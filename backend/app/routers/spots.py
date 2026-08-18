from datetime import UTC, datetime, timedelta
from math import asin, cos, radians, sin, sqrt

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import SpotPost
from app.schemas import SpotPostCreate, SpotPostListResponse, SpotPostRead

router = APIRouter(prefix="/spots", tags=["spots"])

CATEGORIES = {"general", "pets", "free", "food", "traffic", "safety", "events"}
MAX_RADIUS_M = 10000
MAX_DURATION_HOURS = 24


def _distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> int:
    earth_radius_m = 6371000
    d_lat = radians(lat2 - lat1)
    d_lng = radians(lng2 - lng1)
    a = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lng / 2) ** 2
    c = 2 * asin(sqrt(a))
    return int(earth_radius_m * c)


def _validate_coordinates(latitude: float, longitude: float) -> None:
    if latitude < -90 or latitude > 90:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Latitude must be between -90 and 90")
    if longitude < -180 or longitude > 180:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Longitude must be between -180 and 180")


def _to_read(post: SpotPost, distance_m: int | None = None) -> SpotPostRead:
    return SpotPostRead(
        id=post.id,
        body=post.body,
        category=post.category,
        latitude=post.latitude,
        longitude=post.longitude,
        location_hint=post.location_hint,
        created_at=post.created_at,
        expires_at=post.expires_at,
        distance_m=distance_m,
    )


@router.post("", response_model=SpotPostRead, status_code=status.HTTP_201_CREATED)
def create_spot(payload: SpotPostCreate, db: Session = Depends(get_db)):
    _validate_coordinates(payload.latitude, payload.longitude)
    body = payload.body.strip()
    if len(body) < 8:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Spot text must be at least 8 characters")
    if len(body) > 240:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Spot text must be 240 characters or fewer")

    category = payload.category.strip().lower() or "general"
    if category not in CATEGORIES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unsupported spot category")

    duration_hours = max(1, min(payload.duration_hours, MAX_DURATION_HOURS))
    location_hint = payload.location_hint.strip() if payload.location_hint else None
    if location_hint and len(location_hint) > 120:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Location hint must be 120 characters or fewer")

    now = datetime.now(UTC)
    post = SpotPost(
        body=body,
        category=category,
        latitude=payload.latitude,
        longitude=payload.longitude,
        location_hint=location_hint,
        expires_at=now + timedelta(hours=duration_hours),
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return _to_read(post)


@router.get("/nearby", response_model=SpotPostListResponse)
def get_nearby_spots(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_m: int = Query(3000, ge=100, le=MAX_RADIUS_M),
    db: Session = Depends(get_db),
):
    now = datetime.now(UTC)
    lat_delta = radius_m / 111320
    lng_delta = radius_m / (111320 * max(cos(radians(lat)), 0.1))

    candidates = db.scalars(
        select(SpotPost)
        .where(SpotPost.expires_at > now)
        .where(SpotPost.latitude.between(lat - lat_delta, lat + lat_delta))
        .where(SpotPost.longitude.between(lng - lng_delta, lng + lng_delta))
        .order_by(SpotPost.created_at.desc())
        .limit(100)
    ).all()

    nearby = []
    for post in candidates:
        distance = _distance_m(lat, lng, post.latitude, post.longitude)
        if distance <= radius_m:
            nearby.append((post, distance))

    nearby.sort(key=lambda item: (item[1], item[0].expires_at))
    posts = [_to_read(post, distance) for post, distance in nearby[:50]]
    return SpotPostListResponse(posts=posts, radius_m=radius_m, count=len(posts))


@router.get("/{spot_id}", response_model=SpotPostRead)
def get_spot(spot_id: int, db: Session = Depends(get_db)):
    post = db.get(SpotPost, spot_id)
    if post is None or post.expires_at <= datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spot not found")
    return _to_read(post)
