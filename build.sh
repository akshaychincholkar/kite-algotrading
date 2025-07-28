#!/usr/bin/env bash
set -o errexit

# Change to backend directory where manage.py is located
cd backend

# Install essential Django packages first (without pandas/numpy/scipy)
pip install --no-cache-dir Django==5.1.1
pip install --no-cache-dir djangorestframework==3.16.0
pip install --no-cache-dir django-cors-headers==4.7.0
pip install --no-cache-dir gunicorn==22.0.0
pip install --no-cache-dir python-dotenv==1.1.0
pip install --no-cache-dir requests==2.32.3
pip install --no-cache-dir dj-database-url==2.1.0
pip install --no-cache-dir celery==5.4.0
pip install --no-cache-dir redis==5.0.1
pip install --no-cache-dir beautifulsoup4==4.12.2
pip install --no-cache-dir kiteconnect==5.0.1
pip install --no-cache-dir cryptography==45.0.5
pip install --no-cache-dir rich==14.0.0
pip install --no-cache-dir uvicorn==0.34.2

python manage.py collectstatic --no-input

python manage.py migrate