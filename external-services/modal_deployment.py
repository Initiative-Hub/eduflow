import modal

image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install_from_pyproject("pyproject.toml")
    .env(
        {
            "SLIDE_SKILLS_DECK_WORKERS": "8",
            "SLIDE_SKILLS_IMAGE_CONCURRENCY": "6",
            "SLIDE_SKILLS_TRUST_BINDINGS": "1",
            "SLIDE_COLLECTIONS_CACHE_SECONDS": "60",
        }
    )
    .add_local_dir("app", remote_path="/root/app")
    .add_local_file("main.py", remote_path="/root/main.py")
)

app = modal.App("eduflow-external-services", image=image)


@app.function(
    cpu=1,
    memory=2048,
    # A deck is queued as a background task and the POST returns immediately, so
    # the build outlives the request that started it. 300s was shorter than a
    # large deck with generated images, and the client polls for up to 240s on
    # top of that.
    timeout=900,
    # The job table lives in this container's memory (SlideJobService.jobs), so
    # a container that goes away between the POST and the client's next poll
    # takes the job with it — the caller sees "job was lost". Holding the
    # container open across a build and the polling that follows it avoids the
    # common case; the durable fix is to move the job table out of memory.
    scaledown_window=900,
    secrets=[modal.Secret.from_name("custom-secret")],
)
@modal.concurrent(max_inputs=5)
@modal.asgi_app()
def fastapi_app():
    from main import app

    return app
