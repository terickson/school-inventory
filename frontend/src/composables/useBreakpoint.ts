import { computed } from 'vue'
import { useDisplay } from 'vuetify'

export function useBreakpoint() {
  const { mobile, mdAndUp, lgAndUp, name } = useDisplay()

  const isMobile = computed(() => mobile.value)
  const isTablet = computed(() => name.value === 'md')
  const isDesktop = computed(() => lgAndUp.value)
  const showDrawerPersistent = computed(() => mdAndUp.value)

  return {
    isMobile,
    isTablet,
    isDesktop,
    showDrawerPersistent,
  }
}
