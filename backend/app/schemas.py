from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    avatar_url: str | None
    is_host: bool


class SignupIn(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=8)

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, v: str) -> str:
        if len(v.encode()) > 72:  # bcrypt only accepts 72 bytes
            raise ValueError("Password must be at most 72 bytes.")
        return v


class LoginIn(BaseModel):
    email: str
    password: str


class DemoIn(BaseModel):
    role: Literal["guest", "host"]
