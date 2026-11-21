import React, { useState } from 'react';
import type { AvatarStyle, CatalogItem } from '../types/lunar';

/**
 * Authentic Lunar Client pentagon-shield crescent moon mark.
 */
export function LunarLogoMark({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path
        d="M16 2.5L28 9.2V22.8L16 29.5L4 22.8V9.2L16 2.5Z"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinejoin="round"
        fill="rgba(255,255,255,0.06)"
      />
      <path
        d="M17.8 8.3C13.9 8.7 10.9 12 10.9 16C10.9 20.3 14.4 23.8 18.7 23.8C20.5 23.8 22.1 23.2 23.4 22.2C21.8 22.6 20.1 22.2 18.8 21.1C16.2 18.9 15.9 15 18 12.4C18.9 11.3 20.1 10.6 21.4 10.3C20.3 9 19.1 8.4 17.8 8.3Z"
        fill="currentColor"
      />
      <circle cx="21.2" cy="12.2" r="1.15" fill="currentColor" />
      <path
        d="M9.5 24.4H22.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

/**
 * Crisp circular/rounded Roblox-style player avatar bust matching players-1200.webp & home-1200.webp.
 * Renders the real Roblox CDN headshot when `src` is provided, falling back to the vector bust.
 */
export function RobloxAvatar({
  style,
  size = 44,
  className = '',
  src,
  alt = 'Roblox avatar',
}: {
  style: AvatarStyle;
  size?: number;
  className?: string;
  src?: string;
  alt?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        style={{ width: size, height: size }}
        className={`rounded-full shrink-0 object-cover bg-[#1D212E] select-none ${className}`}
      />
    );
  }

  const palette: Record<
    AvatarStyle,
    { bg: string; skin: string; shirt: string; hair?: string; hat?: string; accent?: string }
  > = {
    astronaut: { bg: '#262b3d', skin: '#f5d0b5', shirt: '#e2e8f0', hat: '#ef4444', accent: '#38bdf8' },
    bacon: { bg: '#232836', skin: '#d9dde6', shirt: '#334155', hair: '#9a5b25' },
    'classic-smile': { bg: '#232836', skin: '#e5e7eb', shirt: '#374151' },
    redhead: { bg: '#232836', skin: '#dce1ea', shirt: '#2b5876', hair: '#c2410c' },
    shades: { bg: '#252b3b', skin: '#f2c89b', shirt: '#f97316', hair: '#7c4a21', accent: '#f59e0b' },
    cyber: { bg: '#1e2433', skin: '#e2e8f0', shirt: '#111827', hair: '#0f172a', accent: '#38bdf8' },
    punk: { bg: '#212633', skin: '#86efac', shirt: '#1f2937', hair: '#1e293b', accent: '#ef4444' },
    cap: { bg: '#232836', skin: '#d8dde6', shirt: '#1f2937', hat: '#dc2626' },
    blonde: { bg: '#232836', skin: '#f4d3b0', shirt: '#475569', hair: '#eab308' },
    knight: { bg: '#1e2230', skin: '#cbd5e1', shirt: '#312e81', hat: '#6366f1', accent: '#818cf8' },
    neon: { bg: '#1e2232', skin: '#1f2937', shirt: '#111827', accent: '#22c55e' },
  };

  const p = palette[style] ?? palette['classic-smile'];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`rounded-full shrink-0 select-none ${className}`}
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="32" fill={p.bg} />
      {/* Torso */}
      <rect x="16" y="42" width="32" height="24" rx="7" fill={p.shirt} />
      {/* Neck */}
      <rect x="27" y="37" width="10" height="7" fill={p.skin} opacity="0.88" />
      {/* Head */}
      <rect x="19" y="16" width="26" height="24" rx="7" fill={p.skin} />

      {/* Hair styles */}
      {style === 'redhead' && (
        <>
          <path d="M16 26C16 14 23 10 32 10C41 10 48 14 48 26L46 42H41L42 25C38 22 26 22 22 25L23 42H18L16 26Z" fill={p.hair} />
          <path d="M20 17C26 12 38 12 44 17C40 21 24 21 20 17Z" fill="#ea580c" />
        </>
      )}
      {style === 'bacon' && (
        <path d="M17 24C17 14 24 10 33 10C41 10 47 15 47 24C44 21 39 20 35 21C32 17 26 18 22 22L17 24Z" fill={p.hair} />
      )}
      {style === 'blonde' && (
        <path d="M16 27C16 13 23 9 32 9C41 9 48 13 48 27L46 45H41V25C36 22 28 22 23 25V45H18L16 27Z" fill={p.hair} />
      )}
      {style === 'punk' && (
        <path d="M24 17L28 8L32 15L36 8L40 17H24Z" fill={p.hair} />
      )}
      {style === 'cyber' && (
        <path d="M18 22C19 13 26 11 34 11C42 11 46 15 46 21C41 19 25 19 18 22Z" fill={p.hair} />
      )}
      {style === 'astronaut' && (
        <>
          <path d="M17 20C18 11 24 9 32 9C40 9 46 11 47 20H17Z" fill="#dc2626" />
          <rect x="21" y="13" width="22" height="4" rx="2" fill="#f8fafc" opacity="0.85" />
        </>
      )}
      {style === 'cap' && (
        <>
          <path d="M17 22C17 13 24 10 32 10C40 10 47 13 47 22H17Z" fill="#18181b" />
          <path d="M15 21H49V24H15Z" fill="#dc2626" />
          <text x="32" y="19" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700">R</text>
        </>
      )}
      {style === 'knight' && (
        <>
          <path d="M16 25C16 13 23 9 32 9C41 9 48 13 48 25L45 27H19L16 25Z" fill="#312e81" />
          <path d="M23 19H41V24H23Z" fill="#60a5fa" opacity="0.85" />
        </>
      )}

      {/* Face / Eyes */}
      {style === 'shades' ? (
        <>
          <rect x="21" y="23" width="10" height="6" rx="1.5" fill="#f97316" stroke="#111" strokeWidth="1.2" />
          <rect x="33" y="23" width="10" height="6" rx="1.5" fill="#f97316" stroke="#111" strokeWidth="1.2" />
          <path d="M27 33C29.5 35.5 34.5 35.5 37 33" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : style === 'neon' ? (
        <>
          <path d="M22 25L30 27L22 29Z" fill="#22c55e" />
          <path d="M42 25L34 27L42 29Z" fill="#38bdf8" />
          <path d="M26 33H38" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="27" cy="26" r="2.1" fill="#111827" />
          <circle cx="37" cy="26" r="2.1" fill="#111827" />
          <path d="M26 32.5C28.5 36 35.5 36 38 32.5" stroke="#111827" strokeWidth="2" strokeLinecap="round" fill="none" />
        </>
      )}
    </svg>
  );
}

