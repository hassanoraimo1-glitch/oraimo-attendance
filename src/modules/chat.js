// ═══════════════════════════════════════════════════════════
// modules/chat.js — Realtime chat (group + private)
// Provides globals: openChat, closeChat, loadMessages, renderMessages,
//   sendMessage, appendMessage, subscribeToMessages, loadAdminChatList,
//   escapeHtmlLocal
// Realtime via Supabase, falls back to 5s polling
// ═══════════════════════════════════════════════════════════

// ── CHAT SYSTEM ──
let currentChat = null;
let chatSubscription = null;

async function openChat(chatType, title) {
  currentChat = chatType;
  document.getElementById('chat-title').textContent = title;
  const modal = document.getElementById('chat-modal');
  // Remove inline style completely — let CSS class handle display
  modal.removeAttribute('style');
  modal.classList.add('open');
  document.body.classList.add('modal-open');
  // Scroll to bottom after paint
  setTimeout(() => {
    const msgs = document.getElementById('chat-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }, 150);
  await loadMessages();
  subscribeToMessages();
}

function closeChat() {
  const modal = document.getElementById('chat-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.removeAttribute('style');
  }
  document.body.classList.remove('modal-open');
  currentChat = null;
  if (chatSubscription) {
    if (typeof chatSubscription === 'function') {
      try { chatSubscription(); } catch (_) {}
    } else {
      try { clearInterval(chatSubscription); } catch (_) {}
    }
    chatSubscription = null;
  }
}

async function loadMessages() {
  const el = document.getElementById('chat-messages');
  el.innerHTML = '<div class="full-loader"><div class="loader"></div></div>';
  let query = '?order=created_at.asc&limit=100';
  if (currentChat === 'group') {
    query += '&chat_type=eq.group';
  } else if (currentChat === 'admin') {
    // employee talking to admin
    const myId = currentUser.id;
    query += `&chat_type=eq.private&or=(sender_id.eq.${myId},receiver_id.eq.${myId})`;
  } else {
    // admin talking to specific employee
    const empId = currentChat;
    query += `&chat_type=eq.private&or=(sender_id.eq.${empId},receiver_id.eq.${empId})`;
  }
  const msgs = await dbGet('messages', query).catch(() => []) || [];
  renderMessages(msgs);
}

function renderMessages(msgs) {
  const el = document.getElementById('chat-messages');
  if (!msgs.length) {
    el.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;font-size:13px">لا توجد رسائل بعد</div>';
    return;
  }
  const myId = currentUser.id;
  const myName = currentUser.name;
  el.innerHTML = msgs.map(m => {
    // isMe: my messages align to right (end) in RTL
    const isMe = m.sender_id === myId || m.sender_name === myName;
    const time = new Date(m.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit',minute:'2-digit'});
    const bubbleBg = isMe ? 'linear-gradient(135deg,rgba(0,200,83,.25),rgba(0,160,64,.15))' : 'var(--card2)';
    const bubbleBorder = isMe ? '1px solid rgba(0,200,83,.35)' : '1px solid var(--border)';
    const bubbleRadius = isMe ? '18px 4px 18px 18px' : '4px 18px 18px 18px';
    return `<div style="display:flex;flex-direction:column;align-items:${isMe?'flex-end':'flex-start'};margin-bottom:2px">
      <div style="max-width:78%;min-width:60px;background:${bubbleBg};border-radius:${bubbleRadius};padding:8px 13px;border:${bubbleBorder}">
        ${!isMe?`<div style="font-size:10px;color:var(--green);font-weight:800;margin-bottom:3px">${m.sender_name}</div>`:''}
        <div style="font-size:14px;line-height:1.4;word-break:break-word">${escapeHtmlLocal(m.message)}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:3px;text-align:${isMe?'left':'right'}">${time}</div>
      </div>
    </div>`;
  }).join('');
  el.scrollTop = el.scrollHeight;
}
function escapeHtmlLocal(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

let _sendingMsg = false;
async function sendMessage() {
  if(_sendingMsg) return;
  const input = document.getElementById('chat-input');
  const msg = (input.value||'').trim();
  if (!msg || msg.length > 2000) return;
  _sendingMsg = true;
  input.value = '';
  // Optimistic UI: show message immediately
  const nowIso = new Date().toISOString();
  const tmpMsg = {
    sender_id: currentUser.id, sender_name: currentUser.name,
    message: msg, chat_type: currentChat==='group'?'group':'private',
    created_at: nowIso, _tmp: true
  };
  appendMessage(tmpMsg);
  try{
    const data = {
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      message: msg,
      chat_type: currentChat === 'group' ? 'group' : 'private',
      receiver_id: currentChat === 'group' ? null : (currentChat === 'admin' ? null : parseInt(currentChat))
    };
    await dbPost('messages', data).catch(e => { notify('Error: '+e.message, 'error'); throw e; });
    const notifTitle = currentChat === 'group' ? 'B.tech team 💬' : `رسالة من ${currentUser.name}`;
    if(typeof sendPushNotification==='function') sendPushNotification(notifTitle, msg, currentChat==='group'?null:(currentChat==='admin'?null:currentChat));
  }catch(_){
    // On error, reload to remove optimistic message
    await loadMessages();
  }finally{ _sendingMsg = false; }
}
function appendMessage(m){
  const el=document.getElementById('chat-messages');if(!el)return;
  const myId=currentUser.id,myName=currentUser.name;
  const isMe=m.sender_id===myId||m.sender_name===myName;
  const time=new Date(m.created_at).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});
  const bubbleBg=isMe?'linear-gradient(135deg,rgba(0,200,83,.25),rgba(0,160,64,.15))':'var(--card2)';
  const bubbleBorder=isMe?'1px solid rgba(0,200,83,.35)':'1px solid var(--border)';
  const bubbleRadius=isMe?'18px 4px 18px 18px':'4px 18px 18px 18px';
  const div=document.createElement('div');
  div.style.cssText=`display:flex;flex-direction:column;align-items:${isMe?'flex-end':'flex-start'};margin-bottom:2px`;
  div.innerHTML=`<div style="max-width:78%;min-width:60px;background:${bubbleBg};border-radius:${bubbleRadius};padding:8px 13px;border:${bubbleBorder}">
    ${!isMe?`<div style="font-size:10px;color:var(--green);font-weight:800;margin-bottom:3px">${m.sender_name}</div>`:''}
    <div style="font-size:14px;line-height:1.4;word-break:break-word">${escapeHtmlLocal(m.message)}</div>
    <div style="font-size:10px;color:var(--muted);margin-top:3px;text-align:${isMe?'left':'right'}">${time}</div>
  </div>`;
  el.appendChild(div);
  el.scrollTop=el.scrollHeight;
}

function subscribeToMessages() {
  // Clean up old subscription
  if (chatSubscription) {
    try{if(typeof chatSubscription==='function')chatSubscription();else clearInterval(chatSubscription);}catch(_){}
    chatSubscription=null;
  }
  const onNew = (newMsg) => {
    if(!currentChat||!currentUser) return;
    // Skip own messages — already shown optimistically, no reload needed
    if(newMsg.sender_id===currentUser.id) return;
    appendMessage(newMsg);
  };

  // On mobile, WebSocket/realtime can hang indefinitely.
  // Race it against a 6-second timeout and fall back to polling.
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
      if (!chatSubscription || typeof chatSubscription === 'function') {
        chatSubscription = unsub;
      }
    }).catch(() => {
      clearTimeout(timeoutId);
      fallbackToPolling();
    });
  } else {
    fallbackToPolling();
  }
}

async function loadAdminChatList() {
  const el = document.getElementById('admin-chat-list'); if (!el) return;
  const ar=currentLang==='ar';
  el.innerHTML = (allEmployees || []).map(emp => `
    <div class="card" onclick="openChat('${emp.id}','${emp.name}')" style="cursor:pointer;display:flex;align-items:center;gap:12px;margin-bottom:8px;flex-direction:${ar?'row-reverse':'row'}">
      <div class="emp-avatar" style="width:44px;height:44px;font-size:15px;flex-shrink:0;overflow:hidden">${emp.profile_photo?`<img src="${emp.profile_photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:emp.name[0].toUpperCase()}</div>
      <div style="text-align:${ar?'right':'left'}"><div style="font-size:13px;font-weight:700">${emp.name}</div><div style="font-size:11px;color:var(--muted)">${emp.branch||''}</div></div>
    </div>`).join('');
}
