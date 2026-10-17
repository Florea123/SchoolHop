// Asistentul pentru părinți: buton flotant + panou de chat (POST /api/assistant)

import { api } from './api.js';
import { $, html, raw, firstName } from './ui.js';

const STORAGE_KEY = 'schoolhop.assistant';
const POS_KEY = 'schoolhop.assistant.pos';
const FAB = 56;
const MARGIN = 12;
const SEND_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const ROBOT_ICON = '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 4v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="3.5" r="2" fill="#EE6A3F"/><rect x="5" y="8" width="22" height="17" rx="6" fill="currentColor"/><circle cx="11.5" cy="16" r="2.6" fill="#0F6E6E"/><circle cx="20.5" cy="16" r="2.6" fill="#0F6E6E"/><path d="M12.5 21h7" stroke="#0F6E6E" stroke-width="2" stroke-linecap="round"/><path d="M3 14v5M29 14v5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
const NEW_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const CLOSE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

function loadHistory() {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
function saveHistory(messages) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30))); } catch { /* stocare indisponibilă */ }
}

function loadPos() {
  try { return JSON.parse(localStorage.getItem(POS_KEY)); } catch { return null; }
}
function savePos(pos) {
  try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch { /* stocare indisponibilă */ }
}
const isDesktop = () => window.matchMedia('(min-width: 900px)').matches;

// Zona în care robotul se poate mișca (deasupra barei de navigație pe telefon)
function bounds() {
  const tabbar = isDesktop() ? 0 : (document.querySelector('.app-nav')?.offsetHeight || 0);
  return {
    minX: MARGIN, maxX: window.innerWidth - FAB - MARGIN,
    minY: (document.querySelector('.app-header')?.offsetHeight || 0) + MARGIN,
    maxY: window.innerHeight - tabbar - FAB - MARGIN,
  };
}
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Mută un element prin tragere (mouse sau deget); onMove primește deplasarea, onEnd dacă a fost tragere
function draggable(handle, { onStart, onMove, onEnd }) {
  handle.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button:not(.assistant-fab)')) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;
    onStart();
    handle.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      moved = true;
      handle.classList.add('dragging');
      onMove(dx, dy);
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      handle.classList.remove('dragging');
      onEnd(moved);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  });
}

function suggestionsFor(me) {
  const child = me.children[0] ? firstName(me.children[0].fullName) : 'copilul meu';
  return [
    `Caută-i lui ${child} o cursă spre școală pentru mâine dimineață`,
    `Cine merge la școală din zona noastră cu un coleg de clasă al lui ${child}?`,
    'Vreau să ofer locuri în mașină de luni până vineri',
    'Ce curse am programate săptămâna aceasta?',
  ];
}

