export interface Category {
  id: number
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Item {
  id: number
  name: string
  description: string | null
  category_id: number
  category?: Category
  unit_of_measure: string
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface CategoryCreate {
  name: string
  description?: string
}

export interface CategoryUpdate {
  name?: string
  description?: string
}

export interface ItemCreate {
  name: string
  description?: string
  category_id: number
  unit_of_measure: string
}

export interface ItemUpdate {
  name?: string
  description?: string
  category_id?: number
  unit_of_measure?: string
}

export interface IdentifySuggestion {
  name: string
  description: string
  category_name: string
  category_id: number | null
  unit_of_measure: string
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
}

export interface Features {
  identify_item: boolean
}
