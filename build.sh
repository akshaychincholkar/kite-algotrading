#!/usr/bin/env bash
set -o errexit

# Change to backend directory where manage.py is located
cd backend

pip install -r requirements.txt

python manage.py collectstatic --no-input

python manage.py migrate