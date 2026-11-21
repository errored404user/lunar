import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import {
  bioContainsVerificationCode,
  computeVoteRatingPct,
  formatQuickLoginCode,
  mapPresenceToPlayerStatus,
  mapRobloxPresenceType,
  parseFriendIdentifiersInput,
  parsePositiveRobloxId,
  parseRobloxIdList,
  parseRobloxUsernameOrId,
  sanitizeRobloSecurityCookie,
  sanitizeRobloxImageUrl,
  sanitizeSearchKeyword,
} from './src/utils/robloxApiHelpers.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BioVerificationChallenge {
  userId: number;
  code: string;
  expiresAt: number;
}
const bioChallengeStore = new Map<number, BioVerificationChallenge>();

// Process-ephemeral AES-256-GCM key for encrypting optional Roblox session tokens in RAM only.
// Tokens never touch disk, browser storage, or logs, and are wiped on sign-out or server restart.
const SESSION_VAULT_KEY = crypto.randomBytes(32);

interface EncryptedRobloxSession {
  userId: number;
  username: string;
  iv: Buffer;
  tag: Buffer;
  ciphertext: Buffer;
  createdAt: number;
}
const encryptedSessionStore = new Map<string, EncryptedRobloxSession>();

function storeEncryptedRobloxSession(userId: number, username: string, cookie: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', SESSION_VAULT_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(cookie, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  encryptedSessionStore.set(token, {
    userId,
    username,
    iv,
    tag,
    ciphertext,
    createdAt: Date.now(),
  });
  // Bound in-memory store size
  if (encryptedSessionStore.size > 100) {
    const oldest = encryptedSessionStore.keys().next().value;
    if (oldest) encryptedSessionStore.delete(oldest);
  }
  return token;
}

function readEncryptedRobloxSession(
  bearerHeader: string | undefined,
): { token: string; userId: number; username: string; cookie: string } | null {
  if (!bearerHeader || !bearerHeader.startsWith('Bearer ')) return null;
  const token = bearerHeader.slice('Bearer '.length).trim();
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;
  const entry = encryptedSessionStore.get(token);
  if (!entry) return null;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', SESSION_VAULT_KEY, entry.iv);
    decipher.setAuthTag(entry.tag);
    const cookie = Buffer.concat([decipher.update(entry.ciphertext), decipher.final()]).toString(
      'utf8',
    );
    return { token, userId: entry.userId, username: entry.username, cookie };
  } catch {
    encryptedSessionStore.delete(token);
    return null;
  }
}

interface QuickLoginEntry {
  code: string;
  privateKey: string;
  expiresAt: number;
}
const quickLoginStore = new Map<string, QuickLoginEntry>();

function extractRobloSecurityFromHeaders(headers: Headers): string | null {
  const rawList =
    typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : headers.get('set-cookie')
        ? [headers.get('set-cookie')!]
        : [];
  for (const header of rawList) {
    const match = header.match(/\.ROBLOSECURITY=([^;]+)/i);
    if (match?.[1]) {
      const clean = sanitizeRobloSecurityCookie(match[1]);
      if (clean) return clean;
    }
  }
  return null;
}

async function fetchRobloxPostWithCsrf(
  url: string,
  payload: Record<string, unknown>,
  cookie?: string,
): Promise<Response> {
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LunarForRoblox/1.0',
  };
  if (cookie) {
    baseHeaders.Cookie = `.ROBLOSECURITY=${cookie}`;
  }
  const body = JSON.stringify(payload);
  const first = await fetch(url, {
    method: 'POST',
    headers: baseHeaders,
    body,
    signal: AbortSignal.timeout(9000),
  });
  if (first.status === 403) {
    const csrf = first.headers.get('x-csrf-token');
    if (csrf) {
      return fetch(url, {
        method: 'POST',
        headers: { ...baseHeaders, 'x-csrf-token': csrf },
        body,
        signal: AbortSignal.timeout(9000),
      });
    }
  }
  return first;
}

