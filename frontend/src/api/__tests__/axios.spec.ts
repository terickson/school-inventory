import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig, AxiosHeaders } from 'axios'

// We need to test the interceptors that are registered when the module loads.
// Strategy: mock axios.create to capture the interceptor callbacks, then test them directly.

let requestInterceptor: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig
let responseSuccessInterceptor: (response: AxiosResponse) => AxiosResponse
let responseErrorInterceptor: (error: AxiosError) => Promise<unknown>
let mockApiInstance: ReturnType<typeof createMockApi>
let mockAxiosPost: ReturnType<typeof vi.fn>

function createMockApi() {
  const interceptors = {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  }
  return {
    interceptors,
    defaults: { headers: { common: {} } },
    // The api instance is also callable (for retries)
    __call: vi.fn(),
  }
}

function makeHeaders(extra: Record<string, string> = {}): AxiosHeaders {
  const h = { set: vi.fn(), get: vi.fn(), has: vi.fn(), delete: vi.fn(), ...extra }
  return h as unknown as AxiosHeaders
}

function makeRequestConfig(overrides: Record<string, unknown> = {}): InternalAxiosRequestConfig {
  return {
    headers: makeHeaders() as unknown as AxiosHeaders,
    ...overrides,
  } as InternalAxiosRequestConfig
}

function make401Error(config?: InternalAxiosRequestConfig): AxiosError {
  return {
    config: config ?? makeRequestConfig(),
    response: { status: 401, data: {} } as AxiosResponse,
    isAxiosError: true,
    message: 'Unauthorized',
    name: 'AxiosError',
    toJSON: () => ({}),
  } as AxiosError
}

beforeEach(async () => {
  // Clear module cache so each test gets fresh module-level state
  vi.resetModules()

  // Clear localStorage
  localStorage.clear()

  mockApiInstance = createMockApi()
  mockAxiosPost = vi.fn()

  // Mock axios before importing the module
  vi.doMock('axios', () => {
    const create = vi.fn(() => {
      // Make the instance callable (for retry: api(originalRequest))
      const callable = Object.assign(mockApiInstance.__call, mockApiInstance)
      return callable
    })
    return {
      default: { create, post: mockAxiosPost },
    }
  })

  // Import the module — this triggers interceptor registration
  await import('../axios')

  // Capture the interceptor callbacks
  const reqCall = mockApiInstance.interceptors.request.use.mock.calls[0]
  requestInterceptor = reqCall[0]

  const resCall = mockApiInstance.interceptors.response.use.mock.calls[0]
  responseSuccessInterceptor = resCall[0]
  responseErrorInterceptor = resCall[1]
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Axios request interceptor', () => {
  it('attaches Authorization header when access_token exists', () => {
    localStorage.setItem('access_token', 'test-token-123')
    const config = makeRequestConfig()
    const result = requestInterceptor(config)
    expect(result.headers.Authorization).toBe('Bearer test-token-123')
  })

  it('does not attach Authorization header when no token', () => {
    const config = makeRequestConfig()
    const result = requestInterceptor(config)
    expect(result.headers.Authorization).toBeUndefined()
  })
})

