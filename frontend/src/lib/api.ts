import type { GardenPreferences, DesignResult, SuggestedObject, SegmentedObject, AuthUser, Project, ProjectDetail, ProductGroup, Product, ProductImage } from './types';

const API = '/api';

let _token: string | null = null;

export function setAuthToken(token: string | null) { _token = token; }
export function getAuthToken() { return _token; }

function authHeaders(): Record<string, string> {
  return _token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${_token}` }
    : { 'Content-Type': 'application/json' };
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function login(accountname: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountname, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error((err as { error: string }).error);
  }
  return res.json();
}

export async function getMe(): Promise<AuthUser> {
  const res = await fetch(`${API}/auth/me`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Not authenticated');
  return res.json();
}

export async function forgotPassword(email: string): Promise<void> {
  await fetch(`${API}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

export async function verifyPasswordToken(token: string): Promise<{ type: string; firstname: string }> {
  const res = await fetch(`${API}/auth/verify-token?token=${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error('Invalid or expired link');
  return res.json();
}

export async function setPassword(token: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${API}/auth/set-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed' }));
    throw new Error((err as { error: string }).error);
  }
  return res.json();
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export async function adminGetUsers(): Promise<AuthUser[]> {
  const res = await fetch(`${API}/admin/users`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch users');
  const data = await res.json() as { users: AuthUser[] };
  return data.users;
}

export async function adminCreateUser(data: {
  firstname: string; lastname: string; accountname: string; email: string; credits: number;
}): Promise<AuthUser> {
  const res = await fetch(`${API}/admin/users`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed' }));
    throw new Error((err as { error: string }).error);
  }
  const d = await res.json() as { user: AuthUser };
  return d.user;
}

export async function adminUpdateUser(id: number, data: Partial<{ firstname: string; lastname: string; email: string; credits: number; password: string }>): Promise<AuthUser> {
  const res = await fetch(`${API}/admin/users/${id}`, {
    method: 'PATCH', headers: authHeaders(), body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update user');
  const d = await res.json() as { user: AuthUser };
  return d.user;
}

export async function adminAddCredits(id: number, amount: number): Promise<AuthUser> {
  const res = await fetch(`${API}/admin/users/${id}/credits`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error('Failed to add credits');
  const d = await res.json() as { user: AuthUser };
  return d.user;
}

export async function adminResendInvite(id: number): Promise<void> {
  await fetch(`${API}/admin/users/${id}/resend-invite`, {
    method: 'POST', headers: authHeaders(),
  });
}

export async function adminDeleteUser(id: number): Promise<void> {
  await fetch(`${API}/admin/users/${id}`, { method: 'DELETE', headers: authHeaders() });
}

export async function adminGetUserProductGroups(userId: number): Promise<number[]> {
  const res = await fetch(`${API}/admin/users/${userId}/product-groups`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed');
  const d = await res.json() as { groupIds: number[] };
  return d.groupIds;
}

export async function adminSetUserProductGroups(userId: number, groupIds: number[]): Promise<void> {
  await fetch(`${API}/admin/users/${userId}/product-groups`, {
    method: 'PUT', headers: authHeaders(), body: JSON.stringify({ groupIds }),
  });
}

export async function adminGetProductGroups(): Promise<ProductGroup[]> {
  const res = await fetch(`${API}/admin/product-groups`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed');
  const d = await res.json() as { groups: (Omit<ProductGroup, 'products'> & { products?: Product[] })[] };
  return d.groups.map(g => ({ ...g, products: g.products ?? [] }));
}

export async function adminGetProductGroup(id: number): Promise<ProductGroup> {
  const res = await fetch(`${API}/admin/product-groups/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed');
  const d = await res.json() as { group: ProductGroup };
  return d.group;
}

export async function adminCreateProductGroup(data: { name: string; description: string; category: string; image: string | null }): Promise<ProductGroup> {
  const res = await fetch(`${API}/admin/product-groups`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed');
  const d = await res.json() as { group: ProductGroup };
  return { ...d.group, products: [] };
}

export async function adminUpdateProductGroup(id: number, data: Partial<{ name: string; description: string; category: string; image: string | null }>): Promise<void> {
  await fetch(`${API}/admin/product-groups/${id}`, {
    method: 'PATCH', headers: authHeaders(), body: JSON.stringify(data),
  });
}

export async function adminDeleteProductGroup(id: number): Promise<void> {
  await fetch(`${API}/admin/product-groups/${id}`, { method: 'DELETE', headers: authHeaders() });
}

export async function adminCreateProduct(groupId: number, data: { name: string; description: string }): Promise<Product> {
  const res = await fetch(`${API}/admin/product-groups/${groupId}/products`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed');
  const d = await res.json() as { product: Product };
  return d.product;
}

export async function adminUpdateProduct(id: number, data: Partial<{ name: string; description: string }>): Promise<void> {
  await fetch(`${API}/admin/products/${id}`, {
    method: 'PATCH', headers: authHeaders(), body: JSON.stringify(data),
  });
}

export async function adminDeleteProduct(id: number): Promise<void> {
  await fetch(`${API}/admin/products/${id}`, { method: 'DELETE', headers: authHeaders() });
}

export async function adminAddProductImage(productId: number, image: string): Promise<ProductImage> {
  const res = await fetch(`${API}/admin/products/${productId}/images`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ image }),
  });
  if (!res.ok) throw new Error('Failed');
  const d = await res.json() as { image: ProductImage };
  return d.image;
}

export async function adminDeleteProductImage(id: number): Promise<void> {
  await fetch(`${API}/admin/product-images/${id}`, { method: 'DELETE', headers: authHeaders() });
}

export async function getUserProductGroups(): Promise<ProductGroup[]> {
  const res = await fetch(`${API}/product-groups`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed');
  const d = await res.json() as { groups: ProductGroup[] };
  return d.groups;
}

// ─── Projects ────────────────────────────────────────────────────────────────

function mapProject(p: Record<string, unknown>): Project {
  return {
    id: p.id as number,
    name: p.name as string,
    latestImage: p.latest_image as string,
    preferences: p.preferences ? JSON.parse(p.preferences as string) as GardenPreferences : null,
    createdAt: p.created_at as number,
    updatedAt: p.updated_at as number,
  };
}

export async function getProjects(): Promise<Project[]> {
  const res = await fetch(`${API}/projects`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch projects');
  const data = await res.json() as { projects: Record<string, unknown>[] };
  return data.projects.map(mapProject);
}

export async function createProject(data: {
  name: string; originalImage: string; latestImage: string; preferences: GardenPreferences;
}): Promise<Project> {
  const res = await fetch(`${API}/projects`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ name: data.name, original_image: data.originalImage, latest_image: data.latestImage, preferences: data.preferences }),
  });
  if (!res.ok) throw new Error('Failed to create project');
  const d = await res.json() as { project: Record<string, unknown> };
  return mapProject(d.project);
}

