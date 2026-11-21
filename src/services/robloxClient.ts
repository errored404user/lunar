import type {
  CatalogFilters,
  CatalogItem,
  CommunityGroup,
  GameServer,
  RobloxAccount,
  RobloxGame,
  RobloxPlayer,
} from '../types/lunar';

export async function fetchLiveRobloxGames(): Promise<RobloxGame[]> {
  const res = await fetch('/api/roblox/games');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { games?: Array<Omit<RobloxGame, 'servers'>> };
  return (data.games ?? []).map((g) => ({
    ...g,
    servers: [],
  }));
}

export async function searchLiveRobloxGames(query: string): Promise<RobloxGame[]> {
  const params = new URLSearchParams({ q: query });
  const res = await fetch(`/api/roblox/games/search?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { games?: Array<Omit<RobloxGame, 'servers'>> };
  return (data.games ?? []).map((g) => ({
    ...g,
    servers: [],
  }));
}

export async function fetchLiveRobloxServers(placeId: number): Promise<GameServer[]> {
  const res = await fetch(`/api/roblox/servers/${placeId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { servers?: GameServer[] };
  return data.servers ?? [];
}

export async function searchLiveRobloxPlayers(query: string): Promise<RobloxPlayer[]> {
  const params = new URLSearchParams({ q: query });
  const res = await fetch(`/api/roblox/players?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { players?: RobloxPlayer[] };
  return data.players ?? [];
}

export interface LiveRobloxPresence {
  userId: number;
  status: 'online' | 'in-game' | 'offline';
  presenceLabel: string;
  lastLocation?: string;
  placeId?: number;
  universeId?: number;
  gameId?: string;
}

export async function fetchLiveRobloxPresence(
  userIds: number[],
): Promise<Record<string, LiveRobloxPresence>> {
  if (userIds.length === 0) return {};
  const res = await fetch('/api/roblox/presence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userIds }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { presences?: Record<string, LiveRobloxPresence> };
  return data.presences ?? {};
}

export async function resolveRobloxFriendsBatch(
  identifiers: string | string[],
): Promise<{ friends: RobloxPlayer[]; notFound: string[] }> {
  const res = await fetch('/api/roblox/friends/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifiers }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    friends?: RobloxPlayer[];
    notFound?: string[];
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `Could not resolve Roblox friends (HTTP ${res.status})`);
  }
  return {
    friends: data.friends ?? [],
    notFound: data.notFound ?? [],
  };
}

export async function fetchLiveRobloxCatalog(
  filters: Pick<CatalogFilters, 'query' | 'category' | 'activeTag' | 'sort' | 'minPrice' | 'maxPrice' | 'creatorQuery'>,
): Promise<{ items: CatalogItem[]; rateLimited: boolean }> {
  const params = new URLSearchParams();
  const effectiveKeyword = [filters.query.trim(), filters.activeTag ?? '']
    .filter(Boolean)
    .join(' ');
  if (effectiveKeyword) params.set('q', effectiveKeyword);
  if (filters.category && filters.category !== 'All') params.set('category', filters.category);
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.minPrice.trim()) params.set('minPrice', filters.minPrice.trim());
  if (filters.maxPrice.trim()) params.set('maxPrice', filters.maxPrice.trim());
  if (filters.creatorQuery.trim()) params.set('creator', filters.creatorQuery.trim());

  const res = await fetch(`/api/roblox/catalog?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { items?: CatalogItem[]; rateLimited?: boolean };
  return {
    items: data.items ?? [],
    rateLimited: Boolean(data.rateLimited),
  };
}

export async function fetchLiveRobloxGroups(query = 'Roblox'): Promise<CommunityGroup[]> {
  const params = new URLSearchParams({ q: query });
  const res = await fetch(`/api/roblox/groups?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { groups?: CommunityGroup[] };
  return data.groups ?? [];
}

export interface ResolvedRobloxAccountPayload {
  account: RobloxAccount;
  favoriteGames: RobloxGame[];
  groups: CommunityGroup[];
  friends?: RobloxPlayer[];
  friendRequests?: Array<{
    id: string;
    playerId: string;
    robloxUserId?: number;
    displayName: string;
    username: string;
    avatarStyle: RobloxAccount['avatarStyle'];
    avatarUrl?: string;
    sentDate: string;
  }>;
}

export async function resolveLiveRobloxAccount(
  identifier: string,
): Promise<ResolvedRobloxAccountPayload> {
  const params = new URLSearchParams({ identifier: identifier.trim() });
  const res = await fetch(`/api/roblox/account/resolve?${params.toString()}`);
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    account?: RobloxAccount;
    favoriteGames?: Array<Omit<RobloxGame, 'servers'>>;
    groups?: CommunityGroup[];
  };
  if (!res.ok || !data.account) {
    throw new Error(data.error || `Could not find Roblox account (HTTP ${res.status})`);
  }
  return {
    account: data.account,
    favoriteGames: (data.favoriteGames ?? []).map((g) => ({ ...g, servers: [] })),
    groups: data.groups ?? [],
  };
}

export interface QuickLoginStartResponse {
  quickSessionId: string;
  code: string;
  formattedCode: string;
  qrDataUrl?: string;
  expiresAt: number;
  confirmUrl: string;
}

export async function startRobloxQuickLogin(): Promise<QuickLoginStartResponse> {
  const res = await fetch('/api/roblox/auth/quick-login/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = (await res.json().catch(() => ({}))) as QuickLoginStartResponse & { error?: string };
  if (!res.ok || !data.quickSessionId) {
    throw new Error(data.error || 'Could not start Roblox Quick Login.');
  }
  return data;
}

export interface QuickLoginPollResponse {
  status: string;
  completed: boolean;
  accountName?: string;
  accountPictureUrl?: string;
  sessionToken?: string;
  payload?: ResolvedRobloxAccountPayload;
}

export async function pollRobloxQuickLogin(
  quickSessionId: string,
): Promise<QuickLoginPollResponse> {
  const res = await fetch('/api/roblox/auth/quick-login/poll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quickSessionId }),
  });
  const data = (await res.json().catch(() => ({}))) as QuickLoginPollResponse & {
    error?: string;
    payload?: {
      account: RobloxAccount;
      favoriteGames?: Array<Omit<RobloxGame, 'servers'>>;
      groups?: CommunityGroup[];
      friends?: RobloxPlayer[];
      friendRequests?: ResolvedRobloxAccountPayload['friendRequests'];
    };
  };
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return {
    status: data.status ?? 'Created',
    completed: Boolean(data.completed),
    accountName: data.accountName,
    accountPictureUrl: data.accountPictureUrl,
    sessionToken: data.sessionToken,
    payload: data.payload
      ? {
          account: data.payload.account,
          favoriteGames: (data.payload.favoriteGames ?? []).map((g) => ({ ...g, servers: [] })),
          groups: data.payload.groups ?? [],
          friends: data.payload.friends,
          friendRequests: data.payload.friendRequests,
        }
      : undefined,
  };
}

export async function signInWithRobloxCookie(
  cookie: string,
): Promise<{ sessionToken: string; payload: ResolvedRobloxAccountPayload }> {
  const res = await fetch('/api/roblox/auth/cookie', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cookie }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    sessionToken?: string;
    account?: RobloxAccount;
    favoriteGames?: Array<Omit<RobloxGame, 'servers'>>;
    groups?: CommunityGroup[];
    friends?: RobloxPlayer[];
    friendRequests?: ResolvedRobloxAccountPayload['friendRequests'];
  };
  if (!res.ok || !data.account || !data.sessionToken) {
    throw new Error(data.error || `Could not sign in with cookie (HTTP ${res.status})`);
  }
  return {
    sessionToken: data.sessionToken,
    payload: {
      account: data.account,
      favoriteGames: (data.favoriteGames ?? []).map((g) => ({ ...g, servers: [] })),
      groups: data.groups ?? [],
      friends: data.friends,
      friendRequests: data.friendRequests,
    },
  };
}

export async function syncAuthenticatedRobloxAccount(
  sessionToken: string,
): Promise<ResolvedRobloxAccountPayload> {
  const res = await fetch('/api/roblox/auth/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    account?: RobloxAccount;
    favoriteGames?: Array<Omit<RobloxGame, 'servers'>>;
    groups?: CommunityGroup[];
    friends?: RobloxPlayer[];
    friendRequests?: ResolvedRobloxAccountPayload['friendRequests'];
  };
  if (!res.ok || !data.account) {
    throw new Error(data.error || `Could not sync Roblox session (HTTP ${res.status})`);
  }
  return {
    account: data.account,
    favoriteGames: (data.favoriteGames ?? []).map((g) => ({ ...g, servers: [] })),
    groups: data.groups ?? [],
    friends: data.friends,
    friendRequests: data.friendRequests,
  };
}

export async function logoutRobloxSession(sessionToken: string): Promise<void> {
  await fetch('/api/roblox/auth/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
  }).catch(() => {});
}

export async function startRobloxBioVerification(userId: number): Promise<{
  userId: number;
  code: string;
  expiresAt: number;
  profileSettingsUrl: string;
}> {
  const res = await fetch('/api/roblox/account/verify/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    userId?: number;
    code?: string;
    expiresAt?: number;
    profileSettingsUrl?: string;
    error?: string;
  };
  if (!res.ok || !data.code) {
    throw new Error(data.error || 'Could not start bio verification.');
  }
  return {
    userId: data.userId ?? userId,
    code: data.code,
    expiresAt: data.expiresAt ?? Date.now() + 15 * 60_000,
    profileSettingsUrl: data.profileSettingsUrl ?? 'https://www.roblox.com/my/account#!/info',
  };
}

export async function checkRobloxBioVerification(userId: number): Promise<{
  verified: boolean;
  error?: string;
}> {
  const res = await fetch('/api/roblox/account/verify/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    verified?: boolean;
    error?: string;
  };
  if (!res.ok && !data.error) {
    throw new Error(`HTTP ${res.status}`);
  }
  return {
    verified: Boolean(data.verified),
    error: data.error,
  };
}
