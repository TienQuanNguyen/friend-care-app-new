import type { Profile } from '../types';
import type { ChatMessageWithSender, MessageSenderProfile } from '../types/chat';

export type Nicknames = Record<string, string>;
export const MAX_NICKNAME_LENGTH = 40;

export function normalizeNickname(value: string): string {
  const name = value.trim().replace(/\s+/gu, ' ');
  if (Array.from(name).length > MAX_NICKNAME_LENGTH) throw new Error('Biệt danh tối đa 40 ký tự.');
  if (Array.from(name).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) throw new Error('Biệt danh chứa ký tự không hợp lệ.');
  return name;
}

export function chatName(userId: string, profiles: Profile[], names: Nicknames, fallback = 'Người dùng'): string {
  return names[userId]?.trim() || profiles.find(profile => profile.user_id === userId)?.display_name || fallback;
}

export function withChatNames(message: ChatMessageWithSender, profiles: Profile[], names: Nicknames): ChatMessageWithSender {
  const sender = (id: string, original?: MessageSenderProfile | null): MessageSenderProfile => ({
    display_name: chatName(id, profiles, names, original?.display_name),
    avatar_emoji: profiles.find(profile => profile.user_id === id)?.avatar_emoji || original?.avatar_emoji || '👤',
  });
  return {
    ...message,
    sender: sender(message.sender_id, message.sender),
    reply_to: message.reply_to ? { ...message.reply_to, sender: sender(message.reply_to.sender_id, message.reply_to.sender) } : null,
  };
}
