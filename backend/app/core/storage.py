"""The only module that touches the disk (AR-8).

Each uploaded PDF is stored as <UPLOAD_DIR>/<user_id>/<file_id>.pdf. The
original filename is only kept in the database, never in the path. The settings
are read on every call, so tests can point UPLOAD_DIR at a temporary folder.
"""

import os
import shutil
import tempfile
import uuid
from pathlib import Path

from app.core.config import get_settings


def _user_dir(user_id: uuid.UUID) -> Path:
    # uuid.UUID only ever prints as hex digits and dashes, so it is safe in a path.
    return Path(get_settings().UPLOAD_DIR) / str(uuid.UUID(str(user_id)))


def _pdf_path(user_id: uuid.UUID, file_id: uuid.UUID) -> Path:
    return _user_dir(user_id) / f"{uuid.UUID(str(file_id))}.pdf"


def save_pdf(user_id: uuid.UUID, file_id: uuid.UUID, data: bytes) -> None:
    """Write the PDF. It is first written to a temporary file in the same folder
    and then renamed, so a half-written file never has the real name."""
    target = _pdf_path(user_id, file_id)
    target.parent.mkdir(parents=True, exist_ok=True)
    handle, temp_name = tempfile.mkstemp(dir=target.parent, prefix=".upload-", suffix=".tmp")
    try:
        with os.fdopen(handle, "wb") as temp_file:
            temp_file.write(data)
            temp_file.flush()
            os.fsync(temp_file.fileno())
        os.replace(temp_name, target)
    except BaseException:
        Path(temp_name).unlink(missing_ok=True)
        raise


def read_pdf(user_id: uuid.UUID, file_id: uuid.UUID) -> bytes:
    """The stored PDF. Raises FileNotFoundError if it is not there."""
    return _pdf_path(user_id, file_id).read_bytes()


def delete_pdf(user_id: uuid.UUID, file_id: uuid.UUID) -> None:
    """Delete one stored PDF. A file that is already gone is not an error."""
    _pdf_path(user_id, file_id).unlink(missing_ok=True)


def delete_user_dir(user_id: uuid.UUID) -> None:
    """Delete all of one user's stored PDFs. A missing folder is not an error."""
    try:
        shutil.rmtree(_user_dir(user_id))
    except FileNotFoundError:
        pass
