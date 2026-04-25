// ═══════════════════════════════════════════════════════════
// modules/chat.js — Realtime chat (group + private), WhatsApp-like UX
// Adds: reply, voice notes, richer message bubbles
// ═══════════════════════════════════════════════════════════

let currentChat = null;
let chatSubscription = null;
let _sendingMsg = false;

const _latestMessages = [];
let _replyTarget = null;

let _mediaRecorder = null;
let _voiceChunks = [];
let _voiceStream = null;
let _recordingStartedAt = 0;
let _isRecordingVoice = false;

const CHAT_PAYLOAD_PREFIX = '__chatv1__';
const _CHAT_COLORS = ['#00C853', '#2979FF', '#FF6D00', '#AA00FF', '#00B8D4', '#FF4081', '#76FF03'];
const CHAT_SEEN_PREFIX = 'oraimo_chat_seen_';
const _seenUpdateInFlight = new Set();

let _typingClient = null;
let _typingChannel = null;
let _typingRoomKey = '';
let _typingLastSentAt = 0;
let _typingHideTimer = null;
let _statusRefreshTimer = null;
let _loadMessagesInFlight = false;
let _loadMessagesQueued = false;
let _lastRenderedSignature = '';

function _colorForName(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return _CHAT_COLORS[Math.abs(h) % _CHAT_COLORS.length];
}

function escapeHtmlLocal(s) {
  return window.ChatUI?.escapeHtml ? window.ChatUI.escapeHtml(s) : String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _shortText(v, len = 70) {
  return window.ChatUI?.shortText ? window.ChatUI.shortText(v, len) : String(v || '');
}

function _formatChatListTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const loc = currentLang === 'ar' ? 'ar-EG' : 'en-US';
  if (sameDay) return d.toLocaleTimeString(loc, { hour: 'numeric', minute: '2-digit', hour12: true });
  return d.toLocaleDateString(loc, { day: 'numeric', month: 'short' });
}

function _privateThreadIncludesUser(m, userId) {
  if (!m || m.chat_type !== 'private' || userId == null) return false;
  const mine = Number(userId);
  const sid = Number(m.sender_id);
  const rid = m.receiver_id != null && m.receiver_id !== '' ? Number(m.receiver_id) : null;
  return sid === mine || rid === mine;
}

function _chatSeenStorageKey(chatId) {
  return `${CHAT_SEEN_PREFIX}${chatId}`;
}

function _markChatSeen(chatId) {
  try { localStorage.setItem(_chatSeenStorageKey(chatId), new Date().toISOString()); } catch (_) {}
}

function _getChatSeen(chatId) {
  try { return localStorage.getItem(_chatSeenStorageKey(chatId)) || ''; } catch (_) { return ''; }
}

function _buildMessagePayload(payload) {
  return `${CHAT_PAYLOAD_PREFIX}${JSON.stringify(payload)}`;
}

function _parseMessagePayload(raw) {
  const text = String(raw ?? '');
  if (!text.startsWith(CHAT_PAYLOAD_PREFIX)) {
    return { type: 'text', text, legacy: true };
  }

  try {
    const parsed = JSON.parse(text.slice(CHAT_PAYLOAD_PREFIX.length));
    if (!parsed || typeof parsed !== 'object') throw new Error('invalid payload');
    return parsed;
  } catch (_) {
    return { type: 'text', text, legacy: true };
  }
}

function _chatRoomKey(chatType = currentChat) {
  if (chatType === 'group') return 'group';
  if (chatType === 'admin') return `private-admin-${currentUser?.id || 'unknown'}`;
  return `private-admin-${chatType}`;
}

function _setHeaderStatus(textAr, textEn) {
  const s = document.querySelector('.chat-header-status');
  if (!s) return;
  s.textContent = currentLang === 'ar' ? textAr : textEn;
}

function _setHeaderOnline() {
  _setHeaderStatus('متصل', 'Online');
}

