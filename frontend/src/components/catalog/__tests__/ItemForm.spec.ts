import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ItemForm from '../ItemForm.vue'

// Stub CategorySelect to avoid store dependency
const CategorySelectStub = {
  template: '<div />',
  props: ['modelValue', 'rules'],
}

function mountForm(props: Record<string, unknown> = {}) {
  return mount(ItemForm, {
    props,
    global: {
      stubs: {
        CategorySelect: CategorySelectStub,
      },
    },
  })
}

describe('ItemForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('getImageFile()', () => {
    it('returns null when no file is selected', () => {
      const wrapper = mountForm()
      const vm = wrapper.vm as InstanceType<typeof ItemForm>
      expect(vm.getImageFile()).toBeNull()
    })

    it('returns the File when v-model is a single File (Vuetify 4 behavior)', () => {
      const wrapper = mountForm()
      const vm = wrapper.vm as any
      const file = new File(['img'], 'photo.png', { type: 'image/png' })
      vm.imageFiles = file
      const result = vm.getImageFile()
      expect(result).toBeInstanceOf(File)
      expect(result.name).toBe('photo.png')
    })

    it('returns the first File when v-model is a File array', () => {
      const wrapper = mountForm()
      const vm = wrapper.vm as any
      const file = new File(['img'], 'photo.png', { type: 'image/png' })
      vm.imageFiles = [file]
      const result = vm.getImageFile()
      expect(result).toBeInstanceOf(File)
      expect(result.name).toBe('photo.png')
    })

    it('returns null when v-model is an empty array', () => {
      const wrapper = mountForm()
      const vm = wrapper.vm as any
      vm.imageFiles = []
      expect(vm.getImageFile()).toBeNull()
    })
  })

  describe('shouldRemoveImage()', () => {
    it('returns false by default', () => {
      const wrapper = mountForm()
      const vm = wrapper.vm as InstanceType<typeof ItemForm>
      expect(vm.shouldRemoveImage()).toBe(false)
    })
  })

  describe('getData()', () => {
    it('returns form data without image fields', () => {
      const wrapper = mountForm()
      const vm = wrapper.vm as any
      vm.form.name = 'Pencils'
      vm.form.description = 'HB pencils'
      vm.form.category_id = 1
      vm.form.unit_of_measure = 'box'

      expect(vm.getData()).toEqual({
        name: 'Pencils',
        description: 'HB pencils',
        category_id: 1,
        unit_of_measure: 'box',
      })
    })

    it('omits description when empty', () => {
      const wrapper = mountForm()
      const vm = wrapper.vm as any
      vm.form.name = 'Pencils'
      vm.form.description = ''
      vm.form.category_id = 1
      vm.form.unit_of_measure = 'unit'

      const data = vm.getData()
      expect(data.description).toBeUndefined()
    })
  })

  describe('populates form from item prop', () => {
    it('fills fields from an existing item', async () => {
      const item = {
        id: 5,
        name: 'Markers',
        description: 'Dry erase',
        category_id: 2,
        category: { id: 2, name: 'Writing' },
        unit_of_measure: 'pack',
        image_url: '/api/v1/uploads/item_5_abc.png',
        created_at: '2026-01-01T00:00:00',
        updated_at: '2026-01-01T00:00:00',
      }
      const wrapper = mountForm({ item })
      const vm = wrapper.vm as any

      expect(vm.form.name).toBe('Markers')
      expect(vm.form.description).toBe('Dry erase')
      expect(vm.form.category_id).toBe(2)
      expect(vm.form.unit_of_measure).toBe('pack')
    })
  })

  describe('reset()', () => {
    it('clears form fields and image state', () => {
      const wrapper = mountForm()
      const vm = wrapper.vm as any

      vm.form.name = 'Something'
      vm.imageFiles = new File(['x'], 'f.png', { type: 'image/png' })
      vm.removeImageFlag = true

      vm.reset()

      expect(vm.form.name).toBe('')
      expect(vm.form.category_id).toBeNull()
      expect(vm.imageFiles).toBeNull()
      expect(vm.removeImageFlag).toBe(false)
    })
  })
})
