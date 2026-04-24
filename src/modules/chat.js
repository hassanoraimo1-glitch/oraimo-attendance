// ═══════════════════════════════════════════════════════════
// modules/chat.js — Realtime chat (group + private), WhatsApp-style UI
// Provides globals: openChat, closeChat, loadMessages, renderMessages,
//   sendMessage, appendMessage, subscribeToMessages, loadAdminChatList,
//   escapeHtmlLocal
// ═══════════════════════════════════════════════════════════

let currentChat = null;
let chatSubscription = null;

// ── Sender color map (stable per name) — gives each sender a consistent accent ──
const _CHAT_COLORS = ['#00C853', '#2979FF', '#FF6D00', '#AA00FF', '#00B8D4', '#FF4081', '#76FF03'];
function _colorForName(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return _CHAT_COLORS[Math.abs(h) % _CHAT_COLORS.length];
}

function escapeHtmlLocal(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function openChat(chatType, title) {
  currentChat = chatType;
  const titleEl = document.getElementById('chat-title');
  if (titleEl) titleEl.textContent = title;
  const modal = document.getElementById('chat-modal');
  if (!modal) return;
  modal.removeAttribute('style');
  modal.classList.add('open');
  document.body.classList.add('modal-open');
  await loadMessages();
  subscribeToMessages();
  requestAnimationFrame(() => {
    const msgs = document.getElementById('chat-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  });
}

function closeChat() {
  const modal = document.getElementById('chat-modal');
  if (modal) { modal.classList.remove('open'); modal.removeAttribute('style'); }
  document.body.classList.remove('modal-open');
  currentChat = null;
  if (chatSubscription) {
    if (typeof chatSubscription === 'function') { try { chatSubscription(); } catch (_) { } }
    else { try { clearInterval(chatSubscription); } catch (_) { } }
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
    // employee viewing admin chat → show messages they sent AND received
    query += `&chat_type=eq.private&or=(sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id})`;
  } else {
    // admin viewing a specific employee
    const empId = currentChat;
    query += `&chat_type=eq.private&or=(sender_id.eq.${empId},receiver_id.eq.${empId})`;
  }
  const msgs = await dbGet('messages', query).catch(() => []) || [];
  renderMessages(msgs);
}

// ═══════════════════════════════════════════════════════════
// renderMessages — WhatsApp-style:
//  • Bubble tails (9px radius corner towards sender)
//  • Date separators between different days
//  • Avatar/initial for non-me senders in group chat
//  • Consecutive same-sender messages are visually grouped
//  • Better time format (HH:mm, 24h)
// ═══════════════════════════════════════════════════════════
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
    const d = new Date(m.created_at);
    const dateStr = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const isMe = m.sender_id === myId || m.sender_name === myName;

    // ── Date separator ──
    if (dateStr !== lastDate) {
      const today = new Date().toLocaleDateString('en-CA');
      const yest = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
      let dateLabel;
      if (dateStr === today) dateLabel = ar ? 'اليوم' : 'Today';
      else if (dateStr === yest) dateLabel = ar ? 'أمس' : 'Yesterday';
      else dateLabel = d.toLocaleDateString(ar ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      html.push(`<div style="text-align:center;margin:14px 0 8px"><span style="background:rgba(255,255,255,.06);color:var(--muted);font-size:11px;font-weight:700;padding:4px 12px;border-radius:12px">${dateLabel}</span></div>`);
      lastSenderId = null; // reset grouping
    }
    lastDate = dateStr;

    // ── Grouping logic ──
    const isConsecutive = lastSenderId === m.sender_id;
    lastSenderId = m.sender_id;

    // ── Bubble styling ──
    const senderColor = _colorForName(m.sender_name || '');
    const bubbleBg = isMe
      ? 'linear-gradient(135deg,rgba(0,200,83,.28),rgba(0,160,64,.18))'
      : 'rgba(255,255,255,.05)';
    const bubbleBorder = isMe
      ? '1px solid rgba(0,200,83,.35)'
      : '1px solid rgba(255,255,255,.08)';
    // WhatsApp-style rounded corners with "tail"
    const bubbleRadius = isMe
      ? (isConsecutive ? '14px 4px 14px 14px' : '14px 4px 14px 14px')
      : (isConsecutive ? '4px 14px 14px 14px' : '4px 14px 14px 14px');

    const showSenderName = !isMe && isGroup && !isConsecutive;
    const showAvatar = !isMe && isGroup && !isConsecutive;
    const marginTop = isConsecutive ? '2px' : '10px';

    // Avatar (or spacer for consecutive messages)
    const avatarHtml = (!isMe && isGroup)
      ? (showAvatar
        ? `<div style="width:32px;height:32px;border-radius:50%;background:${senderColor};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0;align-self:flex-end">${(m.sender_name || '?')[0].toUpperCase()}</div>`
        : '<div style="width:32px;flex-shrink:0"></div>')
      : '';

    html.push(`<div style="display:flex;flex-direction:${isMe ? 'row-reverse' : 'row'};align-items:flex-end;gap:6px;margin-top:${marginTop}">
      ${avatarHtml}
      <div style="display:flex;flex-direction:column;align-items:${isMe ? 'flex-end' : 'flex-start'};max-width:78%">
        <div style="background:${bubbleBg};border-radius:${bubbleRadius};padding:7px 12px 5px;border:${bubbleBorder};box-shadow:0 1px 2px rgba(0,0,0,.15)">
          ${showSenderName ? `<div style="font-size:11px;color:${senderColor};font-weight:800;margin-bottom:2px">${escapeHtmlLocal(m.sender_name || '')}</div>` : ''}
          <div style="font-size:14px;line-height:1.4;word-break:break-word;color:var(--text)">${escapeHtmlLocal(m.message)}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:3px;text-align:${isMe ? 'left' : 'right'};direction:ltr">${time}${m._tmp ? ' · ⏳' : ''}</div>
        </div>
      </div>
    </div>`);
  }

  el.innerHTML = html.join('');
  el.scrollTop = el.scrollHeight;
}

let _sendingMsg = false;
async function sendMessage() {
  if (_sendingMsg) return;
  const input = document.getElementById('chat-input');
  if (!input) return;
  const msg = (input.value || '').trim();
  if (!msg || msg.length > 2000) return;
  _sendingMsg = true;
  input.value = '';

  // Optimistic UI
  const nowIso = new Date().toISOString();
  const tmpMsg = {
    sender_id: currentUser.id, sender_name: currentUser.name,
    message: msg, chat_type: currentChat === 'group' ? 'group' : 'private',
    created_at: nowIso, _tmp: true
  };
  appendMessage(tmpMsg);

  try {
    const data = {
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      message: msg,
      chat_type: currentChat === 'group' ? 'group' : 'private',
      receiver_id: currentChat === 'group' ? null : (currentChat === 'admin' ? null : parseInt(currentChat, 10))
    };
    await dbPost('messages', data);
    const notifTitle = currentChat === 'group' ? 'B.tech team 💬' : `رسالة من ${currentUser.name}`;
    if (typeof sendPushNotification === 'function') {
      sendPushNotification(notifTitle, msg, currentChat === 'group' ? null : (currentChat === 'admin' ? null : currentChat));
    }
    // Reload to pick up server-side created_at / id
    await loadMessages();
  } catch (e) {
    console.error('[sendMessage]', e);
    notify('Error: ' + e.message, 'error');
    await loadMessages();
  } finally {
    _sendingMsg = false;
  }
}

function appendMessage(m) {
  // For single new-message append, just re-render (keeps grouping logic consistent)
  const el = document.getElementById('chat-messages');
  if (!el) return;
  // Cheap way: append then let next loadMessages() re-render properly.
  // But for instant optimistic UI, inject a minimal bubble at the end:
  const ar = currentLang === 'ar';
  const isMe = m.sender_id === currentUser.id || m.sender_name === currentUser.name;
  const time = new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const bubbleBg = isMe ? 'linear-gradient(135deg,rgba(0,200,83,.28),rgba(0,160,64,.18))' : 'rgba(255,255,255,.05)';
  const bubbleBorder = isMe ? '1px solid rgba(0,200,83,.35)' : '1px solid rgba(255,255,255,.08)';
  const bubbleRadius = '14px 4px 14px 14px';
  const div = document.createElement('div');
  div.style.cssText = `display:flex;flex-direction:${isMe ? 'row-reverse' : 'row'};align-items:flex-end;gap:6px;margin-top:4px`;
  div.innerHTML = `<div style="display:flex;flex-direction:column;align-items:${isMe ? 'flex-end' : 'flex-start'};max-width:78%">
    <div style="background:${bubbleBg};border-radius:${bubbleRadius};padding:7px 12px 5px;border:${bubbleBorder}">
      <div style="font-size:14px;line-height:1.4;word-break:break-word;color:var(--text)">${escapeHtmlLocal(m.message)}</div>
      <div style="font-size:10px;color:var(--muted);margin-top:3px;text-align:${isMe ? 'left' : 'right'};direction:ltr">${time}${m._tmp ? ' · ⏳' : ''}</div>
    </div>
  </div>`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function subscribeToMessages() {
  if (chatSubscription) {
    try { if (typeof chatSubscription === 'function') chatSubscription(); else clearInterval(chatSubscription); } catch (_) { }
    chatSubscription = null;
  }
  const onNew = (newMsg) => {
    if (!currentChat || !currentUser) return;
    if (newMsg.sender_id === currentUser.id) return;
    // Trigger a full reload to get consistent grouping with existing messages
    loadMessages();
  };
  const fallbackToPolling = () => {
    if (chatSubscription && typeof chatSubscription !== 'function') return;
    chatSubscription = setInterval(() => { if (currentChat) loadMessages(); }, 6000);
  };
  if (window.chatSubscribeRealtime) {
    const timeoutId = setTimeout(fallbackToPolling, 6000);
    window.chatSubscribeRealtime(onNew).then(unsub => {
      clearTimeout(timeoutId);
      if (!chatSubscription || typeof chatSubscription === 'function') chatSubscription = unsub;
    }).catch(() => { clearTimeout(timeoutId); fallbackToPolling(); });
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
