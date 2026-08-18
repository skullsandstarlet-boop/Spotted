from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db

# Define your dependency functions here
# Example: def get_entity_or_404(entity_id: int, db: Session = Depends(get_db)) -> Entity:
