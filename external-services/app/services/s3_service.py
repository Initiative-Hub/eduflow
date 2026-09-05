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


async def object_exists_in_s3(object_key: str, bucket_name: str | None = None) -> bool:
    """Quiet existence check, so cache misses do not log download errors."""
    try:
        s3 = get_s3_client()
        if not s3:
            return False

        bucket = bucket_name or AWS_S3_BUCKET
        await run_in_threadpool(s3.head_object, Bucket=bucket, Key=object_key)
        return True
    except Exception:
        return False


async def upload_bytes_to_s3(
    data: bytes,
    object_key: str,
    bucket_name: str | None = None,
    content_type: str = "application/octet-stream",
) -> bool:
    """Put a small in-memory object without going through a temp file."""
    try:
        s3 = get_s3_client()
        if not s3:
            return False

        bucket = bucket_name or AWS_S3_BUCKET

        def put_object() -> None:
            s3.put_object(
                Bucket=bucket, Key=object_key, Body=data, ContentType=content_type
            )

        await run_in_threadpool(put_object)
        return True
    except Exception as e:
        logger.error(f"Failed to upload bytes to key {object_key}: {e}")
        return False


async def download_bytes_from_s3(
    object_key: str, bucket_name: str | None = None
) -> tuple[bytes, str] | None:
    try:
        s3 = get_s3_client()
        if not s3:
            return None

        bucket = bucket_name or AWS_S3_BUCKET

        def download_object() -> tuple[bytes, str]:
            response = s3.get_object(Bucket=bucket, Key=object_key)
            content_type = response.get("ContentType") or "application/octet-stream"
            return response["Body"].read(), content_type

        return await run_in_threadpool(download_object)
    except Exception as e:
        logger.error(f"Failed to download key {object_key} from S3: {e}")
        return None


async def list_files_in_s3_prefix(
    prefix: str, bucket_name: str | None = None
) -> list[str] | None:
    try:
        s3 = get_s3_client()
        if not s3:
            return None

        bucket = bucket_name or AWS_S3_BUCKET

        def list_keys():
            # list_objects_v2 caps each response at 1000 keys, so paginate to
            # avoid silently truncating large template collections.
            paginator = s3.get_paginator("list_objects_v2")
            keys: list[str] = []
            for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
                keys.extend(item["Key"] for item in page.get("Contents", []))
            return keys

        return await run_in_threadpool(list_keys)
    except Exception as e:
        logger.error(f"Failed to list S3 prefix {prefix}: {e}")
        return None


async def delete_s3_prefix(prefix: str, bucket_name: str | None = None) -> int:
    """Delete every object under a prefix. Returns how many keys were removed, or -1 on failure.

    Used to drop a template layout, so the deleted design cannot come back the
    next time the collection is pulled from S3.
    """
    try:
        s3 = get_s3_client()
        if not s3:
            return -1

        bucket = bucket_name or AWS_S3_BUCKET
        keys = await list_files_in_s3_prefix(prefix, bucket_name)
        if keys is None:
            return -1
        if not keys:
            return 0

        def delete_keys() -> int:
            removed = 0
            # delete_objects takes at most 1000 keys per call
            for start in range(0, len(keys), 1000):
                batch = keys[start : start + 1000]
                s3.delete_objects(
                    Bucket=bucket,
                    Delete={"Objects": [{"Key": k} for k in batch]},
                )
                removed += len(batch)
            return removed

        return await run_in_threadpool(delete_keys)
    except Exception as e:
        logger.error(f"Failed to delete S3 prefix {prefix}: {e}")
        return -1
