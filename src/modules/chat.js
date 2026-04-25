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

const CHAT_SVG_SEND =
  '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
const CHAT_SVG_MIC =
  '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>';
const CHAT_SVG_STOP =
  '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M6 6h12v12H6z"/></svg>';

let _typingClient = null;
let _typingChannel = null;
let _typingRoomKey = '';
let _typingLastSentAt = 0;
let _typingHideTimer = null;
let _statusRefreshTimer = null;
let _loadMessagesInFlight = false;
let _loadMessagesQueued = false;
let _lastRenderedSignature = '';
let _draftTimer = null;
let _searchHits = [];
let _searchIdx = -1;
let _edgeSwipeArmed = false;
let _edgeSwipeStartX = 0;
let _edgeSwipeStartY = 0;

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

function getChatDraftText(chatId) {
  const key = chatId === 'group' ? 'oraimo_chat_draft_group' : chatId === 'admin' ? 'oraimo_chat_draft_admin' : `oraimo_chat_draft_${String(chatId)}`;
  try { return localStorage.getItem(key) || ''; } catch (_) { return ''; }
}

function _chatDraftKey() {
  if (currentChat === 'group') return 'oraimo_chat_draft_group';
  if (currentChat === 'admin') return 'oraimo_chat_draft_admin';
  if (currentChat == null) return '';
  return `oraimo_chat_draft_${String(currentChat)}`;
}

function _loadChatDraft() {
  const inp = document.getElementById('chat-input');
  if (!inp) return;
  const k = _chatDraftKey();
  if (!k) return;
  try {
    const v = localStorage.getItem(k);
    if (v) inp.value = v;
  } catch (_) {}
}

function _saveChatDraft() {
  const k = _chatDraftKey();
  const inp = document.getElementById('chat-input');
  if (!k || !inp) return;
  const raw = inp.value || '';
  const t = raw.trim();
  try {
    if (t) localStorage.setItem(k, raw);
    else localStorage.removeItem(k);
  } catch (_) {}
}

function _clearChatDraft() {
  const k = _chatDraftKey();
  if (!k) return;
  try { localStorage.removeItem(k); } catch (_) {}
}

function _scheduleDraftSave() {
  if (_draftTimer) clearTimeout(_draftTimer);
  _draftTimer = setTimeout(() => {
    _draftTimer = null;
    _saveChatDraft();
  }, 400);
}

function _isHtmlRtl() {
  return document.documentElement.getAttribute('dir') === 'rtl' || (typeof currentLang !== 'undefined' && currentLang === 'ar');
}

function _setHeaderLoading() {
  const s = document.getElementById('chat-header-status') || document.querySelector('.chat-header-status');
  if (!s) return;
  s.classList.remove('is-typing');
  s.textContent = currentLang === 'ar' ? 'جارٍ التحميل…' : 'Loading…';
}

function _updateHeaderActivity(msgs) {
  const s = document.getElementById('chat-header-status') || document.querySelector('.chat-header-status');
  if (!s) return;
  if (s.classList.contains('is-typing')) return;
  const ar = currentLang === 'ar';
  if (!Array.isArray(msgs) || !msgs.length) {
    s.textContent = ar ? 'لا توجد رسائل بعد' : 'No messages yet';
    return;
  }
  const last = msgs[msgs.length - 1];
  const d = new Date(last.created_at);
  if (Number.isNaN(d.getTime())) {
    s.textContent = ar ? 'متصل' : 'Online';
    return;
  }
  const loc = ar ? 'ar-EG' : 'en-US';
  const timeStr = d.toLocaleTimeString(loc, { hour: 'numeric', minute: '2-digit' });
  s.textContent = ar ? `آخر رسالة · ${timeStr}` : `Last message · ${timeStr}`;
}

function _restoreHeaderStatus() {
  const s = document.getElementById('chat-header-status') || document.querySelector('.chat-header-status');
  if (s) s.classList.remove('is-typing');
  _updateHeaderActivity(_latestMessages);
}

