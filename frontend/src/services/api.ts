import { Contest, ContestFilterParams, ContestListResponse, PlatformStatus } from '../types/contest';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export async function fetchContests(params: ContestFilterParams = {}): Promise<ContestListResponse> {
  const query = new URLSearchParams();

  if (params.platform && params.platform !== 'all') {
    query.set('platform', params.platform);
  }
  if (params.status && params.status !== 'all') {
    query.set('status', params.status);
  }
  if (params.from) {
    query.set('from', params.from);
  }
  if (params.to) {
    query.set('to', params.to);
  }
  if (params.limit !== undefined) {
    query.set('limit', String(params.limit));
  }
  if (params.offset !== undefined) {
    query.set('offset', String(params.offset));
  }
  if (params.sort) {
    query.set('sort', params.sort);
  }

  const url = `${API_BASE}/contests?${query.toString()}`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch contests (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function fetchNextContest(): Promise<Contest | null> {
  const response = await fetch(`${API_BASE}/contests/next`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch next contest (${response.status})`);
  }

  const data = await response.json();
  return data;
}

export async function fetchContestById(id: string): Promise<Contest> {
  const response = await fetch(`${API_BASE}/contests/${encodeURIComponent(id)}`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch contest ${id} (${response.status})`);
  }

  return response.json();
}

export async function fetchPlatformStatuses(): Promise<PlatformStatus[]> {
  const response = await fetch(`${API_BASE}/sources/status`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch platform status (${response.status})`);
  }

  return response.json();
}

export async function triggerAdminRefresh(
  platform?: string,
  adminKey: string = 'dev-admin-secret-key-change-in-prod'
): Promise<any> {
  const query = platform ? `?platform=${encodeURIComponent(platform)}` : '';
  const response = await fetch(`${API_BASE}/admin/refresh${query}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'X-Admin-Key': adminKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Refresh failed (${response.status}): ${errorText}`);
  }

  return response.json();
}
