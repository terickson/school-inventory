from fastapi import Query


def pagination_params(skip: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100)):
    return {"skip": skip, "limit": limit}