function _showTypingIndicator(name) {
  _setHeaderStatus(`يكتب الآن... ${name ? `(${name})` : ''}`, `${name || 'Someone'} is typing...`);
  if (_typingHideTimer) clearTimeout(_typingHideTimer);
  _typingHideTimer = setTimeout(() => _setHeaderOnline(), 2400);
}

function _getPeerIdForCurrentChat() {
  if (currentChat === 'group' || currentChat === 'admin') return null;
  const n = Number(currentChat);
  return Number.isFinite(n) ? n : null;
}

function _messageSeenByUser(parsed, userId) {
  const arr = parsed?.meta?.seenBy;
  return Array.isArray(arr) && arr.includes(String(userId));
}

function _statusSuffixForMessage(msg, parsed, isMe) {
  if (!isMe) return '';
  const ar = currentLang === 'ar';
  if (msg._tmp) return ar ? ' · جاري الإرسال…' : ' · Sending…';
  if (msg.chat_type !== 'private') return ar ? ' · ✓ تم' : ' · ✓ Sent';
  const peerId = _getPeerIdForCurrentChat();
  if (!peerId) return ar ? ' · ✓ تم' : ' · ✓ Sent';
  return _messageSeenByUser(parsed, peerId)
    ? (ar ? ' · ✓✓ شوهد' : ' · ✓✓ Seen')
    : (ar ? ' · ✓ تم' : ' · ✓ Sent');
}

async function _ensureTypingChannel() {
  const room = _chatRoomKey();
  if (!room || !currentUser?.id) return;
  if (_typingChannel && _typingRoomKey === room) return;
  await _teardownTypingChannel();
  try {
    const mod = await import('https://esm.sh/@supabase/supabase-js@2?bundle');
    _typingClient = mod.createClient('https://lmszelfnosejdemxhodm.supabase.co', 'sb_publishable_HCOQxXf5sEyulaPkqlSEzg_IK7elCQb');
    _typingRoomKey = room;
    _typingChannel = _typingClient.channel(`chat-typing:${room}`, { config: { broadcast: { ack: false, self: false } } });
    _typingChannel.on('broadcast', { event: 'typing' }, (payload) => {
      const p = payload?.payload || {};
      if (String(p.userId) === String(currentUser.id)) return;
      if (p.room !== _typingRoomKey) return;
      if (p.isTyping) _showTypingIndicator(p.userName || '');
      else _setHeaderOnline();
    });
    _typingChannel.subscribe();
  } catch (e) {
    console.warn('[chat typing] unavailable', e?.message || e);
  }
}

async function _teardownTypingChannel() {
  if (_typingHideTimer) {
    clearTimeout(_typingHideTimer);
    _typingHideTimer = null;
  }
  if (_typingChannel && _typingClient) {
    try { _typingClient.removeChannel(_typingChannel); } catch (_) {}
  }
  _typingChannel = null;
  _typingClient = null;
  _typingRoomKey = '';
}

async function _sendTypingState(isTyping) {
  if (!_typingChannel || !_typingRoomKey || !currentUser?.id) return;
  try {
    await _typingChannel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        room: _typingRoomKey,
        userId: String(currentUser.id),
        userName: String(currentUser.name || ''),
        isTyping: !!isTyping,
        at: new Date().toISOString(),
      },
    });
  } catch (_) {}
}

function _onComposerInput() {
  _refreshSendButtonState();
  const now = Date.now();
  const hasText = !!((document.getElementById('chat-input')?.value || '').trim());
  if (!hasText) {
    _sendTypingState(false);
    return;
  }
  if (now - _typingLastSentAt > 1400) {
    _typingLastSentAt = now;
    _sendTypingState(true);
  }
}

