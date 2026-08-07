FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_APP=app.py

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5015

# Run database migrations and start Gunicorn with gevent-websocket worker
CMD ["sh", "-c", "flask db upgrade && gunicorn -k eventlet -w 1 --bind 0.0.0.0:5015 'app:app'"]
