const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let logoutCallback: (() => void) | null = null;

export const setLogoutCallback = (callback: () => void) => {
  logoutCallback = callback;
};

const getToken = (): string | null => localStorage.getItem('onlybae:user:jwt');

export interface ApiResponse<T = unknown> {
  statusCode: number;
  message: string;
  data: T;
}

async function request<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });

  if (res.status === 401) {
    logoutCallback?.();
    throw new Error('Unauthorized');
  }

  const json = await res.json();
  if (res.status >= 400) throw new Error(json.message || 'Request failed');
  return json;
}

// User API
export const userApi = {
  getProfile: () => request('/api/user/profile'),
  updateProfile: (data: { name?: string; avatarUrl?: string }) =>
    request('/api/user/profile', { method: 'PUT', body: JSON.stringify(data) }),

  getTags: () => request<{ id: string; name: string }[]>('/api/user/tags'),

  browseContent: (params: { page?: number; limit?: number; type?: string; tag?: string; creatorId?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.type) qs.set('type', params.type);
    if (params.tag) qs.set('tag', params.tag);
    if (params.creatorId) qs.set('creatorId', params.creatorId);
    return request(`/api/user/content?${qs}`);
  },

  getCreatorProfile: (id: string) => request<any>(`/api/user/creators/${id}`),

  getContentDetail: (id: string) => request(`/api/user/content/${id}`),
  getContentItems: (id: string) => request(`/api/user/content/${id}/items`),
  unlockContent: (id: string) =>
    request(`/api/user/content/${id}/unlock`, { method: 'POST' }),

  getBalance: () => request('/api/user/balance'),

  createTopup: (amountUsd: number) =>
    request<{ checkoutUrl: string; orderId: string; amountCoins: string; tokensAwarded: number }>(
      '/api/user/topup/create',
      { method: 'POST', body: JSON.stringify({ amountUsd }) }
    ),

  listTopupOrders: () =>
    request<{
      items: { id: string; amountCents: number; amountCoins: string | null; tokensAwarded: number; coinSymbol: string | null; chainId: string | null; txHash: string | null; status: string; createdAt: string }[];
      tokensPerUsd: number;
      minDepositUsd: number;
      stableCoin: string;
    }>('/api/user/topup/orders'),

  getTopupOrder: (id: string) =>
    request<{ id: string; amountCents: number; amountCoins: string | null; tokensAwarded: number; coinSymbol: string | null; status: string; createdAt: string }>(
      `/api/user/topup/orders/${id}`
    ),

  getMembershipPlans: () =>
    request<{ plans: { key: string; label: string; priceCents: number; durationDays: number | null }[] }>(
      '/api/user/membership/plans'
    ),

  subscribeMembership: (plan: 'yearly' | 'lifetime') =>
    request<{ checkoutUrl: string; orderId: string; plan: string }>(
      '/api/user/membership/subscribe',
      { method: 'POST', body: JSON.stringify({ plan }) }
    ),

  getTransactions: (params: { page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    return request(`/api/user/transactions?${qs}`);
  },

  getComments: (contentId: string, params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return request<any>(`/api/user/content/${contentId}/comments?${qs}`);
  },
  addComment: (contentId: string, text: string) =>
    request<any>(`/api/user/content/${contentId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }),
  toggleLike: (contentId: string) =>
    request<any>(`/api/user/content/${contentId}/like`, { method: 'POST' }),
  toggleFavorite: (contentId: string) =>
    request<any>(`/api/user/content/${contentId}/favorite`, { method: 'POST' }),
  listFavorites: (params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return request<any>(`/api/user/favorites?${qs}`);
  },
  listUnlocked: (params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return request<any>(`/api/user/unlocked?${qs}`);
  },
  browseSeries: (params?: { page?: number; limit?: number; type?: 'normal' | 'reels' | 'comic'; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.type) qs.set('type', params.type);
    if (params?.q) qs.set('q', params.q);
    return request<any>(`/api/user/series?${qs}`);
  },
  getSeriesDetail: (id: string) => request<any>(`/api/user/series/${id}`),
  unlockSeries: (seriesId: string) =>
    request<any>(`/api/user/series/${seriesId}/unlock`, { method: 'POST' }),
  browseReels: (params?: { page?: number; limit?: number; seriesId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.seriesId) qs.set('seriesId', params.seriesId);
    return request<{ items: ReelItem[]; total: number; page: number; limit: number }>(`/api/user/reels?${qs}`);
  },
  getCdnCookies: () => request('/api/user/cdn-cookies'),
};

export interface ReelItem {
  id: string;
  title: string;
  description: string | null;
  tokenPrice: number;
  isFree: boolean;
  isUnlocked: boolean;
  isSeriesUnlocked: boolean;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  favorited: boolean;
  creator: { id: string; name: string; avatarUrl?: string };
  series: { id: string; title: string; bundlePrice: number | null } | null;
  episodeNumber: number | null;
  createdAt: string;
  coverUrl: string | null;
  video: {
    url: string | null;
    locked: boolean;
    width: number | null;
    height: number | null;
    durationSec: number | null;
    orientation: 'portrait' | 'landscape' | 'square' | null;
  } | null;
}