function _closeChatSearch() {
  const bar = document.getElementById('chat-header-bar');
  const row = document.getElementById('chat-header-searchrow');
  const modal = document.getElementById('chat-modal');
  const q = document.getElementById('chat-insearch-input');
  if (q) {
    q.value = '';
  }
  if (row) row.classList.add('hidden');
  if (bar) bar.classList.remove('is-searching');
  if (modal) modal.classList.remove('chat-search-open');
  _searchHits = [];
  _searchIdx = -1;
  _updateInSearchCount();
  const root = document.getElementById('chat-messages');
  if (root) {
    root.querySelectorAll('.chat-insearch-active').forEach((el) => el.classList.remove('chat-insearch-active'));
  }
}

function _updateInSearchCount() {
  const el = document.getElementById('chat-insearch-count');
  if (!el) return;
  const n = _searchHits.length;
  if (!n) {
    el.textContent = '';
    return;
  }
  const i = Math.max(0, _searchIdx) + 1;
  el.textContent = `${i} / ${n}`;
}

function _applyChatSearch(rawQ) {
  const root = document.getElementById('chat-messages');
  if (!root) return;
  const q = String(rawQ || '').trim().toLowerCase();
  root.querySelectorAll('.chat-insearch-active').forEach((el) => el.classList.remove('chat-insearch-active'));
  _searchHits = [];
  _searchIdx = -1;
  if (!q) {
    _updateInSearchCount();
    return;
  }
  const ar = currentLang === 'ar';
  for (const m of _latestMessages) {
    if (m == null || m.id == null) continue;
    const p = _parseMessagePayload(m.message);
    const t =
      p.type === 'audio'
        ? `${ar ? 'صوت صوتية رسالة' : 'voice note audio'} ${p.durationSec || ''}`
        : String(p.text || '');
    if (t.toLowerCase().includes(q)) _searchHits.push(String(m.id));
  }
  if (_searchHits.length) {
    _searchIdx = 0;
    _highlightChatSearchAtIndex();
  }
  _updateInSearchCount();
}

