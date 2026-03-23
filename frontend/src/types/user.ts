export type UserRole = 'admin' | 'teacher'

export interface User {
  id: number
  username: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserCreate {
  username: string
  email: string
  full_name: string
  password: string
  role: UserRole
}

export interface UserUpdate {
  email?: string
  full_name?: string
  role?: UserRole
  is_active?: boolean
}

export interface PasswordChange {
  current_password: string
  new_password: string
}

export interface PasswordReset {
  new_password: string
}