async function _markMessagesSeen(msgs) {
  if (!Array.isArray(msgs) || !msgs.length || currentChat === 'group' || !currentUser?.id) return;
  const mine = String(currentUser.id);
  const toUpdate = [];
  for (const m of msgs) {
    if (!m?.id || String(m.sender_id) === mine) continue;
    if (_seenUpdateInFlight.has(String(m.id))) continue;
    const parsed = _parseMessagePayload(m.message);
    if (_messageSeenByUser(parsed, mine)) continue;
    const nextPayload = parsed.legacy ? { type: 'text', text: parsed.text || '' } : { ...parsed };
    nextPayload.meta = nextPayload.meta || {};
    const seenBy = new Set(Array.isArray(nextPayload.meta.seenBy) ? nextPayload.meta.seenBy.map(String) : []);
    seenBy.add(mine);
    nextPayload.meta.seenBy = Array.from(seenBy);
    toUpdate.push({ id: m.id, payload: nextPayload });
  }
  if (!toUpdate.length) return;
  await Promise.allSettled(toUpdate.map(async (it) => {
    _seenUpdateInFlight.add(String(it.id));
    try {
      await dbPatch('messages', { message: _buildMessagePayload(it.payload) }, `?id=eq.${it.id}`);
    } finally {
      _seenUpdateInFlight.delete(String(it.id));
    }
  }));
}

function _replyPreviewHtml(reply) {
  if (!reply) return '';
  const safeName = escapeHtmlLocal(reply.name || (currentLang === 'ar' ? 'رسالة' : 'Message'));
  const safeText = escapeHtmlLocal(_shortText(reply.text || (reply.type === 'audio' ? 'Voice note' : '...')));
  return `<div class="chat-reply-quote">
    <div class="chat-reply-quote-name">${safeName}</div>
    <div class="chat-reply-quote-text">${safeText}</div>
  </div>`;
}

function _refreshSendButtonState() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.querySelector('.chat-send-btn');
  if (!input || !sendBtn) return;

  const hasText = !!(input.value || '').trim();
  if (hasText) {
    sendBtn.textContent = '➤';
  } else {
    sendBtn.textContent = _isRecordingVoice ? '⏹' : '🎤';
  }
}

function _renderReplyPreview() {
  const preview = document.getElementById('chat-reply-preview');
  if (!preview) return;

  if (!_replyTarget) {
    preview.classList.add('hidden');
    preview.innerHTML = '';
    return;
  }

  const title = currentLang === 'ar' ? 'الرد على' : 'Replying to';
  preview.classList.remove('hidden');
  preview.innerHTML = `<div>
      <div class="chat-reply-preview-title">${title} ${escapeHtmlLocal(_replyTarget.name || '')}</div>
      <div class="chat-reply-preview-text">${escapeHtmlLocal(_shortText(_replyTarget.text || (_replyTarget.type === 'audio' ? 'Voice note' : '...')))}</div>
    </div>
    <button class="chat-reply-close" onclick="clearReplyTarget()">×</button>`;
}

function setReplyTarget(index) {
  const msg = _latestMessages[index];
  if (!msg) return;
  const parsed = _parseMessagePayload(msg.message);
  _replyTarget = {
    name: msg.sender_name || (currentLang === 'ar' ? 'مستخدم' : 'User'),
    text: parsed.type === 'audio' ? (currentLang === 'ar' ? 'رسالة صوتية' : 'Voice note') : (parsed.text || ''),
    type: parsed.type || 'text'
  };
  _renderReplyPreview();
}

function clearReplyTarget() {
  _replyTarget = null;
  _renderReplyPreview();
}

