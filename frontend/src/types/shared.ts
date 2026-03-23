export interface PaginatedResponse<T> {
  total: number
  skip: number
  limit: number
  items: T[]
}

export interface PaginationParams {
  skip?: number
  limit?: number
  search?: string
}

export interface ApiError {
  detail: string
  code?: string
}

export interface SortBy {
  key: string
  order: 'asc' | 'desc'
}
