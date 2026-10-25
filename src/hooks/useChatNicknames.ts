import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeNickname, type Nicknames } from '../lib/chatNicknames';

export function useChatNicknames(spaceId: string | null, userId: string | null) {
  const [state, setState] = useState<{ spaceId: string | null; names: Nicknames; loading: boolean; error: string }>({ spaceId: null, names: {}, loading: true, error: '' });
  const sequence = useRef(0);
  const invalidateRequests = useCallback(() => { ++sequence.current; }, []);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    if (!spaceId || !userId) return;
    const { data, error } = await supabase.from('chat_nicknames').select('target_user_id,nickname').eq('care_space_id', spaceId);
    if (request !== sequence.current) return;
    setState(previous => ({ spaceId, loading: false,
      names: error ? (previous.spaceId === spaceId ? previous.names : {}) : Object.fromEntries((data || []).map(row => [row.target_user_id, row.nickname])),
      error: error ? 'Chưa tải được biệt danh. Vui lòng thử lại.' : '',
    }));
  }, [spaceId, userId]);

  useEffect(() => {
    if (!spaceId || !userId) return;
    const timer = window.setTimeout(() => void refresh(), 0);
    const channel = supabase.channel(`chat-nicknames:${spaceId}:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_nicknames', filter: `care_space_id=eq.${spaceId}` }, () => void refresh())
      .subscribe(status => { if (status === 'SUBSCRIBED') void refresh(); });
    const reload = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('focus', reload);
    window.addEventListener('online', reload);
    document.addEventListener('visibilitychange', reload);
    return () => {
      invalidateRequests();
      clearTimeout(timer);
      void supabase.removeChannel(channel);
      window.removeEventListener('focus', reload);
      window.removeEventListener('online', reload);
      document.removeEventListener('visibilitychange', reload);
    };
  }, [spaceId, userId, refresh, invalidateRequests]);

  const save = useCallback(async (targetUserId: string, value: string) => {
    if (!spaceId || !userId) throw new Error('Vui lòng đăng nhập lại.');
    const nickname = normalizeNickname(value);
    const { error } = await supabase.from('chat_nicknames').upsert({
      care_space_id: spaceId, target_user_id: targetUserId, nickname, updated_by: userId,
    }, { onConflict: 'care_space_id,target_user_id' });
    if (error) throw new Error('Chưa lưu được biệt danh. Hãy kiểm tra kết nối rồi thử lại.');
    ++sequence.current;
    setState(previous => previous.spaceId === spaceId ? { ...previous, error: '', names: { ...previous.names, [targetUserId]: nickname } } : previous);
    void refresh();
  }, [spaceId, userId, refresh]);

  const current = state.spaceId === spaceId;
  return { nicknames: current ? state.names : {}, loading: !current || state.loading, error: current ? state.error : '', save, refresh };
}
