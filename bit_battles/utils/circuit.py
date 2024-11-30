from contextlib import contextmanager

import typing as t
import sqlite3
import string
import orjson
import zlib
import time


@contextmanager
def get_db_connection(db_path="circuits.sqlite3"):
    """Context manager for SQLite connection."""
    conn = sqlite3.connect(db_path)
    try:
        yield conn
    finally:
        conn.close()


GATE_FIELDS = {"inputStates", "inputs", "outputs", "path", "state", "value"}
WIRE_FIELDS = {"path", "state", "visited"}
GATES = {"AND", "OR", "NOT", "XOR", "INPUT", "OUTPUT"}


class Circuit:
    def __init__(self, gates: list, wires: list) -> None:
        self._gates: list[dict] = gates
        self._wires: list[dict] = wires
        self._circuit: dict[str, list] = {"g": self._gates, "w": self._wires}

    def _valid(self, value: t.Any, key: str) -> bool:
        # Value is an ID
        if key == "d":
            if isinstance(value, int):
                return abs(value) < 100000
            
            return key in string.ascii_uppercase

        # Value is a coordinate
        if "x" in key or "y" in key:
            if not isinstance(value, int):
                return False
            
            return abs(value) < 100000
        
        # Value is a gate type
        if key == "e":
            return value in GATES

        # Value is a rotation
        if key == "n":
            return 0 <= value <= 360
        
        return False

    def _sanitize_element(self, element: dict, redundant_keys: set, key_truncation: int) -> dict:
        sanitized = {}
        for key, value in element.items():
            if key in redundant_keys:
                continue

            if not self._valid(value, key):
                raise ValueError("Invalid circuit data.")
            
            sanitized[key[::-1][:key_truncation]] = value

        return sanitized

    def _sanitize(self) -> None:
        self._gates = [self._sanitize_element(gate, GATE_FIELDS, 1) for gate in self._gates]
        self._wires = [self._sanitize_element(wire, WIRE_FIELDS, 2) for wire in self._wires]

    def _get_compressed(self) -> bytes:
        return zlib.compress(orjson.dumps(self._circuit))
    
    def save(self, table: str, table_id: str, user_id: str) -> tuple[bool, int]:
        self._sanitize()

        query = f"""
            INSERT INTO {table}_circuits (
                {table}_id, user_id, circuit, creation_timestamp
            ) VALUES (?, ?, ?, ?)
        """
        
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    query,
                    (table_id, user_id, self._get_compressed(), time.time())
                )
                conn.commit()
                id = cursor.lastrowid

                if not id:
                    return False, 0
                
                return True, id
        except sqlite3.Error as e:
            print(f"Database error: {e}")
            return False, 0
        
        except Exception as e:
            print(f"Unexpected error: {e}")
            return False, 0
        
    def load(self, table: str, circuit_id: int) -> tuple[bool, dict]:
        query = f"""
            SELECT circuit FROM {table}_circuits WHERE id = ?
        """

        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    query,
                    (circuit_id,)
                )
                circuit = cursor.fetchone()[0]

                if not circuit:
                    return False, {}
                
                return True, circuit
            
        except sqlite3.Error as e:
            print(f"Database error: {e}")
            return False, {}
        
        except Exception as e:
            print(f"Unexpected error: {e}")
            return False, {}


