import sqlite3
from pathlib import Path

from alembic import command
from alembic.config import Config

BACKEND_DIR = Path(__file__).resolve().parents[1]


def test_ar13_alembic_upgrade_head_kjorer(tmp_path: Path) -> None:
    # Plain (sync) test: alembic/env.py calls asyncio.run itself.
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{tmp_path / 'm.db'}")
    command.upgrade(cfg, "head")


def test_ar13_upgrade_head_lager_users_med_unik_email(tmp_path: Path) -> None:
    db_file = tmp_path / "m.db"
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{db_file}")
    command.upgrade(cfg, "head")

    with sqlite3.connect(db_file) as connection:
        columns = {row[1]: row for row in connection.execute("PRAGMA table_info(users)")}
        assert set(columns) == {"id", "email", "password_hash", "created_at", "terms_accepted_at"}
        assert columns["id"][5] == 1  # primary key
        for name in columns.keys() - {"terms_accepted_at"}:
            assert columns[name][3] == 1, f"{name} should be NOT NULL"

        unique_indexes = [
            row[1] for row in connection.execute("PRAGMA index_list(users)") if row[2] == 1
        ]
        unique_columns = [
            [info[2] for info in connection.execute(f"PRAGMA index_info('{name}')")]
            for name in unique_indexes
        ]
        assert ["email"] in unique_columns


def test_ar13_downgrade_fjerner_users(tmp_path: Path) -> None:
    db_file = tmp_path / "m.db"
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{db_file}")
    command.upgrade(cfg, "head")
    command.downgrade(cfg, "base")
    with sqlite3.connect(db_file) as connection:
        tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master")}
    assert "users" not in tables


def test_ar13_migreringene_samsvarer_med_modellene(tmp_path: Path) -> None:
    # The app tests build tables with create_all, so this is what catches a
    # model change that has no migration (or a migration that differs).
    from alembic.autogenerate import compare_metadata
    from alembic.runtime.migration import MigrationContext
    from sqlalchemy import create_engine

    from app.core.db import Base
    from app.modules.content import models as content_models  # noqa: F401  (registers flashcards)
    from app.modules.files import models as files_models  # noqa: F401  (registers files, file_pages)
    from app.modules.generation import models as generation_models  # noqa: F401  (registers jobs)
    from app.modules.identity import models  # noqa: F401  (registers users)
    from app.modules.subjects import models as subjects_models  # noqa: F401  (registers subjects, lectures)

    db_file = tmp_path / "m.db"
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{db_file}")
    command.upgrade(cfg, "head")

    engine = create_engine(f"sqlite:///{db_file}")
    try:
        with engine.connect() as connection:
            diff = compare_metadata(MigrationContext.configure(connection), Base.metadata)
    finally:
        engine.dispose()
    assert diff == []


def test_ar7_upgrade_head_lager_subjects_med_cascade_og_indeks(tmp_path: Path) -> None:
    db_file = tmp_path / "m.db"
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{db_file}")
    command.upgrade(cfg, "head")

    with sqlite3.connect(db_file) as connection:
        columns = {row[1]: row for row in connection.execute("PRAGMA table_info(subjects)")}
        assert set(columns) == {"id", "user_id", "name", "exam_date", "color_index", "created_at"}
        for name in columns:
            assert columns[name][3] == 1, f"{name} should be NOT NULL"

        foreign_keys = list(connection.execute("PRAGMA foreign_key_list(subjects)"))
        assert [(fk[2], fk[3], fk[4], fk[6]) for fk in foreign_keys] == [
            ("users", "user_id", "id", "CASCADE")
        ]

        indexed = [
            [info[2] for info in connection.execute(f"PRAGMA index_info('{row[1]}')")]
            for row in connection.execute("PRAGMA index_list(subjects)")
        ]
        assert ["user_id"] in indexed


