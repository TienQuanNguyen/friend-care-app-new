import { supabase } from '../lib/supabase';
import type { SpotifyItemType, SpotifyLiveShare } from '../types';

const SPOTIFY_AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_CURRENTLY_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing';
const SPOTIFY_SCOPE = 'user-read-currently-playing';
const PKCE_VERIFIER_KEY = 'friendcare_spotify_pkce_verifier';
const OAUTH_STATE_KEY = 'friendcare_spotify_oauth_state';
const TOKEN_KEY_PREFIX = 'friendcare_spotify_tokens_';
const SHARING_KEY_PREFIX = 'friendcare_spotify_sharing_';
const RUNTIME_CLIENT_ID_KEY = 'friendcare_spotify_client_id';

interface SpotifyTokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface SpotifyTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

interface SpotifyImage {
  url: string;
}

interface SpotifyArtist {
  name: string;
}

interface SpotifyPlaybackItem {
  id?: string;
  type?: SpotifyItemType;
  name?: string;
  duration_ms?: number;
  external_urls?: {
    spotify?: string;
  };
  artists?: SpotifyArtist[];
  album?: {
    name?: string;
    images?: SpotifyImage[];
  };
  show?: {
    name?: string;
    publisher?: string;
  };
  images?: SpotifyImage[];
}

interface SpotifyCurrentlyPlayingResponse {
  is_playing?: boolean;
  progress_ms?: number | null;
  item?: SpotifyPlaybackItem | null;
}

export interface SpotifyPlaybackSnapshot {
  isPlaying: boolean;
  itemType: SpotifyItemType | null;
  spotifyItemId: string | null;
  itemName: string | null;
  artistName: string | null;
  albumName: string | null;
  albumImageUrl: string | null;
  spotifyUrl: string | null;
  progressMs: number | null;
  durationMs: number | null;
  capturedAt: string;
}

export type SpotifyLiveShareInput = Omit<
  SpotifyLiveShare,
  'id' | 'created_at' | 'updated_at'
>;

const formatLiveShareError = (error: unknown) => {
  if (typeof error === 'object' && error !== null) {
    const code = 'code' in error ? String(error.code) : '';
    const message = 'message' in error ? String(error.message) : '';

    if (
      code === 'PGRST205'
      || code === '42P01'
      || message.includes('spotify_live_shares')
    ) {
      return new Error('Chưa tạo bảng chia sẻ Spotify trên Supabase.');
    }

    if (code === '42501') {
      return new Error('Tài khoản chưa có quyền lưu trạng thái Spotify.');
    }
  }

  return error instanceof Error ? error : new Error('Không thể lưu trạng thái Spotify.');
};

const getClientId = () =>
  import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim()
  || localStorage.getItem(RUNTIME_CLIENT_ID_KEY)?.trim()
  || '';

export const getSpotifyRedirectUri = () =>
  import.meta.env.VITE_SPOTIFY_REDIRECT_URI?.trim()
  || `${window.location.origin}/spotify/callback`;

const getTokenStorageKey = (userId: string) => `${TOKEN_KEY_PREFIX}${userId}`;
const getSharingStorageKey = (userId: string) => `${SHARING_KEY_PREFIX}${userId}`;

const generateRandomString = (length: number) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, value => alphabet[value % alphabet.length]).join('');
};

const createCodeChallenge = async (verifier: string) => {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);

  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const readTokens = (userId: string): SpotifyTokenSet | null => {
  try {
    const rawTokens = localStorage.getItem(getTokenStorageKey(userId));
    if (!rawTokens) return null;

    const tokens = JSON.parse(rawTokens) as Partial<SpotifyTokenSet>;
    if (!tokens.accessToken || !tokens.refreshToken || !tokens.expiresAt) return null;
    return tokens as SpotifyTokenSet;
  } catch {
    return null;
  }
};

const saveTokens = (userId: string, tokens: SpotifyTokenSet) => {
  localStorage.setItem(getTokenStorageKey(userId), JSON.stringify(tokens));
};

const requestToken = async (body: URLSearchParams): Promise<SpotifyTokenResponse> => {
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    throw new Error('Không thể xác thực với Spotify.');
  }

  return response.json() as Promise<SpotifyTokenResponse>;
};

const refreshAccessToken = async (userId: string, tokens: SpotifyTokenSet) => {
  const clientId = getClientId();
  if (!clientId) throw new Error('Spotify chưa được cấu hình.');

  const response = await requestToken(new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: tokens.refreshToken,
  }));

  const refreshedTokens: SpotifyTokenSet = {
    accessToken: response.access_token,
    refreshToken: response.refresh_token || tokens.refreshToken,
    expiresAt: Date.now() + response.expires_in * 1000,
  };

  saveTokens(userId, refreshedTokens);
  return refreshedTokens.accessToken;
};

const getAccessToken = async (userId: string) => {
  const tokens = readTokens(userId);
  if (!tokens) throw new Error('Spotify chưa được kết nối.');

  if (tokens.expiresAt > Date.now() + 60_000) {
    return tokens.accessToken;
  }

  return refreshAccessToken(userId, tokens);
};

