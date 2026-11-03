export type PlatformId = 'codeforces' | 'codechef' | 'leetcode';

export type ContestStatus = 'upcoming' | 'ongoing' | 'completed';

export interface Contest {
  id: string;
  platform: PlatformId;
  external_id: string;
  name: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  contest_url: string;
  status: ContestStatus;
  source_updated_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContestListResponse {
  items: Contest[];
  total: number;
  limit: number;
  offset: number;
}

export interface PlatformStatus {
  platform: PlatformId;
  name: string;
  health: 'healthy' | 'degraded' | 'error' | 'unknown';
  last_successful_refresh: string | null;
  last_attempted_refresh: string | null;
  latest_error: string | null;
  contest_count: number;
  is_stale: boolean;
}

export interface ContestFilterParams {
  platform?: PlatformId | 'all';
  status?: ContestStatus | 'all';
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  sort?: 'start_time_asc' | 'start_time_desc' | 'name_asc' | 'name_desc';
}