export async function getProject(id: number): Promise<ProjectDetail> {
  const res = await fetch(`${API}/projects/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch project');
  const d = await res.json() as { project: Record<string, unknown> & { history: Record<string, unknown>[] } };
  const p = d.project;
  return {
    ...mapProject(p),
    originalImage: p.original_image as string,
    history: (p.history as Record<string, unknown>[]).map(h => ({
      id: h.id as number,
      imageUrl: h.image_url as string,
      type: h.type as string,
      label: h.label as string,
      createdAt: h.created_at as number,
    })),
  };
}

export async function updateProject(id: number, data: { latestImage?: string; preferences?: GardenPreferences; name?: string }): Promise<void> {
  await fetch(`${API}/projects/${id}`, {
    method: 'PATCH', headers: authHeaders(),
    body: JSON.stringify({ latest_image: data.latestImage, preferences: data.preferences, name: data.name }),
  });
}

export async function addProjectHistory(id: number, entry: { imageUrl: string; type: string; label: string }): Promise<void> {
  await fetch(`${API}/projects/${id}/history`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ image_url: entry.imageUrl, type: entry.type, label: entry.label }),
  });
}

export async function deleteProject(id: number): Promise<void> {
  await fetch(`${API}/projects/${id}`, { method: 'DELETE', headers: authHeaders() });
}

// ─── Garden ──────────────────────────────────────────────────────────────────

export async function generateDesign(
  imageDataUrl: string,
  preferences: GardenPreferences
): Promise<DesignResult & { creditsRemaining?: number }> {
  const res = await fetch(`${API}/design`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ imageDataUrl, preferences }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((err as { error: string }).error || 'Generation failed');
  }
  return res.json();
}

export async function applyInstruction(imageDataUrl: string, instruction: string): Promise<string> {
  const res = await fetch(`${API}/apply`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ imageDataUrl, instruction }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((err as { error: string }).error || 'Apply failed');
  }
  const data = await res.json() as { imageUrl: string; creditsRemaining?: number };
  return data.imageUrl;
}

export async function segmentImage(imageDataUrl: string): Promise<SegmentedObject[]> {
  const res = await fetch(`${API}/segment`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ imageDataUrl }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Scan failed' }));
    throw new Error((err as { error: string }).error || 'Scan failed');
  }
  const data = await res.json() as { objects: SegmentedObject[] };
  return data.objects ?? [];
}

export async function placeObjectImage(
  gardenImageDataUrl: string,
  objectImageDataUrl: string,
  context?: string
): Promise<string> {
  const res = await fetch(`${API}/place-image`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ gardenImageDataUrl, objectImageDataUrl, context }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((err as { error: string }).error || 'Placement failed');
  }
  const data = await res.json() as { imageUrl: string; creditsRemaining?: number };
  return data.imageUrl;
}

export async function refreshInsights(
  imageDescription: string,
  preferences: GardenPreferences
): Promise<{ harmonyLevel: number; suggestions: string[]; cornerNote: string; suggestedObject: SuggestedObject }> {
  const res = await fetch(`${API}/insights`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ imageDescription, preferences }),
  });
  if (!res.ok) throw new Error('Insights refresh failed');
  return res.json();
}

export interface GardenSuggestion {
  id: string;
  title: string;
  description: string;
  instruction: string;
}

export async function getSuggestions(imageDataUrl: string): Promise<GardenSuggestion[]> {
  const res = await fetch(`${API}/suggestions`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ imageDataUrl }),
  });
  if (!res.ok) return [];
  const data = await res.json() as { suggestions: GardenSuggestion[] };
  return data.suggestions ?? [];
}
