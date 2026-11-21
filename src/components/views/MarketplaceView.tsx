import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  BadgeCheck,
  Check,
  ChevronRight,
  ExternalLink,
  LayoutGrid,
  Loader2,
  RotateCcw,
  Save,
  Search,
  Shirt,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type {
  CatalogCategory,
  CatalogFilters,
  CatalogItem,
  CatalogSort,
  RobloxAccount,
  SaleTypeFilter,
  SavedOutfit,
  TimeRangeFilter,
  TradeOffer,
} from '../../types/lunar';
import { MARKETPLACE_TAGS } from '../../data/seedData';
import { computeCartSummary, filterCatalogItems } from '../../utils/clientLogic';
import { fetchLiveRobloxCatalog } from '../../services/robloxClient';
import {
  CatalogItemArtwork,
  FittingRoomAvatar,
  LunarLogoMark,
  RobloxAvatar,
} from '../LunarBrand';

interface MarketplaceViewProps {
  catalog: CatalogItem[];
  onRegisterLiveCatalog: (items: CatalogItem[]) => void;
  cartItemIds: string[];
  onToggleCart: (itemId: string) => void;
  onCheckoutCart: () => void;
  equipped: Partial<Record<CatalogItem['equipSlot'], string>>;
  onEquipItem: (item: CatalogItem) => void;
  onResetFittingRoom: () => void;
  savedOutfits: SavedOutfit[];
  onSaveOutfit: (name: string) => void;
  onApplyOutfit: (outfit: SavedOutfit) => void;
  trades: TradeOffer[];
  onRespondTrade: (tradeId: string, decision: 'accept' | 'decline') => void;
  accountRobux: number;
  activeAccount: RobloxAccount;
}

const CATEGORIES: CatalogCategory[] = ['All', 'Face', 'Hair', 'Hat', 'Clothing', 'Bundle', 'Accessory'];
const TIME_RANGES: TimeRangeFilter[] = ['All time', 'Past day', 'Past week', 'Past month'];
const SALE_TYPES: SaleTypeFilter[] = ['All', 'Free', 'Paid', 'Limited'];

