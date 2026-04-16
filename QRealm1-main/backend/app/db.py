from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Generator, List, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.engine import Row
from sqlalchemy.exc import OperationalError
from app.db_engine import Base, get_session_local, init_db as init_db_sqlalchemy


def _prepare_sql_params(statement: str, parameters: Tuple) -> Tuple[str, dict]:
    """
    Convert '?' placeholders to named binds for SQLAlchemy text().
    Provides compatibility with legacy code using '?' syntax.
    """
    if not parameters:
        return statement, {}
    parts = statement.split("?")
    expected = len(parts) - 1
    if expected != len(parameters):
        raise ValueError(
            f"SQL placeholder mismatch: {expected} '?' in query, "
            f"{len(parameters)} parameters (snippet: {statement[:120]!r})"
        )
    keys = [f"p{i}" for i in range(len(parameters))]
    out: List[str] = []
    for i, part in enumerate(parts[:-1]):
        out.append(part)
        out.append(f":{keys[i]}")
    out.append(parts[-1])
    bind = {keys[i]: parameters[i] for i in range(len(parameters))}
    return "".join(out), bind


class RowWrapper:
    """Provides sqlite3.Row-like access for SQLAlchemy rows."""
    def __init__(self, row: Row):
        self._row = row
        self._mapping = row._mapping
        self._keys = list(row._mapping.keys())
        self._values = list(row._mapping.values())
    
    def __getitem__(self, key):
        if isinstance(key, int):
            return self._values[key] if key < len(self._values) else None
        return self._mapping[key]
    
    def __contains__(self, key: str) -> bool:
        return key in self._mapping
    
    def __iter__(self):
        return iter(self._values)
    
    def __len__(self) -> int:
        return len(self._values)
    
    def keys(self):
        return self._mapping.keys()
    
    def values(self):
        return self._mapping.values()
    
    def items(self):
        return self._mapping.items()
    
    def get(self, key: str, default: Any = None) -> Any:
        return self._mapping.get(key, default)


class ConnectionWrapper:
    """Provides sqlite3.Connection-like interface for SQLAlchemy sessions."""
    def __init__(self, session):
        self._session = session
    
    def execute(self, statement, parameters=None):
        if parameters:
            params: Tuple = tuple(parameters) if not isinstance(parameters, tuple) else parameters
            stmt, bind = _prepare_sql_params(statement, params)
            result = self._session.execute(text(stmt), bind)
        else:
            result = self._session.execute(text(statement))
        return ResultWrapper(result)
    
    def commit(self):
        self._session.commit()
    
    def rollback(self):
        self._session.rollback()
    
    def close(self):
        self._session.close()


class ResultWrapper:
    """Provides sqlite3.Cursor-like interface for SQLAlchemy results."""
    def __init__(self, result):
        self._result = result
    
    def fetchone(self) -> Optional[RowWrapper]:
        row = self._result.fetchone()
        if row is None:
            return None
        return RowWrapper(row)
    
    def fetchall(self) -> List[RowWrapper]:
        return [RowWrapper(row) for row in self._result.fetchall()]
    
    def first(self) -> Optional[Any]:
        row = self._result.fetchone()
        if row is None:
            return None
        return row[0]
    
    @property
    def lastrowid(self):
        """Not directly supported in SQLAlchemy."""
        return None


@contextmanager
def get_conn() -> Generator[ConnectionWrapper, None, None]:
    """Context manager for database connections."""
    SessionLocal = get_session_local()
    session = SessionLocal()
    conn = ConnectionWrapper(session)
    try:
        yield conn
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def connect() -> ConnectionWrapper:
    """Non-context manager version of a DB connection."""
    SessionLocal = get_session_local()
    session = SessionLocal()
    return ConnectionWrapper(session)


def init_db() -> None:
    """Initialize database tables using SQLAlchemy Base.metadata.create_all."""
    init_db_sqlalchemy()


def now_iso() -> str:
    """Current UTC time in ISO format."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def check_db_connection() -> dict:
    """Check database connectivity for PostgreSQL/Supabase."""
    SessionLocal = get_session_local()
    session = SessionLocal()
    try:
        session.execute(text("SELECT 1"))
        return {"connected": True, "database_type": "postgresql"}
    except OperationalError as e:
        return {"connected": False, "error": str(e), "database_type": "postgresql"}
    finally:
        session.close()