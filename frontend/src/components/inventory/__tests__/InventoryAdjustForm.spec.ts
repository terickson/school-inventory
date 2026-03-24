import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import InventoryAdjustForm from '../InventoryAdjustForm.vue'

function mountForm() {
  return mount(InventoryAdjustForm)
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('InventoryAdjustForm', () => {
  it('starts with zero adjustment and empty reason', () => {
    const vm = mountForm().vm as any
    expect(vm.form.adjustment).toBe(0)
    expect(vm.form.reason).toBe('')
  })

  describe('validation rules', () => {
    it('nonZero rule rejects 0', () => {
      const vm = mountForm().vm as any
      expect(vm.rules.nonZero(0)).toBe('Cannot be zero')
      expect(vm.rules.nonZero(5)).toBe(true)
      expect(vm.rules.nonZero(-3)).toBe(true)
    })

    it('required rule rejects empty/null/undefined', () => {
      const vm = mountForm().vm as any
      expect(vm.rules.required('')).toBe('Required')
      expect(vm.rules.required(null)).toBe('Required')
      expect(vm.rules.required(undefined)).toBe('Required')
      expect(vm.rules.required('reason')).toBe(true)
      expect(vm.rules.required(0)).toBe(true)
    })
  })

  it('getData returns adjustment and reason', () => {
    const vm = mountForm().vm as any
    vm.form.adjustment = -5
    vm.form.reason = 'Damaged items'

    expect(vm.getData()).toEqual({
      adjustment: -5,
      reason: 'Damaged items',
    })
  })

  it('reset clears form fields', () => {
    const vm = mountForm().vm as any
    vm.form.adjustment = 10
    vm.form.reason = 'Restock'

    vm.reset()

    expect(vm.form.adjustment).toBe(0)
    expect(vm.form.reason).toBe('')
  })
})
