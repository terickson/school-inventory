from fastapi import Query


def pagination_params(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of records to return"),
    sort_by: str | None = Query(
        None,
        description="Column name to sort by (e.g. 'name', 'created_at', 'username', 'quantity'). "
        "Invalid column names are silently ignored.",
    ),
    sort_order: str = Query(
        "asc",
        pattern="^(asc|desc)$",
        description="Sort direction: 'asc' for ascending or 'desc' for descending",
    ),
):
    return {"skip": skip, "limit": limit, "sort_by": sort_by, "sort_order": sort_order}
