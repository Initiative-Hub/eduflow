"""Upload template style collections to the S3 template inventory.

Uploads templates/<collection>/** to s3://<AWS_S3_TEMPLATES_BUCKET>/templates/
<collection>/** so every deploy (and get_collections' S3 discovery) sees the
same default inventory: vintage, clean_light, pastel_pop, ...

Run:  python scripts/upload_templates_to_s3.py [collection ...]
      (no args = upload the built-in style collections)
"""

import mimetypes
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMPLATES = ROOT / "templates"
DEFAULT_COLLECTIONS = ["vintage", "clean_light", "pastel_pop"]

# load env the same way the service resolves it (.env here, then repo root)
try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
    load_dotenv(ROOT.parent / ".env")
except ImportError:
    pass

import boto3  # noqa: E402

BUCKET = os.getenv("AWS_S3_TEMPLATES_BUCKET", "eduflow-template")
ENDPOINT = os.getenv("AWS_S3_ENDPOINT", "") or None
REGION = os.getenv("AWS_S3_REGION") or os.getenv("AWS_REGION", "us-east-1")
KEY = os.getenv("AWS_S3_ACCESS_KEY_ID") or os.getenv("AWS_ACCESS_KEY_ID", "")
SECRET = os.getenv("AWS_S3_SECRET_ACCESS_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY", "")


def main() -> None:
    names = sys.argv[1:] or DEFAULT_COLLECTIONS
    client = boto3.client(
        "s3", region_name=REGION, endpoint_url=ENDPOINT,
        aws_access_key_id=KEY or None, aws_secret_access_key=SECRET or None,
    )
    # create the templates bucket if it doesn't exist yet (fresh MinIO/dev)
    try:
        client.head_bucket(Bucket=BUCKET)
    except Exception:
        client.create_bucket(Bucket=BUCKET)
        print(f"created bucket {BUCKET}")
    total = 0
    for name in names:
        src = TEMPLATES / name
        if not src.is_dir():
            print(f"!! skip {name}: {src} not found")
            continue
        n = 0
        for f in sorted(src.rglob("*")):
            if not f.is_file() or f.name.startswith("."):
                continue
            key = f"templates/{name}/{f.relative_to(src).as_posix()}"
            ctype = mimetypes.guess_type(f.name)[0] or "application/octet-stream"
            client.upload_file(str(f), BUCKET, key,
                               ExtraArgs={"ContentType": ctype})
            n += 1
        total += n
        print(f"  {name}: uploaded {n} files -> s3://{BUCKET}/templates/{name}/")
    print(f"done: {total} files")


if __name__ == "__main__":
    main()
