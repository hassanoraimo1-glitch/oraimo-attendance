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

function _colorForName(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return _CHAT_COLORS[Math.abs(h) % _CHAT_COLORS.length];
}

function escapeHtmlLocal(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _shortText(v, len = 70) {
  const s = String(v || '').trim();
  if (!s) return '';
  return s.length > len ? `${s.slice(0, len)}...` : s;
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
    input.addEventListener('input', _refreshSendButtonState);
  }

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
}

async function loadMessages() {
  const el = document.getElementById('chat-messages');
  if (!el) return;

  el.innerHTML = '<div class="full-loader"><div class="loader"></div></div>';
  let query = '?select=*&order=created_at.asc&limit=200';

  if (currentChat === 'group') {
    query += '&chat_type=eq.group';
  } else if (currentChat === 'admin') {
    query += `&chat_type=eq.private&or=(sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id})`;
  } else {
    const empId = currentChat;
    query += `&chat_type=eq.private&or=(sender_id.eq.${empId},receiver_id.eq.${empId})`;
  }

  const msgs = await dbGet('messages', query).catch(() => []) || [];
  _latestMessages.length = 0;
  _latestMessages.push(...msgs);
  renderMessages(msgs);
}

function _formatAudioDuration(sec) {
  const s = Math.max(1, Math.round(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function renderMessages(msgs) {
  const el = document.getElementById('chat-messages');
  if (!el) return;

  const ar = currentLang === 'ar';
  if (!msgs.length) {
    el.innerHTML = `<div style="text-align:center;color:var(--muted);padding:40px 20px;font-size:13px">
      <div style="font-size:36px;margin-bottom:8px">💬</div>
      ${ar ? 'لا توجد رسائل بعد. ابدأ المحادثة!' : 'No messages yet. Start the conversation!'}
    </div>`;
    return;
  }

  const myId = currentUser.id;
  const myName = currentUser.name;
  const isGroup = currentChat === 'group';

  let lastDate = '';
  let lastSenderId = null;
  const html = [];

  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const parsed = _parseMessagePayload(m.message);
    const d = new Date(m.created_at);
    const dateStr = d.toLocaleDateString('en-CA');
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const isMe = m.sender_id === myId || m.sender_name === myName;

    if (dateStr !== lastDate) {
      const today = new Date().toLocaleDateString('en-CA');
      const yest = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
      let dateLabel;
      if (dateStr === today) dateLabel = ar ? 'اليوم' : 'Today';
      else if (dateStr === yest) dateLabel = ar ? 'أمس' : 'Yesterday';
      else dateLabel = d.toLocaleDateString(ar ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      html.push(`<div style="text-align:center;margin:14px 0 8px"><span style="background:rgba(255,255,255,.06);color:var(--muted);font-size:11px;font-weight:700;padding:4px 12px;border-radius:12px">${dateLabel}</span></div>`);
      lastSenderId = null;
    }
    lastDate = dateStr;

    const isConsecutive = lastSenderId === m.sender_id;
    lastSenderId = m.sender_id;

    const senderColor = _colorForName(m.sender_name || '');
    const bubbleBg = isMe
      ? 'linear-gradient(135deg,rgba(0,200,83,.28),rgba(0,160,64,.18))'
      : 'rgba(255,255,255,.05)';
    const bubbleBorder = isMe
      ? '1px solid rgba(0,200,83,.35)'
      : '1px solid rgba(255,255,255,.08)';
    const bubbleRadius = isMe ? '14px 4px 14px 14px' : '4px 14px 14px 14px';

    const showSenderName = !isMe && isGroup && !isConsecutive;
    const showAvatar = !isMe && isGroup && !isConsecutive;
    const marginTop = isConsecutive ? '2px' : '10px';

    const avatarHtml = (!isMe && isGroup)
      ? (showAvatar
        ? `<div style="width:32px;height:32px;border-radius:50%;background:${senderColor};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0;align-self:flex-end">${(m.sender_name || '?')[0].toUpperCase()}</div>`
        : '<div style="width:32px;flex-shrink:0"></div>')
      : '';

    const messageBody = parsed.type === 'audio'
      ? `<audio controls class="chat-audio" src="${escapeHtmlLocal(parsed.audioUrl || '')}"></audio>
         <div style="font-size:10px;color:var(--text2);margin-top:3px">${ar ? 'رسالة صوتية' : 'Voice note'} ${parsed.durationSec ? `• ${_formatAudioDuration(parsed.durationSec)}` : ''}</div>`
      : `<div style="font-size:14px;line-height:1.4;word-break:break-word;color:var(--text)">${escapeHtmlLocal(parsed.text || '')}</div>`;

    html.push(`<div class="chat-msg" style="display:flex;flex-direction:${isMe ? 'row-reverse' : 'row'};align-items:flex-end;gap:6px;margin-top:${marginTop}">
      ${avatarHtml}
      <div style="display:flex;flex-direction:column;align-items:${isMe ? 'flex-end' : 'flex-start'};max-width:100%">
        <div class="chat-bubble" style="background:${bubbleBg};border-radius:${bubbleRadius};border:${bubbleBorder};box-shadow:0 1px 2px rgba(0,0,0,.15)">
          ${showSenderName ? `<div style="font-size:11px;color:${senderColor};font-weight:800;margin-bottom:2px">${escapeHtmlLocal(m.sender_name || '')}</div>` : ''}
          ${_replyPreviewHtml(parsed.reply)}
          ${messageBody}
          <div style="font-size:10px;color:var(--muted);margin-top:3px;text-align:${isMe ? 'left' : 'right'};direction:ltr">${time}${m._tmp ? ' · ⏳' : ''}</div>
        </div>
        <div class="chat-message-actions">
          <button class="chat-reply-action" onclick="setReplyTarget(${i})">${ar ? 'رد' : 'Reply'}</button>
        </div>
      </div>
    </div>`);
  }

  el.innerHTML = html.join('');
  el.scrollTop = el.scrollHeight;
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

  const parsed = _parseMessagePayload(m.message);
  const isMe = m.sender_id === currentUser.id || m.sender_name === currentUser.name;
  const time = new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const bubbleBg = isMe ? 'linear-gradient(135deg,rgba(0,200,83,.28),rgba(0,160,64,.18))' : 'rgba(255,255,255,.05)';
  const bubbleBorder = isMe ? '1px solid rgba(0,200,83,.35)' : '1px solid rgba(255,255,255,.08)';
  const bubbleRadius = '14px 4px 14px 14px';
  const body = parsed.type === 'audio'
    ? `<audio controls class="chat-audio" src="${escapeHtmlLocal(parsed.audioUrl || '')}"></audio>`
    : `<div style="font-size:14px;line-height:1.4;word-break:break-word;color:var(--text)">${escapeHtmlLocal(parsed.text || '')}</div>`;

  const div = document.createElement('div');
  div.style.cssText = `display:flex;flex-direction:${isMe ? 'row-reverse' : 'row'};align-items:flex-end;gap:6px;margin-top:4px`;
  div.innerHTML = `<div style="display:flex;flex-direction:column;align-items:${isMe ? 'flex-end' : 'flex-start'};max-width:82%">
    <div class="chat-bubble" style="background:${bubbleBg};border-radius:${bubbleRadius};border:${bubbleBorder}">
      ${_replyPreviewHtml(parsed.reply)}
      ${body}
      <div style="font-size:10px;color:var(--muted);margin-top:3px;text-align:${isMe ? 'left' : 'right'};direction:ltr">${time}${m._tmp ? ' · ⏳' : ''}</div>
    </div>
  </div>`;
  el.appendChild(div);
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
}

async function loadAdminChatList() {
  const el = document.getElementById('admin-chat-list');
  if (!el) return;
  const ar = currentLang === 'ar';

  if (!allEmployees || !allEmployees.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:12px;text-align:center;padding:20px">${ar ? 'لا يوجد موظفون' : 'No employees'}</div>`;
    return;
  }

  el.innerHTML = allEmployees.map(emp => {
    const color = _colorForName(emp.name || '');
    return `<div class="card" onclick="openChat('${emp.id}','${(emp.name || '').replace(/'/g, "\\'")}')" style="cursor:pointer;display:flex;align-items:center;gap:12px;margin-bottom:8px;flex-direction:${ar ? 'row-reverse' : 'row'}">
      <div class="emp-avatar" style="width:44px;height:44px;font-size:15px;flex-shrink:0;overflow:hidden;background:${color};color:#fff">${emp.profile_photo ? `<img src="${emp.profile_photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : (emp.name || '?')[0].toUpperCase()}</div>
      <div style="text-align:${ar ? 'right' : 'left'};flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${emp.name}</div>
        <div style="font-size:11px;color:var(--muted)">${emp.branch || ''}</div>
      </div>
    </div>`;
  }).join('');
}
