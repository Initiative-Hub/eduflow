import os
from pathlib import Path

# Directories
BASE_DIR = Path(__file__).resolve().parent.parent

# Config variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")

SLIDE_TEMPLATES_DIR = os.getenv("SLIDE_TEMPLATES_DIR")
if not SLIDE_TEMPLATES_DIR:
    if os.path.exists("/root/templates"):
        SLIDE_TEMPLATES_DIR = "/root/templates"
    elif (BASE_DIR / "templates").exists():
        SLIDE_TEMPLATES_DIR = str(BASE_DIR / "templates")
    else:
        SLIDE_TEMPLATES_DIR = str(BASE_DIR / "app" / "services" / "templates")
STORAGE_DIR = Path(os.getenv("SLIDE_STORAGE_DIR", str(BASE_DIR / "storage")))
STORAGE_DIR.mkdir(exist_ok=True, parents=True)

# S3/MinIO Configuration
AWS_REGION = os.getenv("AWS_S3_REGION") or os.getenv("AWS_REGION", "local")
AWS_ACCESS_KEY_ID = os.getenv("AWS_S3_ACCESS_KEY_ID") or os.getenv(
    "AWS_ACCESS_KEY_ID", ""
)
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_S3_SECRET_ACCESS_KEY") or os.getenv(
    "AWS_SECRET_ACCESS_KEY", ""
)
AWS_S3_ENDPOINT = os.getenv("AWS_S3_ENDPOINT", "")
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET", "eduflow-inventory")
AWS_S3_TEMPLATES_BUCKET = os.getenv("AWS_S3_TEMPLATES_BUCKET", "eduflow-template")

# Handle Docker environment resolving localhost to minio container name
if os.path.exists("/.dockerenv") and AWS_S3_ENDPOINT:
    AWS_S3_ENDPOINT = AWS_S3_ENDPOINT.replace("localhost:9000", "minio:9000").replace(
        "127.0.0.1:9000", "minio:9000"
    )
