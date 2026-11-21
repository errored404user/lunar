/**
 * Pure validation, sanitization, and normalization helpers shared by the
 * Lunar for Roblox backend proxy and frontend API client.
 */

const ALLOWED_IMAGE_HOSTS = new Set([
  'tr.rbxcdn.com',
  't0.rbxcdn.com',
  't1.rbxcdn.com',
  't2.rbxcdn.com',
  't3.rbxcdn.com',
  't4.rbxcdn.com',
  't5.rbxcdn.com',
  't6.rbxcdn.com',
  't7.rbxcdn.com',
]);

/**
 * Validates that a thumbnail URL returned by Roblox is a safe HTTPS URL on Roblox's CDN.
 */
export function sanitizeRobloxImageUrl(url: unknown): string | null {
  if (typeof url !== 'string' || !url.trim()) return null;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'https:') return null;
    if (
      ALLOWED_IMAGE_HOSTS.has(parsed.hostname) ||
      parsed.hostname.endsWith('.rbxcdn.com')
    ) {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Parses and validates a positive numeric Roblox ID (placeId, universeId, userId).
 */
export function parsePositiveRobloxId(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isSafeInteger(raw) && raw > 0 ? raw : null;
  }
  if (typeof raw === 'string' && /^\d{1,16}$/.test(raw.trim())) {
    const num = Number(raw.trim());
    return Number.isSafeInteger(num) && num > 0 ? num : null;
  }
  return null;
}

/**
 * Parses a comma-separated list of positive Roblox IDs with an upper bound on count.
 */
export function parseRobloxIdList(raw: unknown, maxItems = 25): number[] {
  if (typeof raw !== 'string') return [];
  const parts = raw
    .split(',')
    .map((s) => parsePositiveRobloxId(s))
    .filter((id): id is number => id !== null);
  return Array.from(new Set(parts)).slice(0, maxItems);
}

/**
 * Sanitizes a free-text search query for upstream Roblox APIs.
 */
export function sanitizeSearchKeyword(raw: unknown, maxLength = 64): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\r\n\t]+/g, ' ').trim().slice(0, maxLength);
}

/**
 * Computes approval rating percentage from Roblox upVotes & downVotes.
 */
export function computeVoteRatingPct(upVotes: number, downVotes: number): number {
  const up = Math.max(0, Number(upVotes) || 0);
  const down = Math.max(0, Number(downVotes) || 0);
  const total = up + down;
  if (total === 0) return 0;
  return Math.round((up / total) * 100);
}

/**
 * Builds a valid native Roblox Player protocol launch URI.
 */
export function buildRobloxLaunchUri(placeId: number, gameInstanceId?: string): string {
  const safePlaceId = parsePositiveRobloxId(placeId);
  if (!safePlaceId) return 'roblox://';
  const params = new URLSearchParams({ placeId: String(safePlaceId) });
  if (gameInstanceId && /^[a-zA-Z0-9-]{8,64}$/.test(gameInstanceId)) {
    params.set('gameInstanceId', gameInstanceId);
  }
  return `roblox://experiences/start?${params.toString()}`;
}

export type ParsedRobloxIdentifier =
  | { type: 'id'; userId: number }
  | { type: 'username'; username: string };

/**
 * Validates a Roblox username (3-20 alphanumeric/underscore, single non-edge underscore)
 * or a positive numeric Roblox User ID. Strips an optional leading "@".
 */
export function parseRobloxUsernameOrId(raw: unknown): ParsedRobloxIdentifier | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const trimmed = String(raw).trim().replace(/^@+/, '');
  if (!trimmed) return null;

  const numericId = parsePositiveRobloxId(trimmed);
  if (numericId !== null) {
    return { type: 'id', userId: numericId };
  }

  // Roblox usernames: 3-20 chars, letters/digits/underscore, no leading/trailing/double underscores
  if (
    trimmed.length >= 3 &&
    trimmed.length <= 20 &&
    /^[A-Za-z0-9_]+$/.test(trimmed) &&
    !trimmed.startsWith('_') &&
    !trimmed.endsWith('_') &&
    !trimmed.includes('__')
  ) {
    return { type: 'username', username: trimmed };
  }
  return null;
}