async function fetchRobloxAuthedJson<T>(url: string, cookie: string, timeoutMs = 8000): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Cookie: `.ROBLOSECURITY=${cookie}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LunarForRoblox/1.0',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new RobloxHttpError(res.status);
  }
  return (await res.json()) as T;
}

const BIO_WORDS = [
  'orbit',
  'comet',
  'nebula',
  'crater',
  'apollo',
  'eclipse',
  'nova',
  'pulsar',
  'quasar',
  'zenith',
];

function createBioVerificationCode(): string {
  const bytes = crypto.randomBytes(4);
  const word = BIO_WORDS[bytes[0] % BIO_WORDS.length];
  const digits = ((bytes[1] << 8) | bytes[2]) % 9000 + 1000;
  return `lunar-${word}-${digits}`;
}

const DEFAULT_UNIVERSE_IDS = [
  7436755782, // Grow a Garden
  383310974,  // Adopt Me!
  3508322461, // Jujutsu Shenanigans
  1686885941, // Brookhaven RP
  65241,      // Natural Disaster Survival
  703124385,  // Tower of Hell
  111958650,  // Arsenal
  994732206,  // Blox Fruits
  2440500124, // DOORS
  2619619496, // BedWars
];

// Lightweight TTL cache to avoid hitting Roblox API rate limits
interface CacheEntry {
  expiresAt: number;
  payload: unknown;
}
const apiCache = new Map<string, CacheEntry>();
let lastLiveCatalogItems: unknown[] = [];

function getCached<T>(key: string): T | null {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    apiCache.delete(key);
    return null;
  }
  return entry.payload as T;
}

function setCached(key: string, payload: unknown, ttlMs = 45_000): void {
  if (apiCache.size > 200) {
    const firstKey = apiCache.keys().next().value;
    if (firstKey) apiCache.delete(firstKey);
  }
  apiCache.set(key, { payload, expiresAt: Date.now() + ttlMs });
}

class RobloxHttpError extends Error {
  status: number;
  constructor(status: number) {
    super(`Roblox API responded with HTTP ${status}`);
    this.status = status;
  }
}

async function fetchRobloxJson<T>(url: string, timeoutMs = 8000): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'LunarForRoblox/1.0',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new RobloxHttpError(res.status);
  }
  return (await res.json()) as T;
}

function mapGenre(rawGenre?: string): string {
  const g = (rawGenre ?? '').toLowerCase();
  if (g.includes('fight') || g.includes('action')) return 'Fighting';
  if (g.includes('fps') || g.includes('shoot')) return 'FPS';
  if (g.includes('sport')) return 'Sports';
  if (g.includes('obby') || g.includes('platform')) return 'Obby';
  if (g.includes('surviv') || g.includes('horror')) return 'Survival';
  if (g.includes('role') || g.includes('town') || g.includes('social')) return 'Roleplay';
  return 'Simulator';
}

function formatVisits(visits: number): string {
  if (!Number.isFinite(visits) || visits <= 0) return '0';
  if (visits >= 1_000_000_000) return `${(visits / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (visits >= 1_000_000) return `${(visits / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (visits >= 1_000) return `${(visits / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(visits);
}

interface NormalizedRobloxPresence {
  userId: number;
  status: 'online' | 'in-game' | 'offline';
  presenceLabel: string;
  lastLocation?: string;
  placeId?: number;
  universeId?: number;
  gameId?: string;
}

async function fetchRobloxPresenceMap(
  userIds: number[],
): Promise<Map<number, NormalizedRobloxPresence>> {
  const uniqueIds = Array.from(
    new Set(userIds.filter((id) => parsePositiveRobloxId(id) !== null)),
  ).slice(0, 50);
  const map = new Map<number, NormalizedRobloxPresence>();
  if (uniqueIds.length === 0) return map;

  try {
    const res = await fetch('https://presence.roblox.com/v1/presence/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'LunarForRoblox/1.0',
      },
      body: JSON.stringify({ userIds: uniqueIds }),
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return map;
    const data = (await res.json()) as {
      userPresences?: Array<{
        userId: number;
        userPresenceType?: number;
        lastLocation?: string;
        placeId?: number | null;
        rootPlaceId?: number | null;
        universeId?: number | null;
        gameId?: string | null;
      }>;
    };

    for (const p of data.userPresences ?? []) {
      const uid = parsePositiveRobloxId(p.userId);
      if (!uid) continue;
      const status = mapPresenceToPlayerStatus(p.userPresenceType);
      const presenceLabel = mapRobloxPresenceType(p.userPresenceType);
      const placeId = parsePositiveRobloxId(p.rootPlaceId ?? p.placeId) ?? undefined;
      const universeId = parsePositiveRobloxId(p.universeId) ?? undefined;
      const cleanLocation =
        typeof p.lastLocation === 'string' &&
        p.lastLocation.trim() &&
        p.lastLocation.trim().toLowerCase() !== 'website'
          ? p.lastLocation.trim().slice(0, 80)
          : undefined;

      map.set(uid, {
        userId: uid,
        status,
        presenceLabel,
        lastLocation: cleanLocation,
        placeId,
        universeId,
        gameId:
          typeof p.gameId === 'string' && /^[a-zA-Z0-9-]{8,64}$/.test(p.gameId)
            ? p.gameId
            : undefined,
      });
    }
  } catch {
    // Presence API failure falls back gracefully to offline
  }
  return map;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  /* ==================== 1. LIVE GAMES (Details + Votes + Official Icons) ==================== */
  app.get('/api/roblox/games', async (req, res) => {
    try {
      const requested = parseRobloxIdList(req.query.universeIds, 20);
      const universeIds = requested.length > 0 ? requested : DEFAULT_UNIVERSE_IDS;
      const cacheKey = `games:${universeIds.join(',')}`;
      const cached = getCached(cacheKey);
      if (cached) return res.json(cached);

      const idParam = universeIds.join(',');
      const [gamesData, votesData, iconsData, bannersData] = await Promise.all([
        fetchRobloxJson<{ data: Array<Record<string, unknown>> }>(
          `https://games.roblox.com/v1/games?universeIds=${idParam}`,
        ),
        fetchRobloxJson<{ data: Array<{ id: number; upVotes: number; downVotes: number }> }>(
          `https://games.roblox.com/v1/games/votes?universeIds=${idParam}`,
        ).catch(() => ({ data: [] })),
        fetchRobloxJson<{ data: Array<{ targetId: number; imageUrl?: string }> }>(
          `https://thumbnails.roblox.com/v1/games/icons?universeIds=${idParam}&size=512x512&format=Png&isCircular=false`,
        ).catch(() => ({ data: [] })),
        fetchRobloxJson<{
          data: Array<{ universeId: number; thumbnails?: Array<{ imageUrl?: string }> }>;
        }>(
          `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${idParam}&countPerUniverse=1&defaults=true&size=768x432&format=Png&isCircular=false`,
        ).catch(() => ({ data: [] })),
      ]);

      const voteMap = new Map(votesData.data.map((v) => [v.id, v]));
      const iconMap = new Map(
        iconsData.data.map((i) => [i.targetId, sanitizeRobloxImageUrl(i.imageUrl)]),
      );
      const bannerMap = new Map(
        bannersData.data.map((b) => [
          b.universeId,
          sanitizeRobloxImageUrl(b.thumbnails?.[0]?.imageUrl),
        ]),
      );

      const games = (gamesData.data ?? []).map((g, idx) => {
        const universeId = Number(g.id);
        const rootPlaceId = Number(g.rootPlaceId);
        const votes = voteMap.get(universeId);
        const ratingPct = votes ? computeVoteRatingPct(votes.upVotes, votes.downVotes) : 88;
        const creatorObj = (g.creator ?? {}) as { name?: string };
        return {
          id: `rbx-${universeId}`,
          universeId,
          placeId: rootPlaceId,
          title: String(g.name ?? 'Untitled Experience'),
          creator: String(creatorObj.name ?? 'Roblox Creator'),
          thumbnail: iconMap.get(universeId) ?? '',
          bannerImage: bannerMap.get(universeId) ?? undefined,
          genre: mapGenre(String(g.genre_l1 ?? g.genre ?? '')),
          playingCount: Number(g.playing ?? 0),
          ratingPct,
          visitsLabel: formatVisits(Number(g.visits ?? 0)),
          isContinue: idx < 5,
          isFavorite: idx >= 2 && idx <= 6,
          isPartnered: idx === 7,
          description: String(g.description ?? '').slice(0, 320),
          source: 'roblox-live',
        };
      });

      const payload = { source: 'roblox-live', fetchedAt: Date.now(), games };
      setCached(cacheKey, payload, 45_000);
      return res.json(payload);
    } catch (err) {
      return res.status(502).json({
        error: 'Unable to fetch live Roblox games right now.',
        detail: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /* ==================== 2. LIVE GAME SEARCH (apis.roblox.com omni-search) ==================== */
  app.get('/api/roblox/games/search', async (req, res) => {
    try {
      const q = sanitizeSearchKeyword(req.query.q, 60);
      if (!q) {
        return res.json({ source: 'roblox-live', games: [] });
      }
      const cacheKey = `game-search:${q.toLowerCase()}`;
      const cached = getCached(cacheKey);
      if (cached) return res.json(cached);

      const params = new URLSearchParams({
        searchQuery: q,
        sessionId: 'lunar-roblox-client',
        pageType: 'all',
      });
      const searchRes = await fetchRobloxJson<{
        searchResults?: Array<{
          contentGroupType?: string;
          contents?: Array<{
            universeId?: number;
            rootPlaceId?: number;
            name?: string;
            creatorName?: string;
            playerCount?: number;
            totalUpVotes?: number;
            totalDownVotes?: number;
            description?: string;
          }>;
        }>;
      }>(`https://apis.roblox.com/search-api/omni-search?${params.toString()}`);

      const rawGames = (searchRes.searchResults ?? [])
        .filter((group) => group.contentGroupType === 'Game')
        .flatMap((group) => group.contents ?? [])
        .filter((item) => parsePositiveRobloxId(item.universeId) !== null)
        .slice(0, 12);

      const uIds = rawGames.map((g) => g.universeId as number);
      let iconMap = new Map<number, string | null>();
      if (uIds.length > 0) {
        const thumbs = await fetchRobloxJson<{ data: Array<{ targetId: number; imageUrl?: string }> }>(
          `https://thumbnails.roblox.com/v1/games/icons?universeIds=${uIds.join(',')}&size=512x512&format=Png&isCircular=false`,
        ).catch(() => ({ data: [] }));
        iconMap = new Map(thumbs.data.map((t) => [t.targetId, sanitizeRobloxImageUrl(t.imageUrl)]));
      }

      const games = rawGames.map((g) => {
        const universeId = Number(g.universeId);
        return {
          id: `rbx-${universeId}`,
          universeId,
          placeId: Number(g.rootPlaceId ?? 0),
          title: String(g.name ?? 'Roblox Experience'),
          creator: String(g.creatorName ?? 'Roblox Creator'),
          thumbnail: iconMap.get(universeId) ?? '',
          genre: 'Simulator',
          playingCount: Number(g.playerCount ?? 0),
          ratingPct: computeVoteRatingPct(Number(g.totalUpVotes ?? 0), Number(g.totalDownVotes ?? 0)),
          visitsLabel: 'Live',
          description: String(g.description ?? 'Live Roblox experience from Roblox Search API.').slice(0, 280),
          source: 'roblox-live',
        };
      });

      const payload = { source: 'roblox-live', query: q, games };
      setCached(cacheKey, payload, 45_000);
      return res.json(payload);
    } catch (err) {
      return res.status(502).json({
        error: 'Failed to search Roblox experiences.',
        detail: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /* ==================== 3. LIVE PUBLIC SERVERS (games.roblox.com/v1/games/{placeId}/servers/Public) ==================== */
  app.get('/api/roblox/servers/:placeId', async (req, res) => {
    try {
      const placeId = parsePositiveRobloxId(req.params.placeId);
      if (!placeId) {
        return res.status(400).json({ error: 'Invalid Roblox placeId.' });
      }

      const cacheKey = `servers:${placeId}`;
      const cached = getCached(cacheKey);
      if (cached) return res.json(cached);

      const data = await fetchRobloxJson<{
        data?: Array<{
          id: string;
          maxPlayers: number;
          playing: number;
          fps?: number;
          ping?: number;
        }>;
      }>(
        `https://games.roblox.com/v1/games/${placeId}/servers/Public?sortOrder=Desc&limit=10`,
      );

      const servers = (data.data ?? []).map((srv, idx) => ({
        id: String(srv.id),
        region: `Public Server #${idx + 1} · ${String(srv.id).slice(0, 8)}`,
        pingMs: Math.max(12, Math.round(Number(srv.ping ?? 45))),
        players: Number(srv.playing ?? 0),
        maxPlayers: Number(srv.maxPlayers ?? 20),
        fpsEstimate: Math.round(Number(srv.fps ?? 60)),
        uptime: 'Live',
      }));

      const payload = { source: 'roblox-live', placeId, servers };
      setCached(cacheKey, payload, 20_000);
      return res.json(payload);
    } catch (err) {
      return res.status(502).json({
        error: 'Unable to fetch live public servers from Roblox.',
        detail: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /* ==================== 4. LIVE PLAYERS SEARCH (users.roblox.com + thumbnails.roblox.com) ==================== */
  app.get('/api/roblox/players', async (req, res) => {
    try {
      const keyword = sanitizeSearchKeyword(req.query.q || 'Physci', 40) || 'Physci';
      const cacheKey = `players:${keyword.toLowerCase()}`;
      const cached = getCached(cacheKey);
      if (cached) return res.json(cached);

      const params = new URLSearchParams({
        keyword,
        limit: '25',
      });
      const userRes = await fetchRobloxJson<{
        data?: Array<{
          id: number;
          name: string;
          displayName: string;
          hasVerifiedBadge?: boolean;
        }>;
      }>(`https://users.roblox.com/v1/users/search?${params.toString()}`);

      const rawUsers = (userRes.data ?? []).slice(0, 20);
      const userIds = rawUsers.map((u) => u.id);

      let thumbMap = new Map<number, string | null>();
      let presenceMap = new Map<number, NormalizedRobloxPresence>();
      if (userIds.length > 0) {
        const [thumbs, presences] = await Promise.all([
          fetchRobloxJson<{ data?: Array<{ targetId: number; imageUrl?: string }> }>(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userIds.join(',')}&size=150x150&format=Png&isCircular=true`,
          ).catch(() => ({ data: [] })),
          fetchRobloxPresenceMap(userIds),
        ]);
        thumbMap = new Map(
          (thumbs.data ?? []).map((t) => [t.targetId, sanitizeRobloxImageUrl(t.imageUrl)]),
        );
        presenceMap = presences;
      }

      const players = rawUsers.map((u) => {
        const presence = presenceMap.get(u.id);
        return {
          id: `rbx-u-${u.id}`,
          robloxUserId: u.id,
          displayName: String(u.displayName || u.name),
          username: String(u.name),
          avatarUrl: thumbMap.get(u.id) ?? undefined,
          verifiedBadge: Boolean(u.hasVerifiedBadge),
          avatarStyle: 'classic-smile',
          avatarBg: '#1d212d',
          status: presence?.status ?? 'offline',
          presenceLabel: presence?.presenceLabel ?? 'Offline',
          currentGameId: presence?.universeId ? `rbx-${presence.universeId}` : undefined,
          currentGameTitle:
            presence?.status === 'in-game'
              ? presence.lastLocation || 'Roblox Experience'
              : undefined,
          currentPlaceId: presence?.placeId,
          currentUniverseId: presence?.universeId,
          currentGameInstanceId: presence?.gameId,
          isFriend: false,
          mutualFriends: 0,
          joinedYear: 2020,
        };
      });

      const payload = { source: 'roblox-live', query: keyword, players };
      setCached(cacheKey, payload, 45_000);
      return res.json(payload);
    } catch (err) {
      return res.status(502).json({
        error: 'Unable to query Roblox Users API.',
        detail: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /* ==================== 4b. LIVE BATCH PRESENCE (presence.roblox.com/v1/presence/users) ==================== */
  app.post('/api/roblox/presence', async (req, res) => {
    try {
      const rawList: unknown[] = Array.isArray(req.body?.userIds) ? req.body.userIds : [];
      const parsedIds: number[] = [];
      for (const item of rawList) {
        const uid = parsePositiveRobloxId(item);
        if (uid !== null) parsedIds.push(uid);
      }
      const userIds: number[] = Array.from(new Set<number>(parsedIds)).slice(0, 50);

      if (userIds.length === 0) {
        return res.json({ source: 'roblox-live', presences: {} });
      }

      const cacheKey = `presence:${[...userIds].sort((a, b) => a - b).join(',')}`;
      const cached = getCached(cacheKey);
      if (cached) return res.json(cached);

      const presenceMap = await fetchRobloxPresenceMap(userIds);
      const presences: Record<string, NormalizedRobloxPresence> = {};
      for (const [uid, p] of presenceMap.entries()) {
        presences[String(uid)] = p;
      }

      const payload = { source: 'roblox-live', fetchedAt: Date.now(), presences };
      setCached(cacheKey, payload, 20_000);
      return res.json(payload);
    } catch (err) {
      return res.status(502).json({
        error: 'Unable to fetch live Roblox friend presence.',
        detail: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /* ==================== 4c. BATCH RESOLVE REAL ROBLOX FRIENDS (@usernames or User IDs) ==================== */
  app.post('/api/roblox/friends/batch', async (req, res) => {
    try {
      const rawInput = Array.isArray(req.body?.identifiers)
        ? req.body.identifiers.map((s: unknown) => String(s ?? '')).join(',')
        : String(req.body?.identifiers ?? '');

      const parsedList = parseFriendIdentifiersInput(rawInput, 15);
      if (parsedList.length === 0) {
        return res.status(400).json({
          error: 'Enter one or more valid Roblox usernames (3–20 chars) or numeric User IDs.',
        });
      }

      const usernames = parsedList
        .filter((p): p is { type: 'username'; username: string } => p.type === 'username')
        .map((p) => p.username);
      const directIds = parsedList
        .filter((p): p is { type: 'id'; userId: number } => p.type === 'id')
        .map((p) => p.userId);

      const resolvedUsers = new Map<
        number,
        {
          id: number;
          name: string;
          displayName: string;
          hasVerifiedBadge?: boolean;
          createdYear?: number;
        }
      >();
      const notFound: string[] = [];

      if (usernames.length > 0) {
        const lookupRes = await fetch('https://users.roblox.com/v1/usernames/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': 'LunarForRoblox/1.0',
          },
          body: JSON.stringify({
            usernames,
            excludeBannedUsers: false,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (!lookupRes.ok) {
          throw new RobloxHttpError(lookupRes.status);
        }
        const lookupData = (await lookupRes.json()) as {
          data?: Array<{
            requestedUsername?: string;
            id: number;
            name: string;
            displayName: string;
            hasVerifiedBadge?: boolean;
          }>;
        };

        const matchedLower = new Set<string>();
        for (const u of lookupData.data ?? []) {
          resolvedUsers.set(u.id, {
            id: u.id,
            name: String(u.name),
            displayName: String(u.displayName || u.name),
            hasVerifiedBadge: Boolean(u.hasVerifiedBadge),
          });
          matchedLower.add((u.requestedUsername || u.name).toLowerCase());
          matchedLower.add(u.name.toLowerCase());
        }
        for (const requested of usernames) {
          if (!matchedLower.has(requested.toLowerCase())) {
            notFound.push(requested);
          }
        }
      }

      if (directIds.length > 0) {
        const idResults = await Promise.all(
          directIds.map(async (uid) => {
            try {
              const profile = await fetchRobloxJson<{
                id: number;
                name: string;
                displayName: string;
                hasVerifiedBadge?: boolean;
                created?: string;
              }>(`https://users.roblox.com/v1/users/${uid}`);
              const createdYear = profile.created
                ? new Date(profile.created).getFullYear()
                : undefined;
              return { ok: true as const, profile, createdYear };
            } catch {
              return { ok: false as const, uid };
            }
          }),
        );
        for (const entry of idResults) {
          if (entry.ok) {
            resolvedUsers.set(entry.profile.id, {
              id: entry.profile.id,
              name: String(entry.profile.name),
              displayName: String(entry.profile.displayName || entry.profile.name),
              hasVerifiedBadge: Boolean(entry.profile.hasVerifiedBadge),
              createdYear:
                entry.createdYear && Number.isFinite(entry.createdYear)
                  ? entry.createdYear
                  : undefined,
            });
          } else {
            notFound.push(String(entry.uid));
          }
        }
      }

      const finalUserList = Array.from(resolvedUsers.values());
      const finalIds = finalUserList.map((u) => u.id);

      let thumbMap = new Map<number, string | null>();
      let presenceMap = new Map<number, NormalizedRobloxPresence>();
      if (finalIds.length > 0) {
        const [thumbs, presences] = await Promise.all([
          fetchRobloxJson<{ data?: Array<{ targetId: number; imageUrl?: string }> }>(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${finalIds.join(',')}&size=150x150&format=Png&isCircular=true`,
          ).catch(() => ({ data: [] })),
          fetchRobloxPresenceMap(finalIds),
        ]);
        thumbMap = new Map(
          (thumbs.data ?? []).map((t) => [t.targetId, sanitizeRobloxImageUrl(t.imageUrl)]),
        );
        presenceMap = presences;
      }

      const friends = finalUserList.map((u) => {
        const presence = presenceMap.get(u.id);
        return {
          id: `rbx-u-${u.id}`,
          robloxUserId: u.id,
          displayName: u.displayName,
          username: u.name,
          avatarUrl: thumbMap.get(u.id) ?? undefined,
          verifiedBadge: Boolean(u.hasVerifiedBadge),
          avatarStyle: 'classic-smile',
          avatarBg: '#1d212d',
          status: presence?.status ?? 'offline',
          presenceLabel: presence?.presenceLabel ?? 'Offline',
          currentGameId: presence?.universeId ? `rbx-${presence.universeId}` : undefined,
          currentGameTitle:
            presence?.status === 'in-game'
              ? presence.lastLocation || 'Roblox Experience'
              : undefined,
          currentPlaceId: presence?.placeId,
          currentUniverseId: presence?.universeId,
          currentGameInstanceId: presence?.gameId,
          isFriend: true,
          mutualFriends: 0,
          joinedYear: u.createdYear ?? 2020,
        };
      });

      return res.json({
        source: 'roblox-live',
        friends,
        notFound,
      });
    } catch (err) {
      return res.status(502).json({
        error: 'Unable to resolve Roblox friends right now.',
        detail: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /* ==================== 5. LIVE MARKETPLACE CATALOG (catalog.roblox.com + thumbnails.roblox.com) ==================== */
  app.get('/api/roblox/catalog', async (req, res) => {
    try {
      const keyword = sanitizeSearchKeyword(req.query.q, 60);
      const categoryParam = sanitizeSearchKeyword(req.query.category, 20) || 'All';
      const sortParam = sanitizeSearchKeyword(req.query.sort, 20) || 'relevance';
      const creatorParam = sanitizeSearchKeyword(req.query.creator, 40);
      const minPrice = req.query.minPrice ? parsePositiveRobloxId(req.query.minPrice) : null;
      const maxPrice = req.query.maxPrice ? parsePositiveRobloxId(req.query.maxPrice) : null;

      const cacheKey = `catalog:${keyword}|${categoryParam}|${sortParam}|${creatorParam}|${minPrice}|${maxPrice}`;
      const cached = getCached(cacheKey);
      if (cached) return res.json(cached);

      const params = new URLSearchParams({ Limit: '30' });
      const categoryCodeMap: Record<string, string> = {
        All: '1',
        Hat: '11',
        Hair: '11',
        Clothing: '3',
        Face: '4',
        Bundle: '17',
        Accessory: '11',
      };
      params.set('Category', categoryCodeMap[categoryParam] ?? '1');

      if (keyword) params.set('Keyword', keyword);
      if (creatorParam) params.set('CreatorName', creatorParam);
      if (minPrice !== null) params.set('MinPrice', String(minPrice));
      if (maxPrice !== null) params.set('MaxPrice', String(maxPrice));

      const sortTypeMap: Record<string, string> = {
        popular: '1',
        'price-asc': '4',
        'price-desc': '5',
      };
      if (sortParam !== 'relevance' && sortTypeMap[sortParam]) {
        params.set('SortType', sortTypeMap[sortParam]);
      }

      const catalogUrl = `https://catalog.roblox.com/v1/search/items/details?${params.toString()}`;
      type CatalogApiResponse = {
        data?: Array<{
          id: number;
          itemType: string;
          name: string;
          creatorName?: string;
          creatorHasVerifiedBadge?: boolean;
          price?: number;
          lowestPrice?: number;
          priceStatus?: string;
          assetType?: number;
          favoriteCount?: number;
          itemRestrictions?: string[];
        }>;
      };

      let catRes: CatalogApiResponse;
      try {
        catRes = await fetchRobloxJson<CatalogApiResponse>(catalogUrl);
      } catch (firstErr) {
        if (firstErr instanceof RobloxHttpError && firstErr.status === 429) {
          await new Promise((r) => setTimeout(r, 1200));
          catRes = await fetchRobloxJson<CatalogApiResponse>(catalogUrl);
        } else {
          throw firstErr;
        }
      }

      const rawItems = (catRes.data ?? []).slice(0, 20);
      const assetIds = rawItems.filter((i) => i.itemType === 'Asset').map((i) => i.id);
      const bundleIds = rawItems.filter((i) => i.itemType === 'Bundle').map((i) => i.id);

      const [assetThumbs, bundleThumbs] = await Promise.all([
        assetIds.length > 0
          ? fetchRobloxJson<{ data?: Array<{ targetId: number; imageUrl?: string }> }>(
              `https://thumbnails.roblox.com/v1/assets?assetIds=${assetIds.join(',')}&size=250x250&format=Png&isCircular=false`,
            ).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
        bundleIds.length > 0
          ? fetchRobloxJson<{ data?: Array<{ targetId: number; imageUrl?: string }> }>(
              `https://thumbnails.roblox.com/v1/bundles/thumbnails?bundleIds=${bundleIds.join(',')}&size=420x420&format=Png&isCircular=false`,
            ).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ]);

      const assetThumbMap = new Map(
        (assetThumbs.data ?? []).map((t) => [t.targetId, sanitizeRobloxImageUrl(t.imageUrl)]),
      );
      const bundleThumbMap = new Map(
        (bundleThumbs.data ?? []).map((t) => [t.targetId, sanitizeRobloxImageUrl(t.imageUrl)]),
      );

      const items = rawItems.map((raw) => {
        const numericPrice =
          raw.priceStatus === 'Free'
            ? 0
            : Number(raw.lowestPrice ?? raw.price ?? 0);
        const isLimited = (raw.itemRestrictions ?? []).some((r) =>
          r.toLowerCase().includes('limited'),
        );
        const isBundle = raw.itemType === 'Bundle';
        const thumbnailUrl = isBundle
          ? bundleThumbMap.get(raw.id) ?? undefined
          : assetThumbMap.get(raw.id) ?? undefined;

        let category: 'Face' | 'Hair' | 'Hat' | 'Clothing' | 'Bundle' | 'Accessory' = 'Accessory';
        let equipSlot: 'face' | 'hair' | 'hat' | 'shirt' | 'accessory' = 'accessory';
        if (isBundle) {
          category = 'Bundle';
          equipSlot = 'shirt';
        } else if (raw.assetType === 18) {
          category = 'Face';
          equipSlot = 'face';
        } else if (raw.assetType === 41) {
          category = 'Hair';
          equipSlot = 'hair';
        } else if (raw.assetType === 8) {
          category = 'Hat';
          equipSlot = 'hat';
        } else if (raw.assetType === 11 || raw.assetType === 12 || raw.assetType === 64 || raw.assetType === 65) {
          category = 'Clothing';
          equipSlot = 'shirt';
        }

        return {
          id: `rbx-${raw.itemType.toLowerCase()}-${raw.id}`,
          robloxAssetId: raw.id,
          itemType: raw.itemType,
          name: String(raw.name ?? 'Catalog Item'),
          creator: String(raw.creatorName ?? 'Roblox'),
          verifiedCreator: Boolean(raw.creatorHasVerifiedBadge || raw.creatorName === 'Roblox'),
          price: Number.isFinite(numericPrice) ? numericPrice : 0,
          category,
          saleType: isLimited ? 'Limited' : numericPrice === 0 ? 'Free' : 'Paid',
          tags: [category.toLowerCase(), ...(keyword ? [keyword.toLowerCase()] : [])],
          artworkType: 'void-fedora',
          thumbnailUrl,
          popularityScore: Number(raw.favoriteCount ?? 100),
          daysOld: 10,
          equipSlot,
          previewColor: '#6366f1',
        };
      });

      const payload = { source: 'roblox-live', items };
      if (items.length > 0) {
        lastLiveCatalogItems = items;
      }
      setCached(cacheKey, payload, 300_000);
      return res.json(payload);
    } catch (err) {
      if (err instanceof RobloxHttpError && err.status === 429) {
        return res.json({
          source: 'roblox-rate-limited',
          rateLimited: true,
          items: lastLiveCatalogItems,
        });
      }
      return res.status(502).json({
        error: 'Unable to fetch live Roblox Catalog items.',
        detail: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /* ==================== 6. LIVE COMMUNITIES / GROUPS (groups.roblox.com) ==================== */
  app.get('/api/roblox/groups', async (req, res) => {
    try {
      const keyword = sanitizeSearchKeyword(req.query.q || 'Roblox', 40) || 'Roblox';
      const cacheKey = `groups:${keyword.toLowerCase()}`;
      const cached = getCached(cacheKey);
      if (cached) return res.json(cached);

      const params = new URLSearchParams({ keyword, limit: '10' });
      const grpRes = await fetchRobloxJson<{
        data?: Array<{
          id: number;
          name: string;
          description?: string;
          memberCount?: number;
          hasVerifiedBadge?: boolean;
        }>;
      }>(`https://groups.roblox.com/v1/groups/search?${params.toString()}`);

      const rawGroups = (grpRes.data ?? []).slice(0, 8);
      const groupIds = rawGroups.map((g) => g.id);
      let iconMap = new Map<number, string | null>();
      if (groupIds.length > 0) {
        const thumbs = await fetchRobloxJson<{ data?: Array<{ targetId: number; imageUrl?: string }> }>(
          `https://thumbnails.roblox.com/v1/groups/icons?groupIds=${groupIds.join(',')}&size=150x150&format=Png&isCircular=false`,
        ).catch(() => ({ data: [] }));
        iconMap = new Map(
          (thumbs.data ?? []).map((t) => [t.targetId, sanitizeRobloxImageUrl(t.imageUrl)]),
        );
      }

      const palette = ['#6E96FF', '#22C55E', '#F59E0B', '#A855F7', '#38BDF8', '#EC4899'];
      const groups = rawGroups.map((g, idx) => ({
        id: `rbx-grp-${g.id}`,
        robloxGroupId: g.id,
        name: String(g.name),
        owner: 'Roblox Community',
        verified: Boolean(g.hasVerifiedBadge),
        membersCount: Number(g.memberCount ?? 0),
        category: 'Live Roblox Group',
        description: String(g.description || 'Official community on Roblox.').slice(0, 220),
        joined: idx === 0,
        accent: palette[idx % palette.length],
        shout: `Group #${g.id} synced live from groups.roblox.com`,
        iconUrl: iconMap.get(g.id) ?? undefined,
      }));

      const payload = { source: 'roblox-live', groups };
      setCached(cacheKey, payload, 60_000);
      return res.json(payload);
    } catch (err) {
      return res.status(502).json({
        error: 'Unable to fetch live Roblox Groups.',
        detail: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /* ==================== 7. CONNECT REAL ROBLOX ACCOUNT (Profile + Avatar + Favorites + Groups) ==================== */
  app.get('/api/roblox/account/resolve', async (req, res) => {
    try {
      const parsed = parseRobloxUsernameOrId(req.query.identifier);
      if (!parsed) {
        return res.status(400).json({
          error: 'Enter a valid Roblox username (3–20 letters, numbers, or underscore) or numeric User ID.',
        });
      }

      const cacheKey = `account:${parsed.type === 'id' ? parsed.userId : parsed.username.toLowerCase()}`;
      const cached = getCached(cacheKey);
      if (cached) return res.json(cached);

      let userId: number | null = parsed.type === 'id' ? parsed.userId : null;
      if (parsed.type === 'username') {
        const lookupRes = await fetch('https://users.roblox.com/v1/usernames/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': 'LunarForRoblox/1.0',
          },
          body: JSON.stringify({
            usernames: [parsed.username],
            excludeBannedUsers: false,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (!lookupRes.ok) {
          throw new RobloxHttpError(lookupRes.status);
        }
        const lookupData = (await lookupRes.json()) as {
          data?: Array<{ id: number; name: string; displayName: string; hasVerifiedBadge?: boolean }>;
        };
        userId = lookupData.data?.[0]?.id ?? null;
      }

      if (!userId) {
        return res.status(404).json({
          error: `No Roblox account found for "${String(req.query.identifier ?? '').trim()}".`,
        });
      }

      const [
        profileData,
        headshotData,
        fullBodyData,
        friendsCountData,
        followersCountData,
        followingsCountData,
        presenceData,
        favoritesRaw,
        groupsRaw,
      ] = await Promise.all([
        fetchRobloxJson<{
          id: number;
          name: string;
          displayName: string;
          description?: string;
          created?: string;
          hasVerifiedBadge?: boolean;
          isBanned?: boolean;
        }>(`https://users.roblox.com/v1/users/${userId}`),
        fetchRobloxJson<{ data?: Array<{ targetId: number; imageUrl?: string }> }>(
          `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true`,
        ).catch(() => ({ data: [] })),
        fetchRobloxJson<{ data?: Array<{ targetId: number; imageUrl?: string }> }>(
          `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=352x352&format=Png&isCircular=false`,
        ).catch(() => ({ data: [] })),
        fetchRobloxJson<{ count?: number }>(
          `https://friends.roblox.com/v1/users/${userId}/friends/count`,
        ).catch(() => ({ count: 0 })),
        fetchRobloxJson<{ count?: number }>(
          `https://friends.roblox.com/v1/users/${userId}/followers/count`,
        ).catch(() => ({ count: 0 })),
        fetchRobloxJson<{ count?: number }>(
          `https://friends.roblox.com/v1/users/${userId}/followings/count`,
        ).catch(() => ({ count: 0 })),
        fetch('https://presence.roblox.com/v1/presence/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': 'LunarForRoblox/1.0',
          },
          body: JSON.stringify({ userIds: [userId] }),
          signal: AbortSignal.timeout(6000),
        })
          .then((r) => (r.ok ? r.json() : { userPresences: [] }))
          .catch(() => ({ userPresences: [] })) as Promise<{
          userPresences?: Array<{ userPresenceType?: number; lastLocation?: string }>;
        }>,
        fetchRobloxJson<{
          data?: Array<{ id: number; name?: string; rootPlace?: { id?: number } }>;
        }>(
          `https://games.roblox.com/v2/users/${userId}/favorite/games?limit=10&sortOrder=Desc`,
        ).catch(() => ({ data: [] })),
        fetchRobloxJson<{
          data?: Array<{
            group?: {
              id: number;
              name: string;
              description?: string;
              memberCount?: number;
              hasVerifiedBadge?: boolean;
            };
            role?: { name?: string };
          }>;
        }>(`https://groups.roblox.com/v2/users/${userId}/groups/roles`).catch(() => ({ data: [] })),
      ]);

      // Enrich user's real favorited Roblox games with live player counts, ratings & icons
      const favUniverseIds = (favoritesRaw.data ?? [])
        .map((g) => parsePositiveRobloxId(g.id))
        .filter((id): id is number => id !== null)
        .slice(0, 10);

      let favoriteGames: Array<Record<string, unknown>> = [];
      if (favUniverseIds.length > 0) {
        const favIdParam = favUniverseIds.join(',');
        const [favDetails, favVotes, favIcons, favBanners] = await Promise.all([
          fetchRobloxJson<{ data?: Array<Record<string, unknown>> }>(
            `https://games.roblox.com/v1/games?universeIds=${favIdParam}`,
          ).catch(() => ({ data: [] })),
          fetchRobloxJson<{ data?: Array<{ id: number; upVotes: number; downVotes: number }> }>(
            `https://games.roblox.com/v1/games/votes?universeIds=${favIdParam}`,
          ).catch(() => ({ data: [] })),
          fetchRobloxJson<{ data?: Array<{ targetId: number; imageUrl?: string }> }>(
            `https://thumbnails.roblox.com/v1/games/icons?universeIds=${favIdParam}&size=512x512&format=Png&isCircular=false`,
          ).catch(() => ({ data: [] })),
          fetchRobloxJson<{
            data?: Array<{ universeId: number; thumbnails?: Array<{ imageUrl?: string }> }>;
          }>(
            `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${favIdParam}&countPerUniverse=1&defaults=true&size=768x432&format=Png&isCircular=false`,
          ).catch(() => ({ data: [] })),
        ]);

        const fVoteMap = new Map((favVotes.data ?? []).map((v) => [v.id, v]));
        const fIconMap = new Map(
          (favIcons.data ?? []).map((i) => [i.targetId, sanitizeRobloxImageUrl(i.imageUrl)]),
        );
        const fBannerMap = new Map(
          (favBanners.data ?? []).map((b) => [
            b.universeId,
            sanitizeRobloxImageUrl(b.thumbnails?.[0]?.imageUrl),
          ]),
        );

        favoriteGames = (favDetails.data ?? []).map((g) => {
          const uId = Number(g.id);
          const votes = fVoteMap.get(uId);
          const creatorObj = (g.creator ?? {}) as { name?: string };
          return {
            id: `rbx-${uId}`,
            universeId: uId,
            placeId: Number(g.rootPlaceId ?? 0),
            title: String(g.name ?? 'Roblox Experience'),
            creator: String(creatorObj.name ?? 'Roblox Creator'),
            thumbnail: fIconMap.get(uId) ?? '',
            bannerImage: fBannerMap.get(uId) ?? undefined,
            genre: mapGenre(String(g.genre_l1 ?? g.genre ?? '')),
            playingCount: Number(g.playing ?? 0),
            ratingPct: votes ? computeVoteRatingPct(votes.upVotes, votes.downVotes) : 88,
            visitsLabel: formatVisits(Number(g.visits ?? 0)),
            isContinue: false,
            isFavorite: true,
            description: String(g.description ?? '').slice(0, 320),
            source: 'roblox-live',
          };
        });
      }

      // Enrich user's real joined Roblox groups
      const rawUserGroups = (groupsRaw.data ?? [])
        .filter((entry) => Boolean(entry.group?.id))
        .slice(0, 10);
      const userGroupIds = rawUserGroups.map((entry) => entry.group!.id);
      let userGroupIconMap = new Map<number, string | null>();
      if (userGroupIds.length > 0) {
        const gIcons = await fetchRobloxJson<{
          data?: Array<{ targetId: number; imageUrl?: string }>;
        }>(
          `https://thumbnails.roblox.com/v1/groups/icons?groupIds=${userGroupIds.join(',')}&size=150x150&format=Png&isCircular=false`,
        ).catch(() => ({ data: [] }));
        userGroupIconMap = new Map(
          (gIcons.data ?? []).map((t) => [t.targetId, sanitizeRobloxImageUrl(t.imageUrl)]),
        );
      }

      const palette = ['#6E96FF', '#22C55E', '#F59E0B', '#A855F7', '#38BDF8', '#EC4899'];
      const groups = rawUserGroups.map((entry, idx) => {
        const grp = entry.group!;
        return {
          id: `rbx-grp-${grp.id}`,
          robloxGroupId: grp.id,
          name: String(grp.name),
          owner: entry.role?.name ? `Your role: ${entry.role.name}` : 'Member',
          verified: Boolean(grp.hasVerifiedBadge),
          membersCount: Number(grp.memberCount ?? 0),
          category: 'Your Roblox Group',
          description: String(grp.description || 'Joined Roblox community.').slice(0, 220),
          joined: true,
          accent: palette[idx % palette.length],
          shout: entry.role?.name
            ? `Synced from @${profileData.name} · Role: ${entry.role.name}`
            : `Synced from @${profileData.name}`,
          iconUrl: userGroupIconMap.get(grp.id) ?? undefined,
        };
      });

      const avatarUrl = sanitizeRobloxImageUrl(headshotData.data?.[0]?.imageUrl) ?? undefined;
      const fullBodyAvatarUrl =
        sanitizeRobloxImageUrl(fullBodyData.data?.[0]?.imageUrl) ?? undefined;
      const presenceObj = presenceData.userPresences?.[0];

      const account = {
        id: `rbx-acc-${profileData.id}`,
        robloxUserId: profileData.id,
        username: String(profileData.name),
        displayName: String(profileData.displayName || profileData.name),
        robux: 0,
        avatarStyle: 'classic-smile',
        avatarUrl,
        fullBodyAvatarUrl,
        verifiedBadge: Boolean(profileData.hasVerifiedBadge),
        description: String(profileData.description ?? '').slice(0, 260),
        createdAt: profileData.created ? String(profileData.created) : undefined,
        friendsCount: Number(friendsCountData.count ?? 0),
        followersCount: Number(followersCountData.count ?? 0),
        followingCount: Number(followingsCountData.count ?? 0),
        presenceLabel: mapRobloxPresenceType(presenceObj?.userPresenceType),
        authMode: 'roblox-linked',
        accentColor: '#6E96FF',
        isPremium: Boolean(profileData.hasVerifiedBadge),
        isolatedProfileDir: `~/.lunar-roblox/profiles/${String(profileData.name)}`,
      };

      const payload = { source: 'roblox-live', account, favoriteGames, groups };
      setCached(cacheKey, payload, 60_000);
      return res.json(payload);
    } catch (err) {
      if (err instanceof RobloxHttpError && err.status === 404) {
        return res.status(404).json({ error: 'Roblox user not found.' });
      }
      return res.status(502).json({
        error: 'Unable to fetch Roblox account details right now.',
        detail: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /* ==================== 8. BIO-CODE OWNERSHIP VERIFICATION (No OAuth / No ID Check Required) ==================== */
  app.post('/api/roblox/account/verify/start', (req, res) => {
    const userId = parsePositiveRobloxId(req.body?.userId);
    if (!userId) {
      return res.status(400).json({ error: 'Valid Roblox userId is required.' });
    }

    // Prune expired challenges
    const now = Date.now();
    for (const [uid, entry] of bioChallengeStore.entries()) {
      if (entry.expiresAt < now) bioChallengeStore.delete(uid);
    }

    const code = createBioVerificationCode();
    const expiresAt = now + 15 * 60_000;
    bioChallengeStore.set(userId, { userId, code, expiresAt });

    return res.json({
      userId,
      code,
      expiresAt,
      profileSettingsUrl: 'https://www.roblox.com/my/account#!/info',
    });
  });

  app.post('/api/roblox/account/verify/check', async (req, res) => {
    try {
      const userId = parsePositiveRobloxId(req.body?.userId);
      if (!userId) {
        return res.status(400).json({ error: 'Valid Roblox userId is required.' });
      }

      const challenge = bioChallengeStore.get(userId);
      if (!challenge || challenge.expiresAt < Date.now()) {
        bioChallengeStore.delete(userId);
        return res.status(400).json({
          verified: false,
          error: 'Verification code expired. Generate a fresh code and try again.',
        });
      }

      // Fetch fresh profile directly from Roblox (never cached)
      const profile = await fetchRobloxJson<{
        id: number;
        name: string;
        displayName: string;
        description?: string;
      }>(`https://users.roblox.com/v1/users/${userId}`);

      const matched = bioContainsVerificationCode(profile.description ?? '', challenge.code);
      if (!matched) {
        return res.json({
          verified: false,
          code: challenge.code,
          error: `Code "${challenge.code}" was not found in @${profile.name}'s Roblox About/Bio yet. Make sure you saved changes on Roblox and try again.`,
        });
      }

      bioChallengeStore.delete(userId);
      // Clear account cache so fresh profile state is fetched next time
      apiCache.delete(`account:${userId}`);
      apiCache.delete(`account:${profile.name.toLowerCase()}`);

      return res.json({
        verified: true,
        userId: profile.id,
        username: profile.name,
        displayName: profile.displayName || profile.name,
      });
    } catch (err) {
      return res.status(502).json({
        verified: false,
        error: 'Unable to check Roblox profile bio right now.',
        detail: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /* ==================== 9. AUTHENTICATED ROBLOX SYNC HELPER ==================== */
  async function buildAuthenticatedAccountPayload(userId: number, cookie: string) {
    const [
      profileData,
      currencyData,
      headshotData,
      fullBodyData,
      friendsCountData,
      followersCountData,
      followingsCountData,
      presenceMapSelf,
      favoritesRaw,
      groupsRaw,
      rawFriendsRes,
      rawRequestsRes,
    ] = await Promise.all([
      fetchRobloxAuthedJson<{
        id: number;
        name: string;
        displayName: string;
        description?: string;
        created?: string;
        hasVerifiedBadge?: boolean;
      }>(`https://users.roblox.com/v1/users/${userId}`, cookie),
      fetchRobloxAuthedJson<{ robux?: number }>(
        `https://economy.roblox.com/v1/users/${userId}/currency`,
        cookie,
      ).catch(() => ({ robux: 0 })),
      fetchRobloxJson<{ data?: Array<{ targetId: number; imageUrl?: string }> }>(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true`,
      ).catch(() => ({ data: [] })),
      fetchRobloxJson<{ data?: Array<{ targetId: number; imageUrl?: string }> }>(
        `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=352x352&format=Png&isCircular=false`,
      ).catch(() => ({ data: [] })),
      fetchRobloxJson<{ count?: number }>(
        `https://friends.roblox.com/v1/users/${userId}/friends/count`,
      ).catch(() => ({ count: 0 })),
      fetchRobloxJson<{ count?: number }>(
        `https://friends.roblox.com/v1/users/${userId}/followers/count`,
      ).catch(() => ({ count: 0 })),
      fetchRobloxJson<{ count?: number }>(
        `https://friends.roblox.com/v1/users/${userId}/followings/count`,
      ).catch(() => ({ count: 0 })),
      fetchRobloxPresenceMap([userId]),
      fetchRobloxAuthedJson<{ data?: Array<{ id: number }> }>(
        `https://games.roblox.com/v2/users/${userId}/favorite/games?limit=10&sortOrder=Desc`,
        cookie,
      ).catch(() => ({ data: [] })),
      fetchRobloxAuthedJson<{
        data?: Array<{
          group?: {
            id: number;
            name: string;
            description?: string;
            memberCount?: number;
            hasVerifiedBadge?: boolean;
          };
          role?: { name?: string };
        }>;
      }>(`https://groups.roblox.com/v2/users/${userId}/groups/roles`, cookie).catch(() => ({
        data: [],
      })),
      fetchRobloxAuthedJson<{
        data?: Array<{
          id: number;
          name: string;
          displayName?: string;
          hasVerifiedBadge?: boolean;
        }>;
      }>(`https://friends.roblox.com/v1/users/${userId}/friends`, cookie).catch(() => ({
        data: [],
      })),
      fetchRobloxAuthedJson<{
        data?: Array<{
          id: number;
          name: string;
          displayName?: string;
          friendRequest?: { sentAt?: string };
        }>;
      }>(`https://friends.roblox.com/v1/my/friends/requests?limit=25`, cookie).catch(() => ({
        data: [],
      })),
    ]);

    // Enrich real favorite games
    const favUniverseIds = (favoritesRaw.data ?? [])
      .map((g) => parsePositiveRobloxId(g.id))
      .filter((id): id is number => id !== null)
      .slice(0, 10);

    let favoriteGames: Array<Record<string, unknown>> = [];
    if (favUniverseIds.length > 0) {
      const favIdParam = favUniverseIds.join(',');
      const [favDetails, favVotes, favIcons, favBanners] = await Promise.all([
        fetchRobloxJson<{ data?: Array<Record<string, unknown>> }>(
          `https://games.roblox.com/v1/games?universeIds=${favIdParam}`,
        ).catch(() => ({ data: [] })),
        fetchRobloxJson<{ data?: Array<{ id: number; upVotes: number; downVotes: number }> }>(
          `https://games.roblox.com/v1/games/votes?universeIds=${favIdParam}`,
        ).catch(() => ({ data: [] })),
        fetchRobloxJson<{ data?: Array<{ targetId: number; imageUrl?: string }> }>(
          `https://thumbnails.roblox.com/v1/games/icons?universeIds=${favIdParam}&size=512x512&format=Png&isCircular=false`,
        ).catch(() => ({ data: [] })),
        fetchRobloxJson<{
          data?: Array<{ universeId: number; thumbnails?: Array<{ imageUrl?: string }> }>;
        }>(
          `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${favIdParam}&countPerUniverse=1&defaults=true&size=768x432&format=Png&isCircular=false`,
        ).catch(() => ({ data: [] })),
      ]);

      const fVoteMap = new Map((favVotes.data ?? []).map((v) => [v.id, v]));
      const fIconMap = new Map(
        (favIcons.data ?? []).map((i) => [i.targetId, sanitizeRobloxImageUrl(i.imageUrl)]),
      );
      const fBannerMap = new Map(
        (favBanners.data ?? []).map((b) => [
          b.universeId,
          sanitizeRobloxImageUrl(b.thumbnails?.[0]?.imageUrl),
        ]),
      );

      favoriteGames = (favDetails.data ?? []).map((g) => {
        const uId = Number(g.id);
        const votes = fVoteMap.get(uId);
        const creatorObj = (g.creator ?? {}) as { name?: string };
        return {
          id: `rbx-${uId}`,
          universeId: uId,
          placeId: Number(g.rootPlaceId ?? 0),
          title: String(g.name ?? 'Roblox Experience'),
          creator: String(creatorObj.name ?? 'Roblox Creator'),
          thumbnail: fIconMap.get(uId) ?? '',
          bannerImage: fBannerMap.get(uId) ?? undefined,
          genre: mapGenre(String(g.genre_l1 ?? g.genre ?? '')),
          playingCount: Number(g.playing ?? 0),
          ratingPct: votes ? computeVoteRatingPct(votes.upVotes, votes.downVotes) : 88,
          visitsLabel: formatVisits(Number(g.visits ?? 0)),
          isContinue: false,
          isFavorite: true,
          description: String(g.description ?? '').slice(0, 320),
          source: 'roblox-live',
        };
      });
    }

    // Enrich real joined groups
    const rawUserGroups = (groupsRaw.data ?? [])
      .filter((entry) => Boolean(entry.group?.id))
      .slice(0, 10);
    const userGroupIds = rawUserGroups.map((entry) => entry.group!.id);
    let userGroupIconMap = new Map<number, string | null>();
    if (userGroupIds.length > 0) {
      const gIcons = await fetchRobloxJson<{
        data?: Array<{ targetId: number; imageUrl?: string }>;
      }>(
        `https://thumbnails.roblox.com/v1/groups/icons?groupIds=${userGroupIds.join(',')}&size=150x150&format=Png&isCircular=false`,
      ).catch(() => ({ data: [] }));
      userGroupIconMap = new Map(
        (gIcons.data ?? []).map((t) => [t.targetId, sanitizeRobloxImageUrl(t.imageUrl)]),
      );
    }
    const palette = ['#6E96FF', '#22C55E', '#F59E0B', '#A855F7', '#38BDF8', '#EC4899'];
    const groups = rawUserGroups.map((entry, idx) => {
      const grp = entry.group!;
      return {
        id: `rbx-grp-${grp.id}`,
        robloxGroupId: grp.id,
        name: String(grp.name),
        owner: entry.role?.name ? `Your role: ${entry.role.name}` : 'Member',
        verified: Boolean(grp.hasVerifiedBadge),
        membersCount: Number(grp.memberCount ?? 0),
        category: 'Your Roblox Group',
        description: String(grp.description || 'Joined Roblox community.').slice(0, 220),
        joined: true,
        accent: palette[idx % palette.length],
        shout: entry.role?.name
          ? `Synced from @${profileData.name} · Role: ${entry.role.name}`
          : `Synced from @${profileData.name}`,
        iconUrl: userGroupIconMap.get(grp.id) ?? undefined,
      };
    });

    // Enrich REAL Roblox friends + incoming friend requests with headshots & live presence
    const realFriendList = (rawFriendsRes.data ?? []).slice(0, 40);
    const realReqList = (rawRequestsRes.data ?? []).slice(0, 15);
    const allSocialIds = Array.from(
      new Set([...realFriendList.map((f) => f.id), ...realReqList.map((r) => r.id)]),
    ).slice(0, 50);

    let socialThumbMap = new Map<number, string | null>();
    let socialPresenceMap = new Map<number, NormalizedRobloxPresence>();
    if (allSocialIds.length > 0) {
      const [thumbs, presences] = await Promise.all([
        fetchRobloxJson<{ data?: Array<{ targetId: number; imageUrl?: string }> }>(
          `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${allSocialIds.join(',')}&size=150x150&format=Png&isCircular=true`,
        ).catch(() => ({ data: [] })),
        fetchRobloxPresenceMap(allSocialIds),
      ]);
      socialThumbMap = new Map(
        (thumbs.data ?? []).map((t) => [t.targetId, sanitizeRobloxImageUrl(t.imageUrl)]),
      );
      socialPresenceMap = presences;
    }

    const friends = realFriendList.map((f) => {
      const p = socialPresenceMap.get(f.id);
      return {
        id: `rbx-u-${f.id}`,
        robloxUserId: f.id,
        displayName: String(f.displayName || f.name),
        username: String(f.name),
        avatarUrl: socialThumbMap.get(f.id) ?? undefined,
        verifiedBadge: Boolean(f.hasVerifiedBadge),
        avatarStyle: 'classic-smile',
        avatarBg: '#1d212d',
        status: p?.status ?? 'offline',
        presenceLabel: p?.presenceLabel ?? 'Offline',
        currentGameId: p?.universeId ? `rbx-${p.universeId}` : undefined,
        currentGameTitle: p?.status === 'in-game' ? p.lastLocation || 'Roblox Experience' : undefined,
        currentPlaceId: p?.placeId,
        currentUniverseId: p?.universeId,
        currentGameInstanceId: p?.gameId,
        isFriend: true,
        mutualFriends: 0,
        joinedYear: 2020,
      };
    });

    const friendRequests = realReqList.map((r) => ({
      id: `rbx-req-${r.id}`,
      playerId: `rbx-u-${r.id}`,
      robloxUserId: r.id,
      displayName: String(r.displayName || r.name),
      username: String(r.name),
      avatarStyle: 'classic-smile',
      avatarUrl: socialThumbMap.get(r.id) ?? undefined,
      sentDate: r.friendRequest?.sentAt
        ? new Date(r.friendRequest.sentAt).toLocaleDateString()
        : 'Recent',
    }));

    const selfPresence = presenceMapSelf.get(userId);
    const account = {
      id: `rbx-acc-${profileData.id}`,
      robloxUserId: profileData.id,
      username: String(profileData.name),
      displayName: String(profileData.displayName || profileData.name),
      robux: Number(currencyData.robux ?? 0),
      avatarStyle: 'classic-smile',
      avatarUrl: sanitizeRobloxImageUrl(headshotData.data?.[0]?.imageUrl) ?? undefined,
      fullBodyAvatarUrl: sanitizeRobloxImageUrl(fullBodyData.data?.[0]?.imageUrl) ?? undefined,
      verifiedBadge: Boolean(profileData.hasVerifiedBadge),
      description: String(profileData.description ?? '').slice(0, 260),
      createdAt: profileData.created ? String(profileData.created) : undefined,
      friendsCount: Number(friendsCountData.count ?? friends.length),
      followersCount: Number(followersCountData.count ?? 0),
      followingCount: Number(followingsCountData.count ?? 0),
      presenceLabel: selfPresence?.presenceLabel ?? 'Online',
      authMode: 'roblox-authenticated',
      accentColor: '#6E96FF',
      isPremium: Boolean(profileData.hasVerifiedBadge),
      isolatedProfileDir: `~/.lunar-roblox/profiles/${String(profileData.name)}`,
    };

    return {
      source: 'roblox-live',
      account,
      favoriteGames,
      groups,
      friends,
      friendRequests,
    };
  }

  /* ==================== 10. OFFICIAL ROBLOX QUICK LOGIN / QR CODE ==================== */
  app.post('/api/roblox/auth/quick-login/start', async (_req, res) => {
    try {
      // Prune expired quick login sessions
      const now = Date.now();
      for (const [k, entry] of quickLoginStore.entries()) {
        if (entry.expiresAt < now) quickLoginStore.delete(k);
      }

      const createRes = await fetchRobloxPostWithCsrf(
        'https://apis.roblox.com/auth-token-service/v1/login/create',
        {},
      );
      if (!createRes.ok) {
        throw new RobloxHttpError(createRes.status);
      }

      const data = (await createRes.json()) as {
        code?: string;
        privateKey?: string;
        expirationTime?: string;
        imagePath?: string;
      };
      if (!data.code || !data.privateKey) {
        return res.status(502).json({ error: 'Roblox Quick Login did not return a login code.' });
      }

      // Fetch official QR PNG directly from Roblox
      let qrDataUrl: string | undefined;
      if (data.imagePath && data.imagePath.startsWith('/v1/login/qr-code-image')) {
        try {
          const qrRes = await fetch(
            `https://apis.roblox.com/auth-token-service${data.imagePath}`,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LunarForRoblox/1.0',
              },
              signal: AbortSignal.timeout(6000),
            },
          );
          if (qrRes.ok) {
            const buf = Buffer.from(await qrRes.arrayBuffer());
            qrDataUrl = `data:image/png;base64,${buf.toString('base64')}`;
          }
        } catch {
          // QR optional; 6-character code still works cleanly
        }
      }

      const quickSessionId = crypto.randomBytes(20).toString('hex');
      const expiresAt = data.expirationTime
        ? Math.max(now + 60_000, new Date(data.expirationTime).getTime())
        : now + 5 * 60_000;
      quickLoginStore.set(quickSessionId, {
        code: data.code,
        privateKey: data.privateKey,
        expiresAt,
      });

      return res.json({
        quickSessionId,
        code: data.code,
        formattedCode: formatQuickLoginCode(data.code),
        qrDataUrl,
        expiresAt,
        confirmUrl: 'https://www.roblox.com/crossdevicelogin/ConfirmCode',
      });
    } catch (err) {
      return res.status(502).json({
        error: 'Unable to start Roblox Quick Login right now.',
        detail: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  app.post('/api/roblox/auth/quick-login/poll', async (req, res) => {
    try {
      const quickSessionId = typeof req.body?.quickSessionId === 'string' ? req.body.quickSessionId.trim() : '';
      if (!/^[a-f0-9]{40}$/i.test(quickSessionId)) {
        return res.status(400).json({ error: 'Invalid Quick Login session.' });
      }
      const entry = quickLoginStore.get(quickSessionId);
      if (!entry || entry.expiresAt < Date.now()) {
        quickLoginStore.delete(quickSessionId);
        return res.json({ status: 'Expired', completed: false });
      }

      const statusRes = await fetchRobloxPostWithCsrf(
        'https://apis.roblox.com/auth-token-service/v1/login/status',
        { code: entry.code, privateKey: entry.privateKey },
      );
      if (!statusRes.ok) {
        return res.json({ status: 'Pending', completed: false });
      }

      const statusData = (await statusRes.json()) as {
        status?: string;
        accountName?: string | null;
        accountPictureUrl?: string | null;
      };
      const status = String(statusData.status ?? 'Created');

      if (status === 'Cancelled' || status === 'Expired') {
        quickLoginStore.delete(quickSessionId);
        return res.json({ status, completed: false });
      }

      if (status !== 'Validated') {
        return res.json({
          status,
          accountName: statusData.accountName ?? undefined,
          accountPictureUrl: sanitizeRobloxImageUrl(statusData.accountPictureUrl) ?? undefined,
          completed: false,
        });
      }

      // Validated! Attempt to redeem cross-device token for an authenticated Roblox session
      quickLoginStore.delete(quickSessionId);
      let redeemedCookie: string | null = null;
      try {
        const redeemRes = await fetchRobloxPostWithCsrf(
          'https://apis.roblox.com/auth-token-service/v1/login/redeem',
          { code: entry.code, privateKey: entry.privateKey },
        );
        redeemedCookie = extractRobloSecurityFromHeaders(redeemRes.headers);
      } catch {
        // Fallback to verified public profile sync below if redeem does not return a session cookie
      }

      if (redeemedCookie) {
        try {
          const authUser = await fetchRobloxAuthedJson<{ id: number; name: string }>(
            'https://users.roblox.com/v1/users/authenticated',
            redeemedCookie,
          );
          const sessionToken = storeEncryptedRobloxSession(
            authUser.id,
            authUser.name,
            redeemedCookie,
          );
          const payload = await buildAuthenticatedAccountPayload(authUser.id, redeemedCookie);
          return res.json({
            status: 'Validated',
            completed: true,
            sessionToken,
            payload,
          });
        } catch {
          // Fall through to username resolution
        }
      }

      // If Roblox confirmed the username via Quick Login, resolve the verified account immediately
      if (statusData.accountName) {
        return res.json({
          status: 'Validated',
          completed: true,
          accountName: statusData.accountName,
        });
      }

      return res.json({ status: 'Validated', completed: true });
    } catch (err) {
      return res.status(502).json({
        error: 'Unable to check Quick Login status right now.',
        detail: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  /* ==================== 11. AUTHENTICATED COOKIE SIGN-IN / SYNC / LOGOUT ==================== */
  app.post('/api/roblox/auth/cookie', async (req, res) => {
    try {
      const cleanCookie = sanitizeRobloSecurityCookie(req.body?.cookie);
      if (!cleanCookie) {
        return res.status(400).json({
          error: 'Enter a valid .ROBLOSECURITY session token with no line breaks or semicolons.',
        });
      }

      let authUser: { id: number; name: string; displayName: string };
      try {
        authUser = await fetchRobloxAuthedJson<{ id: number; name: string; displayName: string }>(
          'https://users.roblox.com/v1/users/authenticated',
          cleanCookie,
        );
      } catch (err) {
        if (err instanceof RobloxHttpError && (err.status === 401 || err.status === 403)) {
          return res.status(401).json({
            error: 'Roblox rejected this session cookie. Make sure it is active and copied completely.',
          });
        }
        throw err;
      }

      const sessionToken = storeEncryptedRobloxSession(authUser.id, authUser.name, cleanCookie);
      const payload = await buildAuthenticatedAccountPayload(authUser.id, cleanCookie);
      return res.json({
        sessionToken,
        ...payload,
      });
    } catch (err) {
      return res.status(502).json({
        error: 'Unable to authenticate with Roblox right now.',
        detail: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  app.post('/api/roblox/auth/sync', async (req, res) => {
    try {
      const session = readEncryptedRobloxSession(req.headers.authorization);
      if (!session) {
        return res.status(401).json({
          error: 'Session expired or not authenticated. Sign in again to re-sync private data.',
        });
      }

      const payload = await buildAuthenticatedAccountPayload(session.userId, session.cookie);
      return res.json(payload);
    } catch (err) {
      if (err instanceof RobloxHttpError && (err.status === 401 || err.status === 403)) {
        const session = readEncryptedRobloxSession(req.headers.authorization);
        if (session) encryptedSessionStore.delete(session.token);
        return res.status(401).json({
          error: 'Roblox session expired. Please sign in again.',
        });
      }
      return res.status(502).json({
        error: 'Unable to sync authenticated Roblox account right now.',
        detail: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  app.post('/api/roblox/auth/logout', (req, res) => {
    const session = readEncryptedRobloxSession(req.headers.authorization);
    if (session) {
      encryptedSessionStore.delete(session.token);
    }
    return res.json({ ok: true });
  });

  /* ==================== VITE DEV MIDDLEWARE / PRODUCTION STATIC ==================== */
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lunar for Roblox server listening on http://localhost:${PORT}`);
  });
}

startServer();
