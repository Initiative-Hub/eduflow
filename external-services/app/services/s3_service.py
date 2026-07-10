import logging
import mimetypes
from pathlib import Path
import boto3  # type: ignore
from botocore.client import Config  # type: ignore
from fastapi.concurrency import run_in_threadpool

from app.deps import (
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION,
    AWS_S3_ENDPOINT,
    AWS_S3_BUCKET,
)

logger = logging.getLogger(__name__)


def get_s3_client():
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY:
        return None

    # Custom config for MinIO / path style compatibility
    config = Config(signature_version="s3v4")
    kwargs = {
        "aws_access_key_id": AWS_ACCESS_KEY_ID,
        "aws_secret_access_key": AWS_SECRET_ACCESS_KEY,
        "region_name": AWS_REGION,
        "config": config,
    }

    if AWS_S3_ENDPOINT:
        kwargs["endpoint_url"] = AWS_S3_ENDPOINT
        # For MinIO compatibility, force path style access
        config = Config(signature_version="s3v4", s3={"addressing_style": "path"})
        kwargs["config"] = config

    return boto3.client("s3", **kwargs)


async def upload_file_to_s3(
    local_path: Path, object_key: str, bucket_name: str | None = None
) -> bool:
    try:
        s3 = get_s3_client()
        if not s3:
            logger.warning("S3 credentials not fully configured; skipping S3 upload.")
            return False

        content_type, _ = mimetypes.guess_type(str(local_path))
        if not content_type:
            content_type = (
                "text/html"
                if local_path.suffix == ".html"
                else "application/octet-stream"
            )

        extra_args = {"ContentType": content_type}
        bucket = bucket_name or AWS_S3_BUCKET

        # Upload in threadpool since boto3 is synchronous and blocks
        await run_in_threadpool(
            s3.upload_file,
            Filename=str(local_path),
            Bucket=bucket,
            Key=object_key,
            ExtraArgs=extra_args,
        )
        logger.info(
            f"Successfully uploaded {local_path} to S3 bucket {bucket} as key {object_key}"
        )
        return True
    except Exception as e:
        logger.error(f"Failed to upload {local_path} to S3: {e}")
        return False


async def download_file_from_s3(
    object_key: str, local_path: Path, bucket_name: str | None = None
) -> bool:
    try:
        s3 = get_s3_client()
        if not s3:
            return False

        local_path.parent.mkdir(parents=True, exist_ok=True)
        bucket = bucket_name or AWS_S3_BUCKET

        # Download in threadpool
        await run_in_threadpool(
            s3.download_file,
            Bucket=bucket,
            Key=object_key,
            Filename=str(local_path),
        )
        logger.info(
            f"Successfully downloaded key {object_key} from S3 bucket {bucket} to {local_path}"
        )
        return True
    except Exception as e:
        logger.error(f"Failed to download key {object_key} from S3: {e}")
        return False


async def list_files_in_s3_prefix(
    prefix: str, bucket_name: str | None = None
) -> list[str]:
    try:
        s3 = get_s3_client()
        if not s3:
            return []

        bucket = bucket_name or AWS_S3_BUCKET

        def list_keys():
            response = s3.list_objects_v2(Bucket=bucket, Prefix=prefix)
            if "Contents" not in response:
                return []
            return [item["Key"] for item in response["Contents"]]

        return await run_in_threadpool(list_keys)
    except Exception as e:
        logger.error(f"Failed to list S3 prefix {prefix}: {e}")
        return []
