from datetime import date, datetime
from zoneinfo import ZoneInfo


def today() -> date:
    """The only source of "today" in the app, in India time."""
    return datetime.now(ZoneInfo("Asia/Kolkata")).date()