/**
 * Maps Roblox presence API userPresenceType integer into a user-friendly status label.
 */
export function mapRobloxPresenceType(presenceType: unknown): string {
  switch (Number(presenceType)) {
    case 1:
      return 'Online';
    case 2:
      return 'In Game';
    case 3:
      return 'In Studio';
    default:
      return 'Offline';
  }
}

/**
 * Maps Roblox presence API userPresenceType integer into Lunar's friend status enum.
 */
export function mapPresenceToPlayerStatus(
  presenceType: unknown,
): 'online' | 'in-game' | 'offline' {
  switch (Number(presenceType)) {
    case 2:
      return 'in-game';
    case 1:
    case 3:
      return 'online';
    default:
      return 'offline';
  }
}

/**
 * Parses a comma-, newline-, or space-separated list of Roblox @usernames or User IDs
 * into deduplicated validated identifiers.
 */
export function parseFriendIdentifiersInput(
  raw: unknown,
  maxItems = 15,
): ParsedRobloxIdentifier[] {
  if (typeof raw !== 'string') return [];
  const tokens = raw
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const result: ParsedRobloxIdentifier[] = [];

  for (const token of tokens) {
    const parsed = parseRobloxUsernameOrId(token);
    if (!parsed) continue;
    const key =
      parsed.type === 'id' ? `id:${parsed.userId}` : `u:${parsed.username.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(parsed);
    if (result.length >= maxItems) break;
  }
  return result;
}

/**
 * Sorts friends so In-Game appear first, then Online, then Offline (alphabetical within tier).
 */
export function sortFriendsByPresence<
  T extends { status: 'online' | 'in-game' | 'offline'; displayName: string },
>(friends: T[]): T[] {
  const rank = (status: T['status']) =>
    status === 'in-game' ? 0 : status === 'online' ? 1 : 2;
  return [...friends].sort((a, b) => {
    const diff = rank(a.status) - rank(b.status);
    if (diff !== 0) return diff;
    return a.displayName.localeCompare(b.displayName);
  });
}

/**
 * Sanitizes a capture image source URL: permits local /src/assets/ paths,
 * Roblox CDN HTTPS URLs, or validated PNG/JPEG/WebP data URLs.
 */
export function sanitizeCaptureImageUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^\/src\/assets\/[a-zA-Z0-9/_.-]+\.(png|jpe?g|webp)$/i.test(trimmed)) {
    return trimmed;
  }
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(trimmed)) {
    return trimmed;
  }
  return sanitizeRobloxImageUrl(trimmed);
}

/**
 * Sanitizes a user-edited capture title.
 */
export function sanitizeCaptureTitle(raw: unknown, fallback = 'Roblox Capture'): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 80);
  return cleaned || fallback;
}

/**
 * Checks whether a Roblox profile bio contains the expected verification phrase
 * (case-insensitive, tolerant of surrounding whitespace/text).
 */
export function bioContainsVerificationCode(bio: unknown, expectedCode: string): boolean {
  if (typeof bio !== 'string' || !expectedCode.trim()) return false;
  return bio.toLowerCase().includes(expectedCode.trim().toLowerCase());
}

/**
 * Validates and sanitizes a user-supplied .ROBLOSECURITY session token.
 * Rejects control characters, newlines, and semicolons to prevent HTTP header injection.
 */
export function sanitizeRobloSecurityCookie(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let cleaned = raw.trim();
  if (cleaned.toLowerCase().startsWith('.roblosecurity=')) {
    cleaned = cleaned.slice('.roblosecurity='.length).trim();
  }
  if (cleaned.length < 20 || cleaned.length > 4000) return null;
  if (/[\r\n;\x00-\x1f\x7f]/.test(cleaned)) return null;
  return cleaned;
}

/**
 * Formats a 6-character Roblox Quick Login code for readable display (e.g., "WMG7FY" -> "WMG-7FY").
 */
export function formatQuickLoginCode(code: unknown): string {
  if (typeof code !== 'string') return '';
  const cleaned = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
  if (cleaned.length === 6) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }
  return cleaned;
}