async function openChat(chatType, title) {
  currentChat = chatType;
  _markChatSeen(chatType === 'group' ? 'group' : String(chatType));
  clearReplyTarget();
  _refreshSendButtonState();

  const titleEl = document.getElementById('chat-title');
  if (titleEl) titleEl.textContent = title;

  const modal = document.getElementById('chat-modal');
  if (!modal) return;

  modal.removeAttribute('style');
  modal.classList.add('open');
  document.body.classList.add('modal-open');

  const input = document.getElementById('chat-input');
  if (input && !input.dataset.bound) {
    input.dataset.bound = '1';
    input.addEventListener('input', _onComposerInput);
  }

  _setHeaderOnline();
  await _ensureTypingChannel();
  await loadMessages();
  subscribeToMessages();

  requestAnimationFrame(() => {
    const msgs = document.getElementById('chat-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  });
}

function _stopVoiceTracks() {
  if (_voiceStream) {
    _voiceStream.getTracks().forEach(track => track.stop());
    _voiceStream = null;
  }
}

function closeChat() {
  const modal = document.getElementById('chat-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.removeAttribute('style');
  }

  clearReplyTarget();
  _sendTypingState(false);
  _teardownTypingChannel();
  _stopVoiceTracks();
  _mediaRecorder = null;
  _isRecordingVoice = false;
  _refreshSendButtonState();

  document.body.classList.remove('modal-open');
  currentChat = null;

  if (chatSubscription) {
    if (typeof chatSubscription === 'function') {
      try { chatSubscription(); } catch (_) { }
    } else {
      try { clearInterval(chatSubscription); } catch (_) { }
    }
    chatSubscription = null;
  }
  if (_statusRefreshTimer) {
    clearInterval(_statusRefreshTimer);
    _statusRefreshTimer = null;
  }

  try {
    void loadEmployeeChatList();
    if (typeof loadAdminChatList === 'function') void loadAdminChatList();
  } catch (_) {}
}

async function loadMessages() {
  if (_loadMessagesInFlight) {
    _loadMessagesQueued = true;
    return;
  }
  _loadMessagesInFlight = true;
  const el = document.getElementById('chat-messages');
  if (!el) {
    _loadMessagesInFlight = false;
    return;
  }
  if (!_lastRenderedSignature) el.innerHTML = '<div class="full-loader"><div class="loader"></div></div>';
  let query = '?select=*&order=created_at.asc&limit=200';

  if (currentChat === 'group') {
    query += '&chat_type=eq.group';
  } else if (currentChat === 'admin') {
    query += `&chat_type=eq.private&or=(sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id})`;
  } else {
    const empId = currentChat;
    query += `&chat_type=eq.private&or=(sender_id.eq.${empId},receiver_id.eq.${empId})`;
  }

  try {
    const msgs = await dbGet('messages', query).catch(() => []) || [];
    const last = msgs[msgs.length - 1];
    const sig = `${msgs.length}|${last?.id || ''}|${last?.created_at || ''}|${currentChat || ''}`;
    _latestMessages.length = 0;
    _latestMessages.push(...msgs);
    await _markMessagesSeen(msgs);
    if (sig !== _lastRenderedSignature) {
      renderMessages(msgs);
      _lastRenderedSignature = sig;
    }
  } finally {
    _loadMessagesInFlight = false;
    if (_loadMessagesQueued) {
      _loadMessagesQueued = false;
      setTimeout(() => { if (currentChat) loadMessages(); }, 120);
    }
  }
}

function _formatAudioDuration(sec) {
  return window.ChatUI?.formatAudioDuration ? window.ChatUI.formatAudioDuration(sec) : '0:00';
}

function renderMessages(msgs) {
  const el = document.getElementById('chat-messages');
  if (!el) return;
  if (window.ChatUI?.renderMessages) {
    window.ChatUI.renderMessages({
      container: el,
      msgs,
      isArabic: currentLang === 'ar',
      isGroup: currentChat === 'group',
      currentUserId: currentUser.id,
      currentUserName: currentUser.name,
      parsePayload: _parseMessagePayload,
      replyPreviewHtml: _replyPreviewHtml,
      colorForName: _colorForName,
      statusSuffixForMessage: _statusSuffixForMessage,
    });
    return;
  }
  el.innerHTML = '';
}

async function _sendPayload(payload) {
  const previewText = payload.type === 'audio'
    ? (currentLang === 'ar' ? '🎤 رسالة صوتية' : '🎤 Voice note')
    : payload.text;

  const nowIso = new Date().toISOString();
  appendMessage({
    sender_id: currentUser.id,
    sender_name: currentUser.name,
    message: _buildMessagePayload(payload),
    chat_type: currentChat === 'group' ? 'group' : 'private',
    created_at: nowIso,
    _tmp: true
  });

  const data = {
    sender_id: currentUser.id,
    sender_name: currentUser.name,
    message: _buildMessagePayload(payload),
    chat_type: currentChat === 'group' ? 'group' : 'private',
    receiver_id: currentChat === 'group' ? null : (currentChat === 'admin' ? null : parseInt(currentChat, 10))
  };

  await dbPost('messages', data);
  if (typeof sendPushNotification === 'function') {
    const notifTitle = currentChat === 'group' ? 'B.tech team 💬' : `رسالة من ${currentUser.name}`;
    sendPushNotification(notifTitle, previewText, currentChat === 'group' ? null : (currentChat === 'admin' ? null : currentChat));
  }
  await loadMessages();
  clearReplyTarget();
  try {
    void loadEmployeeChatList();
    if (typeof loadAdminChatList === 'function') void loadAdminChatList();
  } catch (_) {}
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  if (!input || _sendingMsg) return;

  const msg = (input.value || '').trim();
  if (!msg && !_isRecordingVoice) {
    await toggleVoiceRecording();
    return;
  }

  if (!msg) return;
  if (msg.length > 2000) return;

  _sendingMsg = true;
  input.value = '';
  _sendTypingState(false);
  _refreshSendButtonState();

  try {
    await _sendPayload({
      type: 'text',
      text: msg,
      reply: _replyTarget
    });
  } catch (e) {
    console.error('[sendMessage]', e);
    notify('Error: ' + e.message, 'error');
    await loadMessages();
  } finally {
    _sendingMsg = false;
    _refreshSendButtonState();
  }
}

function appendMessage(m) {
  const el = document.getElementById('chat-messages');
  if (!el) return;
  if (window.ChatUI?.appendMessage) {
    window.ChatUI.appendMessage({
      container: el,
      message: m,
      parsePayload: _parseMessagePayload,
      replyPreviewHtml: _replyPreviewHtml,
      currentUserId: currentUser.id,
      currentUserName: currentUser.name,
      statusSuffixForMessage: _statusSuffixForMessage,
    });
    return;
  }
  el.scrollTop = el.scrollHeight;
}

async function _uploadVoiceWithFallback(fileName, blob) {
  const candidates = ['chat-media', 'visit-photos', 'selfies', 'profiles'];
  let lastErr = null;
  for (const bucket of candidates) {
    try {
      const url = await uploadAny(bucket, fileName, blob);
      if (url) return url;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('audio upload failed');
}

function _blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error('voice encode failed'));
    r.readAsDataURL(blob);
  });
}

async function toggleVoiceRecording() {
  if (_isRecordingVoice) {
    stopVoiceRecording();
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
    notify(currentLang === 'ar' ? 'جهازك لا يدعم تسجيل الصوت' : 'Voice recording is not supported', 'error');
    return;
  }

  try {
    _voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _voiceChunks = [];
    _mediaRecorder = new MediaRecorder(_voiceStream);
    _recordingStartedAt = Date.now();

    _mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) _voiceChunks.push(e.data);
    };

    _mediaRecorder.onstop = async () => {
      try {
        const durationSec = Math.max(1, Math.round((Date.now() - _recordingStartedAt) / 1000));
        const blob = new Blob(_voiceChunks, { type: 'audio/webm' });

        if (blob.size < 1000) {
          notify(currentLang === 'ar' ? 'التسجيل قصير جدًا' : 'Recording is too short', 'error');
          return;
        }

        if (typeof uploadAny !== 'function') {
          notify(currentLang === 'ar' ? 'رفع الصوت غير متاح' : 'Voice upload is unavailable', 'error');
          return;
        }

        const ext = 'webm';
        const fileName = `chat-voice/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        let audioUrl = null;
        try {
          audioUrl = await _uploadVoiceWithFallback(fileName, blob);
        } catch (uploadErr) {
          // Some deployments block anon writes to storage.objects via RLS.
          // Fallback to in-message audio payload so voice chat still works.
          const msg = String(uploadErr?.message || uploadErr || '');
          if (/row-level security|unauthorized/i.test(msg)) {
            audioUrl = await _blobToDataUrl(blob);
          } else {
            throw uploadErr;
          }
        }

        if (!audioUrl) throw new Error('audio upload failed');

        await _sendPayload({
          type: 'audio',
          audioUrl,
          durationSec,
          reply: _replyTarget
        });
      } catch (e) {
        console.error('[voiceRecording]', e);
        notify((currentLang === 'ar' ? 'فشل إرسال الفويس: ' : 'Voice send failed: ') + e.message, 'error');
      } finally {
        _voiceChunks = [];
        _mediaRecorder = null;
        _isRecordingVoice = false;
        _stopVoiceTracks();
        _refreshSendButtonState();
        const btn = document.getElementById('chat-voice-btn');
        if (btn) btn.classList.remove('recording');
      }
    };

    _mediaRecorder.start();
    _isRecordingVoice = true;
    _refreshSendButtonState();
    const btn = document.getElementById('chat-voice-btn');
    if (btn) btn.classList.add('recording');
    notify(currentLang === 'ar' ? 'بدأ تسجيل الفويس...' : 'Voice recording started', 'info');
  } catch (e) {
    notify((currentLang === 'ar' ? 'تعذر تشغيل الميكروفون: ' : 'Microphone error: ') + e.message, 'error');
    _isRecordingVoice = false;
    _stopVoiceTracks();
    _refreshSendButtonState();
  }
}

function stopVoiceRecording() {
  if (_mediaRecorder && _isRecordingVoice) {
    try {
      _mediaRecorder.stop();
      notify(currentLang === 'ar' ? 'جاري إرسال الفويس...' : 'Sending voice note...', 'info');
    } catch (_) {
      _isRecordingVoice = false;
      _stopVoiceTracks();
      _refreshSendButtonState();
    }
  }
}

function subscribeToMessages() {
  if (chatSubscription) {
    try {
      if (typeof chatSubscription === 'function') chatSubscription();
      else clearInterval(chatSubscription);
    } catch (_) { }
    chatSubscription = null;
  }

  const onNew = (newMsg) => {
    if (!currentChat || !currentUser) return;
    if (newMsg.sender_id === currentUser.id) return;
    loadMessages();
  };

  const fallbackToPolling = () => {
    if (chatSubscription && typeof chatSubscription !== 'function') return;
    chatSubscription = setInterval(() => {
      if (currentChat) loadMessages();
    }, 6000);
  };

  if (window.chatSubscribeRealtime) {
    const timeoutId = setTimeout(fallbackToPolling, 6000);
    window.chatSubscribeRealtime(onNew).then(unsub => {
      clearTimeout(timeoutId);
      if (!chatSubscription || typeof chatSubscription === 'function') chatSubscription = unsub;
    }).catch(() => {
      clearTimeout(timeoutId);
      fallbackToPolling();
    });
  } else {
    fallbackToPolling();
  }
  if (_statusRefreshTimer) clearInterval(_statusRefreshTimer);
  _statusRefreshTimer = setInterval(() => { if (currentChat) loadMessages(); }, 9000);
}

async function loadAdminChatList() {
  const el = document.getElementById('admin-chat-list');
  if (!el) return;
  const ar = currentLang === 'ar';
  const totalEl = document.getElementById('chat-list-total');
  const searchEl = document.getElementById('chat-list-search');
  const q = String(searchEl?.value || '').trim().toLowerCase();

  if (!allEmployees || !allEmployees.length) {
    if (totalEl) totalEl.textContent = '0';
    el.innerHTML = `<div class="chat-empty">${ar ? 'لا يوجد موظفون' : 'No employees'}</div>`;
    return;
  }

  const rows = await dbGet('messages', '?select=sender_id,receiver_id,sender_name,message,chat_type,created_at&order=created_at.desc&limit=600').catch(() => []) || [];
  const lastByChat = {};
  const unreadByChat = {};

  for (const m of rows) {
    const chatId = m.chat_type === 'group'
      ? 'group'
      : String(m.sender_id === currentUser.id ? (m.receiver_id ?? '') : m.sender_id);
    if (!chatId) continue;
    if (!lastByChat[chatId]) lastByChat[chatId] = m;

    const seen = _getChatSeen(chatId);
    if (m.sender_id !== currentUser.id && (!seen || new Date(m.created_at) > new Date(seen))) {
      unreadByChat[chatId] = (unreadByChat[chatId] || 0) + 1;
    }
  }

  const groupLast = lastByChat.group;
  const groupParsed = groupLast ? _parseMessagePayload(groupLast.message) : null;
  const groupPreview = groupParsed
    ? (groupParsed.type === 'audio' ? (ar ? '🎤 رسالة صوتية' : '🎤 Voice note') : _shortText(groupParsed.text || ''))
    : (ar ? 'جميع الموظفين' : 'All employees');
  const groupTime = _formatChatListTime(groupLast?.created_at);
  const groupUnread = unreadByChat.group || 0;

  const employees = allEmployees.filter(emp => {
    if (!q) return true;
    return String(emp.name || '').toLowerCase().includes(q) || String(emp.branch || '').toLowerCase().includes(q);
  });

  if (totalEl) totalEl.textContent = String(1 + employees.length);

  const groupItem = `
    <button type="button" class="chat-list-item ${groupUnread ? 'has-unread' : ''}" onclick="openChat('group','B.tech team')">
      <div class="chat-list-avatar group" aria-hidden="true">👥</div>
      <div class="chat-list-main">
        <div class="chat-list-row">
          <div class="chat-list-name">B.tech team</div>
          <div class="chat-list-time">${groupTime || ''}</div>
        </div>
        <div class="chat-list-row">
          <div class="chat-list-last">${escapeHtmlLocal(groupPreview)}</div>
          ${groupUnread ? `<span class="chat-list-unread">${groupUnread > 99 ? '99+' : groupUnread}</span>` : ''}
        </div>
      </div>
    </button>`;

  const empItems = employees.map(emp => {
    const color = _colorForName(emp.name || '');
    const chatId = String(emp.id);
    const last = lastByChat[chatId];
    const parsed = last ? _parseMessagePayload(last.message) : null;
    const preview = parsed
      ? (parsed.type === 'audio' ? (ar ? '🎤 رسالة صوتية' : '🎤 Voice note') : _shortText(parsed.text || ''))
      : (emp.branch || (ar ? 'لا توجد رسائل بعد' : 'No messages yet'));
    const timeLabel = _formatChatListTime(last?.created_at);
    const unread = unreadByChat[chatId] || 0;

    return `<button type="button" class="chat-list-item ${unread ? 'has-unread' : ''}" onclick="openChat('${emp.id}','${(emp.name || '').replace(/'/g, "\\'")}')">
      <div class="chat-list-avatar" style="background:${color};color:#fff" aria-hidden="true">${emp.profile_photo ? `<img src="${emp.profile_photo}" alt="">` : (emp.name || '?')[0].toUpperCase()}</div>
      <div class="chat-list-main">
        <div class="chat-list-row">
          <div class="chat-list-name">${escapeHtmlLocal(emp.name || '')}</div>
          <div class="chat-list-time">${timeLabel || ''}</div>
        </div>
        <div class="chat-list-row">
          <div class="chat-list-last">${escapeHtmlLocal(preview)}</div>
          ${unread ? `<span class="chat-list-unread">${unread > 99 ? '99+' : unread}</span>` : ''}
        </div>
      </div>
    </button>`;
  }).join('');

  if (!employees.length) {
    el.innerHTML = `${groupItem}<div class="chat-empty">${ar ? 'لا توجد نتائج بحث' : 'No results'}</div>`;
    return;
  }

  el.innerHTML = groupItem + empItems;
}

/** Employee home chat tab — same row layout as admin (WhatsApp / Telegram style). */
async function loadEmployeeChatList() {
  const el = document.getElementById('emp-chat-list');
  if (!el || !currentUser?.id) return;

  const ar = currentLang === 'ar';
  const uid = currentUser.id;
  const adminTitle = ar ? 'الإدارة' : 'Management';
  const adminTitleEsc = String(adminTitle).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  const rows = await dbGet('messages', '?select=sender_id,receiver_id,sender_name,message,chat_type,created_at&order=created_at.desc&limit=400').catch(() => []) || [];

  let groupLast = null;
  let adminLast = null;
  for (let i = 0; i < rows.length; i++) {
    const m = rows[i];
    if (m.chat_type === 'group' && !groupLast) groupLast = m;
    if (_privateThreadIncludesUser(m, uid) && !adminLast) adminLast = m;
    if (groupLast && adminLast) break;
  }

  const groupSeen = _getChatSeen('group');
  const adminSeen = _getChatSeen('admin');
  let groupUnread = 0;
  let adminUnread = 0;

  const myId = Number(uid);
  for (let i = 0; i < rows.length; i++) {
    const m = rows[i];
    if (m.chat_type === 'group') {
      if (Number(m.sender_id) !== myId && (!groupSeen || new Date(m.created_at) > new Date(groupSeen))) {
        groupUnread++;
      }
    } else if (_privateThreadIncludesUser(m, uid)) {
      if (Number(m.sender_id) !== myId && (!adminSeen || new Date(m.created_at) > new Date(adminSeen))) {
        adminUnread++;
      }
    }
  }

  const groupParsed = groupLast ? _parseMessagePayload(groupLast.message) : null;
  const groupPreview = groupParsed
    ? (groupParsed.type === 'audio' ? (ar ? '🎤 رسالة صوتية' : '🎤 Voice note') : _shortText(groupParsed.text || ''))
    : (ar ? 'محادثة الفريق' : 'Team chat');
  const groupTime = _formatChatListTime(groupLast?.created_at);

  const adminParsed = adminLast ? _parseMessagePayload(adminLast.message) : null;
  const adminPreview = adminParsed
    ? (adminParsed.type === 'audio' ? (ar ? '🎤 رسالة صوتية' : '🎤 Voice note') : _shortText(adminParsed.text || ''))
    : (ar ? 'اضغط للمحادثة مع الإدارة' : 'Tap to chat with management');
  const adminTime = _formatChatListTime(adminLast?.created_at);

  const adminBtn = `
    <button type="button" class="chat-list-item ${adminUnread ? 'has-unread' : ''}" onclick="openChat('admin','${adminTitleEsc}')">
      <div class="chat-list-avatar admin" aria-hidden="true">👑</div>
      <div class="chat-list-main">
        <div class="chat-list-row">
          <div class="chat-list-name">${escapeHtmlLocal(adminTitle)}</div>
          <div class="chat-list-time">${adminTime || ''}</div>
        </div>
        <div class="chat-list-row">
          <div class="chat-list-last">${escapeHtmlLocal(adminPreview)}</div>
          ${adminUnread ? `<span class="chat-list-unread">${adminUnread > 99 ? '99+' : adminUnread}</span>` : ''}
        </div>
      </div>
    </button>`;

  const groupBtn = `
    <button type="button" class="chat-list-item ${groupUnread ? 'has-unread' : ''}" onclick="openChat('group','B.tech team')">
      <div class="chat-list-avatar group" aria-hidden="true">👥</div>
      <div class="chat-list-main">
        <div class="chat-list-row">
          <div class="chat-list-name">B.tech team</div>
          <div class="chat-list-time">${groupTime || ''}</div>
        </div>
        <div class="chat-list-row">
          <div class="chat-list-last">${escapeHtmlLocal(groupPreview)}</div>
          ${groupUnread ? `<span class="chat-list-unread">${groupUnread > 99 ? '99+' : groupUnread}</span>` : ''}
        </div>
      </div>
    </button>`;

  el.innerHTML = adminBtn + groupBtn;
}