function _highlightChatSearchAtIndex() {
  const root = document.getElementById('chat-messages');
  if (!root) return;
  root.querySelectorAll('.chat-insearch-active').forEach((el) => el.classList.remove('chat-insearch-active'));
  if (_searchIdx < 0 || _searchIdx >= _searchHits.length) return;
  const id = _searchHits[_searchIdx];
  const row = Array.from(root.querySelectorAll('.chat-msg[data-chat-msg-id]')).find(
    (el) => el.getAttribute('data-chat-msg-id') === id
  );
  if (row) {
    row.classList.add('chat-insearch-active');
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  _updateInSearchCount();
}

function _goChatSearchDir(delta) {
  if (!_searchHits.length) return;
  _searchIdx = (_searchIdx + delta + _searchHits.length) % _searchHits.length;
  _highlightChatSearchAtIndex();
}

function toggleChatInSearch(forceOpen) {
  const row = document.getElementById('chat-header-searchrow');
  const bar = document.getElementById('chat-header-bar');
  const modal = document.getElementById('chat-modal');
  const input = document.getElementById('chat-insearch-input');
  if (!row || !bar || !modal) return;
  const willOpen = typeof forceOpen === 'boolean' ? forceOpen : row.classList.contains('hidden');
  if (willOpen) {
    row.classList.remove('hidden');
    bar.classList.add('is-searching');
    modal.classList.add('chat-search-open');
    if (input) {
      const isAr = currentLang === 'ar';
      input.placeholder = isAr
        ? (input.getAttribute('data-ar-ph') || input.placeholder)
        : (input.getAttribute('data-en-ph') || input.placeholder);
      requestAnimationFrame(() => { try { input.focus(); } catch (_) {} });
    }
    _applyChatSearch(input ? input.value : '');
  } else {
    _closeChatSearch();
  }
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
  const s = document.getElementById('chat-header-status') || document.querySelector('.chat-header-status');
  if (!s) return;
  s.classList.remove('is-typing');
  s.textContent = currentLang === 'ar' ? textAr : textEn;
}

function _setHeaderOnline() {
  _restoreHeaderStatus();
}

function _showTypingIndicator(name) {
  const s = document.getElementById('chat-header-status') || document.querySelector('.chat-header-status');
  if (!s) return;
  s.classList.add('is-typing');
  const ar = currentLang === 'ar';
  s.textContent = ar
    ? `يكتب…${name ? ` (${name})` : ''}`
    : `${name || 'Someone'} is typing…`;
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

function _resizeChatComposer() {
  const ta = document.getElementById('chat-input');
  if (!ta || ta.tagName !== 'TEXTAREA') return;
  ta.style.height = 'auto';
  const h = Math.min(Math.max(ta.scrollHeight, 46), 132);
  ta.style.height = `${h}px`;
}

function _onComposerInput() {
  _refreshSendButtonState();
  _resizeChatComposer();
  _scheduleDraftSave();
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
  const mid = reply.messageId != null && String(reply.messageId).length
    ? ` data-reply-to-id="${escapeHtmlLocal(String(reply.messageId))}"`
    : '';
  const linkCl = mid ? ' chat-reply-quote--link' : '';
  const a11y = mid
    ? ' role="button" tabindex="0" aria-label="' + (currentLang === 'ar' ? 'الانتقال للرسالة' : 'Go to message') + '"'
    : '';
  return `<div class="chat-reply-quote${linkCl}"${mid}${a11y}>
    <div class="chat-reply-quote-name">${safeName}</div>
    <div class="chat-reply-quote-text">${safeText}</div>
  </div>`;
}

function _refreshSendButtonState() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');
  if (!input || !sendBtn) return;

  const hasText = !!(input.value || '').trim();
  sendBtn.classList.remove('chat-send-btn--mic', 'chat-send-btn--stop');
  if (_isRecordingVoice) {
    sendBtn.classList.add('chat-send-btn--stop');
    sendBtn.innerHTML = CHAT_SVG_STOP;
    sendBtn.setAttribute('aria-label', currentLang === 'ar' ? 'إيقاف وإرسال' : 'Stop and send');
    return;
  }
  if (hasText) {
    sendBtn.innerHTML = CHAT_SVG_SEND;
    sendBtn.setAttribute('aria-label', currentLang === 'ar' ? 'إرسال' : 'Send');
  } else {
    sendBtn.classList.add('chat-send-btn--mic');
    sendBtn.innerHTML = CHAT_SVG_MIC;
    sendBtn.setAttribute('aria-label', currentLang === 'ar' ? 'تسجيل صوتي' : 'Voice message');
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
    type: parsed.type || 'text',
    messageId: msg.id != null ? String(msg.id) : undefined
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
  _closeChatSearch();

  const titleEl = document.getElementById('chat-title');
  if (titleEl) titleEl.textContent = title;

  const modal = document.getElementById('chat-modal');
  if (!modal) return;

  modal.style.removeProperty('display');
  modal.classList.add('open');
  document.body.classList.add('modal-open');

  const input = document.getElementById('chat-input');
  if (input && !input.dataset.bound) {
    input.dataset.bound = '1';
    input.addEventListener('input', _onComposerInput);
  }
  if (input) {
    input.value = '';
  }
  _loadChatDraft();
  _refreshSendButtonState();
  if (typeof window.ChatUI?.bindVoiceDelegation === 'function') {
    window.ChatUI.bindVoiceDelegation();
  }
  _resizeChatComposer();

  _setHeaderLoading();
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
  if (currentChat) {
    const inp0 = document.getElementById('chat-input');
    if (inp0) {
      const t = (inp0.value || '').trim();
      const k = _chatDraftKey();
      if (k) {
        try {
          if (t) localStorage.setItem(k, inp0.value);
          else localStorage.removeItem(k);
        } catch (_) {}
      }
    }
  }
  _closeChatSearch();

  const modal = document.getElementById('chat-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.removeAttribute('style');
  }

  if (_draftTimer) {
    clearTimeout(_draftTimer);
    _draftTimer = null;
  }

  const inp = document.getElementById('chat-input');
  if (inp) {
    inp.value = '';
    _resizeChatComposer();
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
    _updateHeaderActivity(msgs);
    const modal0 = document.getElementById('chat-modal');
    if (modal0 && modal0.classList.contains('chat-search-open')) {
      const iq = document.getElementById('chat-insearch-input');
      if (iq) _applyChatSearch(iq.value);
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

  if (_draftTimer) {
    clearTimeout(_draftTimer);
    _draftTimer = null;
  }

  _sendingMsg = true;
  input.value = '';
  _resizeChatComposer();
  _sendTypingState(false);
  _refreshSendButtonState();

  try {
    await _sendPayload({
      type: 'text',
      text: msg,
      reply: _replyTarget
    });
    _clearChatDraft();
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

  const GROUP_SVG =
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>';
  const ADMIN_SVG =
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 1l3 5.5 6 .9-4.3 4.2 1 6-5.7-3-5.7 3 1-6L3 7.4l6-.9L12 1z"/></svg>';

  if (!allEmployees || !allEmployees.length) {
    if (totalEl) totalEl.textContent = '0';
    el.innerHTML = `<div class="chat-empty">${ar ? 'لا يوجد موظفون' : 'No employees'}</div>`;
    return;
  }

  if (!el.dataset.loading) {
    el.dataset.loading = '1';
    el.innerHTML = `<div class="chat-list-skeleton" aria-hidden="true">
      <div class="chat-skel-row"><span class="chat-skel-av"></span><span class="chat-skel-lines"><i></i><b></b></span></div>
      <div class="chat-skel-row"><span class="chat-skel-av"></span><span class="chat-skel-lines"><i></i><b></b></span></div>
      <div class="chat-skel-row"><span class="chat-skel-av"></span><span class="chat-skel-lines"><i></i><b></b></span></div>
      <div class="chat-skel-row"><span class="chat-skel-av"></span><span class="chat-skel-lines"><i></i><b></b></span></div>
    </div>`;
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
  const groupDraft = getChatDraftText('group');
  const hasGroupDraft = !!String(groupDraft).trim();
  const groupListPreview = hasGroupDraft
    ? (ar ? `مسودة: ${_shortText(groupDraft, 50)}` : `Draft: ${_shortText(groupDraft, 50)}`)
    : groupPreview;
  const groupLastTs = groupLast?.created_at ? new Date(groupLast.created_at).getTime() : 0;

  const employees = allEmployees.filter(emp => {
    if (!q) return true;
    return String(emp.name || '').toLowerCase().includes(q) || String(emp.branch || '').toLowerCase().includes(q);
  });

  if (totalEl) totalEl.textContent = String(1 + employees.length);

  const groupItem = `
    <button type="button" class="chat-list-item ${groupUnread ? 'has-unread' : ''} ${hasGroupDraft ? 'has-draft' : ''}" onclick="openChat('group','B.tech team')">
      <div class="chat-list-avatar group" aria-hidden="true">${GROUP_SVG}</div>
      <div class="chat-list-main">
        <div class="chat-list-row">
          <div class="chat-list-name">B.tech team</div>
          <div class="chat-list-time">${groupTime || ''}</div>
        </div>
        <div class="chat-list-row">
          <div class="chat-list-last">${escapeHtmlLocal(groupListPreview)}</div>
          ${groupUnread ? `<span class="chat-list-unread">${groupUnread > 99 ? '99+' : groupUnread}</span>` : ''}
        </div>
      </div>
    </button>`;

  const decorated = employees.map(emp => {
    const chatId = String(emp.id);
    const last = lastByChat[chatId];
    const lastTs = last?.created_at ? new Date(last.created_at).getTime() : 0;
    const unread = unreadByChat[chatId] || 0;
    const dtxt = getChatDraftText(emp.id);
    const hasDraft = !!String(dtxt).trim();
    const parsed = last ? _parseMessagePayload(last.message) : null;
    const preview = hasDraft
      ? (ar ? `مسودة: ${_shortText(dtxt, 50)}` : `Draft: ${_shortText(dtxt, 50)}`)
      : (parsed
        ? (parsed.type === 'audio' ? (ar ? '🎤 رسالة صوتية' : '🎤 Voice note') : _shortText(parsed.text || ''))
        : (emp.branch || (ar ? 'لا توجد رسائل بعد' : 'No messages yet')));
    return {
      emp,
      chatId,
      last,
      lastTs,
      unread,
      hasDraft,
      preview,
    };
  });

  // Priority: unread > draft > latest activity > name
  decorated.sort((a, b) => {
    if (!!b.unread !== !!a.unread) return b.unread ? 1 : -1;
    if (!!b.hasDraft !== !!a.hasDraft) return b.hasDraft ? 1 : -1;
    if ((b.lastTs || 0) !== (a.lastTs || 0)) return (b.lastTs || 0) - (a.lastTs || 0);
    return String(a.emp?.name || '').localeCompare(String(b.emp?.name || ''));
  });

  const empItems = decorated.map(({ emp, last, unread, hasDraft, preview }) => {
    const color = _colorForName(emp.name || '');
    const timeLabel = _formatChatListTime(last?.created_at);
    return `<button type="button" class="chat-list-item ${unread ? 'has-unread' : ''} ${hasDraft ? 'has-draft' : ''}" onclick="openChat('${emp.id}','${(emp.name || '').replace(/'/g, "\\'")}')">
      <div class="chat-list-avatar" style="background:${color};color:#fff" aria-hidden="true">${emp.profile_photo ? `<img src="${emp.profile_photo}" alt="" loading="lazy" decoding="async">` : (emp.name || '?')[0].toUpperCase()}</div>
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

  // If group has unread/draft/newer activity, bubble it above employees
  const groupPriority =
    (groupUnread ? 3 : 0) + (hasGroupDraft ? 2 : 0) + (groupLastTs ? 1 : 0);
  const firstEmp = decorated[0];
  const topEmpPriority = firstEmp
    ? ((firstEmp.unread ? 3 : 0) + (firstEmp.hasDraft ? 2 : 0) + (firstEmp.lastTs ? 1 : 0))
    : 0;

  el.innerHTML = (groupPriority >= topEmpPriority ? (groupItem + empItems) : (empItems + groupItem));
  delete el.dataset.loading;
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

  const GROUP_SVG =
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>';
  const ADMIN_SVG =
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 2l2.5 5.2L20 8l-4 4 1 6-5-2.8L7 18l1-6-4-4 5.5-.8L12 2z"/></svg>';

  const adminDraft = getChatDraftText('admin');
  const hasAdminDraft = !!String(adminDraft).trim();
  const adminListPreview = hasAdminDraft
    ? (ar ? `مسودة: ${_shortText(adminDraft, 50)}` : `Draft: ${_shortText(adminDraft, 50)}`)
    : adminPreview;
  const groupDraftE = getChatDraftText('group');
  const hasGroupDraftE = !!String(groupDraftE).trim();
  const groupListPreviewE = hasGroupDraftE
    ? (ar ? `مسودة: ${_shortText(groupDraftE, 50)}` : `Draft: ${_shortText(groupDraftE, 50)}`)
    : groupPreview;

  const adminBtn = `
    <button type="button" class="chat-list-item ${adminUnread ? 'has-unread' : ''} ${hasAdminDraft ? 'has-draft' : ''}" onclick="openChat('admin','${adminTitleEsc}')">
      <div class="chat-list-avatar admin" aria-hidden="true">${ADMIN_SVG}</div>
      <div class="chat-list-main">
        <div class="chat-list-row">
          <div class="chat-list-name">${escapeHtmlLocal(adminTitle)}</div>
          <div class="chat-list-time">${adminTime || ''}</div>
        </div>
        <div class="chat-list-row">
          <div class="chat-list-last">${escapeHtmlLocal(adminListPreview)}</div>
          ${adminUnread ? `<span class="chat-list-unread">${adminUnread > 99 ? '99+' : adminUnread}</span>` : ''}
        </div>
      </div>
    </button>`;

  const groupBtn = `
    <button type="button" class="chat-list-item ${groupUnread ? 'has-unread' : ''} ${hasGroupDraftE ? 'has-draft' : ''}" onclick="openChat('group','B.tech team')">
      <div class="chat-list-avatar group" aria-hidden="true">${GROUP_SVG}</div>
      <div class="chat-list-main">
        <div class="chat-list-row">
          <div class="chat-list-name">B.tech team</div>
          <div class="chat-list-time">${groupTime || ''}</div>
        </div>
        <div class="chat-list-row">
          <div class="chat-list-last">${escapeHtmlLocal(groupListPreviewE)}</div>
          ${groupUnread ? `<span class="chat-list-unread">${groupUnread > 99 ? '99+' : groupUnread}</span>` : ''}
        </div>
      </div>
    </button>`;

  // Priority: unread/draft then admin first (direct to management)
  const adminP = (adminUnread ? 3 : 0) + (hasAdminDraft ? 2 : 0);
  const groupP = (groupUnread ? 3 : 0) + (hasGroupDraftE ? 2 : 0);
  el.innerHTML = (adminP >= groupP) ? (adminBtn + groupBtn) : (groupBtn + adminBtn);
}

(function _bindChatBackButton() {
  const btn = document.getElementById('chat-back-btn');
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeChat();
  });
})();

(function _bindChatHeaderExtras() {
  const modal = document.getElementById('chat-modal');
  const tb = document.getElementById('chat-search-toggle');
  const iPrev = document.getElementById('chat-insearch-prev');
  const iNext = document.getElementById('chat-insearch-next');
  const iClose = document.getElementById('chat-insearch-close');
  const iInp = document.getElementById('chat-insearch-input');
  if (tb && !tb.dataset.bound) {
    tb.dataset.bound = '1';
    tb.addEventListener('click', () => toggleChatInSearch());
  }
  if (iClose && !iClose.dataset.bound) {
    iClose.dataset.bound = '1';
    iClose.addEventListener('click', () => _closeChatSearch());
  }
  if (iPrev && !iPrev.dataset.bound) {
    iPrev.dataset.bound = '1';
    iPrev.addEventListener('click', () => _goChatSearchDir(-1));
  }
  if (iNext && !iNext.dataset.bound) {
    iNext.dataset.bound = '1';
    iNext.addEventListener('click', () => _goChatSearchDir(1));
  }
  if (iInp && !iInp.dataset.bound) {
    iInp.dataset.bound = '1';
    iInp.addEventListener('input', () => _applyChatSearch(iInp.value));
    iInp.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        _closeChatSearch();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) _goChatSearchDir(-1);
        else _goChatSearchDir(1);
      }
    });
  }

  const msgs = document.getElementById('chat-messages');
  if (msgs && !msgs.dataset.replyNav) {
    msgs.dataset.replyNav = '1';
    msgs.addEventListener('click', (e) => {
      const qel = e.target.closest('.chat-reply-quote--link');
      if (!qel) return;
      const id = qel.getAttribute('data-reply-to-id');
      if (!id) return;
      e.preventDefault();
      const row = Array.from(msgs.querySelectorAll('.chat-msg[data-chat-msg-id]')).find(
        (el) => el.getAttribute('data-chat-msg-id') === id
      );
      if (row) {
        row.classList.add('chat-msg--highlight');
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => row.classList.remove('chat-msg--highlight'), 2000);
      }
    });
    msgs.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const qel = e.target.closest('.chat-reply-quote--link');
      if (!qel) return;
      e.preventDefault();
      qel.click();
    });
  }

  if (modal && !modal.dataset.edgeSw) {
    modal.dataset.edgeSw = '1';
    let sx = 0; let sy = 0; let armed = false;
    const fromEdge = (x) => {
      const w = window.innerWidth;
      return _isHtmlRtl() ? (x > w - 28) : (x < 28);
    };
    modal.addEventListener('touchstart', (e) => {
      if (!e.touches || !e.touches[0]) return;
      const x = e.touches[0].clientX;
      if (!fromEdge(x)) { armed = false; return; }
      armed = true;
      sx = x;
      sy = e.touches[0].clientY;
    }, { passive: true });
    modal.addEventListener('touchend', (e) => {
      if (!armed) return;
      armed = false;
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      const rtl = _isHtmlRtl();
      const goBack = rtl ? (dx < -64) : (dx > 64);
      if (goBack && Math.abs(dy) < 50) closeChat();
    }, { passive: true });
  }
})();
