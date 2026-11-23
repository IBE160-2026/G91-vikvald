"""Test coverage per requirement (SK-1), the licence (AR-19) and README (NFR-1).

SK-1 is checked by name, not by content: a requirement counts as tested when at
least one test has its ID in the name. docs/testplan.md says the same.
"""

import hashlib
import re
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TESTPLAN = REPO_ROOT / "docs" / "testplan.md"
LICENSE = REPO_ROOT / "LICENSE"
README = REPO_ROOT / "README.md"

# The official text from https://www.gnu.org/licenses/agpl-3.0.txt, unchanged.
AGPL3_SHA256 = "0d96a4ff68ad6d4b6f1f30f713b18d5184912ba8dd389f86aa7710db079abcb0"

# The functional must-have requirements (SK-1 in the PRD).
MUST_REQUIREMENTS = [f"FR-{n}" for n in [*range(1, 42), 56, 57, 58]]
SUCCESS_CRITERIA = [f"SK-{n}" for n in range(2, 23)]

# Where the test runners look for tests (frontend/vitest.config.ts and
# frontend/playwright.config.ts).
FRONTEND_TEST_GLOBS = [
    *(f"{folder}/**/*.test.{ext}" for folder in ("app", "lib", "modules", "components") for ext in ("ts", "tsx")),
    "e2e/**/*.spec.ts",
]

# Values in the "Manuell kontroll" column that mean "no manual check".
NO_REASON = {"", "–", "—", "-", "n/a"}

_PYTEST_NAME = re.compile(r"^\s*(?:async\s+)?def\s+(test_\w+)", re.MULTILINE)
_BACKEND_ID = re.compile(r"^fr(\d+)$")
# The title of it(...), test(...), describe(...) and their variants (test.describe,
# it.skip ...). Not regex.test(...): the name must not follow a dot or a word character.
_JS_TITLE = re.compile(r"(?<![.\w])(?:it|test|describe)(?:\.\w+)*\(\s*([\"'`])(.*?)(?<!\\)\1")
# Table-driven tests: it.each([...])("title", ...). The table may span several lines.
_JS_EACH_TITLE = re.compile(
    r"(?<![.\w])(?:it|test|describe)(?:\.\w+)*\.each\(.*?\)\(\s*([\"'`])(.*?)(?<!\\)\1", re.DOTALL
)
# FR-<n>, but not NFR-<n>.
_JS_ID = re.compile(r"(?<![A-Za-z])FR-(\d+)(?!\d)")
_ROW = re.compile(r"^\|\s*((?:FR|SK)-\d+)\s*\|(.*)\|\s*$")


@dataclass
class PlanRow:
    files: list[str]
    manual: str


def requirement_ids_in_tests(repo_root: Path) -> dict[str, set[str]]:
    """Map each requirement ID found in a test name to the test files (relative to the repo)."""
    found: dict[str, set[str]] = {}

    def add(number: str, path: Path) -> None:
        found.setdefault(f"FR-{int(number)}", set()).add(path.relative_to(repo_root).as_posix())

    for path in sorted((repo_root / "backend" / "tests").rglob("test_*.py")):
        for name in _PYTEST_NAME.findall(path.read_text(encoding="utf-8")):
            for part in name.split("_"):
                if match := _BACKEND_ID.match(part):
                    add(match.group(1), path)

    frontend = repo_root / "frontend"
    for pattern in FRONTEND_TEST_GLOBS:
        for path in sorted(frontend.glob(pattern)):
            if "node_modules" in path.parts:
                continue
            text = path.read_text(encoding="utf-8")
            for _quote, title in [*_JS_TITLE.findall(text), *_JS_EACH_TITLE.findall(text)]:
                for number in _JS_ID.findall(title):
                    add(number, path)
    return found


def parse_testplan(text: str) -> dict[str, list[PlanRow]]:
    """Rows of the tables in docs/testplan.md, keyed by the ID in the first column."""
    rows: dict[str, list[PlanRow]] = {}
    for line in text.splitlines():
        match = _ROW.match(line.strip())
        if not match:
            continue
        cells = [cell.strip() for cell in match.group(2).split("|")]
        # FR rows: Krav | Hva | Automatiske tester | Manuell kontroll.
        is_fr = match.group(1).startswith("FR-") and len(cells) >= 3
        files = re.findall(r"`([^`]+)`", cells[1]) if is_fr else []
        manual = cells[2] if is_fr else ""
        rows.setdefault(match.group(1), []).append(PlanRow(files=files, manual=manual))
    return rows


def missing_requirements(
    requirements: list[str], found: dict[str, set[str]], rows: dict[str, list[PlanRow]]
) -> list[str]:
    """Requirements without a row in the test plan, or without both a test and a reason."""
    missing = []
    for requirement in requirements:
        plan_rows = rows.get(requirement)
        if not plan_rows:
            missing.append(requirement)
        elif not found.get(requirement) and plan_rows[0].manual.strip().lower() in NO_REASON:
            missing.append(requirement)
    return missing


def _plan() -> dict[str, list[PlanRow]]:
    return parse_testplan(TESTPLAN.read_text(encoding="utf-8"))


