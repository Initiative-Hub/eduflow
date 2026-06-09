import modal

image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install_from_pyproject("pyproject.toml")
    .add_local_dir("app", remote_path="/root/app")
    .add_local_python_source("main")
)

app = modal.App("eduflow-external-services", image=image)


@app.function(cpu=1, memory=2048, timeout=300)
@modal.concurrent(max_inputs=5)
@modal.asgi_app()
def fastapi_app():
    from main import app

    return app