def test_ar7_downgrade_fra_0002_fjerner_subjects_men_beholder_users(tmp_path: Path) -> None:
    db_file = tmp_path / "m.db"
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{db_file}")
    command.upgrade(cfg, "head")
    command.downgrade(cfg, "0001_create_users")
    with sqlite3.connect(db_file) as connection:
        tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master")}
    assert "subjects" not in tables
    assert "users" in tables


def test_ar7_upgrade_head_lager_lectures_med_cascade_og_indeks(tmp_path: Path) -> None:
    db_file = tmp_path / "m.db"
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{db_file}")
    command.upgrade(cfg, "head")

    with sqlite3.connect(db_file) as connection:
        columns = {row[1]: row for row in connection.execute("PRAGMA table_info(lectures)")}
        assert set(columns) == {"id", "subject_id", "name", "date", "created_at"}
        for name in columns:
            assert columns[name][3] == 1, f"{name} should be NOT NULL"

        foreign_keys = list(connection.execute("PRAGMA foreign_key_list(lectures)"))
        assert [(fk[2], fk[3], fk[4], fk[6]) for fk in foreign_keys] == [
            ("subjects", "subject_id", "id", "CASCADE")
        ]

        indexed = [
            [info[2] for info in connection.execute(f"PRAGMA index_info('{row[1]}')")]
            for row in connection.execute("PRAGMA index_list(lectures)")
        ]
        assert ["subject_id"] in indexed


def test_ar7_downgrade_fra_0003_fjerner_lectures_men_beholder_subjects(tmp_path: Path) -> None:
    db_file = tmp_path / "m.db"
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{db_file}")
    command.upgrade(cfg, "head")
    command.downgrade(cfg, "0002_create_subjects")
    with sqlite3.connect(db_file) as connection:
        tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master")}
    assert "lectures" not in tables
    assert "subjects" in tables


def test_ar8_upgrade_head_lager_files_og_file_pages_med_cascade_og_indeks(tmp_path: Path) -> None:
    db_file = tmp_path / "m.db"
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{db_file}")
    command.upgrade(cfg, "head")

    with sqlite3.connect(db_file) as connection:
        columns = {row[1]: row for row in connection.execute("PRAGMA table_info(files)")}
        assert set(columns) == {"id", "lecture_id", "original_name", "page_count", "uploaded_at"}
        for name in columns:
            assert columns[name][3] == 1, f"{name} should be NOT NULL"
        foreign_keys = list(connection.execute("PRAGMA foreign_key_list(files)"))
        assert [(fk[2], fk[3], fk[4], fk[6]) for fk in foreign_keys] == [
            ("lectures", "lecture_id", "id", "CASCADE")
        ]
        indexed = [
            [info[2] for info in connection.execute(f"PRAGMA index_info('{row[1]}')")]
            for row in connection.execute("PRAGMA index_list(files)")
        ]
        assert ["lecture_id"] in indexed

        page_columns = {row[1]: row for row in connection.execute("PRAGMA table_info(file_pages)")}
        assert set(page_columns) == {"file_id", "page_no", "text", "needs_image"}
        for name in page_columns:
            assert page_columns[name][3] == 1, f"{name} should be NOT NULL"
        # Primary key (file_id, page_no): column 5 is the position in the key.
        assert page_columns["file_id"][5] == 1
        assert page_columns["page_no"][5] == 2
        page_keys = list(connection.execute("PRAGMA foreign_key_list(file_pages)"))
        assert [(fk[2], fk[3], fk[4], fk[6]) for fk in page_keys] == [
            ("files", "file_id", "id", "CASCADE")
        ]


def test_ar8_downgrade_fra_0004_fjerner_files_men_beholder_lectures(tmp_path: Path) -> None:
    db_file = tmp_path / "m.db"
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{db_file}")
    command.upgrade(cfg, "head")
    command.downgrade(cfg, "0003_create_lectures")
    with sqlite3.connect(db_file) as connection:
        tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master")}
    assert "files" not in tables
    assert "file_pages" not in tables
    assert "lectures" in tables


