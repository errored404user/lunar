import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePerformanceProfile,
  checkInstanceLaunch,
  computeCartSummary,
  filterCatalogItems,
  filterPlayers,
  formatCompactCount,
  validateWaitlistEmail,
} from './clientLogic';
import type { CatalogFilters, CatalogItem, RobloxPlayer, RunningInstance } from '../types/lunar';

const sampleCatalog: CatalogItem[] = [
  {
    id: 'c1',
    name: 'Silly Fun',
    creator: 'Roblox',
    verifiedCreator: true,
    price: 0,
    category: 'Face',
    saleType: 'Free',
    tags: ['face', 'classic'],
    artworkType: 'silly-fun',
    popularityScore: 98,
    daysOld: 365,
    equipSlot: 'face',
    previewColor: '#e2e8f0',
  },
  {
    id: 'c2',
    name: 'Void Fedora',
    creator: 'LunarUGC',
    verifiedCreator: true,
    price: 450,
    category: 'Hat',
    saleType: 'Limited',
    tags: ['fedora', 'aura'],
    artworkType: 'void-fedora',
    popularityScore: 92,
    daysOld: 5,
    equipSlot: 'hat',
    previewColor: '#6366f1',
  },
  {
    id: 'c3',
    name: 'Knit Sweater - Black',
    creator: 'Roblox',
    verifiedCreator: true,
    price: 120,
    category: 'Clothing',
    saleType: 'Paid',
    tags: ['sweater', 'streetwear'],
    artworkType: 'knit-sweater',
    popularityScore: 84,
    daysOld: 20,
    equipSlot: 'shirt',
    previewColor: '#1f2937',
  },
];

const defaultFilters: CatalogFilters = {
  query: '',
  category: 'All',
  activeTag: null,
  sort: 'relevance',
  timeRange: 'All time',
  saleType: 'All',
  minPrice: '',
  maxPrice: '',
  creatorQuery: '',
};

test('formatCompactCount formats thousands and millions cleanly', () => {
  assert.equal(formatCompactCount(450), '450');
  assert.equal(formatCompactCount(11100), '11.1K');
  assert.equal(formatCompactCount(171200), '171.2K');
  assert.equal(formatCompactCount(2000000), '2M');
});

test('filterCatalogItems filters by tag, price range, sale type, and creator', () => {
  const byTag = filterCatalogItems(sampleCatalog, { ...defaultFilters, activeTag: 'fedora' });
  assert.equal(byTag.length, 1);
  assert.equal(byTag[0].id, 'c2');

  const byPrice = filterCatalogItems(sampleCatalog, {
    ...defaultFilters,
    minPrice: '100',
    maxPrice: '500',
    sort: 'price-desc',
  });
  assert.deepEqual(
    byPrice.map((i) => i.id),
    ['c2', 'c3'],
  );

  const byTime = filterCatalogItems(sampleCatalog, { ...defaultFilters, timeRange: 'Past week' });
  assert.deepEqual(
    byTime.map((i) => i.id),
    ['c2'],
  );

  const byCreator = filterCatalogItems(sampleCatalog, { ...defaultFilters, creatorQuery: 'lunar' });
  assert.equal(byCreator.length, 1);
  assert.equal(byCreator[0].creator, 'LunarUGC');
});

test('filterPlayers matches display name and @handle case-insensitively', () => {
  const players: RobloxPlayer[] = [
    {
      id: 'p1',
      displayName: 'Physci',
      username: 'Physci',
      avatarStyle: 'redhead',
      avatarBg: '#1b1f2a',
      status: 'online',
      isFriend: false,
      mutualFriends: 2,
      joinedYear: 2021,
    },
    {
      id: 'p2',
      displayName: 'PHYSCY',
      username: 'kyhdsde',
      avatarStyle: 'cyber',
      avatarBg: '#1b1f2a',
      status: 'offline',
      isFriend: false,
      mutualFriends: 0,
      joinedYear: 2023,
    },
  ];

  assert.equal(filterPlayers(players, '@kyhdsde').length, 1);
  assert.equal(filterPlayers(players, 'physc').length, 2);
  assert.equal(filterPlayers(players, 'nonexistent').length, 0);
});

test('computeCartSummary calculates total Robux and free items accurately', () => {
  const summary = computeCartSummary(['c1', 'c2', 'c3', 'unknown'], sampleCatalog);
  assert.deepEqual(summary, {
    totalRobux: 570,
    itemCount: 3,
    freeCount: 1,
  });
});

test('checkInstanceLaunch allows isolated multi-account instances and blocks duplicate account+game', () => {
  const active: RunningInstance[] = [
    {
      id: 'inst-1',
      pid: 48120,
      accountId: 'acc-1',
      accountUsername: 'LunarSamBlox',
      gameId: 'grow-a-garden',
      gameTitle: 'Grow a Garden',
      gameThumbnail: '',
      serverRegion: 'US-East',
      pingMs: 24,
      fpsTarget: 'unlimited',
      liveFps: 380,
      memoryMb: 640,
      startedAt: Date.now(),
      status: 'running',
      windowMode: 'Borderless',
    },
  ];

  const dup = checkInstanceLaunch(active, 'acc-1', 'grow-a-garden');
  assert.equal(dup.allowed, false);

  const multiAcc = checkInstanceLaunch(active, 'acc-2', 'grow-a-garden');
  assert.equal(multiAcc.allowed, true);
  assert.equal(multiAcc.isolatedContainerIndex, 2);

  const differentGame = checkInstanceLaunch(active, 'acc-1', 'adopt-me');
  assert.equal(differentGame.allowed, true);
});

test('calculatePerformanceProfile returns infinity badge for uncapped FPS and valid pacing', () => {
  const uncapped = calculatePerformanceProfile('unlimited', true);
  assert.equal(uncapped.badgeText, '∞');
  assert.ok(uncapped.estimatedFps >= 300);
  assert.ok(uncapped.frameTimeMs < 4);

  const capped = calculatePerformanceProfile(144, true);
  assert.equal(capped.badgeText, '144');
  assert.equal(capped.estimatedFps, 144);
});

test('validateWaitlistEmail rejects invalid or empty emails and accepts valid ones', () => {
  assert.equal(validateWaitlistEmail('').valid, false);
  assert.equal(validateWaitlistEmail('not-an-email').valid, false);
  assert.equal(validateWaitlistEmail('sam@lunar.gg').valid, true);
});
