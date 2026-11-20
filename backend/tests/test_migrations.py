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
