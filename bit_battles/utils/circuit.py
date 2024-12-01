from bit_battles.utils.snowflakes import SnowflakeGenerator

from contextlib import contextmanager

import typing as t
import sqlite3
import string
import orjson
import zlib
import time
import os


@contextmanager
def get_db_connection(db_path="circuits.sqlite3"):
    """Context manager for SQLite connection."""
    conn = sqlite3.connect(db_path)
    try:
        yield conn
    finally:
        conn.close()


GATE_FIELDS = {"inputStates", "inputs", "output", "path", "state", "value", "completed"}
WIRE_FIELDS = {"path", "state", "visited"}
GATES = {"AND", "OR", "NOT", "XOR", "INPUT", "OUTPUT"}


class Circuit:
    def __init__(self, gates: list, wires: list) -> None:
        self._gates: list[dict] = gates
        self._wires: list[dict] = wires
        self._circuit: dict[str, list] = {"g": self._gates, "w": self._wires}

    def _create_db(self) -> None:
        query = """
            CREATE TABLE IF NOT EXISTS battle_circuits(
                id TEXT PRIMARY KEY,
                battle_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                circuit TEXT NOT NULL,
                creation_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS daily_circuits(
                id TEXT PRIMARY KEY,
                daily_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                circuit TEXT NOT NULL,
                creation_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS challenge_circuits(
                id TEXT PRIMARY KEY,
                challenge_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                circuit TEXT NOT NULL,
                creation_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.executescript(query)
            conn.commit()

    def _valid(self, value: t.Any, key: str) -> bool:
        if key == "id":
            if isinstance(value, int):
                return value < 100000
            
            if not value:
                return True

            return value in string.ascii_uppercase
        
        if key == "type":
            return value in GATES

        if key == "rotation":
            return 0 <= value <= 360
        
        if "x" in key.lower() or "y" in key.lower():
            if not isinstance(value, int):
                return False
            
            return abs(value) < 100000

        return False

    def _sanitize_element(self, element: dict, redundant_keys: set, key_truncation: int) -> dict:
        sanitized = {}
        for key, value in element.items():
            if key in redundant_keys:
                continue

            if not self._valid(value, key):
                raise ValueError(f"Invalid circuit data. '{value}' is not of type '{key}'.")
            
            sanitized[key[::-1][:key_truncation]] = value

        return sanitized

    def _sanitize(self) -> None:
        self._gates = [self._sanitize_element(gate, GATE_FIELDS, 1) for gate in self._gates]
        self._wires = [self._sanitize_element(wire, WIRE_FIELDS, 2) for wire in self._wires]

    def _get_compressed(self) -> bytes:
        return zlib.compress(orjson.dumps(self._circuit))
    
    def save(self, table: str, table_id: str, user_id: str) -> tuple[bool, int]:
        if not os.path.exists("circuits.sqlite3"):
            self._create_db()

        self._sanitize()

        query = f"""
            INSERT INTO {table}_circuits (
                id, {table}_id, user_id, circuit, creation_timestamp
            ) VALUES (?, ?, ?, ?, ?)
        """
        
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    query,
                    (SnowflakeGenerator().generate_id(), table_id, user_id, self._get_compressed(), time.time())
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
