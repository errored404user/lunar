import type {
  CatalogFilters,
  CatalogItem,
  RobloxPlayer,
  RunningInstance,
} from '../types/lunar';

/**
 * Formats large player/member counts concisely (e.g., 171200 -> "171.2K", 1250000 -> "1.3M").
 */
export function formatCompactCount(count: number): string {
  if (!Number.isFinite(count) || count < 0) return '0';
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return String(Math.round(count));
}

/**
 * Filters and sorts Roblox marketplace catalog items using all active toolbar and right-sidebar filters.
 */
export function filterCatalogItems(
  items: CatalogItem[],
  filters: CatalogFilters,
): CatalogItem[] {
  const q = filters.query.trim().toLowerCase();
  const creatorQ = filters.creatorQuery.trim().toLowerCase();
  const minVal = filters.minPrice.trim() === '' ? null : Number(filters.minPrice);
  const maxVal = filters.maxPrice.trim() === '' ? null : Number(filters.maxPrice);

  const maxDaysMap: Record<CatalogFilters['timeRange'], number | null> = {
    'All time': null,
    'Past day': 1,
    'Past week': 7,
    'Past month': 30,
  };
  const maxDays = maxDaysMap[filters.timeRange];

  const filtered = items.filter((item) => {
    if (filters.category !== 'All' && item.category !== filters.category) {
      return false;
    }
    if (filters.activeTag) {
      const targetTag = filters.activeTag.toLowerCase();
      const matchesTag =
        item.tags.some((t) => t.toLowerCase() === targetTag) ||
        item.name.toLowerCase().includes(targetTag);
      if (!matchesTag) return false;
    }
    if (q) {
      const inName = item.name.toLowerCase().includes(q);
      const inCreator = item.creator.toLowerCase().includes(q);
      const inTags = item.tags.some((t) => t.toLowerCase().includes(q));
      if (!inName && !inCreator && !inTags) return false;
    }
    if (creatorQ && !item.creator.toLowerCase().includes(creatorQ)) {
      return false;
    }
    if (filters.saleType !== 'All' && item.saleType !== filters.saleType) {
      return false;
    }
    if (minVal !== null && !Number.isNaN(minVal) && item.price < minVal) {
      return false;
    }
    if (maxVal !== null && !Number.isNaN(maxVal) && item.price > maxVal) {
      return false;
    }
    if (maxDays !== null && item.daysOld > maxDays) {
      return false;
    }
    return true;
  });

  const sorted = [...filtered];
  switch (filters.sort) {
    case 'price-asc':
      sorted.sort((a, b) => a.price - b.price || b.popularityScore - a.popularityScore);
      break;
    case 'price-desc':
      sorted.sort((a, b) => b.price - a.price || b.popularityScore - a.popularityScore);
      break;
    case 'popular':
      sorted.sort((a, b) => b.popularityScore - a.popularityScore);
      break;
    case 'relevance':
    default:
      break;
  }
  return sorted;
}

/**
 * Filters Roblox players by display name or @handle.
 */
export function filterPlayers(players: RobloxPlayer[], query: string): RobloxPlayer[] {
  const clean = query.trim().toLowerCase().replace(/^@/, '');
  if (!clean) return players;
  return players.filter(
    (p) =>
      p.displayName.toLowerCase().includes(clean) ||
      p.username.toLowerCase().includes(clean),
  );
}

/**
 * Computes shopping cart summary totals (total Robux, paid count, free count).
 */
export function computeCartSummary(
  cartItemIds: string[],
  catalog: CatalogItem[],
): { totalRobux: number; itemCount: number; freeCount: number } {
  const lookup = new Map(catalog.map((item) => [item.id, item]));
  let totalRobux = 0;
  let freeCount = 0;
  let itemCount = 0;

  for (const id of cartItemIds) {
    const found = lookup.get(id);
    if (!found) continue;
    itemCount += 1;
    totalRobux += found.price;
    if (found.price === 0) freeCount += 1;
  }

  return { totalRobux, itemCount, freeCount };
}

/**
 * Validates launching an isolated Roblox instance. Lunar for Roblox supports unlimited
 * isolated instances across separate accounts (and warns only if the exact same account
 * is already running in the exact same experience unless force-isolated).
 */
export function checkInstanceLaunch(
  existingInstances: RunningInstance[],
  accountId: string,
  gameId: string,
): { allowed: boolean; reason?: string; isolatedContainerIndex: number } {
  const sameAccountRunning = existingInstances.find(
    (inst) => inst.accountId === accountId && inst.gameId === gameId,
  );
  if (sameAccountRunning) {
    return {
      allowed: false,
      reason: `${sameAccountRunning.accountUsername} is already running ${sameAccountRunning.gameTitle}. Switch accounts to launch another isolated instance.`,
      isolatedContainerIndex: existingInstances.length + 1,
    };
  }
  return {
    allowed: true,
    isolatedContainerIndex: existingInstances.length + 1,
  };
}

/**
 * Computes effective FPS readout and frame pacing ms based on FPS cap & hardware acceleration.
 */
export function calculatePerformanceProfile(
  fpsCap: number | 'unlimited',
  hardwareAcceleration: boolean,
): { badgeText: string; estimatedFps: number; frameTimeMs: number } {
  if (fpsCap === 'unlimited') {
    const estimatedFps = hardwareAcceleration ? 420 : 285;
    return {
      badgeText: '∞',
      estimatedFps,
      frameTimeMs: Number((1000 / estimatedFps).toFixed(2)),
    };
  }
  const safeCap = Math.max(30, fpsCap);
  const estimatedFps = hardwareAcceleration ? safeCap : Math.min(safeCap, 120);
  return {
    badgeText: String(safeCap),
    estimatedFps,
    frameTimeMs: Number((1000 / estimatedFps).toFixed(2)),
  };
}

/**
 * Validates waitlist email address format for the lunar.gg/roblox showcase view.
 */
export function validateWaitlistEmail(email: string): { valid: boolean; error?: string } {
  const trimmed = email.trim();
  if (!trimmed) {
    return { valid: false, error: 'Please enter your email address.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Enter a valid email address (e.g. player@example.com).' };
  }
  return { valid: true };
}
