"""Every API route needs a logged-in student, except the five public ones (AR-2, FR-4).

The test walks all routes, also those inside included routers, and fails for each
route that does not have current_user somewhere in its dependency tree.
"""

from collections.abc import Callable, Iterator, Sequence
from dataclasses import dataclass
from typing import Annotated, Any

from fastapi import APIRouter, Depends, FastAPI, params
from fastapi.dependencies.models import Dependant
from fastapi.dependencies.utils import get_dependant
from fastapi.routing import APIRoute

from app.main import create_app
from app.modules.identity.dependencies import current_user
from app.modules.identity.models import User

PUBLIC_ROUTES = {
    ("GET", "/api/health"),
    ("GET", "/api/config"),
    ("POST", "/api/identity/register"),
    ("POST", "/api/identity/login"),
    ("POST", "/api/identity/logout"),
}


@dataclass
class FoundRoute:
    path: str
    route: APIRoute
    # Dependencies from the routers it was included through (include_router(dependencies=...)).
    router_dependencies: list[params.Depends]


def _walk(routes: Sequence[Any], prefix: str, dependencies: list[params.Depends]) -> Iterator[FoundRoute]:
    for route in routes:
        if isinstance(route, APIRoute):
            yield FoundRoute(prefix + route.path, route, dependencies)
        elif hasattr(route, "original_router") and hasattr(route, "include_context"):
            # FastAPI 0.162 keeps an included router as an _IncludedRouter. The
            # router's own prefix is already in its routes' paths; the prefix and
            # dependencies given to include_router are in include_context.
            context = route.include_context
            yield from _walk(
                route.original_router.routes,
                prefix + (context.prefix or ""),
                [*dependencies, *(context.dependencies or [])],
            )
        elif hasattr(route, "routes") and not hasattr(route, "path"):
            raise AssertionError(f"Unknown route container: {type(route).__name__}")


def _calls(dependant: Dependant) -> Iterator[Callable[..., Any]]:
    for dependency in dependant.dependencies:
        if dependency.call is not None:
            yield dependency.call
        yield from _calls(dependency)


def _uses_current_user(found: FoundRoute) -> bool:
    if current_user in _calls(found.route.dependant):
        return True
    for depends in found.router_dependencies:
        if depends.dependency is current_user:
            return True
        if depends.dependency is not None and current_user in _calls(
            get_dependant(path=found.path, call=depends.dependency)
        ):
            return True
    return False


def _api_routes(app: FastAPI) -> list[FoundRoute]:
    return list(_walk(app.routes, "", []))


def _unguarded(app: FastAPI) -> list[str]:
    missing = []
    for found in _api_routes(app):
        for method in sorted(found.route.methods):
            if (method, found.path) in PUBLIC_ROUTES:
                continue
            if not _uses_current_user(found):
                missing.append(f"{method} {found.path}")
    return missing


def test_ar2_alle_ruter_er_funnet_samme_som_openapi() -> None:
    app = create_app()
    found = {found.path for found in _api_routes(app) if found.route.include_in_schema}
    assert found == set(app.openapi()["paths"])
    # The five public routes are really there (so the list does not go stale).
    pairs = {(m, f.path) for f in _api_routes(app) for m in f.route.methods}
    assert PUBLIC_ROUTES <= pairs


def test_ar2_alle_ruter_bruker_current_user() -> None:
    assert _unguarded(create_app()) == []


def _guarded_endpoint(user: Annotated[User, Depends(current_user)]) -> dict[str, str]:
    return {}


def _open_endpoint() -> dict[str, str]:
    return {}


def test_ar2_ny_rute_uten_current_user_blir_funnet() -> None:
    app = create_app()
    inner = APIRouter(prefix="/inner")
    inner.add_api_route("/open", _open_endpoint, methods=["GET"])
    outer = APIRouter(prefix="/api/test")
    outer.add_api_route("/open", _open_endpoint, methods=["POST"])
    outer.add_api_route("/guarded", _guarded_endpoint, methods=["GET"])
    outer.include_router(inner, prefix="/nested")
    app.include_router(outer, prefix="/extra")

    assert _unguarded(app) == [
        "POST /extra/api/test/open",
        "GET /extra/api/test/nested/inner/open",
    ]
    found = {f.path for f in _api_routes(app)}
    assert found == set(app.openapi()["paths"])


async def _wraps_current_user(user: Annotated[User, Depends(current_user)]) -> User:
    return user


def test_ar2_current_user_fra_routeren_eller_indirekte_teller() -> None:
    app = create_app()
    via_include = APIRouter()
    via_include.add_api_route("/api/test/a", _open_endpoint, methods=["GET"])
    app.include_router(via_include, dependencies=[Depends(current_user)])
    via_router = APIRouter(prefix="/api/test", dependencies=[Depends(_wraps_current_user)])
    via_router.add_api_route("/b", _open_endpoint, methods=["GET"])
    app.include_router(via_router)

    assert _unguarded(app) == []
