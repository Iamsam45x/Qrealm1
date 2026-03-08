import os
import uuid
from typing import Optional

from fastapi import UploadFile

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")


def ensure_upload_dir(folder: Optional[str] = None) -> str:
  base = os.path.abspath(UPLOAD_DIR)
  if folder:
    safe_folder = folder.strip().replace("..", "").replace("\\", "/")
    path = os.path.abspath(os.path.join(base, safe_folder))
  else:
    path = base
  if not path.startswith(base):
    path = base
  os.makedirs(path, exist_ok=True)
  return path


def save_upload(file: UploadFile, folder: Optional[str] = None) -> dict:
  target_dir = ensure_upload_dir(folder)
  ext = os.path.splitext(file.filename or "")[1]
  name = f"{uuid.uuid4().hex}{ext}"
  target_path = os.path.join(target_dir, name)

  with open(target_path, "wb") as f:
    f.write(file.file.read())

  rel = os.path.relpath(target_path, os.path.abspath(UPLOAD_DIR)).replace("\\", "/")
  return {
    "filename": name,
    "path": rel,
    "fullPath": target_path,
  }
