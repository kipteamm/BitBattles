# Logic circuit simulation battles
Players in a battle have to implement the same truthtable in the least amount of time while using as little gates as possible.

## Running locally
To run the app locally, just run the `app.py` file. Make sure you are in the parent directory with `app.py` and `bit_battles` as contents.
```bash
python app.py
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
flask db upgrade
```
