import { describe, it, expect, beforeEach } from 'vitest'

// useConfirm uses module-level refs, so we re-import each test to get fresh state
let useConfirm: typeof import('../useConfirm').useConfirm

beforeEach(async () => {
  vi.resetModules()
  const mod = await import('../useConfirm')
  useConfirm = mod.useConfirm
})

describe('useConfirm', () => {
  it('starts with isOpen false', () => {
    const { isOpen } = useConfirm()
    expect(isOpen.value).toBe(false)
  })

  it('confirm() opens dialog and populates options', () => {
    const { isOpen, options, confirm } = useConfirm()

    confirm({ title: 'Delete?', message: 'Are you sure?' })

    expect(isOpen.value).toBe(true)
    expect(options.value.title).toBe('Delete?')
    expect(options.value.message).toBe('Are you sure?')
  })

  it('applies default options', () => {
    const { options, confirm } = useConfirm()

    confirm({ title: 'Test', message: 'Msg' })

    expect(options.value.confirmText).toBe('Confirm')
    expect(options.value.cancelText).toBe('Cancel')
    expect(options.value.confirmColor).toBe('error')
  })

  it('allows overriding default options', () => {
    const { options, confirm } = useConfirm()

    confirm({
      title: 'Test',
      message: 'Msg',
      confirmText: 'Yes',
      cancelText: 'No',
      confirmColor: 'primary',
    })

    expect(options.value.confirmText).toBe('Yes')
    expect(options.value.cancelText).toBe('No')
    expect(options.value.confirmColor).toBe('primary')
  })

  it('resolves to true when handleConfirm is called', async () => {
    const { confirm, handleConfirm } = useConfirm()

    const promise = confirm({ title: 'T', message: 'M' })
    handleConfirm()

    expect(await promise).toBe(true)
  })

  it('resolves to false when handleCancel is called', async () => {
    const { confirm, handleCancel } = useConfirm()

    const promise = confirm({ title: 'T', message: 'M' })
    handleCancel()

    expect(await promise).toBe(false)
  })

  it('closes dialog on confirm', () => {
    const { isOpen, confirm, handleConfirm } = useConfirm()

    confirm({ title: 'T', message: 'M' })
    expect(isOpen.value).toBe(true)

    handleConfirm()
    expect(isOpen.value).toBe(false)
  })

  it('closes dialog on cancel', () => {
    const { isOpen, confirm, handleCancel } = useConfirm()

    confirm({ title: 'T', message: 'M' })
    expect(isOpen.value).toBe(true)

    handleCancel()
    expect(isOpen.value).toBe(false)
  })
})
