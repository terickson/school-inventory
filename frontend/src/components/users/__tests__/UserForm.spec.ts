import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import UserForm from '../UserForm.vue'
import type { User } from '@/types'

const existingUser: User = {
  id: 1,
  username: 'jsmith',
  email: 'john@school.com',
  full_name: 'John Smith',
  role: 'teacher',
  is_active: true,
  created_at: '2026-01-01T00:00:00',
  updated_at: '2026-01-01T00:00:00',
}

function mountForm(props: Record<string, unknown> = {}) {
  return mount(UserForm, { props })
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('UserForm', () => {
  describe('create mode (no user prop)', () => {
    it('starts with empty fields and isEdit false', () => {
      const vm = mountForm().vm as any
      expect(vm.isEdit).toBe(false)
      expect(vm.form.username).toBe('')
      expect(vm.form.full_name).toBe('')
      expect(vm.form.email).toBe('')
      expect(vm.form.role).toBe('teacher')
      expect(vm.form.password).toBe('')
    })

    it('getData includes username and password', () => {
      const vm = mountForm().vm as any
      vm.form.username = 'newuser'
      vm.form.full_name = 'New User'
      vm.form.email = 'new@test.com'
      vm.form.role = 'teacher'
      vm.form.password = 'secret123'

      const data = vm.getData()
      expect(data.username).toBe('newuser')
      expect(data.password).toBe('secret123')
      expect(data.full_name).toBe('New User')
      expect(data.email).toBe('new@test.com')
      expect(data.role).toBe('teacher')
    })
  })

  describe('edit mode (with user prop)', () => {
    it('populates fields from user and sets isEdit true', () => {
      const vm = mountForm({ user: existingUser }).vm as any
      expect(vm.isEdit).toBe(true)
      expect(vm.form.username).toBe('jsmith')
      expect(vm.form.full_name).toBe('John Smith')
      expect(vm.form.email).toBe('john@school.com')
      expect(vm.form.role).toBe('teacher')
    })

    it('getData omits username and password in edit mode', () => {
      const vm = mountForm({ user: existingUser }).vm as any
      const data = vm.getData()
      expect(data).toEqual({
        full_name: 'John Smith',
        email: 'john@school.com',
        role: 'teacher',
      })
      expect(data.username).toBeUndefined()
      expect(data.password).toBeUndefined()
    })
  })

  describe('validation rules', () => {
    it('required rule rejects empty string', () => {
      const vm = mountForm().vm as any
      expect(vm.rules.required('')).toBe('Required')
      expect(vm.rules.required('x')).toBe(true)
    })

    it('email rule validates format', () => {
      const vm = mountForm().vm as any
      expect(vm.rules.email('bad')).toBe('Invalid email')
      expect(vm.rules.email('a@b.c')).toBe(true)
    })

    it('minLength rule requires at least 6 characters', () => {
      const vm = mountForm().vm as any
      expect(vm.rules.minLength('short')).toBe('Min 6 characters')
      expect(vm.rules.minLength('longenough')).toBe(true)
    })
  })

  describe('reset()', () => {
    it('clears all form fields', () => {
      const vm = mountForm({ user: existingUser }).vm as any
      vm.reset()
      expect(vm.form.username).toBe('')
      expect(vm.form.full_name).toBe('')
      expect(vm.form.email).toBe('')
      expect(vm.form.role).toBe('teacher')
      expect(vm.form.password).toBe('')
    })
  })
})
