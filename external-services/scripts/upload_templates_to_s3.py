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
TEMPLATES = (
    Path(os.environ["TEMPLATES_DIR"])
    if os.environ.get("TEMPLATES_DIR")
    else ROOT / "templates"
)
DEFAULT_COLLECTIONS = [
    "vintage",
    "clean_light",
    "pastel_pop",
    "professional_focus",
]

# load env the same way the service resolves it (.env here, then repo root)
try:
    from dotenv import load_dotenv

    load_dotenv(ROOT / ".env")
    load_dotenv(ROOT.parent / ".env")
except ImportError:
    pass

import boto3  # type: ignore  # noqa: E402

BUCKET = os.getenv("AWS_S3_TEMPLATES_BUCKET", "eduflow-template")
ENDPOINT = os.getenv("AWS_S3_ENDPOINT", "") or None
REGION = os.getenv("AWS_S3_REGION") or os.getenv("AWS_REGION", "us-east-1")
KEY = os.getenv("AWS_S3_ACCESS_KEY_ID") or os.getenv("AWS_ACCESS_KEY_ID", "")
SECRET = os.getenv("AWS_S3_SECRET_ACCESS_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY", "")


def upload_dir(client, bucket: str, src: Path, prefix: str) -> int:
    n = 0
    for f in sorted(src.rglob("*")):
        if not f.is_file() or f.name.startswith("."):
            continue
        key = f"{prefix}{f.relative_to(src).as_posix()}"
        ctype = mimetypes.guess_type(f.name)[0] or "application/octet-stream"
        client.upload_file(str(f), bucket, key, ExtraArgs={"ContentType": ctype})
        n += 1
    return n


def main() -> None:
    args = sys.argv[1:]
    # --default: target the system default-templates bucket, and understand
    # the special name "base" = the root UPPERCASE category bank, which the
    # service loads as collection "templates" (keys templates/templates/...).
    use_default_bucket = "--default" in args
    names = [a for a in args if not a.startswith("--")] or DEFAULT_COLLECTIONS
    bucket = (
        os.getenv("AWS_S3_DEFAULT_TEMPLATES_BUCKET", "eduflow-default-template")
        if use_default_bucket
        else os.getenv("AWS_S3_TEMPLATES_BUCKET", "eduflow-template")
    )
    client = boto3.client(
        "s3",
        region_name=REGION,
        endpoint_url=ENDPOINT,
        aws_access_key_id=KEY or None,
        aws_secret_access_key=SECRET or None,
    )
    # create the bucket if it doesn't exist yet (fresh MinIO/dev)
    try:
        client.head_bucket(Bucket=bucket)
    except Exception:
        client.create_bucket(Bucket=bucket)
        print(f"created bucket {bucket}")

    total = 0
    for name in names:
        if name == "base":
            # root UPPERCASE category bank -> collection "templates"
            n = 0
            for cat in sorted(TEMPLATES.iterdir()):
                if cat.is_dir() and cat.name.isupper():
                    n += upload_dir(
                        client, bucket, cat, f"templates/templates/{cat.name}/"
                    )
            total += n
            print(f"  base bank: {n} files -> s3://{bucket}/templates/templates/")
            continue
        src = TEMPLATES / name
        if not src.is_dir():
            print(f"!! skip {name}: {src} not found")
            continue
        n = upload_dir(client, bucket, src, f"templates/{name}/")
        total += n
        print(f"  {name}: {n} files -> s3://{bucket}/templates/{name}/")
    print(f"done: {total} files")


if __name__ == "__main__":
    main()
