from collections.abc import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def make_engine(url: str) -> Engine:
    engine = create_engine(url, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def on_connect(dbapi_connection, _record):
        # Take over transaction control from pysqlite (SQLAlchemy's documented recipe).
        dbapi_connection.isolation_level = None
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

    @event.listens_for(engine, "begin")
    def on_begin(conn):
        # ponytail: serializes all transactions, fine for one worker;
        # per-route locking if read concurrency ever matters.
        conn.exec_driver_sql("BEGIN IMMEDIATE")

    return engine


engine = make_engine(get_settings().database_url)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session
