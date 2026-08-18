# Vercel serverless function entry point.
# All app logic lives in app/main.py - this file just re-exports for Vercel.
# For local development: uvicorn app.main:app --reload
from app.main import app  # noqa: F401
