import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StockLevelBadge from '../StockLevelBadge.vue'

function mountBadge(quantity: number, minQuantity: number) {
  return mount(StockLevelBadge, { props: { quantity, minQuantity } })
}

describe('StockLevelBadge', () => {
  it('shows error color when quantity is 0', () => {
    const vm = mountBadge(0, 5).vm as any
    expect(vm.badgeColor).toBe('error')
    expect(vm.badgeIcon).toBe('mdi-alert-circle-outline')
  })

  it('shows error color when quantity is negative', () => {
    const vm = mountBadge(-1, 5).vm as any
    expect(vm.badgeColor).toBe('error')
    expect(vm.badgeIcon).toBe('mdi-alert-circle-outline')
  })

  it('shows warning color when quantity equals minQuantity', () => {
    const vm = mountBadge(5, 5).vm as any
    expect(vm.badgeColor).toBe('warning')
    expect(vm.badgeIcon).toBe('mdi-alert-outline')
  })

  it('shows warning color when quantity is below minQuantity', () => {
    const vm = mountBadge(3, 5).vm as any
    expect(vm.badgeColor).toBe('warning')
    expect(vm.badgeIcon).toBe('mdi-alert-outline')
  })

  it('shows success color when quantity exceeds minQuantity', () => {
    const vm = mountBadge(10, 5).vm as any
    expect(vm.badgeColor).toBe('success')
    expect(vm.badgeIcon).toBe('mdi-check-circle-outline')
  })

  it('displays quantity / minQuantity text', () => {
    const wrapper = mountBadge(10, 5)
    expect(wrapper.text()).toContain('10')
    expect(wrapper.text()).toContain('5')
  })
})
