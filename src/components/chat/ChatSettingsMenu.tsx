import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Pencil, X, Users, ArrowLeft, Loader2 } from 'lucide-react';
import type { Profile } from '../../types';
import { chatName, MAX_NICKNAME_LENGTH, normalizeNickname, type Nicknames } from '../../lib/chatNicknames';

interface Props {
  profiles: Profile[];
  currentUserId: string;
  nicknames: Nicknames;
  loading: boolean;
  error: string;
  onSave: (userId: string, nickname: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function ChatSettingsMenu(props: Props) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" aria-label="Tùy chỉnh cuộc trò chuyện" title="Tùy chỉnh cuộc trò chuyện" aria-haspopup="dialog" aria-expanded={open}
      onClick={() => setOpen(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-brand-house transition-colors hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
      <MoreHorizontal className="h-5 w-5" />
    </button>
    {open && createPortal(<NicknameDialog {...props} onClose={() => setOpen(false)} />, document.body)}
  </>;
}

export function NicknameDialog({ profiles, currentUserId, nicknames, loading, error, onSave, onRefresh, onClose }: Props & { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, []);
  useEffect(() => { if (editing) input.current?.focus(); }, [editing]);

  const save = async (value: string) => {
    if (!editing || saving) return;
    setSaveError('');
    try {
      const nickname = normalizeNickname(value);
      setSaving(true);
      await onSave(editing.user_id, nickname);
      setNotice(nickname ? 'Đã lưu biệt danh cho cả hai.' : 'Đã trở về tên hiển thị gốc.');
      setEditing(null);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Chưa lưu được biệt danh.');
    } finally { setSaving(false); }
  };

  return <dialog ref={dialog} aria-labelledby="chat-settings-title" onCancel={event => { if (saving) event.preventDefault(); else onClose(); }}
    onClick={event => { if (event.target === dialog.current && !saving) onClose(); }}
    className="m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-3xl border border-canvas-dark bg-white p-0 text-text-main shadow-xl backdrop:bg-slate-900/30 backdrop:backdrop-blur-sm">
    <div className="p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        {editing ? <button type="button" disabled={saving} onClick={() => { setEditing(null); setSaveError(''); }} aria-label="Quay lại danh sách thành viên" className="rounded-full p-2 hover:bg-canvas-cool"><ArrowLeft className="h-5 w-5" /></button>
          : <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand"><Users className="h-5 w-5" /></span>}
        <div className="min-w-0 flex-1"><h2 id="chat-settings-title" className="text-lg font-bold text-brand-house">{editing ? 'Đặt biệt danh' : 'Tùy chỉnh trò chuyện'}</h2><p className="mt-0.5 text-xs text-text-soft">Một cách gọi riêng của hai bạn</p></div>
        <button type="button" disabled={saving} onClick={onClose} aria-label="Đóng tùy chỉnh" className="rounded-full p-2 text-text-soft hover:bg-canvas-cool"><X className="h-5 w-5" /></button>
      </div>
      <p className="mb-4 rounded-xl bg-canvas-cool p-3 text-xs leading-relaxed text-text-soft">Biệt danh hiển thị với cả hai trong cuộc trò chuyện này. Tên tài khoản gốc không thay đổi.</p>
      {editing ? <form onSubmit={event => { event.preventDefault(); void save(draft); }}>
        <div className="mb-4 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-canvas-cool text-xl">{editing.avatar_emoji}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{editing.display_name}{editing.user_id === currentUserId ? ' (Bạn)' : ''}</p><p className="text-xs text-text-soft">Tên hiển thị gốc</p></div></div>
        <label htmlFor="chat-nickname" className="text-sm font-semibold text-brand-house">Biệt danh</label>
        <input ref={input} id="chat-nickname" value={draft} disabled={saving} onChange={event => setDraft(event.target.value)} placeholder={editing.display_name} autoComplete="off"
          aria-describedby="nickname-hint" aria-invalid={Array.from(draft.trim()).length > MAX_NICKNAME_LENGTH}
          className="mt-2 w-full rounded-xl border border-canvas-dark bg-white px-3 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" />
        <p id="nickname-hint" className="mt-2 flex justify-between gap-2 text-xs text-text-soft"><span>Để trống để dùng tên gốc.</span><span>{Array.from(draft.trim()).length}/{MAX_NICKNAME_LENGTH}</span></p>
        {saveError && <p role="alert" className="mt-3 text-sm text-red-600">{saveError}</p>}
        <div className="mt-5 flex justify-between gap-3"><button type="button" disabled={saving || !nicknames[editing.user_id]} onClick={() => void save('')} className="rounded-xl px-3 py-2.5 text-sm text-text-soft hover:bg-canvas-cool disabled:opacity-40">Xóa biệt danh</button><button type="submit" disabled={saving || Array.from(draft.trim()).length > MAX_NICKNAME_LENGTH} className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-house disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? 'Đang lưu…' : 'Lưu biệt danh'}</button></div>
      </form> : <>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-soft">Thành viên & biệt danh</h3>
        {loading ? <p role="status" className="py-4 text-sm text-text-soft">Đang tải biệt danh…</p> : error ? <div role="alert" className="text-sm text-red-600">{error}<button type="button" onClick={() => void onRefresh()} className="ml-2 underline">Thử lại</button></div> :
          <ul className="space-y-2">{profiles.map(profile => <li key={profile.user_id}><button type="button" onClick={() => { setEditing(profile); setDraft(nicknames[profile.user_id] || ''); setNotice(''); }}
            className="flex w-full items-center gap-3 rounded-2xl border border-canvas-dark/60 px-3 py-3 text-left transition-colors hover:border-brand/30 hover:bg-canvas-cool">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-canvas-cool text-xl">{profile.avatar_emoji}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-brand-house">{chatName(profile.user_id, profiles, nicknames)}{profile.user_id === currentUserId ? ' (Bạn)' : ''}</span><span className="mt-0.5 block truncate text-xs text-text-soft">{nicknames[profile.user_id] ? `Tên gốc: ${profile.display_name}` : 'Chưa đặt biệt danh'}</span></span><Pencil className="h-4 w-4 shrink-0 text-brand" />
          </button></li>)}</ul>}
        {notice && <p role="status" className="mt-4 text-sm text-brand-house">{notice}</p>}
      </>}
    </div>
  </dialog>;
}
