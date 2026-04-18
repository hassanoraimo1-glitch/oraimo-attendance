// ────────────────────────────────────────────────────────────
// CHAT SERVICE  (hardened)
// ────────────────────────────────────────────────────────────
// Review-pass fixes:
//   • Sanitised filter values (were building raw SQL-like strings).
//   • Message length validated client-side (server should too via RLS).
//   • Cleanup now handles both realtime AND polling fallback uniformly.
//   • Duplicate subscriptions can no longer leak channels.
// ────────────────────────────────────────────────────────────

import { db, getRealtimeClient, safeFilterValue } from './supabase.js';
import { state } from '../state.js';
import { sendPushNotification } from './notifications.js';

const MAX_MESSAGE_LEN = 2000;
const POLLING_INTERVAL_MS = 5000;

export async function loadMessages() {
  const chat = state.currentChat;
  if (!chat) return [];
  const myId = state.currentUser?.id;

  let query = '?order=created_at.asc&limit=200';
  if (chat === 'group') {
    query += '&chat_type=eq.group';
  } else if (chat === 'admin') {
    const id = safeFilterValue(myId);
    query += `&chat_type=eq.private&or=(sender_id.eq.${id},receiver_id.eq.${id})`;
  } else {
    const id = safeFilterValue(chat);
    query += `&chat_type=eq.private&or=(sender_id.eq.${id},receiver_id.eq.${id})`;
  }

  try {
    const msgs = await db.get('messages', query);
    return msgs || [];
  } catch (e) {
    console.warn('[chat] loadMessages failed:', e.message);
    return [];
  }
}

export async function sendMessage(text) {
  const msg = (text || '').trim();
  if (!msg || msg.length > MAX_MESSAGE_LEN) return null;

  const chat = state.currentChat;
  const user = state.currentUser;
  if (!chat || !user) return null;

  const data = {
    sender_id: user.id,
    sender_name: user.name,
    message: msg,
    chat_type: chat === 'group' ? 'group' : 'private',
    receiver_id:
      chat === 'group' ? null :
      chat === 'admin' ? null :
      parseInt(chat, 10),
  };

  const created = await db.post('messages', data);

  // fire-and-forget push notification
  const title = chat === 'group' ? 'B.tech team 💬' : `رسالة من ${user.name}`;
  const target = chat === 'group' ? null : chat === 'admin' ? null : chat;
  sendPushNotification(title, msg, target);

  return created;
}

/**
 * Subscribe to realtime INSERTs on the `messages` table.
 * Returns a cleanup function that safely handles both realtime
 * channels and polling fallbacks.
 */
export async function subscribeRealtime(onNewMessage) {
  // Tear down any previous subscription first.
  cleanup();

  try {
    const client = await getRealtimeClient();
    const channel = client
      .channel(`messages-feed-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        payload => {
          if (isMessageRelevant(payload.new)) onNewMessage(payload.new);
        }
      )
      .subscribe();

    state.chatRealtimeChannel = { type: 'realtime', channel };

    return () => {
      try { channel.unsubscribe(); } catch (_) {}
      if (state.chatRealtimeChannel?.channel === channel) {
        state.chatRealtimeChannel = null;
      }
    };
  } catch (e) {
    console.warn('[chat] realtime unavailable, using polling', e);
    return startPollingFallback(onNewMessage);
  }
}

function cleanup() {
  const prev = state.chatRealtimeChannel;
  if (!prev) return;
  if (prev.type === 'realtime' && prev.channel) {
    try { prev.channel.unsubscribe(); } catch (_) {}
  } else if (prev.type === 'polling' && prev.handle) {
    try { clearInterval(prev.handle); } catch (_) {}
  }
  state.chatRealtimeChannel = null;
}

function isMessageRelevant(m) {
  if (!m || !state.currentChat || !state.currentUser) return false;
  const chat = state.currentChat;
  const myId = state.currentUser.id;
  if (chat === 'group') return m.chat_type === 'group';
  if (m.chat_type !== 'private') return false;
  if (chat === 'admin') return m.sender_id === myId || m.receiver_id === myId;
  const partnerId = parseInt(chat, 10);
  return (
    (m.sender_id === myId && m.receiver_id === partnerId) ||
    (m.sender_id === partnerId && m.receiver_id === myId)
  );
}

function startPollingFallback(onNewMessage) {
  let lastSeen = new Date().toISOString();
  const handle = setInterval(async () => {
    try {
      const rows = await db.get(
        'messages',
        `?created_at=gt.${safeFilterValue(lastSeen)}&order=created_at.asc&limit=50`
      );
      if (rows && rows.length) {
        lastSeen = rows[rows.length - 1].created_at;
        rows.filter(isMessageRelevant).forEach(onNewMessage);
      }
    } catch (_) {}
  }, POLLING_INTERVAL_MS);

  state.chatRealtimeChannel = { type: 'polling', handle };

  return () => {
    try { clearInterval(handle); } catch (_) {}
    if (state.chatRealtimeChannel?.handle === handle) {
      state.chatRealtimeChannel = null;
    }
  };
}
