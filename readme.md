# Logic circuit simulation battles
Players in a battle have to implement the same truthtable in the least amount of time while using as little gates as possible.

```bash
pa website create --domain LogisimBattles.pythonanywhere.com --command '/home/LogisimBattles/.virtualenvs/venv/bin/gunicorn --worker-class eventlet -w 1 --chdir /home/LogisimBattles/LogisimBattles --bind unix:${DOMAIN_SOCKET} app:app'
```

```bash
pa website reload --domain LogisimBattles.pythonanywhere.com
```