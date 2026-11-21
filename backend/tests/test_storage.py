"""core/storage: the only module that touches the disk (AR-8)."""

import uuid
from pathlib import Path

import pytest

from app.core import storage


def test_ar8_lagre_og_lese_bruker_bare_id_ene_i_stien(upload_dir: Path) -> None:
    user_id, file_id = uuid.uuid4(), uuid.uuid4()
    storage.save_pdf(user_id, file_id, b"%PDF-1.7 innhold")

    path = upload_dir / str(user_id) / f"{file_id}.pdf"
    assert path.read_bytes() == b"%PDF-1.7 innhold"
    assert storage.read_pdf(user_id, file_id) == b"%PDF-1.7 innhold"
    # No temporary files are left behind.
    assert list(path.parent.iterdir()) == [path]


def test_ar8_lagre_paa_nytt_erstatter_innholdet(upload_dir: Path) -> None:
    user_id, file_id = uuid.uuid4(), uuid.uuid4()
    storage.save_pdf(user_id, file_id, b"gammel")
    storage.save_pdf(user_id, file_id, b"ny")
    assert storage.read_pdf(user_id, file_id) == b"ny"


def test_ar8_slette_en_fil_lar_de_andre_vaere(upload_dir: Path) -> None:
    user_id, kept, removed = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    storage.save_pdf(user_id, kept, b"a")
    storage.save_pdf(user_id, removed, b"b")

    storage.delete_pdf(user_id, removed)
    storage.delete_pdf(user_id, removed)  # already gone: not an error

    assert storage.read_pdf(user_id, kept) == b"a"
    with pytest.raises(FileNotFoundError):
        storage.read_pdf(user_id, removed)


def test_ar8_slette_brukermappa_lar_andre_brukere_vaere(upload_dir: Path) -> None:
    klara, ola, file_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    storage.save_pdf(klara, file_id, b"klara")
    storage.save_pdf(ola, file_id, b"ola")

    storage.delete_user_dir(klara)
    storage.delete_user_dir(klara)  # already gone: not an error

    assert not (upload_dir / str(klara)).exists()
    assert storage.read_pdf(ola, file_id) == b"ola"


def test_ar8_feil_under_skriving_etterlater_ingen_fil(
    upload_dir: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    user_id, file_id = uuid.uuid4(), uuid.uuid4()

    def broken_replace(_src: object, _dst: object) -> None:
        raise OSError("disk full")

    monkeypatch.setattr(storage.os, "replace", broken_replace)
    with pytest.raises(OSError):
        storage.save_pdf(user_id, file_id, b"%PDF-")
    assert list((upload_dir / str(user_id)).iterdir()) == []


def test_ar8_stien_kommer_fra_upload_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.config import get_settings

    other = tmp_path / "annen"
    monkeypatch.setenv("UPLOAD_DIR", str(other))
    get_settings.cache_clear()
    user_id, file_id = uuid.uuid4(), uuid.uuid4()
    storage.save_pdf(user_id, file_id, b"x")
    assert (other / str(user_id) / f"{file_id}.pdf").exists()
