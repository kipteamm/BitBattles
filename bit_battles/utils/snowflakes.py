import time

class SnowflakeGenerator:
    machine_id = 1
    sequence = 0
    last_timestamp = -1

    @staticmethod
    def wait_for_next_ms(last_timestamp):
        current_timestamp = int(time.time() * 1000)

        while current_timestamp <= last_timestamp:
            current_timestamp = int(time.time() * 1000)

        return current_timestamp

    @staticmethod
    def generate_id():
        current_timestamp = int(time.time() * 1000)

        if current_timestamp == SnowflakeGenerator.last_timestamp:
            SnowflakeGenerator.sequence = (SnowflakeGenerator.sequence + 1) & 4095
            if SnowflakeGenerator.sequence == 0:
                current_timestamp = SnowflakeGenerator.wait_for_next_ms(current_timestamp)
        else:
            SnowflakeGenerator.sequence = 0

        SnowflakeGenerator.last_timestamp = current_timestamp

        snowflake_id = (
            (current_timestamp << 22)
            | (SnowflakeGenerator.machine_id << 12)
            | SnowflakeGenerator.sequence
        )

        return snowflake_id
