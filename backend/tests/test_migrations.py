from pathlib import Path

from alembic import command
from alembic.config import Config

BACKEND_DIR = Path(__file__).resolve().parents[1]


def test_ar13_alembic_upgrade_head_kjorer(tmp_path: Path) -> None:
    # Plain (sync) test: alembic/env.py calls asyncio.run itself.
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{tmp_path / 'm.db'}")
    command.upgrade(cfg, "head")
