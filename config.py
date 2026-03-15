import os
from dotenv import load_dotenv

load_dotenv(override=True)

# Fluxbase configuration
FLUXBASE_CONFIG = {
    'url': os.environ.get('FLUXBASE_URL', 'https://api.fluxbase.io'),
    'project_id': os.environ.get('FLUXBASE_PROJECT_ID', 'default_project'),
    'api_key': os.environ.get('FLUXBASE_API_KEY', 'default_key')
}

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'superfarmer-super-secret'
    # Optional flags
