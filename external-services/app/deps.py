import os
from pathlib import Path

# Directories
BASE_DIR = Path(__file__).resolve().parent.parent

# Config variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")

SLIDE_TEMPLATES_DIR = BASE_DIR / "templates"
SLIDE_TEMPLATES_DIR.mkdir(exist_ok=True, parents=True)

STORAGE_DIR = BASE_DIR / "storage"
STORAGE_DIR.mkdir(exist_ok=True, parents=True)

# S3/MinIO Configuration
AWS_REGION = os.getenv("AWS_REGION", "local")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "minioadmin")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "minioadmin")
AWS_S3_ENDPOINT = os.getenv("AWS_S3_ENDPOINT", "")
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET", "eduflow-inventory")
AWS_S3_TEMPLATES_BUCKET = os.getenv("AWS_S3_TEMPLATES_BUCKET", "eduflow-template")
AWS_S3_DEFAULT_TEMPLATES_BUCKET = os.getenv("AWS_S3_DEFAULT_TEMPLATES_BUCKET", "eduflow-default-template")

# Handle Docker environment resolving localhost to minio container name
if os.path.exists("/.dockerenv") and AWS_S3_ENDPOINT:
    AWS_S3_ENDPOINT = AWS_S3_ENDPOINT.replace("localhost:9000", "minio:9000").replace(
        "127.0.0.1:9000", "minio:9000"
    )
