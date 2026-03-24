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
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface ApiError {
  detail: string
  code?: string
}

export interface SortBy {
  key: string
  order: 'asc' | 'desc'
}
