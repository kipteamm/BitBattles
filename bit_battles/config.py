import dotenv
import re
import os


dotenv.load_dotenv()


DEBUG = os.getenv("DEBUG") == "true"
SECRET_KEY = os.getenv("SECRET_KEY")
ALLOWED_CHARACTERS_REGEX = re.compile(r'^[a-zA-Z0-9_.-]+$')
PATH_WEIGHT = 3
GATE_WEIGHT = 1