def test_sk1_every_must_requirement_has_test_or_reason() -> None:
    missing = missing_requirements(MUST_REQUIREMENTS, requirement_ids_in_tests(REPO_ROOT), _plan())
    assert not missing, f"No test with the ID in its name and no reason in docs/testplan.md: {', '.join(missing)}"


def test_sk1_testplan_has_one_row_per_must_requirement() -> None:
    rows = _plan()
    wrong = [f"{req} ({len(rows.get(req, []))} rows)" for req in MUST_REQUIREMENTS if len(rows.get(req, [])) != 1]
    extra = sorted(req for req in rows if req.startswith("FR-") and req not in MUST_REQUIREMENTS)
    assert not wrong, f"Expected one row each in docs/testplan.md: {', '.join(wrong)}"
    assert not extra, f"Not a must-have requirement: {', '.join(extra)}"


def test_sk1_testplan_files_exist() -> None:
    gone = sorted(
        {name for plan_rows in _plan().values() for row in plan_rows for name in row.files if not (REPO_ROOT / name).is_file()}
    )
    assert not gone, f"Files in docs/testplan.md that do not exist: {', '.join(gone)}"


def test_sk1_missing_requirements_are_listed(tmp_path: Path) -> None:
    (tmp_path / "backend" / "tests").mkdir(parents=True)
    (tmp_path / "backend" / "tests" / "test_x.py").write_text(
        "def test_fr1_fr3_something():\n    pass\n\ndef test_nfr4_not_a_must():\n    pass\n", encoding="utf-8"
    )
    (tmp_path / "frontend" / "e2e").mkdir(parents=True)
    (tmp_path / "frontend" / "e2e" / "x.spec.ts").write_text(
        'test.describe("FR-5: a flow", () => {\n  test("NFR-2: no requests", () => {});\n});\n'
        'it.each([\n  ["a", 1],\n])("FR-7: %s gives %d", () => {});\n'
        'expect(/x/.test("FR-8: not a test")).toBe(false);\n',
        encoding="utf-8",
    )
    found = requirement_ids_in_tests(tmp_path)
    assert set(found) == {"FR-1", "FR-3", "FR-5", "FR-7"}

    plan = parse_testplan(
        "| Krav | Hva | Automatiske tester | Manuell kontroll |\n"
        "| --- | --- | --- | --- |\n"
        "| FR-1 | a | `backend/tests/test_x.py` | – |\n"
        "| FR-2 | b | – | Only with the real model. |\n"
        "| FR-3 | c | `backend/tests/test_x.py` | – |\n"
        "| FR-4 | d | – | — |\n"
        "| FR-5 | e | `frontend/e2e/x.spec.ts` | – |\n"
    )
    requirements = ["FR-1", "FR-2", "FR-3", "FR-4", "FR-5", "FR-6"]
    # FR-2 is manual only, FR-4 has neither test nor reason, FR-6 has no row.
    assert missing_requirements(requirements, found, plan) == ["FR-4", "FR-6"]


def test_sk1_testplan_files_match_test_names() -> None:
    """The "Automatiske tester" column lists exactly the files with the ID in a test name."""
    found = requirement_ids_in_tests(REPO_ROOT)
    rows = _plan()
    stale = []
    for requirement in MUST_REQUIREMENTS:
        listed = set(rows[requirement][0].files) if rows.get(requirement) else set()
        actual = found.get(requirement, set())
        if listed != actual:
            extra = ", ".join(sorted(listed - actual)) or "none"
            absent = ", ".join(sorted(actual - listed)) or "none"
            stale.append(f"{requirement} (listed without a test: {extra}; not listed: {absent})")
    assert not stale, "Update docs/testplan.md: " + "; ".join(stale)


def test_sk1_testplan_lists_sk2_to_sk22() -> None:
    rows = _plan()
    wrong = [f"{sk} ({len(rows.get(sk, []))} rows)" for sk in SUCCESS_CRITERIA if len(rows.get(sk, [])) != 1]
    assert not wrong, f"Expected one row each in docs/testplan.md: {', '.join(wrong)}"


def test_ar19_license_is_unmodified_agpl3() -> None:
    actual = hashlib.sha256(LICENSE.read_bytes()).hexdigest()
    assert actual == AGPL3_SHA256, (
        f"LICENSE differs from https://www.gnu.org/licenses/agpl-3.0.txt: "
        f"expected SHA-256 {AGPL3_SHA256}, got {actual}"
    )


def test_nfr1_readme_has_required_sections() -> None:
    text = README.read_text(encoding="utf-8")
    for needed in (
        "## Lisens",
        "AGPL-3.0",
        "PyMuPDF",
        "CC BY-NC-SA 4.0",
        "docs/testplan.md",
        "docs/testing/brukerreiser.md",
        "test@studiekamerat.no",
        "http://localhost:3000",
    ):
        assert needed in text, f"README.md is missing {needed!r}"
    bash_blocks = re.findall(r"```bash\n(.*?)```", text, flags=re.DOTALL)
    assert any(re.search(r"^docker compose up\s*$", block, re.MULTILINE) for block in bash_blocks), (
        "README.md has no ```bash block with `docker compose up`"
    )
