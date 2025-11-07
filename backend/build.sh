#!/bin/bash
# Build script for Render deployment
# This runs migrations and collects static files

set -e  # Exit on error

echo "Running database migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Build completed successfully!"

