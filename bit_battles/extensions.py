from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO 


socketio = SocketIO(cors_allowed_origins="*")
db = SQLAlchemy()