export function mountAssistant(me) {
  if (document.getElementById('assistantPanel')) return;
  if (!document.querySelector('link[href="css/assistant.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/assistant.css';
    document.head.appendChild(link);
  }

  let messages = loadHistory();
  let sending = false;

  const fab = document.createElement('button');
  fab.className = 'assistant-fab';
  fab.type = 'button';
  fab.setAttribute('aria-haspopup', 'dialog');
  fab.setAttribute('aria-label', 'Deschide asistentul (îl poți muta trăgându-l)');
  fab.title = 'Asistent SchoolHop';
  fab.innerHTML = ROBOT_ICON;

  const panel = document.createElement('section');
  panel.className = 'assistant-panel';
  panel.id = 'assistantPanel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Asistent SchoolHop');
  panel.innerHTML = html`
    <header class="assistant-head">
      <div class="assistant-avatar" aria-hidden="true">${raw(ROBOT_ICON)}</div>
      <div class="assistant-title"><strong>Asistent SchoolHop</strong><span>Te ajută cu drumul spre școală</span></div>
      <button type="button" class="btn-icon" data-clear aria-label="Conversație nouă" title="Conversație nouă">${raw(NEW_ICON)}</button>
      <button type="button" class="btn-icon" data-close aria-label="Închide asistentul">${raw(CLOSE_ICON)}</button>
    </header>
    <div class="assistant-messages" aria-live="polite"></div>
    <form class="assistant-input">
      <textarea rows="1" maxlength="1000" placeholder="Scrie un mesaj…" aria-label="Mesaj pentru asistent"></textarea>
      <button type="submit" class="assistant-send" aria-label="Trimite">${raw(SEND_ICON)}</button>
    </form>`.toString();

  document.body.append(fab, panel);
  const list = panel.querySelector('.assistant-messages');
  const form = panel.querySelector('form');
  const input = panel.querySelector('textarea');
  const sendBtn = panel.querySelector('.assistant-send');

  function render() {
    if (!messages.length) {
      list.innerHTML = html`
        <div class="assistant-welcome">
          <h2>Bună, ${firstName(me.user.fullName)}!</h2>
          <p>Spune-mi ce ai nevoie pentru drumul copiilor la școală.</p>
          <div class="assistant-suggestions">${suggestionsFor(me).map((s) => raw(html`<button type="button" data-suggestion="${s}">${s}</button>`))}</div>
        </div>`.toString();
      list.querySelectorAll('[data-suggestion]').forEach((b) => b.addEventListener('click', () => send(b.dataset.suggestion)));
      return;
    }
    list.innerHTML = messages.map((m) => html`<div class="msg msg-${m.role}">${m.content}</div>`).join('')
      + (sending ? '<div class="msg msg-assistant typing" aria-label="Asistentul scrie"><i></i><i></i><i></i></div>' : '');
    list.scrollTop = list.scrollHeight;
  }

  function autosize() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    sendBtn.disabled = sending || !input.value.trim();
  }

  async function send(text) {
    const content = String(text || '').trim();
    if (!content || sending) return;
    messages.push({ role: 'user', content });
    sending = true;
    input.value = '';
    autosize();
    render();
    try {
      const res = await api.post('/assistant', { messages });
      messages.push({ role: 'assistant', content: res.reply });
    } catch (err) {
      messages.push({ role: 'assistant', content: `Nu am putut trimite mesajul: ${err.message}` });
    } finally {
      sending = false;
      saveHistory(messages);
      render();
      autosize();
      input.focus();
    }
  }

  // Poziția robotului: implicit jos-dreapta; după tragere se lipește de cea mai apropiată margine
  let pos = loadPos();
  function placeFab() {
    const b = bounds();
    if (!pos || !['left', 'right'].includes(pos.side)) pos = { side: 'right', y: b.maxY };
    pos.y = clamp(pos.y, b.minY, b.maxY);
    fab.style.left = `${pos.side === 'left' ? b.minX : b.maxX}px`;
    fab.style.top = `${pos.y}px`;
  }

  // Pe desktop, chat-ul se deschide lângă robot, pe partea lui de ecran
  function placePanel() {
    if (!isDesktop()) { panel.style.left = ''; panel.style.top = ''; return; }
    const b = bounds();
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    const left = pos.side === 'left' ? MARGIN : window.innerWidth - w - MARGIN;
    const top = clamp(pos.y + FAB - h, b.minY, window.innerHeight - h - MARGIN);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  let origin;
  draggable(fab, {
    onStart: () => { origin = { x: parseFloat(fab.style.left), y: parseFloat(fab.style.top) }; },
    onMove: (dx, dy) => {
      const b = bounds();
      fab.style.left = `${clamp(origin.x + dx, b.minX, b.maxX)}px`;
      fab.style.top = `${clamp(origin.y + dy, b.minY, b.maxY)}px`;
    },
    onEnd: (moved) => {
      if (!moved) { open(); return; }
      const x = parseFloat(fab.style.left);
      pos = { side: x + FAB / 2 < window.innerWidth / 2 ? 'left' : 'right', y: parseFloat(fab.style.top) };
      savePos(pos);
      placeFab();
    },
  });

  // Pe desktop, panoul se mută trăgând de bara de sus; robotul îl urmează
  const head = panel.querySelector('.assistant-head');
  let panelOrigin;
  draggable(head, {
    onStart: () => { panelOrigin = { x: panel.offsetLeft, y: panel.offsetTop }; },
    onMove: (dx, dy) => {
      if (!isDesktop()) return;
      panel.style.left = `${clamp(panelOrigin.x + dx, MARGIN, window.innerWidth - panel.offsetWidth - MARGIN)}px`;
      panel.style.top = `${clamp(panelOrigin.y + dy, MARGIN, window.innerHeight - panel.offsetHeight - MARGIN)}px`;
    },
    onEnd: (moved) => {
      if (!moved || !isDesktop()) return;
      const b = bounds();
      pos = {
        side: panel.offsetLeft + panel.offsetWidth / 2 < window.innerWidth / 2 ? 'left' : 'right',
        y: clamp(panel.offsetTop + panel.offsetHeight - FAB, b.minY, b.maxY),
      };
      savePos(pos);
      placeFab();
      placePanel();
    },
  });

  window.addEventListener('resize', () => { placeFab(); if (!panel.hidden) placePanel(); });
  placeFab();

  function open() {
    panel.hidden = false;
    fab.hidden = true;
    placePanel();
    render();
    autosize();
    input.focus();
  }
  function close() {
    panel.hidden = true;
    fab.hidden = false;
    placeFab();
    fab.focus();
  }

  fab.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  panel.querySelector('[data-close]').addEventListener('click', close);
  panel.querySelector('[data-clear]').addEventListener('click', () => { messages = []; saveHistory(messages); render(); input.focus(); });
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); }
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });
}
