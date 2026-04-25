// UI-only helpers for chat rendering.
// Theme-aware bubbles, grouping, custom voice row (no default <audio controls> chrome).
(function initChatUI(global) {
  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function shortText(v, len = 70) {
    const t = String(v || '').trim();
    if (!t) return '';
    return t.length > len ? `${t.slice(0, len)}...` : t;
  }

  function formatAudioDuration(sec) {
    const s = Math.max(1, Math.round(Number(sec) || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  const PLAY_SVG =
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
  const PAUSE_SVG =
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

  function voiceBlock(parsed, isArabic) {
    const src = escapeHtml(parsed.audioUrl || '');
    const dur = parsed.durationSec ? formatAudioDuration(parsed.durationSec) : '';
    const label = isArabic ? 'صوت' : 'Voice';
    return `<div class="chat-voice-wrap">
      <button type="button" class="chat-voice-play" aria-label="${isArabic ? 'تشغيل' : 'Play'}">${PLAY_SVG}</button>
      <div class="chat-voice-wave" aria-hidden="true"></div>
      <span class="chat-voice-dur">${escapeHtml(dur || '0:01')}</span>
      <span class="chat-voice-label">${label}</span>
      <audio preload="metadata" class="chat-voice-audio" src="${src}"></audio>
    </div>`;
  }

  function bindVoiceDelegation() {
    const root = document.getElementById('chat-messages');
    if (!root || root._chatVoiceBound) return;
    root._chatVoiceBound = true;
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.chat-voice-play');
      if (!btn) return;
      e.preventDefault();
      const wrap = btn.closest('.chat-voice-wrap');
      if (!wrap) return;
      const audio = wrap.querySelector('audio');
      if (!audio || !audio.src) return;

      root.querySelectorAll('.chat-voice-wrap.is-playing').forEach((w) => {
        if (w === wrap) return;
        w.classList.remove('is-playing');
        const a = w.querySelector('audio');
        const b = w.querySelector('.chat-voice-play');
        if (a) {
          try {
            a.pause();
          } catch (_) {}
        }
        if (b) b.innerHTML = PLAY_SVG;
      });

      if (audio.paused) {
        audio.onended = () => {
          wrap.classList.remove('is-playing');
          btn.innerHTML = PLAY_SVG;
        };
        audio.play().catch(() => {});
        wrap.classList.add('is-playing');
        btn.innerHTML = PAUSE_SVG;
      } else {
        audio.pause();
        wrap.classList.remove('is-playing');
        btn.innerHTML = PLAY_SVG;
      }
    });
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
      container.innerHTML = `<div class="chat-empty-state">
        <div class="chat-empty-state__icon" aria-hidden="true"></div>
        <p class="chat-empty-state__text">${isArabic ? 'لا توجد رسائل بعد. ابدأ المحادثة!' : 'No messages yet. Start the conversation!'}</p>
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
        html.push(`<div class="chat-date-divider"><span class="chat-date-pill">${escapeHtml(dateLabel)}</span></div>`);
        lastSenderId = null;
      }
      lastDate = dateStr;

      const isConsecutive = lastSenderId === m.sender_id;
      lastSenderId = m.sender_id;

      const senderColor = colorForName(m.sender_name || '');
      const showSenderName = !isMe && isGroup && !isConsecutive;
      const showAvatar = !isMe && isGroup && !isConsecutive;
      const stackClass = isConsecutive ? ' chat-msg--stack' : '';

      const avatarHtml = !isMe && isGroup
        ? showAvatar
          ? `<div class="chat-msg__avatar" style="background:${escapeHtml(senderColor)}">${escapeHtml((m.sender_name || '?')[0].toUpperCase())}</div>`
          : '<div class="chat-msg__avatar chat-msg__avatar--spacer" aria-hidden="true"></div>'
        : '';

      const messageBody =
        parsed.type === 'audio'
          ? voiceBlock(parsed, isArabic)
          : `<div class="chat-msg__text">${escapeHtml(parsed.text || '')}</div>`;

      const bubbleMod = isMe ? 'chat-bubble--me' : 'chat-bubble--them';
      const rowMod = isMe ? 'chat-msg--me' : 'chat-msg--them';

      html.push(`<div class="chat-msg ${rowMod}${stackClass}" style="--sender-accent:${escapeHtml(senderColor)}">
        ${avatarHtml}
        <div class="chat-msg__col">
          <div class="chat-bubble ${bubbleMod}">
            ${showSenderName ? `<div class="chat-msg__sender">${escapeHtml(m.sender_name || '')}</div>` : ''}
            ${replyPreviewHtml(parsed.reply)}
            ${messageBody}
            <div class="chat-msg__meta">${time}${statusSuffixForMessage(m, parsed, isMe)}</div>
          </div>
          <div class="chat-message-actions">
            <button type="button" class="chat-reply-action" onclick="setReplyTarget(${i})">${isArabic ? 'رد' : 'Reply'}</button>
          </div>
        </div>
      </div>`);
    }

    container.innerHTML = html.join('');
    container.scrollTop = container.scrollHeight;
    bindVoiceDelegation();
  }

  function appendMessage(opts) {
    const { container, message, parsePayload, replyPreviewHtml, currentUserId, currentUserName, statusSuffixForMessage } = opts;
    if (!container || !message) return;
    const parsed = parsePayload(message.message);
    const isMe = message.sender_id === currentUserId || message.sender_name === currentUserName;
    const time = new Date(message.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const ar = typeof currentLang !== 'undefined' ? currentLang === 'ar' : true;
    const grp = typeof currentChat !== 'undefined' && currentChat === 'group';
    const body =
      parsed.type === 'audio'
        ? voiceBlock(parsed, ar)
        : `<div class="chat-msg__text">${escapeHtml(parsed.text || '')}</div>`;

    const div = document.createElement('div');
    div.className = `chat-msg ${isMe ? 'chat-msg--me' : 'chat-msg--them'}`;
    div.innerHTML = `${!isMe && grp ? '<div class="chat-msg__avatar chat-msg__avatar--spacer"></div>' : ''}
      <div class="chat-msg__col">
        <div class="chat-bubble ${isMe ? 'chat-bubble--me' : 'chat-bubble--them'}">
          ${replyPreviewHtml(parsed.reply)}
          ${body}
          <div class="chat-msg__meta">${time}${statusSuffixForMessage(message, parsed, isMe)}</div>
        </div>
      </div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    bindVoiceDelegation();
  }

  global.ChatUI = {
    escapeHtml,
    shortText,
    formatAudioDuration,
    renderMessages,
    appendMessage,
    bindVoiceDelegation,
  };
})(window);
