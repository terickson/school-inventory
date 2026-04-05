import { defineStore } from 'pinia'
import { ref } from 'vue'
import { catalogApi } from '@/api'

export const useFeaturesStore = defineStore('features', () => {
  const identifyItemEnabled = ref(false)
  const loaded = ref(false)

  async function fetchFeatures() {
    try {
      const features = await catalogApi.getFeatures()
      identifyItemEnabled.value = features.identify_item
    } catch {
      identifyItemEnabled.value = false
    }
    loaded.value = true
  }

  return {
    identifyItemEnabled,
    loaded,
    fetchFeatures,
  }
})
