import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusChip from '../StatusChip.vue'

function mountChip(status: string) {
  return mount(StatusChip, { props: { status } })
}

describe('StatusChip', () => {
  it('renders active status with info color and clock icon', () => {
    const wrapper = mountChip('active')
    const vm = wrapper.vm as any
    expect(vm.chipColor).toBe('info')
    expect(vm.chipIcon).toBe('mdi-clock-outline')
    expect(vm.label).toBe('Active')
  })

  it('renders returned status with success color and return icon', () => {
    const wrapper = mountChip('returned')
    const vm = wrapper.vm as any
    expect(vm.chipColor).toBe('success')
    expect(vm.chipIcon).toBe('mdi-keyboard-return')
    expect(vm.label).toBe('Returned')
  })

  it('renders overdue status with error color and alert icon', () => {
    const wrapper = mountChip('overdue')
    const vm = wrapper.vm as any
    expect(vm.chipColor).toBe('error')
    expect(vm.chipIcon).toBe('mdi-alert-circle-outline')
    expect(vm.label).toBe('Overdue')
  })

  it('renders unknown status with grey color, help icon, and capitalized label', () => {
    const wrapper = mountChip('cancelled')
    const vm = wrapper.vm as any
    expect(vm.chipColor).toBe('grey')
    expect(vm.chipIcon).toBe('mdi-help-circle-outline')
    expect(vm.label).toBe('Cancelled')
  })
})
