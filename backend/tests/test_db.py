from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def test_ar13_sqlite_foreign_keys_er_paa(session: AsyncSession) -> None:
    result = await session.execute(text("PRAGMA foreign_keys"))
    assert result.scalar_one() == 1
