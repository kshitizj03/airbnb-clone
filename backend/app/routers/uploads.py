from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, UploadFile

from app.config import get_settings
from app.errors import AppError
from app.models import User
from app.security import current_user

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

MAX_BYTES = 5 * 1024 * 1024


def _sniff(head: bytes) -> tuple[str, str] | None:
    """(content type, extension) from the file's first bytes, or None if not an allowed image."""
    if head.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", ".jpg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", ".png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp", ".webp"
    return None


@router.post("", status_code=201)
async def upload(file: UploadFile, _user: User = Depends(current_user)):
    data = await file.read(MAX_BYTES + 1)  # one byte over the limit is enough to refuse
    if len(data) > MAX_BYTES:
        raise AppError(413, "too_large", "Images can be at most 5 MB.")
    kind = _sniff(data)
    # Trust neither the header nor the bytes alone: both must agree.
    if kind is None or kind[0] != file.content_type:
        raise AppError(415, "unsupported_type", "Upload a JPEG, PNG or WebP image.")
    folder = Path(get_settings().upload_dir)
    folder.mkdir(parents=True, exist_ok=True)
    name = uuid4().hex + kind[1]  # never the client's filename
    (folder / name).write_bytes(data)
    return {"url": f"/uploads/{name}"}
