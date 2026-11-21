import React, { useEffect, useState } from 'react';
import {
  BadgeCheck,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';
import type { RobloxAccount, RobloxPlayer } from '../../types/lunar';
import {
  checkRobloxBioVerification,
  pollRobloxQuickLogin,
  resolveLiveRobloxAccount,
  searchLiveRobloxPlayers,
  signInWithRobloxCookie,
  startRobloxBioVerification,
  startRobloxQuickLogin,
  syncAuthenticatedRobloxAccount,
  type QuickLoginStartResponse,
  type ResolvedRobloxAccountPayload,
} from '../../services/robloxClient';
import { LunarLogoMark, RobloxAvatar } from '../LunarBrand';

type AuthTab = 'roblox-login' | 'quick-qr' | 'cookie' | 'public';

interface AccountConnectModalProps {
  open: boolean;
  onClose: () => void;
  accounts: RobloxAccount[];
  activeAccountId: string;
  sessionTokens: Record<string, string>;
  onAccountLinked: (
    payload: ResolvedRobloxAccountPayload,
    authMode?: RobloxAccount['authMode'],
    sessionToken?: string,
  ) => void;
  onMarkAccountVerified: (accountId: string) => void;
  onSwitchAccount: (accountId: string) => void;
  onRemoveAccount: (accountId: string) => void;
  onClearDemoAccounts: () => void;
}

interface ActiveBioChallenge {
  accountId: string;
  userId: number;
  username: string;
  code: string;
  profileSettingsUrl: string;
}

function RobloxTiltMark({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path
        d="M8.6 2.5L29.5 8.1L23.9 29L3 23.4L8.6 2.5ZM14.3 12.1L12.7 18.1L18.7 19.7L20.3 13.7L14.3 12.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function RobuxMiniIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M8 1.5L13.6 4.75V11.25L8 14.5L2.4 11.25V4.75L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <rect x="6.2" y="6.2" width="3.6" height="3.6" rx="0.5" fill="currentColor" />
    </svg>
  );
}

export function AccountConnectModal({
  open,
  onClose,
  accounts,
  activeAccountId,
  sessionTokens,
  onAccountLinked,
  onMarkAccountVerified,
  onSwitchAccount,
  onRemoveAccount,
  onClearDemoAccounts,
}: AccountConnectModalProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>('roblox-login');

  // Official Roblox Login + Quick/QR shared live session state
  const [quickLogin, setQuickLogin] = useState<QuickLoginStartResponse | null>(null);
  const [quickStatus, setQuickStatus] = useState<string>('idle');
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [copiedQuickCode, setCopiedQuickCode] = useState(false);

  // Cookie auth state
  const [cookieInput, setCookieInput] = useState('');
  const [showCookie, setShowCookie] = useState(false);
  const [cookieLoading, setCookieLoading] = useState(false);
  const [cookieError, setCookieError] = useState<string | null>(null);

  // Public lookup + Bio verification state
  const [identifier, setIdentifier] = useState('');
  const [suggestions, setSuggestions] = useState<RobloxPlayer[]>([]);
  const [searchingSuggestions, setSearchingSuggestions] = useState(false);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState<string | null>(null);
  const [bioChallenge, setBioChallenge] = useState<ActiveBioChallenge | null>(null);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioMessage, setBioMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null,
  );
  const [copiedBioCode, setCopiedBioCode] = useState(false);

  // Right-side Saved Accounts sync state
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuickError(null);
      setCookieError(null);
      setPublicError(null);
      setSyncError(null);
      setSuggestions([]);
      setCookieInput('');
      setShowCookie(false);
    }
  }, [open]);

  // Auto-generate official Roblox QR / Quick Login code when switching to Quick / QR tab
  useEffect(() => {
    if (!open || activeTab !== 'quick-qr') return;
    if (quickLogin && quickLogin.expiresAt > Date.now() + 10_000 && quickStatus !== 'Expired') {
      return;
    }
    void handleStartQuickLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeTab]);

  // Poll Roblox Quick Login status every 2.8s while an active Quick Login session is waiting
  useEffect(() => {
    if (!open || !quickLogin) return;
    if (quickStatus === 'Validated' || quickStatus === 'Expired' || quickStatus === 'Cancelled') {
      return;
    }

    let cancelled = false;
    const interval = window.setInterval(async () => {
      try {
        const res = await pollRobloxQuickLogin(quickLogin.quickSessionId);
        if (cancelled) return;
        setQuickStatus(res.status);
        if (res.completed) {
          if (res.payload) {
            onAccountLinked(res.payload, 'roblox-authenticated', res.sessionToken);
            setQuickLogin(null);
          } else if (res.accountName) {
            const resolved = await resolveLiveRobloxAccount(res.accountName);
            if (!cancelled) {
              onAccountLinked(resolved, 'roblox-verified');
              setQuickLogin(null);
            }
          }
        }
      } catch {
        // Keep polling gracefully on transient hiccups
      }
    }, 2800);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [open, quickLogin, quickStatus, onAccountLinked]);

  // Live Roblox username autocomplete in Public tab
  useEffect(() => {
    if (!open || activeTab !== 'public') return;
    const cleaned = identifier.trim().replace(/^@+/, '');
    if (cleaned.length < 3 || /^\d+$/.test(cleaned)) {
      setSuggestions([]);
      setSearchingSuggestions(false);
      return;
    }

    let cancelled = false;
    setSearchingSuggestions(true);
    const timer = window.setTimeout(async () => {
      try {
        const matches = await searchLiveRobloxPlayers(cleaned);
        if (!cancelled) setSuggestions(matches.slice(0, 5));
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSearchingSuggestions(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [identifier, open, activeTab]);

  if (!open) return null;

  const hasLinkedRealAccount = accounts.some((a) => Boolean(a.robloxUserId));
  const hasDemoAccounts = accounts.some((a) => !a.robloxUserId);

  const handleStartQuickLogin = async () => {
    setQuickLoading(true);
    setQuickError(null);
    setQuickStatus('Starting');
    try {
      const started = await startRobloxQuickLogin();
      setQuickLogin(started);
      setQuickStatus('Created');
    } catch (err) {
      setQuickError(
        err instanceof Error ? err.message : 'Unable to start Roblox Quick Login right now.',
      );
      setQuickStatus('idle');
    } finally {
      setQuickLoading(false);
    }
  };

  const handleCookieSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = cookieInput.trim();
    if (!raw) {
      setCookieError('Paste your .ROBLOSECURITY session token first.');
      return;
    }
    setCookieLoading(true);
    setCookieError(null);
    try {
      const { sessionToken, payload } = await signInWithRobloxCookie(raw);
      onAccountLinked(payload, 'roblox-authenticated', sessionToken);
      setCookieInput('');
    } catch (err) {
      setCookieError(err instanceof Error ? err.message : 'Could not sign in with cookie.');
    } finally {
      setCookieLoading(false);
    }
  };

  const connectPublicIdentifier = async (target: string) => {
    const cleaned = target.trim();
    if (!cleaned) {
      setPublicError('Enter a Roblox username or numeric User ID.');
      return;
    }
    setPublicLoading(true);
    setPublicError(null);
    try {
      const payload = await resolveLiveRobloxAccount(cleaned);
      onAccountLinked(payload, 'roblox-linked');
      setIdentifier('');
      setSuggestions([]);
    } catch (err) {
      setPublicError(err instanceof Error ? err.message : 'Could not find Roblox account.');
    } finally {
      setPublicLoading(false);
    }
  };

  const handleSyncAccount = async (acc: RobloxAccount) => {
    setSyncingId(acc.id);
    setSyncError(null);
    try {
      const sessionToken = sessionTokens[acc.id];
      if (sessionToken) {
        const payload = await syncAuthenticatedRobloxAccount(sessionToken);
        onAccountLinked(payload, 'roblox-authenticated', sessionToken);
      } else {
        const idOrName = acc.robloxUserId ? String(acc.robloxUserId) : acc.username;
        const payload = await resolveLiveRobloxAccount(idOrName);
        onAccountLinked(
          payload,
          acc.authMode === 'roblox-verified' ? 'roblox-verified' : 'roblox-linked',
        );
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Unable to sync account right now.');
    } finally {
      setSyncingId(null);
    }
  };

  const handleStartBioVerify = async (acc: RobloxAccount) => {
    if (!acc.robloxUserId) return;
    setActiveTab('public');
    setBioLoading(true);
    setBioMessage(null);
    setCopiedBioCode(false);
    try {
      const res = await startRobloxBioVerification(acc.robloxUserId);
      setBioChallenge({
        accountId: acc.id,
        userId: acc.robloxUserId,
        username: acc.username,
        code: res.code,
        profileSettingsUrl: res.profileSettingsUrl,
      });
    } catch (err) {
      setBioMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not start bio verification.',
      });
    } finally {
      setBioLoading(false);
    }
  };

  const handleCheckBioVerify = async () => {
    if (!bioChallenge) return;
    setBioLoading(true);
    setBioMessage(null);
    try {
      const res = await checkRobloxBioVerification(bioChallenge.userId);
      if (res.verified) {
        onMarkAccountVerified(bioChallenge.accountId);
        setBioMessage({
          type: 'success',
          text: `Ownership verified for @${bioChallenge.username}! You can now clear the code from your Roblox bio.`,
        });
        setBioChallenge(null);
      } else {
        setBioMessage({
          type: 'error',
          text:
            res.error ||
            'Code not found in your Roblox About/Bio yet. Save changes on Roblox and retry.',
        });
      }
    } catch (err) {
      setBioMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not verify Roblox bio right now.',
      });
    } finally {
      setBioLoading(false);
    }
  };

  const copyText = async (text: string, onCopied: () => void) => {
    try {
      await navigator.clipboard.writeText(text);
      onCopied();
    } catch {
      // Ignore clipboard failures
    }
  };

  const tabs: Array<{ id: AuthTab; label: string; icon: React.ComponentType<{ className?: string }> }> =
    [
      { id: 'roblox-login', label: 'Roblox Login', icon: Globe },
      { id: 'quick-qr', label: 'Quick / QR', icon: QrCode },
      { id: 'cookie', label: 'Cookie', icon: KeyRound },
      { id: 'public', label: 'Public', icon: UserPlus },
    ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sign in with Roblox"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[820px] rounded-2xl bg-[#181A20] border border-white/[0.08] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-[1.58fr_1fr] max-h-[90vh]"
      >
        {/* ==================== LEFT COLUMN: SIGN IN WITH ROBLOX ==================== */}
        <div className="p-6 flex flex-col gap-5 overflow-y-auto">
          {/* Top Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#20232C] border border-white/[0.08] flex items-center justify-center shrink-0">
              <LunarLogoMark className="w-4.5 h-4.5 text-[#E5E9F2]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-white leading-tight">
                Sign in with Roblox
              </h2>
              <p className="text-xs text-[#868E9F] mt-0.5 truncate">
                Sync real Robux, friends, requests, servers &amp; multi-account launches
              </p>
            </div>
          </div>

          {/* 4-Tab Segmented Method Selector */}
          <div
            role="tablist"
            aria-label="Roblox sign-in methods"
            className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#12141A] border border-white/[0.06]"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-lg text-[11px] font-medium transition-colors ${
                    isSelected
                      ? 'bg-[#232732] text-white border border-white/[0.08] shadow-sm'
                      : 'text-[#7E879A] hover:text-[#CBD2E1] border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ==================== TAB 1: OFFICIAL ROBLOX SIGN-IN ==================== */}
          {activeTab === 'roblox-login' && (
            <div className="rounded-xl bg-[#1C1F28] border border-white/[0.07] p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#12141B] border border-white/[0.07] mx-auto flex items-center justify-center text-white">
                <RobloxTiltMark className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-[15px] font-bold text-white">Official Roblox Sign-In</h3>
                <p className="text-xs text-[#949DB0] max-w-[350px] mx-auto leading-relaxed">
                  Opens Roblox&apos;s official login page in a clean isolated window. Supports
                  passwords, 2FA, Authenticator apps, and Passkeys natively.
                </p>
              </div>

              {!quickLogin ? (
                <button
                  type="button"
                  disabled={quickLoading}
                  onClick={() => void handleStartQuickLogin()}
                  className="w-full h-11 rounded-xl bg-[#E3E6EC] hover:bg-white disabled:opacity-60 text-[#101218] text-[13px] font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  {quickLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting to Roblox.com...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Continue with Roblox.com
                    </>
                  )}
                </button>
              ) : (
                <div className="rounded-xl bg-[#13161E] border border-white/[0.08] p-4 space-y-3 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#949DB0]">
                      Official Roblox One-Time Code
                    </span>
                    <span className="text-[11px] font-medium text-[#4ADE80] inline-flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {quickStatus === 'UserLinked'
                        ? 'Confirm on Roblox.com...'
                        : 'Waiting for sign-in...'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-center py-2 rounded-lg bg-[#0D1017] border border-white/[0.08] font-mono text-lg font-bold tracking-[0.22em] text-white select-all">
                      {quickLogin.formattedCode}
                    </code>
                    <button
                      type="button"
                      onClick={() =>
                        void copyText(quickLogin.code, () => {
                          setCopiedQuickCode(true);
                          window.setTimeout(() => setCopiedQuickCode(false), 2000);
                        })
                      }
                      className="h-11 px-3 rounded-lg bg-[#232734] hover:bg-[#2C3142] text-xs font-semibold text-white inline-flex items-center gap-1.5"
                    >
                      {copiedQuickCode ? (
                        <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {copiedQuickCode ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={quickLogin.confirmUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 h-10 rounded-lg bg-[#E3E6EC] hover:bg-white text-[#101218] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Roblox.com &amp; Enter Code
                    </a>
                    <button
                      type="button"
                      onClick={() => void handleStartQuickLogin()}
                      title="Generate new code"
                      aria-label="Generate new Roblox login code"
                      className="h-10 w-10 rounded-lg bg-[#232734] hover:bg-[#2C3142] text-[#9BA3B8] hover:text-white flex items-center justify-center"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {quickError && (
                <p className="text-xs text-[#F87171] bg-[#EF4444]/10 border border-[#EF4444]/25 rounded-lg px-3 py-2 text-left">
                  {quickError}
                </p>
              )}
            </div>
          )}

          {/* ==================== TAB 2: QUICK / QR ==================== */}
          {activeTab === 'quick-qr' && (
            <div className="rounded-xl bg-[#1C1F28] border border-white/[0.07] p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Roblox Quick Login &amp; QR Code</h3>
                  <p className="text-xs text-[#949DB0] mt-0.5">
                    Scan with the Roblox mobile app or enter the 6-character code on Roblox.com
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleStartQuickLogin()}
                  disabled={quickLoading}
                  className="px-2.5 py-1.5 rounded-lg bg-[#252A38] hover:bg-[#2E3446] text-[11px] font-semibold text-[#DCE1EE] inline-flex items-center gap-1 shrink-0"
                >
                  <RefreshCw className={`w-3 h-3 ${quickLoading ? 'animate-spin' : ''}`} />
                  New Code
                </button>
              </div>

              {quickLoading && !quickLogin ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2 text-xs text-[#949DB0]">
                  <Loader2 className="w-6 h-6 text-[#60A5FA] animate-spin" />
                  <span>Generating official Roblox Quick Login code...</span>
                </div>
              ) : quickLogin ? (
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {quickLogin.qrDataUrl ? (
                    <div className="p-2.5 rounded-xl bg-white shrink-0 shadow-md">
                      <img
                        src={quickLogin.qrDataUrl}
                        alt="Official Roblox Quick Login QR code"
                        className="w-32 h-32 block"
                      />
                    </div>
                  ) : (
                    <div className="w-36 h-36 rounded-xl bg-[#13161E] border border-white/[0.08] flex items-center justify-center shrink-0">
                      <QrCode className="w-12 h-12 text-[#64748B]" />
                    </div>
                  )}

                  <div className="flex-1 w-full space-y-3">
                    <div className="space-y-1">
                      <span className="text-[11px] text-[#868E9F] block">Quick Login Code</span>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-center py-2 rounded-lg bg-[#11141C] border border-white/[0.08] font-mono text-lg font-bold tracking-[0.2em] text-white select-all">
                          {quickLogin.formattedCode}
                        </code>
                        <button
                          type="button"
                          onClick={() =>
                            void copyText(quickLogin.code, () => {
                              setCopiedQuickCode(true);
                              window.setTimeout(() => setCopiedQuickCode(false), 2000);
                            })
                          }
                          className="h-10 px-3 rounded-lg bg-[#252A38] hover:bg-[#31384A] text-xs font-semibold text-white inline-flex items-center gap-1"
                        >
                          {copiedQuickCode ? (
                            <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          {copiedQuickCode ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    <a
                      href={quickLogin.confirmUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-9 rounded-lg bg-[#E3E6EC] hover:bg-white text-[#101218] text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Roblox Quick Login Page
                    </a>

                    <p className="text-[11px] text-[#4ADE80] flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                      {quickStatus === 'UserLinked'
                        ? 'Code accepted — tap Confirm Login on your device.'
                        : quickStatus === 'Expired'
                          ? 'Code expired. Click New Code to refresh.'
                          : 'Listening for official Roblox confirmation...'}
                    </p>
                  </div>
                </div>
              ) : null}

              {quickError && (
                <p className="text-xs text-[#F87171] bg-[#EF4444]/10 border border-[#EF4444]/25 rounded-lg px-3 py-2">
                  {quickError}
                </p>
              )}
            </div>
          )}

          {/* ==================== TAB 3: SESSION COOKIE ==================== */}
          {activeTab === 'cookie' && (
            <form
              onSubmit={handleCookieSubmit}
              className="rounded-xl bg-[#1C1F28] border border-white/[0.07] p-5 space-y-4"
            >
              <div>
                <h3 className="text-sm font-bold text-white">Sign in with .ROBLOSECURITY Cookie</h3>
                <p className="text-xs text-[#949DB0] mt-1 leading-relaxed">
                  Unlocks live <strong className="text-[#DCE1EE]">Robux balance</strong>, your
                  complete <strong className="text-[#DCE1EE]">Roblox Friends list</strong>, and
                  incoming <strong className="text-[#DCE1EE]">Friend Requests</strong> directly from
                  Roblox APIs.
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="roblox-cookie-input"
                  className="text-xs font-medium text-[#C9D0E2] block"
                >
                  .ROBLOSECURITY Token
                </label>
                <div className="relative">
                  <input
                    id="roblox-cookie-input"
                    type={showCookie ? 'text' : 'password'}
                    value={cookieInput}
                    onChange={(e) => {
                      setCookieInput(e.target.value);
                      if (cookieError) setCookieError(null);
                    }}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="_|WARNING:-DO-NOT-SHARE-THIS|--..."
                    className="w-full h-10 pl-3 pr-10 rounded-lg bg-[#11141B] border border-white/[0.1] text-xs font-mono text-white placeholder-[#5D667B] focus:outline-none focus:border-[#38BDF8]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCookie((v) => !v)}
                    aria-label={showCookie ? 'Hide session cookie' : 'Show session cookie'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7E879A] hover:text-white p-1"
                  >
                    {showCookie ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={cookieLoading || !cookieInput.trim()}
                className="w-full h-10 rounded-xl bg-[#E3E6EC] hover:bg-white disabled:opacity-50 text-[#101218] text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors"
              >
                {cookieLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying with Roblox...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    Authenticate &amp; Sync Account
                  </>
                )}
              </button>

              {cookieError && (
                <p className="text-xs text-[#F87171] bg-[#EF4444]/10 border border-[#EF4444]/25 rounded-lg px-3 py-2">
                  {cookieError}
                </p>
              )}
            </form>
          )}

          {/* ==================== TAB 4: PUBLIC PROFILE + BIO VERIFY ==================== */}
          {activeTab === 'public' && (
            <div className="rounded-xl bg-[#1C1F28] border border-white/[0.07] p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Public Username / User ID Lookup</h3>
                <p className="text-xs text-[#949DB0] mt-0.5">
                  Link any Roblox profile instantly with live avatar, favorites &amp; groups — zero
                  passwords or cookies needed.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void connectPublicIdentifier(identifier);
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-[#68718A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (publicError) setPublicError(null);
                    }}
                    placeholder="Type @username or User ID..."
                    aria-label="Roblox username or User ID"
                    className="w-full h-10 pl-9 pr-8 rounded-lg bg-[#11141B] border border-white/[0.1] text-xs text-white placeholder-[#5D667B] focus:outline-none focus:border-[#38BDF8]"
                  />
                  {searchingSuggestions && (
                    <Loader2 className="w-3.5 h-3.5 text-[#60A5FA] animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                <button
                  type="submit"
                  disabled={publicLoading || !identifier.trim()}
                  className="h-10 px-4 rounded-lg bg-[#E3E6EC] hover:bg-white disabled:opacity-50 text-[#101218] text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  {publicLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  Connect
                </button>
              </form>

              {suggestions.length > 0 && (
                <div className="rounded-lg bg-[#11141B] border border-white/[0.08] divide-y divide-white/[0.05] overflow-hidden">
                  {suggestions.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      disabled={publicLoading}
                      onClick={() =>
                        void connectPublicIdentifier(
                          player.robloxUserId ? String(player.robloxUserId) : player.username,
                        )
                      }
                      className="w-full px-3 py-2 flex items-center justify-between gap-2 hover:bg-white/[0.05] text-left transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <RobloxAvatar
                          style={player.avatarStyle}
                          src={player.avatarUrl}
                          alt={player.displayName}
                          size={28}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate flex items-center gap-1">
                            <span className="truncate">{player.displayName}</span>
                            {player.verifiedBadge && (
                              <BadgeCheck className="w-3 h-3 text-[#38BDF8] shrink-0" />
                            )}
                          </p>
                          <p className="text-[11px] text-[#7E879E] truncate">@{player.username}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-[#60A5FA]">Select</span>
                    </button>
                  ))}
                </div>
              )}

              {publicError && (
                <p className="text-xs text-[#F87171] bg-[#EF4444]/10 border border-[#EF4444]/25 rounded-lg px-3 py-2">
                  {publicError}
                </p>
              )}

              {bioChallenge && (
                <div className="rounded-lg bg-[#131B2A] border border-[#38BDF8]/35 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#4ADE80]" />
                      Verify @{bioChallenge.username} via Bio
                    </p>
                    <button
                      type="button"
                      onClick={() => setBioChallenge(null)}
                      aria-label="Cancel bio verification"
                      className="text-[#8B94AB] hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-2.5 py-1.5 rounded bg-[#0D1017] font-mono text-xs text-[#93B4FF] select-all">
                      {bioChallenge.code}
                    </code>
                    <button
                      type="button"
                      onClick={() =>
                        void copyText(bioChallenge.code, () => {
                          setCopiedBioCode(true);
                          window.setTimeout(() => setCopiedBioCode(false), 2000);
                        })
                      }
                      className="px-2.5 py-1.5 rounded bg-[#232A3E] text-xs font-semibold text-white"
                    >
                      {copiedBioCode ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={bioChallenge.profileSettingsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-[#232A3E] text-[11px] text-[#DCE1EE] inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Roblox Bio Settings
                    </a>
                    <button
                      type="button"
                      onClick={() => void handleCheckBioVerify()}
                      disabled={bioLoading}
                      className="px-3 py-1.5 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-[#052E16] text-[11px] font-bold inline-flex items-center gap-1"
                    >
                      {bioLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                      Check Bio
                    </button>
                  </div>
                </div>
              )}

              {bioMessage && (
                <p
                  className={`text-xs rounded-lg px-3 py-2 border ${
                    bioMessage.type === 'success'
                      ? 'text-[#4ADE80] bg-[#22C55E]/10 border-[#22C55E]/30'
                      : 'text-[#F87171] bg-[#EF4444]/10 border-[#EF4444]/25'
                  }`}
                >
                  {bioMessage.text}
                </p>
              )}
            </div>
          )}

          {/* Bottom Emerald Security Notice Banner (matching screenshot) */}
          <div className="mt-auto rounded-xl bg-[#0F2420] border border-[#10B981]/25 px-4 py-3 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-[#7AD9B8]">
              Your session token is encrypted in server memory (AES-256-GCM) for this session only
              and never written to disk or browser storage — talking directly to official Roblox
              APIs.
            </p>
          </div>
        </div>

        {/* ==================== RIGHT COLUMN: SAVED ACCOUNTS ==================== */}
        <div className="p-6 border-t md:border-t-0 md:border-l border-white/[0.07] bg-[#16181F] flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white">
                Saved Accounts ({accounts.length})
              </h3>
              <p className="text-[11px] text-[#7E879A] mt-0.5">
                Bind different accounts to instances
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close sign in modal"
              className="p-1 rounded-lg text-[#8B94AB] hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {syncError && (
            <p className="text-[11px] text-[#F87171] bg-[#EF4444]/10 border border-[#EF4444]/25 rounded-lg px-2.5 py-1.5">
              {syncError}
            </p>
          )}

          <div className="space-y-2.5 flex-1">
            {accounts.map((acc) => {
              const isActive = acc.id === activeAccountId;
              const isAuthed = acc.authMode === 'roblox-authenticated';
              const isVerified = acc.authMode === 'roblox-verified';
              const isReal = Boolean(acc.robloxUserId);

              const statusLabel = isAuthed
                ? 'Authenticated'
                : isVerified
                  ? 'Verified Bio'
                  : isReal
                    ? 'Public Sync'
                    : 'Demo Profile';

              const statusColor = isAuthed
                ? 'text-[#22C55E]'
                : isVerified
                  ? 'text-[#4ADE80]'
                  : isReal
                    ? 'text-[#60A5FA]'
                    : 'text-[#7E879A]';

              return (
                <div
                  key={acc.id}
                  onClick={() => {
                    if (!isActive) onSwitchAccount(acc.id);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !isActive) {
                      e.preventDefault();
                      onSwitchAccount(acc.id);
                    }
                  }}
                  className={`rounded-xl border p-3.5 space-y-3 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#182230] border-[#38BDF8]/45 shadow-[0_0_0_1px_rgba(56,189,248,0.12)]'
                      : 'bg-[#1B1E27] hover:bg-[#202430] border-white/[0.06]'
                  }`}
                >
                  {/* Top Row: Avatar + Name + Verified Shield + Active Check */}
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <RobloxAvatar
                        style={acc.avatarStyle}
                        src={acc.avatarUrl}
                        alt={acc.displayName}
                        size={38}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-bold text-white truncate">
                            {acc.displayName}
                          </span>
                          {(isAuthed || isVerified) && (
                            <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                          )}
                          {acc.verifiedBadge && !isAuthed && !isVerified && (
                            <BadgeCheck className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-[#8B94AB] truncate flex items-center gap-1 mt-0.5 font-mono-tabular">
                          <span className="truncate">@{acc.username}</span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-0.5 text-[#C9D0E2]">
                            <RobuxMiniIcon className="w-3 h-3 text-[#94A3B8]" />
                            {acc.robux.toLocaleString()}
                          </span>
                        </p>
                      </div>
                    </div>

                    {isActive && <Check className="w-4 h-4 text-[#38BDF8] shrink-0" />}
                  </div>

                  {/* Bottom Row: Status + Sync + Sign Out / Remove */}
                  <div
                    className="flex items-center justify-between gap-2 pt-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className={`text-[11px] font-semibold ${statusColor}`}>
                      {statusLabel}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isReal && !isAuthed && !isVerified && (
                        <button
                          type="button"
                          onClick={() => void handleStartBioVerify(acc)}
                          className="px-2 py-1 rounded-md bg-[#222838] hover:bg-[#2C3449] text-[#9EC0FF] text-[11px] font-medium transition-colors"
                        >
                          Verify
                        </button>
                      )}

                      {isReal && (
                        <button
                          type="button"
                          onClick={() => void handleSyncAccount(acc)}
                          disabled={syncingId === acc.id}
                          className="px-2.5 py-1 rounded-md bg-[#1D3550] hover:bg-[#254468] disabled:opacity-60 text-[#60A5FA] text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <RefreshCw
                            className={`w-3 h-3 ${syncingId === acc.id ? 'animate-spin' : ''}`}
                          />
                          Sync
                        </button>
                      )}

                      {(isReal || accounts.length > 1) && (
                        <button
                          type="button"
                          onClick={() => onRemoveAccount(acc.id)}
                          aria-label={`Sign out ${acc.username}`}
                          title="Sign out & remove account"
                          className="p-1.5 rounded-md text-[#7E879A] hover:text-[#F87171] hover:bg-white/[0.06] transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasLinkedRealAccount && hasDemoAccounts && (
            <button
              type="button"
              onClick={onClearDemoAccounts}
              className="text-[11px] text-[#7E879A] hover:text-[#9EC0FF] text-left transition-colors"
            >
              Remove premade demo accounts
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
