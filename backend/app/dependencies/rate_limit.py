from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Deque, Dict, Optional

from fastapi import HTTPException, Request, status


class InMemoryRateLimiter:
    """
    Minimal MVP in-memory rate limiter.

    Works inside one backend process.
    Good enough for basic MVP anti-abuse.
    If backend later runs with multiple workers/servers, replace with Redis-based limiter.
    """

    def __init__(self) -> None:
        self._buckets: Dict[str, Deque[float]] = defaultdict(deque)

    def hit(self, key: str, limit: int, window_seconds: int) -> bool:
        now = time.time()
        bucket = self._buckets[key]

        while bucket and bucket[0] <= now - window_seconds:
            bucket.popleft()

        if len(bucket) >= limit:
            return False

        bucket.append(now)
        return True


limiter = InMemoryRateLimiter()


def get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

    if request.client and request.client.host:
        return request.client.host

    return "unknown"


def get_rate_limit_identity(
    request: Request,
    user_id: Optional[int | str] = None,
) -> str:
    if user_id is not None:
        return f"user:{user_id}"

    return f"ip:{get_client_ip(request)}"


def check_rate_limit(
    request: Request,
    *,
    scope: str,
    limit: int,
    window_seconds: int,
    user_id: Optional[int | str] = None,
) -> None:
    identity = get_rate_limit_identity(request, user_id=user_id)
    key = f"{scope}:{identity}"

    allowed = limiter.hit(
        key=key,
        limit=limit,
        window_seconds=window_seconds,
    )

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": "Too many requests. Please try again later.",
                "scope": scope,
                "limit": limit,
                "window_seconds": window_seconds,
            },
        )


def rate_limit_auth(request: Request) -> None:
    check_rate_limit(
        request,
        scope="auth",
        limit=10,
        window_seconds=60,
    )


def rate_limit_read(request: Request, user_id: Optional[int | str] = None) -> None:
    check_rate_limit(
        request,
        scope="read",
        limit=120,
        window_seconds=60,
        user_id=user_id,
    )


def rate_limit_upload(request: Request, user_id: Optional[int | str] = None) -> None:
    check_rate_limit(
        request,
        scope="upload",
        limit=10,
        window_seconds=10 * 60,
        user_id=user_id,
    )


def rate_limit_user_action(request: Request, user_id: Optional[int | str] = None) -> None:
    check_rate_limit(
        request,
        scope="user_action",
        limit=30,
        window_seconds=60,
        user_id=user_id,
    )


def rate_limit_staff_action(request: Request, user_id: Optional[int | str] = None) -> None:
    check_rate_limit(
        request,
        scope="staff_action",
        limit=30,
        window_seconds=60,
        user_id=user_id,
    )
