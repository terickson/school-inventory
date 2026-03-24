import { describe, it, expect, beforeEach } from 'vitest'

let useNotify: typeof import('../useNotify').useNotify

beforeEach(async () => {
  vi.resetModules()
  const mod = await import('../useNotify')
  useNotify = mod.useNotify
})

describe('useNotify', () => {
  it('success() sets correct notification', () => {
    const { snackbar, notification, success } = useNotify()

    success('Item saved')

    expect(snackbar.value).toBe(true)
    expect(notification.value.message).toBe('Item saved')
    expect(notification.value.color).toBe('success')
    expect(notification.value.timeout).toBe(3000)
  })

  it('error() sets correct notification', () => {
    const { snackbar, notification, error } = useNotify()

    error('Something broke')

    expect(snackbar.value).toBe(true)
    expect(notification.value.message).toBe('Something broke')
    expect(notification.value.color).toBe('error')
    expect(notification.value.timeout).toBe(5000)
  })

  it('warning() sets correct notification', () => {
    const { snackbar, notification, warning } = useNotify()

    warning('Low stock')

    expect(snackbar.value).toBe(true)
    expect(notification.value.message).toBe('Low stock')
    expect(notification.value.color).toBe('warning')
    expect(notification.value.timeout).toBe(4000)
  })

  it('info() sets correct notification', () => {
    const { snackbar, notification, info } = useNotify()

    info('FYI')

    expect(snackbar.value).toBe(true)
    expect(notification.value.message).toBe('FYI')
    expect(notification.value.color).toBe('info')
    expect(notification.value.timeout).toBe(3000)
  })
})
