"""
PythonAnywhere WSGI entry point for Community Redressal Planner AI Service.

Setup on PythonAnywhere:
1. Create a new Web App → Manual configuration → Python 3.11
2. Set Source code: /home/krishnaCodeWarriors/community-redressal-planner/ai-service
3. Set WSGI file path to this file
4. In the Virtualenv section, create/set: /home/krishnaCodeWarriors/.virtualenvs/crp-ai
5. In a Bash console:
      cd ~/community-redressal-planner/ai-service
      pip install -r requirements.txt
6. Reload the web app
"""

import sys
import os

# Add ai-service directory to path
path = os.path.dirname(os.path.abspath(__file__))
if path not in sys.path:
    sys.path.insert(0, path)

# Set environment variables for PythonAnywhere
os.environ.setdefault('PYTHONANYWHERE', 'true')

from main import app as application  # noqa: E402 — FastAPI ASGI app

# PythonAnywhere uses WSGI but FastAPI is ASGI.
# Use asgiref or a2wsgi to bridge.
try:
    from a2wsgi import ASGIMiddleware
    application = ASGIMiddleware(application)
except ImportError:
    # Fallback: tell user to install a2wsgi
    def application(environ, start_response):
        start_response('200 OK', [('Content-Type', 'application/json')])
        return [b'{"error": "Install a2wsgi: pip install a2wsgi", "status": "setup_required"}']
