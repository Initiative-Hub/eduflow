import modal

image = (
    modal.Image.debian_slim(python_version="3.12")
    # PPTX import renders each slide's background, and it gets there by
    # converting the deck to PDF. slide_skills looks for `soffice` and, failing
    # that, falls back to driving PowerPoint through `osascript` — a macOS-only
    # binary. On a pip-only Debian image neither exists, so every import died
    # with "[Errno 2] No such file or directory". It worked on a developer Mac
    # with LibreOffice installed, which is why it only showed up in production.
    #
    # `libreoffice-impress` is the only component `--convert-to pdf` needs for a
    # .pptx; the full `libreoffice` metapackage is several times the size. The
    # fonts are not optional either: without them LibreOffice substitutes for
    # Arial and the extracted backgrounds come out with the wrong metrics.
    .apt_install(
        "libreoffice-impress",
        "fonts-dejavu",
        "fonts-liberation",  # metric-compatible with Arial/Times/Courier
    )
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
    # Job state is mirrored to object storage, so any container can answer a
    # poll and there is no reason to hold one open waiting for the next. This
    # was 900s purely to work around the in-memory job table; keeping it there
    # would bill 15 idle minutes after every burst. Just long enough now to
    # spare a returning user a cold start.
    scaledown_window=120,
    secrets=[modal.Secret.from_name("custom-secret")],
)
# How many requests one container serves at once — and therefore when Modal
# starts another. A deck build holds its request open for its whole duration
# (FastAPI background tasks run inside the ASGI request), so at 5 a container
# was "full" with 5 builds while using almost none of its CPU: measured compute
# is about 1ms per slide against ~25s of waiting on the model, so a build is
# roughly 0.4% of one core. Scaling out on that signal buys idle containers.
# Memory is the real ceiling here, not CPU — a deck holds its SVGs and any
# base64 images in memory — so if the Modal dashboard shows memory near the
# 2GB limit under load, lower this rather than raising it.
@modal.concurrent(max_inputs=20)
@modal.asgi_app()
def fastapi_app():
    from main import app

    return app
