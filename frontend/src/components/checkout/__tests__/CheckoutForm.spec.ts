import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CheckoutForm from '../CheckoutForm.vue'

vi.mock('@/api', () => ({
  authApi: { login: vi.fn(), logout: vi.fn(), me: vi.fn() },
  inventoryApi: { list: vi.fn().mockResolvedValue({ items: [], total: 0 }) },
  usersApi: { list: vi.fn().mockResolvedValue({ items: [], total: 0 }) },
}))

function mountForm() {
  return mount(CheckoutForm)
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('CheckoutForm', () => {
  it('starts with default form values', () => {
    const vm = mountForm().vm as any
    expect(vm.form.inventory_id).toBeNull()
    expect(vm.form.quantity).toBe(1)
    expect(vm.form.notes).toBe('')
    expect(vm.form.user_id).toBeNull()
  })

  it('getData returns correct shape, omitting empty optional fields', () => {
    const vm = mountForm().vm as any
    vm.form.inventory_id = 5
    vm.form.quantity = 3
    vm.form.notes = ''
    vm.form.user_id = null

    const data = vm.getData()
    expect(data.inventory_id).toBe(5)
    expect(data.quantity).toBe(3)
    expect(data.notes).toBeUndefined()
    expect(data.user_id).toBeUndefined()
  })

  it('getData includes user_id when set', () => {
    const vm = mountForm().vm as any
    vm.form.inventory_id = 5
    vm.form.quantity = 1
    vm.form.user_id = 10

    expect(vm.getData().user_id).toBe(10)
  })

  describe('validation rules', () => {
    it('required rule accepts 0 but rejects empty/null', () => {
      const vm = mountForm().vm as any
      expect(vm.rules.required(0)).toBe(true)
      expect(vm.rules.required('')).toBe('Required')
      expect(vm.rules.required(null)).toBe('Required')
    })

    it('positiveNumber rule rejects 0 and negative', () => {
      const vm = mountForm().vm as any
      expect(vm.rules.positiveNumber(0)).toBe('Must be greater than 0')
      expect(vm.rules.positiveNumber(-1)).toBe('Must be greater than 0')
      expect(vm.rules.positiveNumber(1)).toBe(true)
    })
  })

  it('reset restores default values', () => {
    const vm = mountForm().vm as any
    vm.form.inventory_id = 5
    vm.form.quantity = 99
    vm.form.notes = 'test'

    vm.reset()

    expect(vm.form.inventory_id).toBeNull()
    expect(vm.form.quantity).toBe(1)
    expect(vm.form.notes).toBe('')
  })
})
