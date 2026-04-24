// UI-only helpers for chat rendering.
// Keeps templates and DOM paint logic separate from chat business logic.
(function initChatUI(global) {
  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function shortText(v, len = 70) {
    const s = String(v || '').trim();
    if (!s) return '';
    return s.length > len ? `${s.slice(0, len)}...` : s;
  }

  function formatAudioDuration(sec) {
    const s = Math.max(1, Math.round(Number(sec) || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  function renderMessages(opts) {
    const {
      container,
      msgs,
      isArabic,
      isGroup,
      currentUserId,
      currentUserName,
      parsePayload,
      replyPreviewHtml,
      colorForName,
      statusSuffixForMessage,
    } = opts;
    if (!container) return;
    if (!Array.isArray(msgs) || !msgs.length) {
      container.innerHTML = `<div style="text-align:center;color:var(--muted);padding:40px 20px;font-size:13px">
        <div style="font-size:36px;margin-bottom:8px">💬</div>
        ${isArabic ? 'لا توجد رسائل بعد. ابدأ المحادثة!' : 'No messages yet. Start the conversation!'}
      </div>`;
      return;
    }

    let lastDate = '';
    let lastSenderId = null;
    const html = [];

    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      const parsed = parsePayload(m.message);
      const d = new Date(m.created_at);
      const dateStr = d.toLocaleDateString('en-CA');
      const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const isMe = m.sender_id === currentUserId || m.sender_name === currentUserName;

      if (dateStr !== lastDate) {
        const today = new Date().toLocaleDateString('en-CA');
        const yest = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
        let dateLabel;
        if (dateStr === today) dateLabel = isArabic ? 'اليوم' : 'Today';
        else if (dateStr === yest) dateLabel = isArabic ? 'أمس' : 'Yesterday';
        else dateLabel = d.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        html.push(`<div style="text-align:center;margin:14px 0 8px"><span style="background:rgba(255,255,255,.06);color:var(--muted);font-size:11px;font-weight:700;padding:4px 12px;border-radius:12px">${dateLabel}</span></div>`);
        lastSenderId = null;
      }
      lastDate = dateStr;

      const isConsecutive = lastSenderId === m.sender_id;
      lastSenderId = m.sender_id;

      const senderColor = colorForName(m.sender_name || '');
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
        ? `<audio controls class="chat-audio" src="${escapeHtml(parsed.audioUrl || '')}"></audio>
           <div style="font-size:10px;color:var(--text2);margin-top:3px">${isArabic ? 'رسالة صوتية' : 'Voice note'} ${parsed.durationSec ? `• ${formatAudioDuration(parsed.durationSec)}` : ''}</div>`
        : `<div style="font-size:14px;line-height:1.4;word-break:break-word;color:var(--text)">${escapeHtml(parsed.text || '')}</div>`;

      html.push(`<div class="chat-msg" style="display:flex;flex-direction:${isMe ? 'row-reverse' : 'row'};align-items:flex-end;gap:6px;margin-top:${marginTop}">
        ${avatarHtml}
        <div style="display:flex;flex-direction:column;align-items:${isMe ? 'flex-end' : 'flex-start'};max-width:100%">
          <div class="chat-bubble" style="background:${bubbleBg};border-radius:${bubbleRadius};border:${bubbleBorder};box-shadow:0 1px 2px rgba(0,0,0,.15)">
            ${showSenderName ? `<div style="font-size:11px;color:${senderColor};font-weight:800;margin-bottom:2px">${escapeHtml(m.sender_name || '')}</div>` : ''}
            ${replyPreviewHtml(parsed.reply)}
            ${messageBody}
            <div style="font-size:10px;color:var(--muted);margin-top:3px;text-align:${isMe ? 'left' : 'right'};direction:ltr">${time}${statusSuffixForMessage(m, parsed, isMe)}</div>
          </div>
          <div class="chat-message-actions">
            <button class="chat-reply-action" onclick="setReplyTarget(${i})">${isArabic ? 'رد' : 'Reply'}</button>
          </div>
        </div>
      </div>`);
    }

    container.innerHTML = html.join('');
    container.scrollTop = container.scrollHeight;
  }

  function appendMessage(opts) {
    const { container, message, parsePayload, replyPreviewHtml, currentUserId, currentUserName, statusSuffixForMessage } = opts;
    if (!container || !message) return;
    const parsed = parsePayload(message.message);
    const isMe = message.sender_id === currentUserId || message.sender_name === currentUserName;
    const time = new Date(message.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const bubbleBg = isMe ? 'linear-gradient(135deg,rgba(0,200,83,.28),rgba(0,160,64,.18))' : 'rgba(255,255,255,.05)';
    const bubbleBorder = isMe ? '1px solid rgba(0,200,83,.35)' : '1px solid rgba(255,255,255,.08)';
    const body = parsed.type === 'audio'
      ? `<audio controls class="chat-audio" src="${escapeHtml(parsed.audioUrl || '')}"></audio>`
      : `<div style="font-size:14px;line-height:1.4;word-break:break-word;color:var(--text)">${escapeHtml(parsed.text || '')}</div>`;

    const div = document.createElement('div');
    div.style.cssText = `display:flex;flex-direction:${isMe ? 'row-reverse' : 'row'};align-items:flex-end;gap:6px;margin-top:4px`;
    div.innerHTML = `<div style="display:flex;flex-direction:column;align-items:${isMe ? 'flex-end' : 'flex-start'};max-width:82%">
      <div class="chat-bubble" style="background:${bubbleBg};border-radius:14px 4px 14px 14px;border:${bubbleBorder}">
        ${replyPreviewHtml(parsed.reply)}
        ${body}
        <div style="font-size:10px;color:var(--muted);margin-top:3px;text-align:${isMe ? 'left' : 'right'};direction:ltr">${time}${statusSuffixForMessage(message, parsed, isMe)}</div>
      </div>
    </div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  global.ChatUI = {
    escapeHtml,
    shortText,
    formatAudioDuration,
    renderMessages,
    appendMessage,
  };
})(window);

