import { ref } from 'vue'

interface Notification {
  message: string
  color: string
  timeout: number
}

const snackbar = ref(false)
const notification = ref<Notification>({
  message: '',
  color: 'success',
  timeout: 3000,
})

export function useNotify() {
  function success(message: string) {
    notification.value = { message, color: 'success', timeout: 3000 }
    snackbar.value = true
  }

  function error(message: string) {
    notification.value = { message, color: 'error', timeout: 5000 }
    snackbar.value = true
  }

  function warning(message: string) {
    notification.value = { message, color: 'warning', timeout: 4000 }
    snackbar.value = true
  }

  function info(message: string) {
    notification.value = { message, color: 'info', timeout: 3000 }
    snackbar.value = true
  }

  return {
    snackbar,
    notification,
    success,
    error,
    warning,
    info,
  }
}
