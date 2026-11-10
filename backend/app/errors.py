from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    def __init__(self, status: int, code: str, message: str, fields: dict | None = None):
        self.status, self.code, self.message, self.fields = status, code, message, fields or {}


def _body(status: int, code: str, message: str, fields: dict | None = None) -> JSONResponse:
    error = {"code": code, "message": message}
    if fields:
        error["fields"] = fields
    return JSONResponse(status_code=status, content={"error": error})


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error(_req: Request, exc: AppError):
        return _body(exc.status, exc.code, exc.message, exc.fields)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_req: Request, exc: RequestValidationError):
        fields = {str(e["loc"][-1]): e["msg"] for e in exc.errors()}
        return _body(422, "validation_error", "Some fields are invalid.", fields)

    @app.exception_handler(StarletteHTTPException)
    async def http_error(_req: Request, exc: StarletteHTTPException):
        return _body(exc.status_code, "http_error", str(exc.detail))