const mapPlayback = (
  playback: SpotifyCurrentlyPlayingResponse | null,
): SpotifyPlaybackSnapshot => {
  const item = playback?.item || null;
  const itemType = item?.type === 'episode' ? 'episode' : item?.type === 'track' ? 'track' : null;
  const artistName = itemType === 'track'
    ? item?.artists?.map(artist => artist.name).filter(Boolean).join(', ') || null
    : item?.show?.publisher || item?.show?.name || null;
  const albumName = itemType === 'track' ? item?.album?.name || null : item?.show?.name || null;
  const albumImageUrl = itemType === 'track'
    ? item?.album?.images?.[0]?.url || null
    : item?.images?.[0]?.url || null;

  return {
    isPlaying: Boolean(playback?.is_playing && item),
    itemType,
    spotifyItemId: item?.id || null,
    itemName: item?.name || null,
    artistName,
    albumName,
    albumImageUrl,
    spotifyUrl: item?.external_urls?.spotify || null,
    progressMs: playback?.progress_ms ?? null,
    durationMs: item?.duration_ms ?? null,
    capturedAt: new Date().toISOString(),
  };
};

export const spotifyAuthService = {
  isConfigured() {
    return Boolean(getClientId());
  },

  setClientId(clientId: string) {
    localStorage.setItem(RUNTIME_CLIENT_ID_KEY, clientId.trim());
  },

  isConnected(userId: string) {
    return Boolean(readTokens(userId));
  },

  isSharingEnabled(userId: string) {
    return localStorage.getItem(getSharingStorageKey(userId)) === 'true';
  },

  setSharingEnabled(userId: string, enabled: boolean) {
    localStorage.setItem(getSharingStorageKey(userId), String(enabled));
  },

  async beginAuthorization() {
    const clientId = getClientId();
    if (!clientId) throw new Error('Spotify chưa được cấu hình.');

    const verifier = generateRandomString(64);
    const state = generateRandomString(32);
    const challenge = await createCodeChallenge(verifier);

    sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
    sessionStorage.setItem(OAUTH_STATE_KEY, state);

    const authorizationUrl = new URL(SPOTIFY_AUTHORIZE_URL);
    authorizationUrl.search = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: getSpotifyRedirectUri(),
      scope: SPOTIFY_SCOPE,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      state,
    }).toString();

    window.location.href = authorizationUrl.toString();
  },

  async finishAuthorization(userId: string, code: string, returnedState: string | null) {
    const clientId = getClientId();
    const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
    const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);

    if (!clientId || !verifier || !returnedState || returnedState !== expectedState) {
      throw new Error('Phiên kết nối Spotify không hợp lệ. Vui lòng thử lại.');
    }

    const response = await requestToken(new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: getSpotifyRedirectUri(),
      code_verifier: verifier,
    }));

    if (!response.refresh_token) {
      throw new Error('Spotify không trả về refresh token.');
    }

    saveTokens(userId, {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresAt: Date.now() + response.expires_in * 1000,
    });
    localStorage.setItem(getSharingStorageKey(userId), 'true');
    sessionStorage.removeItem(PKCE_VERIFIER_KEY);
    sessionStorage.removeItem(OAUTH_STATE_KEY);
  },

  disconnect(userId: string) {
    localStorage.removeItem(getTokenStorageKey(userId));
    localStorage.removeItem(getSharingStorageKey(userId));
  },

  async getCurrentPlayback(userId: string): Promise<SpotifyPlaybackSnapshot> {
    let accessToken = await getAccessToken(userId);
    let response = await fetch(SPOTIFY_CURRENTLY_PLAYING_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401) {
      const tokens = readTokens(userId);
      if (!tokens) throw new Error('Spotify cần được kết nối lại.');
      accessToken = await refreshAccessToken(userId, tokens);
      response = await fetch(SPOTIFY_CURRENTLY_PLAYING_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }

    if (response.status === 204) return mapPlayback(null);
    if (response.status === 429) throw new Error('Spotify đang giới hạn yêu cầu. Vui lòng thử lại sau.');
    if (!response.ok) throw new Error('Không thể đọc bài đang nghe từ Spotify.');

    return mapPlayback(await response.json() as SpotifyCurrentlyPlayingResponse);
  },
};

export const spotifyLiveShareService = {
  async getShares(careSpaceId: string): Promise<SpotifyLiveShare[]> {
    const { data, error } = await supabase
      .from('spotify_live_shares')
      .select('*')
      .eq('care_space_id', careSpaceId)
      .order('updated_at', { ascending: false });

    if (error) throw formatLiveShareError(error);
    return (data || []) as SpotifyLiveShare[];
  },

  async upsertShare(input: SpotifyLiveShareInput): Promise<SpotifyLiveShare> {
    const { data, error } = await supabase
      .from('spotify_live_shares')
      .upsert({
        ...input,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'care_space_id,user_id' })
      .select()
      .single();

    if (error) throw formatLiveShareError(error);
    return data as SpotifyLiveShare;
  },

  subscribe(careSpaceId: string, onChange: () => void) {
    return supabase
      .channel(`spotify-live-shares:${careSpaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'spotify_live_shares',
          filter: `care_space_id=eq.${careSpaceId}`,
        },
        onChange,
      )
      .subscribe();
  },
};
