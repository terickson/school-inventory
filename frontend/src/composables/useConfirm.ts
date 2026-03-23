import { ref } from 'vue'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmColor?: string
}

const isOpen = ref(false)
const options = ref<ConfirmOptions>({
  title: '',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  confirmColor: 'error',
})

let resolvePromise: ((value: boolean) => void) | null = null

export function useConfirm() {
  function confirm(opts: ConfirmOptions): Promise<boolean> {
    options.value = {
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      confirmColor: 'error',
      ...opts,
    }
    isOpen.value = true
    return new Promise<boolean>((resolve) => {
      resolvePromise = resolve
    })
  }

  function handleConfirm() {
    isOpen.value = false
    resolvePromise?.(true)
    resolvePromise = null
  }

  function handleCancel() {
    isOpen.value = false
    resolvePromise?.(false)
    resolvePromise = null
  }

  return {
    isOpen,
    options,
    confirm,
    handleConfirm,
    handleCancel,
  }
}
