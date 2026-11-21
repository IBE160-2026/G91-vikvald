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
        assert set(columns) == {"id", "email", "password_hash", "created_at"}
        assert columns["id"][5] == 1  # primary key
        for name in columns:
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
