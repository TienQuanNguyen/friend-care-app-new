import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, LockKeyhole, Music2 } from 'lucide-react';
import { musicService } from '../services/musicService';
import type { MusicNote } from '../types';

const LOCK_MESSAGE =
  'Xin chào em thân yêu, một lời thông báo buồn đến người dùng thân yêu của anh. Giai đoạn này admin có vẻ không ổn và tinh thần không ổn định. Cậu ấy sẽ phải một mình tự chất vấn lại bản thân một khoảng thời gian đến khi nào ổn thì thôi. Trong giai đoạn này xin quý khách hãy nghe bài nhạc dưới đây để thư giãn trong lúc app khóa ạ. Anh chúc em thi tốt, luôn cầu mong sự bình an và suôn sẻ đến với em. Em sẽ làm được suôn sẻ nhất - anh tin như vậy. Vì em rất giỏi mà. Anh nhớ em';

function getSpotifyEmbedUrl(value?: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.hostname !== 'open.spotify.com') return null;

    const parts = url.pathname.split('/').filter(Boolean);
    const embedIndex = parts.indexOf('embed');
    const typeIndex = embedIndex >= 0 ? embedIndex + 1 : 0;
    const type = parts[typeIndex];
    const id = parts[typeIndex + 1];

    if (!['track', 'album', 'playlist', 'episode', 'show'].includes(type) || !id) {
      return null;
    }

    return `https://open.spotify.com/embed/${type}/${encodeURIComponent(id)}?utm_source=generator&theme=0`;
  } catch {
    return null;
  }
}

export const MaintenanceLockScreen = () => {
  const [music, setMusic] = useState<MusicNote | null>(null);
  const [isLoadingMusic, setIsLoadingMusic] = useState(true);

  useEffect(() => {
    let isMounted = true;

    musicService
      .getMusicNotes()
      .then((notes) => {
        if (!isMounted) return;
        setMusic(notes.find((note) => getSpotifyEmbedUrl(note.spotify_url)) ?? null);
      })
      .catch((error) => {
        console.error('Không thể tải bài nhạc cho màn hình khóa:', error);
      })
      .finally(() => {
        if (isMounted) setIsLoadingMusic(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const embedUrl = useMemo(() => getSpotifyEmbedUrl(music?.spotify_url), [music?.spotify_url]);

  return (
    <main className="relative min-h-screen overflow-y-auto bg-canvas px-4 py-10 sm:px-6 sm:py-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-light/60 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-gold-lightest blur-3xl"
      />

      <section className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center justify-center">
        <div className="w-full rounded-[28px] border border-white/80 bg-white/95 p-6 text-center shadow-[0_20px_60px_rgba(30,57,50,0.14)] sm:rounded-[36px] sm:p-10">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand text-white shadow-[0_12px_30px_rgba(0,98,65,0.28)] sm:h-24 sm:w-24">
            <LockKeyhole aria-hidden="true" className="h-10 w-10 sm:h-12 sm:w-12" strokeWidth={2.2} />
          </div>

          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.22em] text-brand-accent">
            Friend Care đang tạm khóa
          </p>
          <h1 className="text-2xl font-extrabold leading-tight text-brand-house sm:text-3xl">
            Một lời nhắn nhỏ gửi đến em
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-text-soft sm:text-base sm:leading-8">
            {LOCK_MESSAGE}
          </p>

          <div className="my-7 h-px bg-gradient-to-r from-transparent via-brand-light to-transparent" />

          <div className="text-left">
            <div className="mb-3 flex items-center gap-2 text-brand-house">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-light">
                <Music2 aria-hidden="true" className="h-4 w-4 text-brand" />
              </span>
              <div>
                <h2 className="text-sm font-extrabold sm:text-base">Một bài nhạc dành cho em</h2>
                <p className="text-xs text-text-soft">Bấm nút phát để nghe trong lúc chờ nhé.</p>
              </div>
            </div>

            {isLoadingMusic ? (
              <div className="flex h-[152px] items-center justify-center rounded-2xl bg-canvas-cool">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-light border-b-brand" />
                <span className="sr-only">Đang tải bài nhạc</span>
              </div>
            ) : embedUrl ? (
              <div className="overflow-hidden rounded-2xl border border-canvas-dark bg-canvas-cool shadow-sm">
                <iframe
                  src={embedUrl}
                  title="Bài nhạc Spotify dành cho em"
                  width="100%"
                  height="152"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-brand-light bg-brand-light/20 px-5 py-6 text-center">
                <Music2 aria-hidden="true" className="mx-auto mb-2 h-6 w-6 text-brand" />
                <p className="text-sm text-text-soft">Bài nhạc đang được chuẩn bị.</p>
              </div>
            )}

            {music?.spotify_url && embedUrl && (
              <a
                href={music.spotify_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-auto mt-4 flex w-fit items-center gap-1.5 rounded-full bg-brand-light/60 px-4 py-2 text-xs font-bold text-brand transition-colors hover:bg-brand-light focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
              >
                Mở trong Spotify
                <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <p className="mt-7 text-xs font-semibold text-text-soft/80">— Admin Friend Care —</p>
        </div>
      </section>
    </main>
  );
};