/**
 * High-contrast, crisp 3D-shaded vector renders for each Marketplace catalog item matching marketplace-1200.webp.
 */
export function CatalogItemArtwork({ type }: { type: CatalogItem['artworkType'] }) {
  switch (type) {
    case 'silly-fun':
      return (
        <svg viewBox="0 0 140 140" className="w-full h-full p-4" aria-hidden="true">
          <defs>
            <linearGradient id="headGrad1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#d7dbe3" />
              <stop offset="100%" stopColor="#9aa2b3" />
            </linearGradient>
          </defs>
          <rect x="26" y="22" width="88" height="94" rx="28" fill="url(#headGrad1)" />
          <ellipse cx="56" cy="54" rx="4.5" ry="7.5" fill="#111318" />
          <ellipse cx="84" cy="54" rx="4.5" ry="7.5" fill="#111318" />
          <path
            d="M46 74C52 94 84 94 94 74"
            stroke="#111318"
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M72 86C72 95 82 95 82 86Z" fill="#111318" />
        </svg>
      );
    case 'man-face':
      return (
        <svg viewBox="0 0 140 140" className="w-full h-full p-4" aria-hidden="true">
          <defs>
            <linearGradient id="manHead" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d8dce6" />
              <stop offset="100%" stopColor="#8d95a6" />
            </linearGradient>
          </defs>
          <rect x="24" y="22" width="92" height="94" rx="26" fill="url(#manHead)" />
          {/* Iconic arched eyebrows */}
          <path d="M36 47C45 41 55 43 60 47" stroke="#111318" strokeWidth="4.2" strokeLinecap="round" fill="none" />
          <path d="M78 47C84 43 96 41 104 47" stroke="#111318" strokeWidth="4.2" strokeLinecap="round" fill="none" />
          {/* Eyes */}
          <ellipse cx="50" cy="56" rx="10" ry="5" fill="#f8fafc" stroke="#111318" strokeWidth="2.5" />
          <circle cx="51" cy="56" r="3" fill="#111318" />
          <ellipse cx="90" cy="56" rx="10" ry="5" fill="#f8fafc" stroke="#111318" strokeWidth="2.5" />
          <circle cx="89" cy="56" r="3" fill="#111318" />
          {/* Confident smirk */}
          <path d="M48 80C62 84 82 82 94 75" stroke="#111318" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M98 84L90 102" stroke="#111318" strokeWidth="2.2" strokeLinecap="round" opacity="0.65" />
        </svg>
      );
    case 'john-bundle':
      return (
        <svg viewBox="0 0 140 140" className="w-full h-full p-3" aria-hidden="true">
          {/* Hair */}
          <path d="M55 28C57 16 74 14 82 22L85 32H55Z" fill="#18181b" />
          {/* Head */}
          <rect x="57" y="25" width="26" height="24" rx="7" fill="#f0c8a8" />
          <circle cx="65" cy="35" r="2" fill="#111" />
          <circle cx="75" cy="35" r="2" fill="#111" />
          {/* Jacket Torso */}
          <rect x="46" y="51" width="48" height="42" rx="6" fill="#1f2937" />
          <path d="M65 51H75V93H65Z" fill="#ef4444" />
          <path d="M68 51H72V93H68Z" fill="#38bdf8" />
          {/* Arms */}
          <rect x="33" y="53" width="12" height="36" rx="5" fill="#18181b" />
          <rect x="95" y="53" width="12" height="36" rx="5" fill="#18181b" />
          {/* Legs */}
          <rect x="48" y="95" width="19" height="34" rx="4" fill="#334155" />
          <rect x="73" y="95" width="19" height="34" rx="4" fill="#334155" />
        </svg>
      );
    case 'knit-sweater':
      return (
        <svg viewBox="0 0 140 140" className="w-full h-full p-4" aria-hidden="true">
          <path
            d="M44 34L60 28C65 34 75 34 80 28L96 34L116 72L100 82L91 63V112H49V63L40 82L24 72L44 34Z"
            fill="#1f222a"
            stroke="#363c4d"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M55 30C63 39 77 39 85 30" stroke="#475569" strokeWidth="3" fill="none" />
          <line x1="49" y1="104" x2="91" y2="104" stroke="#363c4d" strokeWidth="2.5" />
        </svg>
      );
    case 'roblox-cap':
      return (
        <svg viewBox="0 0 140 140" className="w-full h-full p-4" aria-hidden="true">
          <path d="M30 74C30 42 52 28 74 28C98 28 112 46 112 74H30Z" fill="#1e2028" stroke="#323746" strokeWidth="2" />
          <path d="M22 76C34 68 78 66 104 82L76 100C52 102 28 90 22 76Z" fill="#dc2626" />
          <text x="72" y="64" textAnchor="middle" fill="#f8fafc" fontSize="28" fontWeight="800" fontFamily="DM Sans">
            R
          </text>
        </svg>
      );
    case 'orange-beanie':
      return (
        <svg viewBox="0 0 140 140" className="w-full h-full p-4" aria-hidden="true">
          <path d="M40 60C38 86 44 108 58 116C64 96 68 92 78 112C94 104 100 82 96 58Z" fill="#18181b" />
          <path d="M42 56C44 30 62 22 78 24C94 26 102 42 98 60C84 52 56 50 42 56Z" fill="#ea580c" />
          <path d="M40 54C56 44 86 44 100 58" stroke="#c2410c" strokeWidth="7" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'red-hair':
      return (
        <svg viewBox="0 0 140 140" className="w-full h-full p-4" aria-hidden="true">
          <path
            d="M44 52C44 28 56 20 70 20C84 20 96 28 96 52C102 74 100 100 88 118C78 110 74 114 70 120C64 112 56 114 50 118C38 98 38 74 44 52Z"
            fill="#c2410c"
          />
          <path d="M52 34C64 26 78 26 88 36C78 46 62 46 52 34Z" fill="#f97316" />
          <path d="M48 64C54 80 54 96 52 110" stroke="#7c2d12" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M90 64C86 80 86 96 88 110" stroke="#7c2d12" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'blue-hair':
      return (
        <svg viewBox="0 0 140 140" className="w-full h-full p-4" aria-hidden="true">
          <path
            d="M22 68C36 44 64 30 98 36C112 42 116 62 112 96C98 86 82 78 68 78C56 84 44 84 38 76L22 68Z"
            fill="#1d4ed8"
          />
          <path
            d="M34 62C50 44 76 38 100 46C84 56 64 62 46 66Z"
            fill="#3b82f6"
          />
        </svg>
      );
    case 'void-fedora':
      return (
        <svg viewBox="0 0 140 140" className="w-full h-full p-4" aria-hidden="true">
          <ellipse cx="70" cy="86" rx="48" ry="15" fill="#1e1b4b" stroke="#6366f1" strokeWidth="2.5" />
          <path d="M40 82L48 40C58 34 82 34 92 40L100 82Z" fill="#1e2236" stroke="#818cf8" strokeWidth="2" />
          <path d="M42 72H98V80H42Z" fill="#6366f1" />
        </svg>
      );
    case 'gold-shades':
      return (
        <svg viewBox="0 0 140 140" className="w-full h-full p-4" aria-hidden="true">
          <rect x="20" y="54" width="42" height="28" rx="9" fill="#0f172a" stroke="#f59e0b" strokeWidth="4" />
          <rect x="78" y="54" width="42" height="28" rx="9" fill="#0f172a" stroke="#f59e0b" strokeWidth="4" />
          <line x1="62" y1="62" x2="78" y2="62" stroke="#f59e0b" strokeWidth="4" />
          <path d="M28 62L42 74" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
          <path d="M86 62L100 74" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        </svg>
      );
    case 'frost-scarf':
      return (
        <svg viewBox="0 0 140 140" className="w-full h-full p-4" aria-hidden="true">
          <rect x="28" y="46" width="84" height="28" rx="14" fill="#0284c7" stroke="#38bdf8" strokeWidth="2.5" />
          <rect x="78" y="66" width="24" height="48" rx="8" fill="#0369a1" stroke="#38bdf8" strokeWidth="2.5" />
          <line x1="36" y1="60" x2="104" y2="60" stroke="#bae6fd" strokeWidth="3" strokeDasharray="6 6" />
        </svg>
      );
    case 'valk-helm':
    default:
      return (
        <svg viewBox="0 0 140 140" className="w-full h-full p-4" aria-hidden="true">
          <path d="M40 86C40 50 52 38 70 38C88 38 100 50 100 86H40Z" fill="#1e293b" stroke="#60a5fa" strokeWidth="2.5" />
          <path d="M40 62L14 34L36 46L44 74Z" fill="#93c5fd" />
          <path d="M100 62L126 34L104 46L96 74Z" fill="#93c5fd" />
          <path d="M62 42L70 22L78 42Z" fill="#60a5fa" />
        </svg>
      );
  }
}

/**
 * Interactive full-body Roblox avatar for the Marketplace Fitting Room.
 */
export function FittingRoomAvatar({
  equipped,
  catalog,
}: {
  equipped: Partial<Record<CatalogItem['equipSlot'], string>>;
  catalog: CatalogItem[];
}) {
  const byId = new Map(catalog.map((i) => [i.id, i]));
  const faceItem = equipped.face ? byId.get(equipped.face) : undefined;
  const hairItem = equipped.hair ? byId.get(equipped.hair) : undefined;
  const hatItem = equipped.hat ? byId.get(equipped.hat) : undefined;
  const shirtItem = equipped.shirt ? byId.get(equipped.shirt) : undefined;
  const accItem = equipped.accessory ? byId.get(equipped.accessory) : undefined;

  const shirtColor = shirtItem ? shirtItem.previewColor : '#252a3b';

  return (
    <svg viewBox="0 0 200 260" className="w-full h-56 select-none" aria-label="Fitting room avatar preview">
      {/* Studio floor shadow */}
      <ellipse cx="100" cy="238" rx="54" ry="10" fill="rgba(0,0,0,0.45)" />

      {/* Legs */}
      <rect x="70" y="160" width="26" height="72" rx="6" fill="#2b3245" stroke="#3c445c" strokeWidth="1.5" />
      <rect x="104" y="160" width="26" height="72" rx="6" fill="#2b3245" stroke="#3c445c" strokeWidth="1.5" />

      {/* Arms */}
      <rect x="38" y="92" width="24" height="68" rx="7" fill={shirtColor} stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
      <rect x="138" y="92" width="24" height="68" rx="7" fill={shirtColor} stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
      {/* Hands */}
      <rect x="41" y="154" width="18" height="12" rx="4" fill="#d9dee8" />
      <rect x="141" y="154" width="18" height="12" rx="4" fill="#d9dee8" />

      {/* Torso */}
      <rect x="64" y="88" width="72" height="72" rx="9" fill={shirtColor} stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
      {shirtItem?.artworkType === 'john-bundle' && (
        <>
          <rect x="93" y="88" width="14" height="72" fill="#ef4444" />
          <rect x="98" y="88" width="4" height="72" fill="#38bdf8" />
        </>
      )}

      {/* Scarf accessory */}
      {accItem?.artworkType === 'frost-scarf' && (
        <>
          <rect x="66" y="82" width="68" height="14" rx="7" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
          <rect x="108" y="90" width="14" height="32" rx="5" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.5" />
        </>
      )}

      {/* Head */}
      <rect x="74" y="38" width="52" height="48" rx="14" fill="#d9dee8" />

      {/* Hair */}
      {hairItem && (
        <path
          d="M68 58C68 34 80 28 100 28C120 28 132 34 132 58L128 84H120V54C110 48 90 48 80 54V84H72L68 58Z"
          fill={hairItem.previewColor}
        />
      )}

      {/* Face */}
      {faceItem?.artworkType === 'man-face' ? (
        <>
          <path d="M82 54C88 50 94 52 96 54" stroke="#111827" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M104 54C108 52 114 50 118 54" stroke="#111827" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <circle cx="90" cy="60" r="2.5" fill="#111827" />
          <circle cx="110" cy="60" r="2.5" fill="#111827" />
          <path d="M89 72C98 75 108 73 113 69" stroke="#111827" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <ellipse cx="91" cy="58" rx="2.6" ry="4" fill="#111827" />
          <ellipse cx="109" cy="58" rx="2.6" ry="4" fill="#111827" />
          <path d="M88 70C93 78 107 78 112 70" stroke="#111827" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </>
      )}

      {/* Shades accessory */}
      {accItem?.artworkType === 'gold-shades' && (
        <>
          <rect x="79" y="54" width="18" height="10" rx="3" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
          <rect x="103" y="54" width="18" height="10" rx="3" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
          <line x1="97" y1="58" x2="103" y2="58" stroke="#f59e0b" strokeWidth="2" />
        </>
      )}

      {/* Hat */}
      {hatItem?.artworkType === 'roblox-cap' && (
        <>
          <path d="M72 46C72 30 85 24 100 24C115 24 128 30 128 46H72Z" fill="#1e2028" />
          <path d="M68 44H134V49H68Z" fill="#dc2626" />
          <text x="100" y="40" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800">R</text>
        </>
      )}
      {hatItem?.artworkType === 'void-fedora' && (
        <>
          <ellipse cx="100" cy="43" rx="38" ry="8" fill="#1e1b4b" stroke="#6366f1" strokeWidth="2" />
          <path d="M76 42L82 18C90 14 110 14 118 18L124 42Z" fill="#1e2236" stroke="#818cf8" strokeWidth="1.8" />
          <rect x="77" y="34" width="46" height="6" fill="#6366f1" />
        </>
      )}
      {hatItem?.artworkType === 'valk-helm' && (
        <>
          <path d="M74 44C74 26 84 20 100 20C116 20 126 26 126 44H74Z" fill="#1e293b" stroke="#60a5fa" strokeWidth="2" />
          <path d="M74 34L54 16L70 24Z" fill="#93c5fd" />
          <path d="M126 34L146 16L130 24Z" fill="#93c5fd" />
        </>
      )}
    </svg>
  );
}
