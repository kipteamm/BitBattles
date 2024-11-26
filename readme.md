# Logic circuit simulation battles
Players in a battle have to implement the same truthtable in the least amount of time while using as little gates as possible.

## Running locally
To run the app locally, just run the `app.py` file. Make sure you are in the parent directory with `app.py` and `bit_battles` as contents.
```bash
python app.py
```

If you are running the project for the first time you are going to have to add 2 files to `bit_battles`.
1. `bit_battles/config.py`
```py
import re


DEBUG = True
ALLOWED_CHARACTERS_REGEX = re.compile(r'^[a-zA-Z0-9_.-]+$')
```
2. `bit_battles/secrets.py`
```py
# This can be anything, only in production should you worry about this seriously.
SECRET_KEY = "just_a_string"
```

You will also have to run initial migrations.
```bash
flask db init
flask db migrate -m "initial migration"
flask db upgrade
```

After that any change to the database can be migrated using
```bash
flask db migrate -m "migration name"
flask db upgraed
```