def test_fr11_upgrade_head_legger_terms_accepted_at_paa_users(tmp_path: Path) -> None:
    db_file = tmp_path / "m.db"
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{db_file}")
    command.upgrade(cfg, "head")
    with sqlite3.connect(db_file) as connection:
        columns = {row[1]: row for row in connection.execute("PRAGMA table_info(users)")}
    assert "terms_accepted_at" in columns
    assert columns["terms_accepted_at"][3] == 0  # nullable
    assert columns["terms_accepted_at"][4] is None  # no default


def test_fr11_downgrade_til_0004_fjerner_kolonnen_men_beholder_users(tmp_path: Path) -> None:
    db_file = tmp_path / "m.db"
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{db_file}")
    command.upgrade(cfg, "head")
    with sqlite3.connect(db_file) as connection:
        connection.execute(
            "INSERT INTO users (id, email, password_hash, created_at, terms_accepted_at) "
            "VALUES ('a', 'klara@eksempel.no', 'x', '2026-11-21', '2026-11-21')"
        )
    command.downgrade(cfg, "0004_create_files")
    with sqlite3.connect(db_file) as connection:
        columns = {row[1] for row in connection.execute("PRAGMA table_info(users)")}
        emails = [row[0] for row in connection.execute("SELECT email FROM users")]
    assert columns == {"id", "email", "password_hash", "created_at"}
    assert emails == ["klara@eksempel.no"]


def test_ar5_upgrade_head_lager_jobs_og_flashcards_med_cascade_og_delvis_unik_indeks(
    tmp_path: Path,
) -> None:
    db_file = tmp_path / "m.db"
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{db_file}")
    command.upgrade(cfg, "head")

    with sqlite3.connect(db_file) as connection:
        job_columns = {row[1]: row for row in connection.execute("PRAGMA table_info(jobs)")}
        assert set(job_columns) == {
            "id", "lecture_id", "kind", "params", "status", "requested", "created",
            "discarded", "error_code", "started_at", "finished_at",
        }
        nullable = {"created", "discarded", "error_code", "finished_at"}
        for name, row in job_columns.items():
            assert row[3] == (0 if name in nullable else 1), name
        job_keys = list(connection.execute("PRAGMA foreign_key_list(jobs)"))
        assert [(fk[2], fk[3], fk[4], fk[6]) for fk in job_keys] == [
            ("lectures", "lecture_id", "id", "CASCADE")
        ]
        index_sql = connection.execute(
            "SELECT sql FROM sqlite_master WHERE name = 'uq_jobs_running_lecture'"
        ).fetchone()[0]
        assert "UNIQUE" in index_sql and "status = 'running'" in index_sql

        card_columns = {row[1]: row for row in connection.execute("PRAGMA table_info(flashcards)")}
        assert set(card_columns) == {
            "id", "file_id", "kind", "front", "back", "page_no", "formula_flag", "created_at",
        }
        for name, row in card_columns.items():
            assert row[3] == (0 if name == "back" else 1), name
        card_keys = list(connection.execute("PRAGMA foreign_key_list(flashcards)"))
        assert [(fk[2], fk[3], fk[4], fk[6]) for fk in card_keys] == [
            ("files", "file_id", "id", "CASCADE")
        ]
        indexed = [
            [info[2] for info in connection.execute(f"PRAGMA index_info('{row[1]}')")]
            for row in connection.execute("PRAGMA index_list(flashcards)")
        ]
        assert ["file_id"] in indexed


def test_ar4_downgrade_til_0005_fjerner_jobs_og_flashcards(tmp_path: Path) -> None:
    db_file = tmp_path / "m.db"
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{db_file}")
    command.upgrade(cfg, "head")
    command.downgrade(cfg, "0005_add_terms_accepted_at")
    with sqlite3.connect(db_file) as connection:
        tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master")}
    assert "jobs" not in tables
    assert "flashcards" not in tables
    assert "files" in tables
