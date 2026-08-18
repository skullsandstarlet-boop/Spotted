# FastAPI Vercel Starter Template (Sync-Only)

A clean, minimal FastAPI template using **synchronous SQLAlchemy** and **sync API endpoints** only. Optimized for LLM code generation and Vercel deployment. This template provides essential structure without specific business logic, using traditional synchronous patterns throughout.

## 🏗️ Architecture

```
app/
├── main.py            # FastAPI entry point with health check and router registration
├── dependencies.py      # Smart dependency injection patterns (examples included)
├── database.py         # DB connection & session management
├── models.py          # SQLAlchemy ORM models (commented examples)
├── schemas.py         # Pydantic schemas (base classes + examples)
├── services/          # Business logic layer (empty, ready for your services)
│   └── __init__.py
└── routers/           # API route handlers (empty, ready for your routes)
    └── __init__.py
api/index.py           # Vercel deployment wrapper (imports from app/main.py)
```

## 🔄 Sync-Only Architecture

This template uses **synchronous patterns only** - no async/await anywhere in the codebase. All database operations, API endpoints, and middleware use traditional synchronous Python patterns for maximum simplicity and LLM comprehension.

### Adding New Resources
The template is ready for you to add entities. Follow this pattern (example: `User`):

1. **Database Model** (`app/models.py`)
```python
# Uncomment and modify the example User model:
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

2. **Schemas** (`app/schemas.py`)
```python
# Add these to your schemas.py file:
class UserBase(BaseSchema):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class User(UserBase, TimestampMixin):
    id: int
```

3. **Service Layer** (`app/services/user_service.py`) - Create new file (sync functions)
```python
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from typing import List, Optional

from ..models.user import User
from ..schemas import UserCreate, UserUpdate

def create_user(db: Session, user_data: UserCreate) -> User:  # sync function
    """Create a new user"""
    db_user = User(**user_data.dict())
    db.add(db_user)
    try:
        db.commit()
        db.refresh(db_user)
        return db_user
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "User already exists")

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:  # sync function
    """Get user by ID"""
    return db.query(User).filter(User.id == user_id).first()
```

4. **Dependencies** (`app/dependencies.py`) - Add this function (sync)
```python
def get_user_or_404(user_id: int, db: Session = Depends(get_db)) -> User:  # sync function
    """Get user by ID or raise 404"""
    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user
```

5. **Router** (`app/routers/users.py`) - Create new file (sync endpoints only)
```python
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.user import User
from ..schemas import UserCreate, User as UserSchema
from ..services import user_service
from ..dependencies import get_user_or_404

router = APIRouter(prefix="/users", tags=["users"])

@router.post("", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):  # sync function
    return user_service.create_user(db, user)

@router.get("/{user_id}", response_model=UserSchema)
def get_user(user: User = Depends(get_user_or_404)):  # sync function
    return user
```

6. **Include Router** (`app/main.py`) - Update imports and include router
```python
from app.routers import users
app.include_router(users.router)
```

## 🚀 Vercel Function Deployment

This template is designed to be deployed as a **Vercel serverless function**. The agent handles all deployment and environment setup automatically.

### What the Agent Handles:
- **Serverless Deployment**: Deploys FastAPI app as Vercel function
- **Database Migrations**: Creates and runs Alembic migrations when models are added
- **Environment Setup**: Configures database connections and environment variables
- **Dependencies**: Installs and manages all required packages

### Architecture:
- `api/index.py` serves as the Vercel function entry point (imports from `app/main.py`)
- `vercel.json` routes all requests to the FastAPI app
- Database operations run on each function invocation (sync patterns)
- No persistent server - fully serverless

## 📚 Key Components

### Base Schema (`app/schemas.py`)
- `BaseSchema`: Common Pydantic configuration
- `TimestampMixin`: Reusable created_at/updated_at fields

### Service Pattern
- Business logic separated from routes
- Reusable across multiple endpoints
- Easy error handling and validation

### Smart Dependencies
- Automatic 404 handling
- Dependency chaining
- Request validation

## 🤖 LLM Generation Guidelines

When AI agents generate code for this template, they should:

1. **Use SYNC functions ONLY** - Never use async/await, always use standard def functions
2. **Follow the layered architecture** - Models → Schemas → Services → Dependencies → Routers
3. **Use sync SQLAlchemy patterns** - Standard Session, no async sessions or async database operations
4. **Keep routers thin** - Business logic goes in services, not route handlers
5. **Use dependency injection** - Leverage the `get_entity_or_404` pattern for clean error handling
6. **Follow naming conventions** - `EntityBase`, `EntityCreate`, `EntityUpdate`, `Entity` for schemas
7. **Update main app** - Remember to include new routers in `app/main.py`
8. **Handle errors properly** - Use FastAPI's HTTPException with appropriate status codes
9. **For file uploads, use presigned flow** - backend returns upload contract; client uploads directly to object storage

### 🚨 CRITICAL: Synchronous Patterns Only
- **NO async/await** anywhere in the codebase
- **NO async database sessions** - use standard SQLAlchemy Session
- **NO async middleware** - use exception handlers or sync middleware
- **NO async dependencies** - all dependency functions should be standard def functions

### 🚨 CRITICAL: Never Use Enum in Database Columns
**Always use String columns in database, handle enums in Python code:**

**❌ WRONG - Don't use Enum in database:**
```python
# DON'T DO THIS
from sqlalchemy import Enum
priority = Column(Enum(TaskPriority))  # ❌ Breaks migrations & deployment
```

**✅ CORRECT - Use String in database, Enum in Python:**
```python
import enum
from sqlalchemy import String

