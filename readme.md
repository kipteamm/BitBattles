```
pa website create --domain LogisimBattles.pythonanywhere.com --command '/home/LogisimBattles/.virtualenvs/venv/bin/gunicorn --worker-class eventlet -w 1 --chdir /home/LogisimBattles --bind unix:${DOMAIN_SOCKET} app:app'
```