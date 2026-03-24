const API_BASE = 'http://localhost:8000/api/v1';

let adminToken: string | null = null;

/**
 * Generate a unique suffix for test data names to avoid UNIQUE constraint conflicts.
 */
export function uniqueSuffix(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
}

async function getAdminToken(): Promise<string> {
  if (adminToken) return adminToken;
  const formData = new URLSearchParams();
  formData.append('username', 'admin');
  formData.append('password', 'AdminPass123!');
  const res = await fetch(`${API_BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  adminToken = data.access_token;
  return adminToken!;
}

export function resetAdminToken(): void {
  adminToken = null;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAdminToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function apiGet(path: string): Promise<any> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost(path: string, body: any): Promise<any> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function apiPatch(path: string, body: any): Promise<any> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`DELETE ${path} failed: ${res.status}`);
  }
}

export async function createUser(data: {
  username: string;
  full_name: string;
  email: string;
  role: string;
  password: string;
}): Promise<any> {
  return apiPost('/users', data);
}

export async function createLocator(data: {
  name: string;
  description?: string;
}): Promise<any> {
  return apiPost('/locators', data);
}

export async function createSublocator(
  locatorId: number,
  data: { name: string; description?: string },
): Promise<any> {
  return apiPost(`/locators/${locatorId}/sublocators`, data);
}

export async function createItem(data: {
  name: string;
  category_id: number;
  unit_of_measure: string;
  description?: string;
}): Promise<any> {
  return apiPost('/items', data);
}

export async function createInventory(data: {
  item_id: number;
  locator_id: number;
  sublocator_id?: number | null;
  quantity: number;
  min_quantity?: number;
}): Promise<any> {
  return apiPost('/inventory', data);
}

export async function createCheckout(data: {
  inventory_id: number;
  quantity: number;
  due_date: string;
  notes?: string;
  user_id?: number;
}): Promise<any> {
  return apiPost('/checkouts', data);
}

export async function returnCheckout(
  checkoutId: number,
  data: { quantity: number; notes?: string },
): Promise<any> {
  return apiPost(`/checkouts/${checkoutId}/return`, data);
}

export async function getCategories(): Promise<any> {
  return apiGet('/categories?limit=100');
}

export async function uploadItemImage(
  itemId: number,
  imageBytes: Buffer,
  filename: string = 'test.jpg',
  contentType: string = 'image/jpeg',
): Promise<any> {
  const token = await getAdminToken();
  const boundary = '----FormBoundary' + Date.now().toString(36);
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`,
    ),
    imageBytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const res = await fetch(`${API_BASE}/items/${itemId}/image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST /items/${itemId}/image failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function deleteItemImage(itemId: number): Promise<void> {
  return apiDelete(`/items/${itemId}/image`);
}

export async function createCategory(data: {
  name: string;
  description?: string;
}): Promise<any> {
  return apiPost('/categories', data);
}

export async function updateCategory(
  id: number,
  data: { name?: string; description?: string },
): Promise<any> {
  return apiPatch(`/categories/${id}`, data);
}

export async function deleteCategory(id: number): Promise<void> {
  return apiDelete(`/categories/${id}`);
}

export async function waitForBackend(maxRetries = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch('http://localhost:8000/health');
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Backend did not become ready');
}

export async function waitForFrontend(maxRetries = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch('http://localhost:5173');
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Frontend did not become ready');
}
