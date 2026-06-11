import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { spotifyAuthService } from '../services/spotifyService';

const getCallbackError = () => {
  const params = new URLSearchParams(window.location.search);
  const spotifyError = params.get('error');
  const code = params.get('code');

  if (spotifyError === 'access_denied') return 'Bạn đã hủy quyền kết nối Spotify.';
  if (spotifyError || !code) return 'Spotify không trả về mã xác thực.';
  return '';
};

export const SpotifyCallback = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const handledRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState(getCallbackError);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user || handledRef.current) return;
    handledRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (errorMessage || !code) return;

    spotifyAuthService.finishAuthorization(user.id, code, state)
      .then(() => {
        setConnected(true);
        window.setTimeout(() => navigate('/', { replace: true }), 700);
      })
      .catch(error => {
        console.error('Spotify callback error:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Không thể hoàn tất kết nối Spotify.');
      });
  }, [errorMessage, navigate, user]);

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-card">
        {errorMessage ? (
          <>
            <XCircle className="mx-auto h-10 w-10 text-semantic-destructive" />
            <h1 className="mt-3 text-lg font-extrabold text-text-main">Kết nối chưa hoàn tất</h1>
            <p className="mt-2 text-sm leading-relaxed text-text-soft">{errorMessage}</p>
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="mt-5 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-accent"
            >
              Về Dashboard
            </button>
          </>
        ) : connected ? (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-[#1ed760]" />
            <h1 className="mt-3 text-lg font-extrabold text-text-main">Đã kết nối Spotify</h1>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand" />
            <h1 className="mt-3 text-lg font-extrabold text-text-main">Đang kết nối Spotify</h1>
          </>
        )}
      </div>
    </main>
  );
};
