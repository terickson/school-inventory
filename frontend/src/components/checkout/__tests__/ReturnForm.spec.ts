import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ReturnForm from '../ReturnForm.vue'

function mountForm(maxQuantity: number) {
  return mount(ReturnForm, { props: { maxQuantity } })
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('ReturnForm', () => {
  it('initializes quantity to maxQuantity', () => {
    const vm = mountForm(5).vm as any
    expect(vm.form.quantity).toBe(5)
  })

  it('getData returns quantity and omits empty notes', () => {
    const vm = mountForm(3).vm as any
    vm.form.notes = ''
    const data = vm.getData()
    expect(data.quantity).toBe(3)
    expect(data.notes).toBeUndefined()
  })

  it('getData includes notes when set', () => {
    const vm = mountForm(3).vm as any
    vm.form.notes = 'Returned in good condition'
    expect(vm.getData().notes).toBe('Returned in good condition')
  })

  describe('validation rules', () => {
    it('maxQuantity rule rejects values above max', () => {
      const vm = mountForm(5).vm as any
      expect(vm.rules.maxQuantity(6)).toBe('Cannot return more than 5')
      expect(vm.rules.maxQuantity(5)).toBe(true)
      expect(vm.rules.maxQuantity(1)).toBe(true)
    })

    it('positiveNumber rule rejects 0 and negative', () => {
      const vm = mountForm(5).vm as any
      expect(vm.rules.positiveNumber(0)).toBe('Must be greater than 0')
      expect(vm.rules.positiveNumber(1)).toBe(true)
    })
  })

  it('reset restores quantity to maxQuantity', () => {
    const vm = mountForm(5).vm as any
    vm.form.quantity = 2
    vm.form.notes = 'test'

    vm.reset()

    expect(vm.form.quantity).toBe(5)
    expect(vm.form.notes).toBe('')
  })
})