export function MarketplaceView({
  catalog,
  onRegisterLiveCatalog,
  cartItemIds,
  onToggleCart,
  onCheckoutCart,
  equipped,
  onEquipItem,
  onResetFittingRoom,
  savedOutfits,
  onSaveOutfit,
  onApplyOutfit,
  trades,
  onRespondTrade,
  accountRobux,
  activeAccount,
}: MarketplaceViewProps) {
  const [filters, setFilters] = useState<CatalogFilters>({
    query: '',
    category: 'All',
    activeTag: null,
    sort: 'relevance',
    timeRange: 'All time',
    saleType: 'All',
    minPrice: '',
    maxPrice: '',
    creatorQuery: '',
  });
  const [liveItems, setLiveItems] = useState<CatalogItem[] | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);
  const [apiNotice, setApiNotice] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'filters' | 'fitting'>('filters');
  const [activeModal, setActiveModal] = useState<'cart' | 'trades' | 'outfits' | null>(null);
  const [outfitName, setOutfitName] = useState('');
  const [outfitError, setOutfitError] = useState('');
  const tagBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoadingLive(true);
      setApiNotice(null);
      try {
        const { items: fetched, rateLimited } = await fetchLiveRobloxCatalog(filters);
        if (!cancelled) {
          if (fetched.length > 0) {
            setLiveItems(fetched);
            onRegisterLiveCatalog(fetched);
            if (rateLimited) {
              setApiNotice('Showing cached live Roblox catalog (API momentarily rate-limited).');
            }
          } else if (rateLimited) {
            setApiNotice('Showing cached catalog (Roblox Catalog API momentarily rate-limited).');
            setLiveItems(null);
          } else {
            setLiveItems([]);
          }
        }
      } catch {
        if (!cancelled) {
          setApiNotice('Showing cached catalog (Roblox Catalog API unavailable).');
          setLiveItems(null);
        }
      } finally {
        if (!cancelled) setLoadingLive(false);
      }
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    filters.query,
    filters.category,
    filters.activeTag,
    filters.sort,
    filters.minPrice,
    filters.maxPrice,
    filters.creatorQuery,
  ]);

  const filteredItems = useMemo(() => {
    if (liveItems !== null) {
      return liveItems.filter((item) => {
        if (filters.saleType !== 'All' && item.saleType !== filters.saleType) return false;
        return true;
      });
    }
    return filterCatalogItems(catalog, filters);
  }, [liveItems, catalog, filters]);

  const combinedCatalog = useMemo(() => {
    const map = new Map<string, CatalogItem>();
    for (const c of catalog) map.set(c.id, c);
    for (const c of liveItems ?? []) map.set(c.id, c);
    return Array.from(map.values());
  }, [catalog, liveItems]);

  const cartSummary = useMemo(
    () => computeCartSummary(cartItemIds, combinedCatalog),
    [cartItemIds, combinedCatalog],
  );
  const cartItems = useMemo(
    () =>
      cartItemIds
        .map((id) => combinedCatalog.find((c) => c.id === id))
        .filter(Boolean) as CatalogItem[],
    [cartItemIds, combinedCatalog],
  );

  const handleSaveOutfit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = outfitName.trim();
    if (!trimmed) {
      setOutfitError('Enter an outfit name first.');
      return;
    }
    onSaveOutfit(trimmed);
    setOutfitName('');
    setOutfitError('');
  };

  const resetFilters = () => {
    setFilters({
      query: '',
      category: 'All',
      activeTag: null,
      sort: 'relevance',
      timeRange: 'All time',
      saleType: 'All',
      minPrice: '',
      maxPrice: '',
      creatorQuery: '',
    });
  };

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden relative">
      {/* Main Catalog Workspace powered by catalog.roblox.com + thumbnails.roblox.com */}
      <div className="flex-1 min-w-0 lg:overflow-y-auto px-5 py-4 space-y-3.5">
        {/* Top Marketplace Control Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[240px] flex items-center h-9 rounded-lg bg-[#171A23] border border-white/[0.08] focus-within:border-[#6E96FF]/60 overflow-hidden">
            <div className="flex items-center pl-2.5 pr-1 border-r border-white/[0.08] h-full shrink-0">
              <LayoutGrid className="w-3.5 h-3.5 text-[#8B94AB] mr-1.5" />
              <select
                aria-label="Catalog category"
                value={filters.category}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, category: e.target.value as CatalogCategory }))
                }
                className="bg-transparent text-xs font-medium text-[#E5E9F3] focus:outline-none pr-1 cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-[#171A23] text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center flex-1 px-2.5 gap-2 min-w-0">
              {loadingLive ? (
                <Loader2 className="w-3.5 h-3.5 text-[#7FA6FF] animate-spin shrink-0" />
              ) : (
                <Search className="w-3.5 h-3.5 text-[#6D768E] shrink-0" />
              )}
              <input
                type="search"
                value={filters.query}
                onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
                placeholder="Search live Roblox catalog..."
                aria-label="Search the catalog"
                className="w-full bg-transparent text-xs text-white placeholder:text-[#6D768E] focus:outline-none"
              />
            </div>
          </div>

          {/* Sort dropdown */}
          <div className="h-9 px-2.5 rounded-lg bg-[#171A23] border border-white/[0.08] flex items-center gap-1.5 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#8B94AB]" />
            <select
              aria-label="Sort catalog"
              value={filters.sort}
              onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as CatalogSort }))}
              className="bg-transparent text-xs font-medium text-[#E5E9F3] focus:outline-none cursor-pointer"
            >
              <option value="relevance" className="bg-[#171A23]">Relevance</option>
              <option value="popular" className="bg-[#171A23]">Most Popular</option>
              <option value="price-asc" className="bg-[#171A23]">Price: Low to High</option>
              <option value="price-desc" className="bg-[#171A23]">Price: High to Low</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setActiveModal('trades')}
            className="h-9 px-3 rounded-lg bg-[#171A23] hover:bg-[#202432] border border-white/[0.08] text-xs font-medium text-[#E2E7F4] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#9BA3B8]" />
            <span>Trades</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('outfits')}
            className="h-9 px-3 rounded-lg bg-[#171A23] hover:bg-[#202432] border border-white/[0.08] text-xs font-medium text-[#E2E7F4] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Shirt className="w-3.5 h-3.5 text-[#9BA3B8]" />
            <span>Outfits</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('cart')}
            aria-label={`Open cart with ${cartSummary.itemCount} items`}
            data-testid="marketplace-cart-btn"
            className="h-9 px-3 rounded-lg bg-[#171A23] hover:bg-[#202432] border border-white/[0.08] text-xs font-medium text-[#E2E7F4] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-[#9BA3B8]" />
            <span>Cart</span>
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#2563EB] text-[10px] font-bold text-white flex items-center justify-center font-mono-tabular">
              {cartSummary.itemCount}
            </span>
          </button>
        </div>

        {/* Scrollable Quick Tag Filters */}
        <div className="flex items-center gap-1.5">
          <div ref={tagBarRef} className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1">
            {MARKETPLACE_TAGS.map((tag) => {
              const active = filters.activeTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setFilters((f) => ({ ...f, activeTag: f.activeTag === tag ? null : tag }))
                  }
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 border ${
                    active
                      ? 'bg-[#2563EB]/25 border-[#60A5FA]/60 text-white'
                      : 'bg-[#171A23] border-white/[0.07] text-[#A2ABC2] hover:text-white hover:bg-[#1F2432]'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => tagBarRef.current?.scrollBy({ left: 180, behavior: 'smooth' })}
            aria-label="Scroll catalog tags right"
            className="w-7 h-7 rounded-full bg-[#171A23] border border-white/[0.07] flex items-center justify-center text-[#9BA3B8] hover:text-white shrink-0"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {apiNotice && <p className="text-xs text-[#FBBF24]">{apiNotice}</p>}

        {/* 4-Column Catalog Grid */}
        {loadingLive && !liveItems ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="space-y-2 animate-pulse">
                <div className="aspect-square rounded-xl bg-[#1A1D28] border border-white/[0.06]" />
                <div className="h-3.5 w-3/4 rounded bg-[#1E2230]" />
                <div className="h-3 w-1/2 rounded bg-[#191D29]" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl bg-[#151822] border border-white/[0.06] p-10 text-center">
            <p className="text-sm font-semibold text-white">No catalog items match your filters</p>
            <p className="text-xs text-[#8089A0] mt-1">
              Try clearing your price range, tag filter, or creator search.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 px-4 py-2 rounded-lg bg-[#232839] hover:bg-[#2C3348] text-xs font-medium text-white transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-6">
            {filteredItems.map((item) => {
              const inCart = cartItemIds.includes(item.id);
              const isEquipped = equipped[item.equipSlot] === item.id;

              return (
                <article key={item.id} className="group flex flex-col">
                  <div className="relative aspect-square rounded-xl bg-[#1A1D28] border border-white/[0.07] overflow-hidden flex items-center justify-center transition-colors group-hover:border-white/[0.16]">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <CatalogItemArtwork type={item.artworkType} />
                    )}

                    {item.saleType === 'Limited' && (
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-[#4338CA]/80 text-[10px] font-semibold text-[#E0E7FF]">
                        Limited
                      </span>
                    )}

                    {item.robloxAssetId && (
                      <a
                        href={
                          item.itemType === 'Bundle'
                            ? `https://www.roblox.com/bundles/${item.robloxAssetId}`
                            : `https://www.roblox.com/catalog/${item.robloxAssetId}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${item.name} on Roblox`}
                        className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 text-white/80 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {/* Hover action buttons: Try on + Add to cart */}
                    <div className="absolute inset-x-2 bottom-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => {
                          onEquipItem(item);
                          setRightTab('fitting');
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold backdrop-blur-md transition-colors ${
                          isEquipped
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-[#0E1015]/85 hover:bg-[#191E2D] text-white border border-white/10'
                        }`}
                      >
                        {isEquipped ? 'Equipped' : 'Try on'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleCart(item.id)}
                        aria-label={inCart ? `Remove ${item.name} from cart` : `Add ${item.name} to cart`}
                        className={`w-8 h-7 rounded-lg flex items-center justify-center backdrop-blur-md transition-colors ${
                          inCart
                            ? 'bg-[#16A34A] text-white'
                            : 'bg-[#0E1015]/85 hover:bg-[#191E2D] text-[#E2E7F4] border border-white/10'
                        }`}
                      >
                        {inCart ? <Check className="w-3.5 h-3.5" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 space-y-1">
                    <h3 className="text-[13px] font-medium text-[#EEF1F8] truncate">{item.name}</h3>
                    <div className="flex items-center gap-1 text-[11px] text-[#7E879E]">
                      <span className="truncate">{item.creator}</span>
                      {item.verifiedCreator && (
                        <BadgeCheck className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />
                      )}
                    </div>
                    <div className="pt-0.5 flex items-center justify-between gap-2">
                      {item.price === 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-[#132F22] border border-[#22C55E]/25 text-[11px] font-semibold text-[#4ADE80]">
                          Free
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1D2231] border border-white/[0.08] text-[11px] font-semibold text-[#E5E9F3] font-mono-tabular">
                          R$ {item.price.toLocaleString()}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onToggleCart(item.id)}
                        className="text-[11px] text-[#7F889E] hover:text-white transition-colors"
                      >
                        {inCart ? 'In cart' : '+ Cart'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Panel: Filters | Fitting room */}
      <aside className="w-full lg:w-[310px] xl:w-[332px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/[0.06] bg-[#101218] p-4 flex flex-col gap-4 lg:overflow-y-auto">
        <div role="tablist" aria-label="Marketplace tools" className="grid grid-cols-2 p-1 rounded-xl bg-[#161923] border border-white/[0.06]">
          <button
            type="button"
            role="tab"
            aria-selected={rightTab === 'filters'}
            onClick={() => setRightTab('filters')}
            className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              rightTab === 'filters'
                ? 'bg-[#262B3B] text-white shadow-sm'
                : 'text-[#8B94AB] hover:text-white'
            }`}
          >
            Filters
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={rightTab === 'fitting'}
            onClick={() => setRightTab('fitting')}
            className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              rightTab === 'fitting'
                ? 'bg-[#262B3B] text-white shadow-sm'
                : 'text-[#8B94AB] hover:text-white'
            }`}
          >
            Fitting room
          </button>
        </div>

        {rightTab === 'filters' ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="mkt-time-range" className="text-xs font-medium text-[#A8B1C7]">
                Time range
              </label>
              <select
                id="mkt-time-range"
                value={filters.timeRange}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, timeRange: e.target.value as TimeRangeFilter }))
                }
                className="w-full h-9 px-3 rounded-lg bg-[#181B25] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#6E96FF]"
              >
                {TIME_RANGES.map((t) => (
                  <option key={t} value={t} className="bg-[#181B25]">
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mkt-sale-type" className="text-xs font-medium text-[#A8B1C7]">
                Sale type
              </label>
              <select
                id="mkt-sale-type"
                value={filters.saleType}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, saleType: e.target.value as SaleTypeFilter }))
                }
                className="w-full h-9 px-3 rounded-lg bg-[#181B25] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#6E96FF]"
              >
                {SALE_TYPES.map((s) => (
                  <option key={s} value={s} className="bg-[#181B25]">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-[#A8B1C7] block">Price (Robux)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={filters.minPrice}
                  onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value }))}
                  placeholder="Min"
                  aria-label="Minimum Robux price"
                  className="w-full h-9 px-3 rounded-lg bg-[#181B25] border border-white/[0.08] text-xs text-white placeholder:text-[#667085] focus:outline-none focus:border-[#6E96FF] font-mono-tabular"
                />
                <span className="text-[#667085] text-xs">-</span>
                <input
                  type="number"
                  min={0}
                  value={filters.maxPrice}
                  onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))}
                  placeholder="Max"
                  aria-label="Maximum Robux price"
                  className="w-full h-9 px-3 rounded-lg bg-[#181B25] border border-white/[0.08] text-xs text-white placeholder:text-[#667085] focus:outline-none focus:border-[#6E96FF] font-mono-tabular"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mkt-creator" className="text-xs font-medium text-[#A8B1C7]">
                Creator
              </label>
              <input
                id="mkt-creator"
                type="text"
                value={filters.creatorQuery}
                onChange={(e) => setFilters((f) => ({ ...f, creatorQuery: e.target.value }))}
                placeholder="Creator name"
                className="w-full h-9 px-3 rounded-lg bg-[#181B25] border border-white/[0.08] text-xs text-white placeholder:text-[#667085] focus:outline-none focus:border-[#6E96FF]"
              />
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="w-full py-2 rounded-lg bg-[#181C26] hover:bg-[#222736] border border-white/[0.07] text-xs font-medium text-[#B8C0D6] hover:text-white transition-colors"
            >
              Reset filters
            </button>

            <div className="mt-auto rounded-2xl bg-[#141720] border border-white/[0.05] p-6 flex flex-col items-center justify-center min-h-[160px]">
              <LunarLogoMark className="w-20 h-20 text-white/[0.07]" />
              <p className="text-[11px] text-[#6E778E] mt-2 text-center">
                {filteredItems.length} live Roblox catalog items
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#151822] border border-white/[0.07] p-3 flex flex-col items-center">
              {activeAccount.fullBodyAvatarUrl ? (
                <div className="w-full flex flex-col items-center py-2">
                  <img
                    src={activeAccount.fullBodyAvatarUrl}
                    alt={`${activeAccount.displayName} Roblox avatar`}
                    referrerPolicy="no-referrer"
                    className="w-44 h-44 object-contain"
                  />
                  <span className="mt-1 text-[11px] font-medium text-[#93B4FF]">
                    @{activeAccount.username} · Live 3D Avatar
                  </span>
                </div>
              ) : (
                <FittingRoomAvatar equipped={equipped} catalog={combinedCatalog} />
              )}
              <div className="w-full flex items-center justify-between pt-2 border-t border-white/[0.06]">
                <span className="text-[11px] text-[#8B94AB]">
                  {Object.values(equipped).filter(Boolean).length} items equipped
                </span>
                <button
                  type="button"
                  onClick={onResetFittingRoom}
                  className="inline-flex items-center gap-1 text-[11px] text-[#9BA3B8] hover:text-white"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-[#A8B1C7]">Currently wearing</p>
              {Object.values(equipped).filter(Boolean).length === 0 ? (
                <p className="text-xs text-[#6E778E] py-2">
                  Click &ldquo;Try on&rdquo; on any catalog item to preview it live.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {(Object.entries(equipped) as [CatalogItem['equipSlot'], string | undefined][]).map(
                    ([slot, id]) => {
                      if (!id) return null;
                      const item = combinedCatalog.find((c) => c.id === id);
                      if (!item) return null;
                      return (
                        <div
                          key={slot}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#171A24] border border-white/[0.06] text-xs"
                        >
                          <span className="truncate text-[#E4E8F3]">{item.name}</span>
                          <span className="text-[10px] text-[#7E879E] capitalize ml-2">{slot}</span>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </div>

            <form onSubmit={handleSaveOutfit} className="space-y-2 pt-2 border-t border-white/[0.06]">
              <label htmlFor="save-outfit-name" className="text-xs font-medium text-[#A8B1C7] block">
                Save as custom outfit
              </label>
              <div className="flex gap-2">
                <input
                  id="save-outfit-name"
                  type="text"
                  value={outfitName}
                  onChange={(e) => {
                    setOutfitName(e.target.value);
                    setOutfitError('');
                  }}
                  placeholder="e.g. Space Explorer"
                  className="flex-1 h-9 px-3 rounded-lg bg-[#181B25] border border-white/[0.08] text-xs text-white placeholder:text-[#667085] focus:outline-none focus:border-[#6E96FF]"
                />
                <button
                  type="submit"
                  className="h-9 px-3 rounded-lg bg-white text-[#0E1015] hover:bg-[#E5ECFF] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
              {outfitError && <p className="text-[11px] text-[#F87171]">{outfitError}</p>}
            </form>
          </div>
        )}
      </aside>

      {/* Modals for Cart, Trades, and Outfits */}
      {activeModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            activeModal === 'cart'
              ? 'Shopping Cart'
              : activeModal === 'trades'
                ? 'In-App Trades'
                : 'Saved Outfits'
          }
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg rounded-2xl bg-[#151822] border border-white/[0.1] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
              <h2 className="text-sm font-semibold text-white">
                {activeModal === 'cart' && `Shopping Cart (${cartSummary.itemCount})`}
                {activeModal === 'trades' && `In-App Trades (${trades.length})`}
                {activeModal === 'outfits' && `Saved Outfits (${savedOutfits.length})`}
              </h2>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close modal"
                className="p-1.5 rounded-lg text-[#8B94AB] hover:text-white hover:bg-white/[0.06]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 max-h-[65vh] overflow-y-auto space-y-3">
              {activeModal === 'cart' && (
                <>
                  {cartItems.length === 0 ? (
                    <p className="text-xs text-[#8B94AB] py-6 text-center">
                      Your cart is empty. Add items from the Marketplace to batch purchase.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {cartItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#1B1F2C] border border-white/[0.06]"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-lg bg-[#131620] overflow-hidden shrink-0 flex items-center justify-center">
                                {item.thumbnailUrl ? (
                                  <img
                                    src={item.thumbnailUrl}
                                    alt={item.name}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-contain p-1"
                                  />
                                ) : (
                                  <CatalogItemArtwork type={item.artworkType} />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                                <p className="text-[11px] text-[#7E879E] font-mono-tabular">
                                  {item.price === 0 ? 'Free' : `R$ ${item.price.toLocaleString()}`}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onToggleCart(item.id)}
                              aria-label={`Remove ${item.name} from cart`}
                              className="p-1.5 rounded-lg text-[#8B94AB] hover:text-[#F87171] hover:bg-white/[0.05]"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="pt-3 border-t border-white/[0.07] flex items-center justify-between text-xs">
                        <span className="text-[#9BA3B8]">
                          Balance: <strong className="text-white font-mono-tabular">R$ {accountRobux.toLocaleString()}</strong>
                        </span>
                        <span className="text-white font-semibold font-mono-tabular">
                          Total: R$ {cartSummary.totalRobux.toLocaleString()}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={cartSummary.totalRobux > accountRobux}
                        onClick={() => {
                          onCheckoutCart();
                          setActiveModal(null);
                        }}
                        className="w-full py-2.5 rounded-xl bg-white text-[#0E1015] hover:bg-[#E5ECFF] disabled:opacity-40 text-xs font-semibold transition-colors"
                      >
                        {cartSummary.totalRobux > accountRobux
                          ? 'Insufficient Robux on active account'
                          : `Complete Batch Purchase (${cartSummary.itemCount} items)`}
                      </button>
                    </>
                  )}
                </>
              )}

              {activeModal === 'trades' && (
                <div className="space-y-3">
                  {trades.length === 0 ? (
                    <p className="text-xs text-[#8B94AB] py-6 text-center">No active trade offers.</p>
                  ) : (
                    trades.map((trade) => (
                      <div
                        key={trade.id}
                        className="p-3.5 rounded-xl bg-[#1A1E2B] border border-white/[0.07] space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <RobloxAvatar style={trade.partnerAvatar} size={30} />
                            <div>
                              <p className="text-xs font-semibold text-white">{trade.partnerName}</p>
                              <p className="text-[11px] text-[#7E879E]">
                                {trade.partnerHandle} · {trade.timestamp}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] font-semibold text-[#93B4FF]">
                            {trade.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5 text-xs">
                          <div className="p-2.5 rounded-lg bg-[#131620]">
                            <p className="text-[11px] text-[#7E879E]">You give</p>
                            <p className="text-white font-medium mt-1">{trade.giveItems.join(', ')}</p>
                            <p className="text-[11px] text-[#9BA3B8] font-mono-tabular mt-1">
                              R$ {trade.giveValue.toLocaleString()}
                            </p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-[#131620]">
                            <p className="text-[11px] text-[#7E879E]">You receive</p>
                            <p className="text-[#4ADE80] font-medium mt-1">{trade.receiveItems.join(', ')}</p>
                            <p className="text-[11px] text-[#4ADE80] font-mono-tabular mt-1">
                              R$ {trade.receiveValue.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {trade.status === 'Inbound' && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onRespondTrade(trade.id, 'accept')}
                              className="flex-1 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold transition-colors"
                            >
                              Accept Trade
                            </button>
                            <button
                              type="button"
                              onClick={() => onRespondTrade(trade.id, 'decline')}
                              className="flex-1 py-2 rounded-lg bg-[#4A1D24] hover:bg-[#5E242D] text-[#FCA5A5] text-xs font-semibold transition-colors"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeModal === 'outfits' && (
                <div className="space-y-2.5">
                  {savedOutfits.map((outfit) => (
                    <div
                      key={outfit.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#1A1E2B] border border-white/[0.07]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[#23283B] flex items-center justify-center text-[#93B4FF]">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{outfit.name}</p>
                          <p className="text-[11px] text-[#7E879E]">
                            {Object.values(outfit.equipped).filter(Boolean).length} items · {outfit.createdAt}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onApplyOutfit(outfit);
                          setRightTab('fitting');
                          setActiveModal(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white text-[#0E1015] hover:bg-[#E5ECFF] text-xs font-semibold whitespace-nowrap"
                      >
                        Equip Outfit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
