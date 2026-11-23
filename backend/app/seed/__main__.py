"""`python -m app.seed`: runs seed_if_empty against the app's database.

Always exits with 0, also when the seed fails, so the backend starts anyway
(the seed logs the kind of error and tries again at the next start)."""

import asyncio
import logging
import sys


async def _main() -> None:
    # Imported here, so even an error while importing is caught below.
    from app.core.config import get_settings
    from app.core.db import SessionLocal, engine
    from app.seed.service import seed_if_empty

    try:
        await seed_if_empty(SessionLocal, get_settings())
    finally:
        await engine.dispose()


def main() -> int:
    logging.basicConfig(
        stream=sys.stdout,
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    try:
        asyncio.run(_main())
    except (Exception, SystemExit) as exc:  # Also SystemExit from invalid settings; Ctrl+C still stops.
        logging.getLogger("app.seed").error("Seed failed: %s", type(exc).__name__)
    return 0


if __name__ == "__main__":
    sys.exit(main())