class TaskPriority(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class Task(Base):
    __tablename__ = "tasks"
    # ✅ Always use String for enum-like columns
    priority = Column(String(50), default=TaskPriority.MEDIUM.value, nullable=False)
    status = Column(String(50), default=TaskStatus.TODO.value, nullable=False)
```

**Handle enum conversion in API endpoints:**
```python
@router.post("", response_model=TaskSchema)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    task_data = task.model_dump()
    # Convert enum to string value for database
    if hasattr(task_data.get("priority"), "value"):
        task_data["priority"] = task_data["priority"].value

    db_task = TaskModel(**task_data)
    db.add(db_task)
    db.commit()
    return db_task
```

### 🚨 CRITICAL: Always Include New Routers
**After creating any router, you MUST update `app/main.py`:**
```python
# STEP 1: Import your router
from app.routers import users, products, orders  # Add your new router here

# STEP 2: Include it in the app
app.include_router(users.router)
app.include_router(products.router)  # Add this line for new routers
app.include_router(orders.router)    # Add this line for new routers
```
**⚠️ Forgetting this step means your API endpoints won't work!**

### 🚨 CRITICAL: Files LLM Must NOT Modify

**NEVER modify these deployment-critical files:**

- **`api/index.py`** - Vercel deployment wrapper (just imports from `app/main.py`)
- **`vercel.json`** - Contains essential Vercel deployment configuration
- **`alembic.ini`** - Database migration configuration

### ✅ Files LLM CAN Modify

**LLM can and should modify:**

- **`alembic/env.py`** - ADD model imports when creating new models so migrations work
  ```python
  # Add imports like: from app.models import User, Product, Order
  ```

**Why?** Alembic needs to know about your models to generate migrations properly.

## 📁 File Templates

### Service Template
Copy this template for new services (`app/services/entity_service.py`):

```python
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from typing import List, Optional

from ..models.entity_name import EntityName  # Replace EntityName with your model
from ..schemas import EntityCreate, EntityUpdate  # Replace with your schemas

def create_entity(db: Session, entity_data: EntityCreate) -> EntityName:  # sync function
    """Create a new entity"""
    # Convert Pydantic model to dict and handle enum values
    entity_dict = entity_data.model_dump()

    # Handle enum fields - convert to string values for database
    for field_name, field_value in entity_dict.items():
        if hasattr(field_value, "value"):  # It's an enum
            entity_dict[field_name] = field_value.value

    db_entity = EntityName(**entity_dict)
    db.add(db_entity)
    try:
        db.commit()
        db.refresh(db_entity)
        return db_entity
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Entity already exists")

def get_entity_by_id(db: Session, entity_id: int) -> Optional[EntityName]:  # sync function
    """Get entity by ID"""
    return db.query(EntityName).filter(EntityName.id == entity_id).first()

def get_entities(db: Session, skip: int = 0, limit: int = 100) -> List[EntityName]:  # sync function
    """Get list of entities with pagination"""
    return db.query(EntityName).offset(skip).limit(limit).all()
```

### Router Template
Copy this template for new routers (`app/routers/entities.py`):

```python
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.entity_name import EntityName  # Replace EntityName with your model
from ..schemas import EntityCreate, EntityUpdate, Entity as EntitySchema  # Replace with your schemas
from ..services import entity_service  # Replace with your service
from ..dependencies import get_entity_or_404  # Replace with your dependency

router = APIRouter(prefix="/entities", tags=["entities"])  # Update prefix and tags

@router.post("", response_model=EntitySchema, status_code=status.HTTP_201_CREATED)
def create_entity(entity: EntityCreate, db: Session = Depends(get_db)):  # sync function
    # Service handles enum conversion automatically
    return entity_service.create_entity(db, entity)

@router.get("", response_model=List[EntitySchema])
def get_entities(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):  # sync function
    return entity_service.get_entities(db, skip, limit)

@router.get("/{entity_id}", response_model=EntitySchema)
def get_entity(entity: EntityName = Depends(get_entity_or_404)):  # sync function
    return entity
```

## 🔧 Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (optional, only if using database)
- `ALLOWED_ORIGINS`: Comma-separated CORS origin allowlist (exact origins only)
- `FRONTEND_URL`: Used as CORS fallback when `ALLOWED_ORIGINS` is not set

## 📦 Dependencies

Core dependencies included in `requirements.txt`:

- **FastAPI**: Modern, fast web framework for building APIs
- **SQLAlchemy**: SQL toolkit and Object Relational Mapping (ORM) library
- **Alembic**: Database migrations for SQLAlchemy
- **Pydantic**: Data validation and settings management using Python type annotations
- **psycopg2-binary**: PostgreSQL adapter for Python
- **uvicorn**: ASGI server for running FastAPI applications

## 🎯 What This Template Provides

**✅ Ready to use:**
- FastAPI application structure
- Database connection setup (PostgreSQL)  
- Alembic migrations configuration
- Pydantic schemas with base classes and mixins
- Database seeding script with examples
- Vercel deployment configuration
- Health check endpoint

**✅ Ready for LLM generation:**
- Clear architectural patterns
- Commented examples in all files
- Service layer separation
- Smart dependency injection patterns
- Error handling conventions

**✅ Clean slate for your project:**
- No specific business logic
- No unnecessary endpoints
- No demo data or migrations
- Ready to build any type of API