describe('Axios response interceptor', () => {
  it('passes through successful responses', () => {
    const response = { data: { id: 1 }, status: 200 } as AxiosResponse
    expect(responseSuccessInterceptor(response)).toBe(response)
  })

  describe('non-401 errors', () => {
    it('extracts detail from response body', async () => {
      const error = {
        config: makeRequestConfig(),
        response: { status: 400, data: { detail: 'Bad input' } } as AxiosResponse,
        message: 'Request failed',
        isAxiosError: true,
        name: 'AxiosError',
        toJSON: () => ({}),
      } as AxiosError

      await expect(responseErrorInterceptor(error)).rejects.toThrow('Bad input')
    })

    it('falls back to error.message when no detail', async () => {
      const error = {
        config: makeRequestConfig(),
        response: { status: 500, data: {} } as AxiosResponse,
        message: 'Server error',
        isAxiosError: true,
        name: 'AxiosError',
        toJSON: () => ({}),
      } as AxiosError

      await expect(responseErrorInterceptor(error)).rejects.toThrow('Server error')
    })

    it('falls back to generic message when no detail or message', async () => {
      const error = {
        config: makeRequestConfig(),
        response: { status: 500, data: {} } as AxiosResponse,
        message: '',
        isAxiosError: true,
        name: 'AxiosError',
        toJSON: () => ({}),
      } as AxiosError

      await expect(responseErrorInterceptor(error)).rejects.toThrow('An unexpected error occurred')
    })
  })

  describe('401 token refresh flow', () => {
    it('clears tokens and redirects when no refresh_token exists', async () => {
      localStorage.setItem('access_token', 'expired')
      // No refresh_token set

      Object.defineProperty(window, 'location', {
        value: { pathname: '/catalog', href: '/catalog' },
        writable: true,
        configurable: true,
      })

      const error = make401Error()
      await expect(responseErrorInterceptor(error)).rejects.toBeDefined()

      expect(localStorage.getItem('access_token')).toBeNull()
      expect(localStorage.getItem('refresh_token')).toBeNull()
    })

    it('does not redirect when already on /login', async () => {
      localStorage.setItem('access_token', 'expired')

      const hrefSetter = vi.fn()
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/login',
          get href() { return '/login' },
          set href(v: string) { hrefSetter(v) },
        },
        writable: true,
        configurable: true,
      })

      const error = make401Error()
      await expect(responseErrorInterceptor(error)).rejects.toBeDefined()
      expect(hrefSetter).not.toHaveBeenCalled()
    })

    it('refreshes token and retries the original request on success', async () => {
      localStorage.setItem('access_token', 'expired')
      localStorage.setItem('refresh_token', 'valid-refresh')

      mockAxiosPost.mockResolvedValueOnce({
        data: {
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          token_type: 'bearer',
        },
      })

      const retryResponse = { data: { ok: true }, status: 200 }
      mockApiInstance.__call.mockResolvedValueOnce(retryResponse)

      const config = makeRequestConfig()
      const error = make401Error(config)

      const result = await responseErrorInterceptor(error)

      expect(result).toBe(retryResponse)
      expect(localStorage.getItem('access_token')).toBe('new-access')
      expect(localStorage.getItem('refresh_token')).toBe('new-refresh')
      expect(mockAxiosPost).toHaveBeenCalledWith('/api/v1/auth/refresh', {
        refresh_token: 'valid-refresh',
      })
    })

    it('clears tokens when refresh fails', async () => {
      localStorage.setItem('access_token', 'expired')
      localStorage.setItem('refresh_token', 'bad-refresh')

      Object.defineProperty(window, 'location', {
        value: { pathname: '/catalog', href: '/catalog' },
        writable: true,
        configurable: true,
      })

      mockAxiosPost.mockRejectedValueOnce(new Error('Refresh failed'))

      const error = make401Error()
      await expect(responseErrorInterceptor(error)).rejects.toThrow('Refresh failed')

      expect(localStorage.getItem('access_token')).toBeNull()
      expect(localStorage.getItem('refresh_token')).toBeNull()
    })

    it('does not retry when _retry flag is already set', async () => {
      const config = makeRequestConfig({ _retry: true }) as InternalAxiosRequestConfig & { _retry: boolean }
      const error = {
        config,
        response: { status: 401, data: {} } as AxiosResponse,
        message: 'Unauthorized',
        isAxiosError: true,
        name: 'AxiosError',
        toJSON: () => ({}),
      } as AxiosError

      // Should fall through to the non-401 error path
      await expect(responseErrorInterceptor(error)).rejects.toThrow('Unauthorized')
      expect(mockAxiosPost).not.toHaveBeenCalled()
    })
  })
})
