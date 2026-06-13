import { create } from 'zustand';
import type { Conversation, Message, UserProfile } from '../types';

type ChatStore = {
  conversations: Record<string, Conversation>;
  activeConvId: string | null;
  totalUnread: number;

  openConversation: (partnerId: string, profile: UserProfile) => void;
  sendMessage: (convId: string, text: string) => void;
  receiveMessage: (convId: string, text: string) => void;
  markRead: (convId: string) => void;
  setActive: (convId: string | null) => void;
};

function convId(partnerId: string): string {
  return `conv-${partnerId}`;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: {},
  activeConvId: null,
  totalUnread: 0,

  openConversation: (partnerId, profile) => {
    const id = convId(partnerId);
    set((s) => {
      if (s.conversations[id]) return { activeConvId: id };
      return {
        activeConvId: id,
        conversations: {
          ...s.conversations,
          [id]: {
            id,
            partnerId,
            partnerProfile: profile,
            messages: [],
            unreadCount: 0,
            lastActivity: Date.now(),
          },
        },
      };
    });
  },

  sendMessage: (id, text) =>
    set((s) => {
      const conv = s.conversations[id];
      if (!conv) return s;
      const msg: Message = {
        id: `msg-${Date.now()}`,
        senderId: 'me',
        text,
        timestamp: Date.now(),
        read: true,
      };
      return {
        conversations: {
          ...s.conversations,
          [id]: {
            ...conv,
            messages: [...conv.messages, msg],
            lastActivity: Date.now(),
          },
        },
      };
    }),

  receiveMessage: (id, text) =>
    set((s) => {
      const conv = s.conversations[id];
      if (!conv) return s;
      const isActive = s.activeConvId === id;
      const msg: Message = {
        id: `msg-${Date.now()}-r`,
        senderId: conv.partnerId,
        text,
        timestamp: Date.now(),
        read: isActive,
      };
      const newUnread = isActive ? 0 : conv.unreadCount + 1;
      const total = Object.values({ ...s.conversations, [id]: { ...conv, unreadCount: newUnread } })
        .reduce((acc, c) => acc + c.unreadCount, 0);
      return {
        totalUnread: total,
        conversations: {
          ...s.conversations,
          [id]: {
            ...conv,
            messages: [...conv.messages, msg],
            unreadCount: newUnread,
            lastActivity: Date.now(),
          },
        },
      };
    }),

  markRead: (id) =>
    set((s) => {
      const conv = s.conversations[id];
      if (!conv) return s;
      const total = Object.values(s.conversations)
        .reduce((acc, c) => acc + (c.id === id ? 0 : c.unreadCount), 0);
      return {
        totalUnread: total,
        conversations: {
          ...s.conversations,
          [id]: { ...conv, unreadCount: 0, messages: conv.messages.map((m) => ({ ...m, read: true })) },
        },
      };
    }),

  setActive: (id) => {
    set({ activeConvId: id });
    if (id) get().markRead(id);
  },
}));
