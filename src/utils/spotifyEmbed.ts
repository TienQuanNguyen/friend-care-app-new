export type SpotifyResourceType = 'track' | 'episode' | 'show' | 'album' | 'playlist';

export interface SpotifyResource {
  type: SpotifyResourceType;
  id: string;
  canonicalUrl: string;
  embedUrl: string;
}

const SUPPORTED_RESOURCE_TYPES: SpotifyResourceType[] = [
  'track',
  'episode',
  'show',
  'album',
  'playlist',
];

const isSpotifyResourceType = (value: string): value is SpotifyResourceType =>
  SUPPORTED_RESOURCE_TYPES.includes(value as SpotifyResourceType);

export function parseSpotifyUrl(value?: string | null): SpotifyResource | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'open.spotify.com') {
      return null;
    }

    const parts = url.pathname.split('/').filter(Boolean);
    const typeIndex = parts.findIndex(isSpotifyResourceType);
    if (typeIndex < 0) return null;

    const typeCandidate = parts[typeIndex];
    const id = parts[typeIndex + 1];
    if (!isSpotifyResourceType(typeCandidate) || !id || !/^[a-zA-Z0-9]+$/.test(id)) {
      return null;
    }

    const type = typeCandidate;

    return {
      type,
      id,
      canonicalUrl: `https://open.spotify.com/${type}/${id}`,
      embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
    };
  } catch {
    return null;
  }
}

export function getSpotifyEmbedHeight(type: SpotifyResourceType): number {
  return type === 'show' || type === 'album' || type === 'playlist' ? 352 : 152;
}

export function isSpotifyPodcastType(type: SpotifyResourceType): boolean {
  return type === 'episode' || type === 'show';
}

export function getSpotifyShareTitle(type: SpotifyResourceType): string {
  if (type === 'episode') return 'Tập podcast đã chia sẻ';
  if (type === 'show') return 'Podcast đã chia sẻ';
  if (type === 'album') return 'Album đã chia sẻ';
  if (type === 'playlist') return 'Playlist đã chia sẻ';
  return 'Bài nhạc đã chia sẻ';
}

export function getSpotifyResourceLabel(type: SpotifyResourceType): string {
  if (type === 'episode') return 'tập podcast';
  if (type === 'show') return 'podcast';
  if (type === 'album') return 'album';
  if (type === 'playlist') return 'playlist';
  return 'bài nhạc';
}
