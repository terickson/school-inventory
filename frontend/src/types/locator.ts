export interface Locator {
  id: number
  name: string
  description: string | null
  user_id: number
  created_at: string
  updated_at: string
  sublocators?: Sublocator[]
}

export interface LocatorCreate {
  name: string
  description?: string
}

export interface LocatorUpdate {
  name?: string
  description?: string
}

export interface Sublocator {
  id: number
  name: string
  description: string | null
  locator_id: number
  created_at: string
  updated_at: string
}

export interface SublocatorCreate {
  name: string
  description?: string
}

export interface SublocatorUpdate {
  name?: string
  description?: string
}
