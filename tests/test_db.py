import pytest
from pydantic import ValidationError

from app.config import Settings
from app.db import make_engine


def journal_mode(engine) -> str:
    with engine.connect() as conn:
        return conn.exec_driver_sql("PRAGMA journal_mode").scalar()


def test_default_journal_mode_is_wal(tmp_path):
    assert journal_mode(make_engine(f"sqlite:///{tmp_path / 'a.db'}")) == "wal"


def test_delete_journal_mode(tmp_path):
    engine = make_engine(f"sqlite:///{tmp_path / 'a.db'}", journal_mode="DELETE")
    assert journal_mode(engine) == "delete"


def test_invalid_journal_mode_rejected():
    with pytest.raises(ValidationError):
        Settings(sqlite_journal_mode="TRUNCATE")
