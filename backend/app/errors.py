import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("app")


class AppError(Exception):
    def __init__(self, status: int, code: str, message: str, fields: dict | None = None):
        self.status, self.code, self.message, self.fields = status, code, message, fields or {}


def _body(status: int, code: str, message: str, fields: dict | None = None) -> JSONResponse:
    error = {"code": code, "message": message}
    if fields:
        error["fields"] = fields
    return JSONResponse(status_code=status, content={"error": error})


def _field(loc: tuple) -> str:
    """("body", "photo_urls", 1) -> "photo_urls.1"; a whole-body error stays "body"."""
    return ".".join(str(p) for p in loc[1:]) or str(loc[0])


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error(_req: Request, exc: AppError):
        return _body(exc.status, exc.code, exc.message, exc.fields)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_req: Request, exc: RequestValidationError):
        fields = {_field(e["loc"]): e["msg"] for e in exc.errors()}
        return _body(422, "validation_error", "Some fields are invalid.", fields)

    @app.exception_handler(StarletteHTTPException)
    async def http_error(_req: Request, exc: StarletteHTTPException):
        return _body(exc.status_code, "http_error", str(exc.detail))

    @app.exception_handler(Exception)
    async def internal_error(req: Request, exc: Exception):
        logger.error("Unhandled error on %s %s", req.method, req.url.path, exc_info=exc)
        return _body(500, "internal_error", "Something went wrong.")
