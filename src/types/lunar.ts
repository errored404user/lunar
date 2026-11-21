export type NavSection =
  | 'launchpad'
  | 'discovery'
  | 'players'
  | 'communities'
  | 'marketplace'
  | 'messages'
  | 'captures'
  | 'instances'
  | 'macros'
  | 'settings';

export type AvatarStyle =
  | 'astronaut'
  | 'bacon'
  | 'classic-smile'
  | 'redhead'
  | 'shades'
  | 'cyber'
  | 'punk'
  | 'cap'
  | 'blonde'
  | 'knight'
  | 'neon';

export interface RobloxAccount {
  id: string;
  robloxUserId?: number;
  username: string;
  displayName: string;
  robux: number;
  avatarStyle: AvatarStyle;
  avatarUrl?: string;
  fullBodyAvatarUrl?: string;
  verifiedBadge?: boolean;
  description?: string;
  createdAt?: string;
  friendsCount?: number;
  followersCount?: number;
  followingCount?: number;
  presenceLabel?: string;
  authMode?: 'roblox-authenticated' | 'roblox-verified' | 'roblox-linked' | 'demo';
  accentColor: string;
  isPremium: boolean;
  isolatedProfileDir: string;
}

export interface GameServer {
  id: string;
  region: string;
  pingMs: number;
  players: number;
  maxPlayers: number;
  fpsEstimate: number;
  uptime: string;
}

export interface RobloxGame {
  id: string;
  universeId?: number;
  placeId?: number;
  title: string;
  creator: string;
  thumbnail: string;
  bannerImage?: string;
  genre: 'Simulator' | 'Roleplay' | 'Fighting' | 'FPS' | 'Obby' | 'Sports' | 'Survival';
  playingCount: number;
  ratingPct: number;
  visitsLabel: string;
  isContinue?: boolean;
  isFavorite?: boolean;
  isPartnered?: boolean;
  description: string;
  servers: GameServer[];
  source?: 'roblox-live' | 'local';
}

export interface RobloxPlayer {
  id: string;
  robloxUserId?: number;
  displayName: string;
  username: string;
  avatarUrl?: string;
  verifiedBadge?: boolean;
  avatarStyle: AvatarStyle;
  avatarBg: string;
  status: 'online' | 'in-game' | 'offline';
  presenceLabel?: string;
  currentGameId?: string;
  currentGameTitle?: string;
  currentPlaceId?: number;
  currentUniverseId?: number;
  currentGameInstanceId?: string;
  isFriend: boolean;
  mutualFriends: number;
  joinedYear: number;
}

export interface FriendRequest {
  id: string;
  playerId: string;
  robloxUserId?: number;
  displayName: string;
  username: string;
  avatarStyle: AvatarStyle;
  avatarUrl?: string;
  sentDate: string;
}

export type CatalogCategory = 'All' | 'Face' | 'Hair' | 'Hat' | 'Clothing' | 'Bundle' | 'Accessory';
export type CatalogSort = 'relevance' | 'price-asc' | 'price-desc' | 'popular';
export type SaleTypeFilter = 'All' | 'Free' | 'Paid' | 'Limited';
export type TimeRangeFilter = 'All time' | 'Past day' | 'Past week' | 'Past month';

export interface CatalogItem {
  id: string;
  robloxAssetId?: number;
  itemType?: string;
  thumbnailUrl?: string;
  name: string;
  creator: string;
  verifiedCreator: boolean;
  price: number; // 0 = Free
  category: Exclude<CatalogCategory, 'All'>;
  saleType: 'Free' | 'Paid' | 'Limited';
  tags: string[];
  artworkType:
    | 'silly-fun'
    | 'john-bundle'
    | 'man-face'
    | 'knit-sweater'
    | 'roblox-cap'
    | 'orange-beanie'
    | 'red-hair'
    | 'blue-hair'
    | 'gold-shades'
    | 'void-fedora'
    | 'frost-scarf'
    | 'lunar-aura'
    | 'cyber-visor'
    | 'crimson-hoodie'
    | 'classic-dreads'
    | 'valk-helm';
  popularityScore: number;
  daysOld: number;
  equipSlot: 'face' | 'hair' | 'hat' | 'shirt' | 'accessory';
  previewColor: string;
}

export interface CatalogFilters {
  query: string;
  category: CatalogCategory;
  activeTag: string | null;
  sort: CatalogSort;
  timeRange: TimeRangeFilter;
  saleType: SaleTypeFilter;
  minPrice: string;
  maxPrice: string;
  creatorQuery: string;
}

export interface SavedOutfit {
  id: string;
  name: string;
  createdAt: string;
  equipped: Partial<Record<CatalogItem['equipSlot'], string>>;
}

export interface TradeOffer {
  id: string;
  partnerName: string;
  partnerHandle: string;
  partnerAvatar: AvatarStyle;
  status: 'Inbound' | 'Outbound' | 'Completed';
  giveItems: string[];
  receiveItems: string[];
  giveValue: number;
  receiveValue: number;
  timestamp: string;
}

export interface RunningInstance {
  id: string;
  pid: number;
  accountId: string;
  accountUsername: string;
  gameId: string;
  gameTitle: string;
  gameThumbnail: string;
  gameBanner?: string;
  serverRegion: string;
  pingMs: number;
  fpsTarget: number | 'unlimited';
  liveFps: number;
  memoryMb: number;
  startedAt: number;
  status: 'running' | 'paused';
  windowMode: 'Fullscreen' | 'Borderless' | 'Windowed 1280×720';
}

export interface MacroStep {
  id: string;
  key: string;
  action: 'Press' | 'Hold' | 'Click Left' | 'Wait';
  delayMs: number;
}

export interface MacroPreset {
  id: string;
  name: string;
  description: string;
  hotkey: string;
  enabled: boolean;
  repeatMode: 'Toggle Loop' | 'Hold' | 'Run Once';
  targetGame: string;
  steps: MacroStep[];
}

export interface CaptureItem {
  id: string;
  title: string;
  gameTitle: string;
  thumbnail: string;
  capturedAt: string;
  resolution: string;
  fpsAtCapture: string;
  accountUsername: string;
  source?: 'screen' | 'upload' | 'instance';
  notes?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'me' | 'them';
  text: string;
  time: string;
  gameInviteId?: string;
}

export interface ChatThread {
  id: string;
  playerId: string;
  displayName: string;
  username: string;
  avatarStyle: AvatarStyle;
  avatarUrl?: string;
  online: boolean;
  unread: number;
  messages: ChatMessage[];
}

export interface CommunityGroup {
  id: string;
  robloxGroupId?: number;
  iconUrl?: string;
  name: string;
  owner: string;
  verified: boolean;
  membersCount: number;
  category: string;
  description: string;
  joined: boolean;
  accent: string;
  shout: string;
}

export interface ClientSettings {
  fpsCap: number | 'unlimited';
  renderer: 'Vulkan' | 'Direct3D 11' | 'Metal' | 'OpenGL';
  lightingEngine: 'Future' | 'ShadowMap' | 'Voxel' | 'Compatibility';
  hardwareAcceleration: boolean;
  discordRichPresence: boolean;
  isolatedStoragePerAccount: boolean;
  secondScreenHudEnabled: boolean;
  showFpsInHud: boolean;
  showPingInHud: boolean;
  showMacroStatusInHud: boolean;
  disableTelemetry: boolean;
  lowLatencyNetwork: boolean;
}
