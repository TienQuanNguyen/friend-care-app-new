import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Copy,
  Disc3,
  ExternalLink,
  Headphones,
  Loader2,
  Settings2,
  Unplug,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCareSpace } from '../contexts/CareSpaceContext';
import {
  getSpotifyRedirectUri,
  spotifyAuthService,
  spotifyLiveShareService,
  type SpotifyPlaybackSnapshot,
} from '../services/spotifyService';
import type { SpotifyLiveShare } from '../types';

const POLL_INTERVAL_MS = 30_000;
const LIVE_WINDOW_MS = 2 * 60_000;

export const SpotifyNowPlaying = () => {
  const { user } = useAuth();
  const { careSpace, profiles } = useCareSpace();
  const [shares, setShares] = useState<SpotifyLiveShare[]>([]);
  const [connected, setConnected] = useState(() => Boolean(user && spotifyAuthService.isConnected(user.id)));
  const [sharingEnabled, setSharingEnabled] = useState(
    () => Boolean(user && spotifyAuthService.isSharingEnabled(user.id)),
  );
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showClientSetup, setShowClientSetup] = useState(false);
  const [clientIdInput, setClientIdInput] = useState('');
  const [copiedRedirect, setCopiedRedirect] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const syncingRef = useRef(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const loadShares = useCallback(async () => {
    if (!careSpace) return;

    try {
      const data = await spotifyLiveShareService.getShares(careSpace.id);
      setShares(data);
      setErrorMessage('');
    } catch (error) {
      console.error('Error loading Spotify live shares:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Chưa thể tải trạng thái Spotify.');
    }
  }, [careSpace]);

  const upsertPlayback = useCallback(async (snapshot: SpotifyPlaybackSnapshot) => {
    if (!user || !careSpace) return;

    let updatedShare: SpotifyLiveShare | null;

    if (snapshot.spotifyItemId && snapshot.itemName && snapshot.spotifyUrl) {
      updatedShare = await spotifyLiveShareService.upsertShare({
        care_space_id: careSpace.id,
        user_id: user.id,
        sharing_enabled: true,
        is_playing: snapshot.isPlaying,
        item_type: snapshot.itemType,
        spotify_item_id: snapshot.spotifyItemId,
        item_name: snapshot.itemName,
        artist_name: snapshot.artistName,
        album_name: snapshot.albumName,
        album_image_url: snapshot.albumImageUrl,
        spotify_url: snapshot.spotifyUrl,
        progress_ms: snapshot.progressMs,
        duration_ms: snapshot.durationMs,
        captured_at: snapshot.capturedAt,
      });
    } else {
      updatedShare = await spotifyLiveShareService.updatePlaybackStatus({
        careSpaceId: careSpace.id,
        userId: user.id,
        isPlaying: false,
        capturedAt: snapshot.capturedAt,
      });
    }

    if (updatedShare) {
      setShares(current => [
        updatedShare,
        ...current.filter(share => share.user_id !== updatedShare.user_id),
      ]);
    }
  }, [careSpace, user]);

  const syncPlayback = useCallback(async () => {
    if (!user || !careSpace || !connected || !sharingEnabled || syncingRef.current) return;

    syncingRef.current = true;
    setSyncing(true);

    try {
      const playback = await spotifyAuthService.getCurrentPlayback(user.id);
      await upsertPlayback(playback);
      setErrorMessage('');
    } catch (error) {
      console.error('Error syncing Spotify playback:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể đồng bộ Spotify.');
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [careSpace, connected, sharingEnabled, upsertPlayback, user]);

  useEffect(() => {
    if (!careSpace) return;

    const initialLoadId = window.setTimeout(() => void loadShares(), 0);
    const channel = spotifyLiveShareService.subscribe(careSpace.id, () => {
      void loadShares();
    });

    return () => {
      window.clearTimeout(initialLoadId);
      void channel.unsubscribe();
    };
  }, [careSpace, loadShares]);

  useEffect(() => {
    if (!connected || !sharingEnabled) return;

    const initialSyncId = window.setTimeout(() => void syncPlayback(), 0);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') void syncPlayback();
    }, POLL_INTERVAL_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void syncPlayback();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearTimeout(initialSyncId);
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connected, sharingEnabled, syncPlayback]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const ownShare = useMemo(
    () => shares.find(share => share.user_id === user?.id),
    [shares, user],
  );
  const recentShares = useMemo(
    () => shares
      .filter(share => (
        share.sharing_enabled
        && share.item_name
        && share.spotify_url
      ))
      .sort((a, b) => {
        if (a.user_id === user?.id) return -1;
        if (b.user_id === user?.id) return 1;
        return Date.parse(b.updated_at) - Date.parse(a.updated_at);
      })
      .slice(0, 2),
    [shares, user],
  );
  const isCurrentlyPlaying = (share: SpotifyLiveShare) => (
    share.is_playing && now - Date.parse(share.updated_at) < LIVE_WINDOW_MS
  );
  const currentlyPlayingCount = recentShares.filter(isCurrentlyPlaying).length;
  const partnerRecentShare = recentShares.find(share => share.user_id !== user?.id);
  const displayedShare = partnerRecentShare || recentShares[0] || null;

  const connectSpotify = async () => {
    setErrorMessage('');
    if (!spotifyAuthService.isConfigured()) {
      setShowClientSetup(true);
      setShowSettings(false);
      return;
    }

    setSyncing(true);
    try {
      await spotifyAuthService.beginAuthorization();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể kết nối Spotify.');
      setSyncing(false);
    }
  };

  const saveClientIdAndConnect = async () => {
    const clientId = clientIdInput.trim();
    if (clientId.length < 10) {
      setErrorMessage('Client ID Spotify chưa hợp lệ.');
      return;
    }

    spotifyAuthService.setClientId(clientId);
    setErrorMessage('');
    setSyncing(true);
    try {
      await spotifyAuthService.beginAuthorization();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể kết nối Spotify.');
      setSyncing(false);
    }
  };

  const copyRedirectUri = async () => {
    try {
      await navigator.clipboard.writeText(getSpotifyRedirectUri());
      setCopiedRedirect(true);
      window.setTimeout(() => setCopiedRedirect(false), 1500);
    } catch {
      setErrorMessage('Không thể sao chép. Hãy chọn và sao chép Redirect URI thủ công.');
    }
  };

  const updateSharing = async (enabled: boolean) => {
    if (!user || !careSpace) return;
    if (enabled && !connected) {
      await connectSpotify();
      return;
    }

    spotifyAuthService.setSharingEnabled(user.id, enabled);
    setSharingEnabled(enabled);
    setErrorMessage('');

    try {
      if (enabled) {
        const playback = await spotifyAuthService.getCurrentPlayback(user.id);
        await upsertPlayback(playback);
      } else {
        const updatedShare = await spotifyLiveShareService.upsertShare({
          care_space_id: careSpace.id,
          user_id: user.id,
          sharing_enabled: false,
          is_playing: false,
          item_type: ownShare?.item_type,
          spotify_item_id: ownShare?.spotify_item_id,
          item_name: ownShare?.item_name,
          artist_name: ownShare?.artist_name,
          album_name: ownShare?.album_name,
          album_image_url: ownShare?.album_image_url,
          spotify_url: ownShare?.spotify_url,
          progress_ms: ownShare?.progress_ms,
          duration_ms: ownShare?.duration_ms,
          captured_at: new Date().toISOString(),
        });
        setShares(current => [
          updatedShare,
          ...current.filter(share => share.user_id !== user.id),
        ]);
      }
    } catch (error) {
      console.error('Error updating Spotify sharing:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể đổi trạng thái chia sẻ.');
    }
  };

  const disconnectSpotify = async () => {
    if (!user || !careSpace) return;
    setSyncing(true);

    try {
      await spotifyLiveShareService.upsertShare({
        care_space_id: careSpace.id,
        user_id: user.id,
        sharing_enabled: false,
        is_playing: false,
        captured_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error disabling Spotify share:', error);
    } finally {
      spotifyAuthService.disconnect(user.id);
      setConnected(false);
      setSharingEnabled(false);
      setShowSettings(false);
      setSyncing(false);
      void loadShares();
    }
  };

  return createPortal(
    <div ref={popoverRef} className="fixed right-3 top-20 z-50 md:right-5 md:top-5">
      <button
        type="button"
        onClick={() => setIsOpen(current => !current)}
        className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#111713] text-white shadow-[0_6px_18px_rgba(0,0,0,0.2)] transition-transform hover:scale-105 active:scale-95"
        title="Bài hát đang nghe"
        aria-label="Bài hát đang nghe"
        aria-expanded={isOpen}
      >
        {displayedShare?.album_image_url ? (
          <img src={displayedShare.album_image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <Disc3 className={sharingEnabled && connected ? 'h-5 w-5 vinyl-spin text-[#1ed760]' : 'h-5 w-5 text-[#1ed760]'} />
        )}
        <span
          className={`absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#111713] ${
            currentlyPlayingCount > 0 ? 'bg-[#1ed760]' : displayedShare ? 'bg-amber-300' : 'bg-white/45'
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 top-14 overflow-hidden rounded-xl bg-[#111713] text-white shadow-[0_14px_38px_rgba(0,0,0,0.28)] ${
            recentShares.length === 2
              ? 'w-[min(380px,calc(100vw-24px))]'
              : 'w-[min(290px,calc(100vw-24px))]'
          }`}
        >
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1ed760] text-[#07130a]">
              <Disc3 className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase text-white/45">Spotify</p>
              <p className="truncate text-xs font-extrabold">
                {currentlyPlayingCount === 2
                  ? 'Cả hai đang nghe'
                  : currentlyPlayingCount === 1
                    ? 'Bài hát đang nghe'
                    : 'Bài hát đã nghe gần đây'}
              </p>
            </div>
            {syncing && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/50" />}
            <button
              type="button"
              onClick={() => setShowSettings(current => !current)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/55 hover:bg-white/10 hover:text-white"
              title="Cài đặt Spotify"
              aria-label="Cài đặt Spotify"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/55 hover:bg-white/10 hover:text-white"
              title="Đóng"
              aria-label="Đóng"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {recentShares.length > 0 ? (
            <div className={`grid ${recentShares.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {recentShares.map((share, index) => {
                const profile = profiles.find(item => item.user_id === share.user_id);
                const isOwnShare = share.user_id === user?.id;
                const isPlayingNow = isCurrentlyPlaying(share);

                return (
                  <a
                    key={share.id}
                    href={share.spotify_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group min-w-0 p-3 hover:bg-white/[0.04] ${
                      recentShares.length === 2 && index === 0 ? 'border-r border-white/10' : ''
                    }`}
                    title={`Mở bài của ${isOwnShare ? 'bạn' : profile?.display_name || 'người ấy'} trên Spotify`}
                  >
                    <span className="mb-2 flex items-center gap-1.5">
                      <span className="text-sm leading-none">{profile?.avatar_emoji || '🎧'}</span>
                      <span className="min-w-0 flex-1 truncate text-[9px] font-bold text-white/55">
                        {isOwnShare ? 'Bạn' : profile?.display_name || 'Người ấy'}
                      </span>
                      <span className={`inline-flex shrink-0 items-center gap-1 text-[8px] font-bold ${
                        isPlayingNow ? 'text-[#1ed760]' : 'text-white/40'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          isPlayingNow ? 'bg-[#1ed760]' : 'bg-white/30'
                        }`} />
                        {isPlayingNow ? 'Đang nghe' : 'Đã nghe'}
                      </span>
                      <ExternalLink className="h-3 w-3 shrink-0 text-white/30 group-hover:text-[#1ed760]" />
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      {share.album_image_url ? (
                        <img src={share.album_image_url} alt="" className="h-11 w-11 shrink-0 rounded-md object-cover" />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white/10">
                          <Headphones className="h-4 w-4 text-white/70" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-extrabold">{share.item_name}</span>
                        <span className="mt-0.5 block truncate text-[9px] text-white/50">
                          {share.artist_name || share.album_name || 'Spotify'}
                        </span>
                      </span>
                    </span>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="p-3">
              <p className="text-[11px] leading-relaxed text-white/55">
                {connected && sharingEnabled
                  ? 'Đang chờ bài nhạc được phát trên Spotify.'
                  : 'Chưa kết nối Spotify.'}
              </p>
              {!connected && !showClientSetup && (
                <button
                  type="button"
                  onClick={() => void connectSpotify()}
                  disabled={syncing}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#1ed760] px-3 py-1.5 text-[11px] font-extrabold text-[#07130a] hover:bg-[#35e776] disabled:opacity-60"
                >
                  <Headphones className="h-3.5 w-3.5" />
                  Kết nối Spotify
                </button>
              )}
            </div>
          )}

          {showClientSetup && !connected && (
            <div className="border-t border-white/10 p-3">
              <label htmlFor="spotify-client-id" className="text-[10px] font-bold text-white/65">
                Spotify Client ID
              </label>
              <input
                id="spotify-client-id"
                type="text"
                value={clientIdInput}
                onChange={event => setClientIdInput(event.target.value)}
                placeholder="Nhập Client ID"
                autoComplete="off"
                className="mt-1.5 w-full rounded-md border border-white/15 bg-white/10 px-2.5 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-[#1ed760]"
              />
              <div className="mt-2">
                <p className="text-[9px] font-semibold text-white/45">Redirect URI</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <code className="min-w-0 flex-1 truncate rounded-md bg-black/25 px-2 py-1.5 text-[9px] text-white/60">
                    {getSpotifyRedirectUri()}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyRedirectUri()}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10 text-white/60 hover:text-white"
                    title="Sao chép Redirect URI"
                    aria-label="Sao chép Redirect URI"
                  >
                    {copiedRedirect ? <Check className="h-3.5 w-3.5 text-[#1ed760]" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <a
                  href="https://developer.spotify.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-[#1ed760] hover:underline"
                >
                  Spotify Dashboard
                </a>
                <button
                  type="button"
                  onClick={() => void saveClientIdAndConnect()}
                  disabled={syncing}
                  className="rounded-full bg-[#1ed760] px-3 py-1.5 text-[10px] font-extrabold text-[#07130a] disabled:opacity-60"
                >
                  Lưu và kết nối
                </button>
              </div>
            </div>
          )}

          {showSettings && (
            <div className="border-t border-white/10 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold">Tự động chia sẻ</p>
                  <p className="text-[9px] text-white/45">Cập nhật khi app đang mở.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={sharingEnabled}
                  onClick={() => void updateSharing(!sharingEnabled)}
                  disabled={syncing}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                    sharingEnabled ? 'bg-[#1ed760]' : 'bg-white/20'
                  }`}
                  title={sharingEnabled ? 'Tắt chia sẻ' : 'Bật chia sẻ'}
                >
                  <span
                    className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-transform ${
                      sharingEnabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {connected && (
                <button
                  type="button"
                  onClick={() => void disconnectSpotify()}
                  disabled={syncing}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-bold text-white/50 hover:text-white"
                >
                  <Unplug className="h-3 w-3" />
                  Ngắt kết nối
                </button>
              )}
            </div>
          )}

          {errorMessage && (
            <p className="border-t border-white/10 px-3 py-2 text-[9px] leading-relaxed text-rose-300">
              {errorMessage}
            </p>
          )}
        </div>
      )}
    </div>,
    document.body,
  );
};
