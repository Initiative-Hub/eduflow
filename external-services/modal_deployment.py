import modal

image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install_from_pyproject("pyproject.toml")
    .add_local_dir("app", remote_path="/root/app")
    .add_local_dir("templates", remote_path="/root/templates")
    .add_local_file("main.py", remote_path="/root/main.py")
)

app = modal.App("eduflow-external-services", image=image)


@app.function(
    cpu=1,
    memory=2048,
    timeout=300,
    secrets=[modal.Secret.from_name("custom-secret")],
)
@modal.concurrent(max_inputs=5)
@modal.asgi_app()
def fastapi_app():
    from main import app

    return app
