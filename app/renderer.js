const state = loadState();
let activePeerId = null;
let mediaStream = null;
const bridge = window.desktopBridge || null;

const els = {
  nameInput: document.getElementById('nameInput'),
  emailInput: document.getElementById('emailInput'),
  createBtn: document.getElementById('createBtn'),
  userSwitch: document.getElementById('userSwitch'),
  allUsers: document.getElementById('allUsers'),
  requests: document.getElementById('requests'),
  chatTitle: document.getElementById('chatTitle'),
  activeUserLabel: document.getElementById('activeUserLabel'),
  messages: document.getElementById('messages'),
  msgInput: document.getElementById('msgInput'),
  fileInput: document.getElementById('fileInput'),
  sendBtn: document.getElementById('sendBtn'),
  audioBtn: document.getElementById('audioBtn'),
  videoBtn: document.getElementById('videoBtn'),
  screenBtn: document.getElementById('screenBtn'),
  stopMediaBtn: document.getElementById('stopMediaBtn'),
  localVideo: document.getElementById('localVideo'),
  backupName: document.getElementById('backupName'),
  saveBackupBtn: document.getElementById('saveBackupBtn'),
  restoreInput: document.getElementById('restoreInput'),
  backupInfo: document.getElementById('backupInfo')
};

function uid() {
  return crypto.randomUUID();
}

function loadState() {
  const raw = localStorage.getItem('cc_state');
  return raw ? JSON.parse(raw) : {
    users: [],
    currentUserId: null,
    requests: [],
    acceptedPairs: [],
    chats: {}
  };
}

function saveState() {
  localStorage.setItem('cc_state', JSON.stringify(state));
}

function getCurrentUser() {
  return state.users.find((u) => u.id === state.currentUserId) || null;
}

function usersConnected(userA, userB) {
  return state.acceptedPairs.some((p) =>
    (p.a === userA && p.b === userB) || (p.a === userB && p.b === userA));
}

function chatKey(a, b) {
  return [a, b].sort().join('::');
}

function ensureChat(a, b) {
  const key = chatKey(a, b);
  if (!state.chats[key]) state.chats[key] = [];
  return state.chats[key];
}

function renderUsers() {
  const current = getCurrentUser();
  els.userSwitch.innerHTML = state.users.map((u) =>
    `<option value="${u.id}" ${u.id === state.currentUserId ? 'selected' : ''}>${u.name} (${u.email})</option>`
  ).join('');

  els.allUsers.innerHTML = '';
  state.users.forEach((u) => {
    if (!current || u.id === current.id) return;
    const li = document.createElement('li');
    const connected = usersConnected(current.id, u.id);
    const btnText = connected ? 'Open Chat' : 'Send Request';

    li.innerHTML = `
      <strong>${u.name}</strong><br/>
      <small>${u.email}</small>
      <button data-id="${u.id}">${btnText}</button>
    `;

    li.querySelector('button').onclick = () => {
      if (!connected) {
        state.requests.push({ id: uid(), from: current.id, to: u.id, status: 'pending' });
        saveAndRender();
      } else {
        activePeerId = u.id;
        renderChat();
      }
    };

    els.allUsers.appendChild(li);
  });
}

function renderRequests() {
  const current = getCurrentUser();
  if (!current) return;

  els.requests.innerHTML = '';
  state.requests
    .filter((r) => r.to === current.id && r.status === 'pending')
    .forEach((r) => {
      const fromUser = state.users.find((u) => u.id === r.from);
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${fromUser?.name || 'Unknown'}</strong>
        <small> wants to connect</small>
        <div class="inline">
          <button data-action="accept">Accept</button>
          <button data-action="reject" class="warn">Reject</button>
        </div>
      `;

      li.querySelector('[data-action="accept"]').onclick = () => {
        r.status = 'accepted';
        state.acceptedPairs.push({ a: r.from, b: r.to });
        saveAndRender();
      };
      li.querySelector('[data-action="reject"]').onclick = () => {
        r.status = 'rejected';
        saveAndRender();
      };

      els.requests.appendChild(li);
    });
}

function renderChat() {
  const current = getCurrentUser();
  const peer = state.users.find((u) => u.id === activePeerId);
  if (!current || !peer) {
    els.chatTitle.textContent = 'Select a connected user';
    els.messages.innerHTML = '';
    return;
  }

  if (!usersConnected(current.id, peer.id)) {
    els.chatTitle.textContent = 'Connection request not accepted yet';
    els.messages.innerHTML = '';
    return;
  }

  els.chatTitle.textContent = `Chat with ${peer.name}`;
  els.activeUserLabel.textContent = `Logged in as ${current.name} (${current.email})`;

  const messages = ensureChat(current.id, peer.id);
  els.messages.innerHTML = messages.map((m) => {
    const owner = state.users.find((u) => u.id === m.from);
    if (m.type === 'file') {
      return `<div class="msg"><small>${owner?.name} • ${new Date(m.at).toLocaleString()}</small>
        <a href="${m.file.data}" download="${m.file.name}">📎 ${m.file.name}</a></div>`;
    }
    return `<div class="msg"><small>${owner?.name} • ${new Date(m.at).toLocaleString()}</small>${m.text}</div>`;
  }).join('');
}

function saveAndRender() {
  saveState();
  renderUsers();
  renderRequests();
  renderChat();
}

els.createBtn.onclick = () => {
  const name = els.nameInput.value.trim();
  const email = els.emailInput.value.trim().toLowerCase();
  if (!name || !email) return alert('Name and email required');

  const existing = state.users.find((u) => u.email === email);
  if (existing) {
    state.currentUserId = existing.id;
  } else {
    const user = { id: uid(), name, email };
    state.users.push(user);
    state.currentUserId = user.id;
  }

  els.nameInput.value = '';
  saveAndRender();
};

els.userSwitch.onchange = () => {
  state.currentUserId = els.userSwitch.value;
  saveAndRender();
};

els.sendBtn.onclick = async () => {
  const current = getCurrentUser();
  const peer = state.users.find((u) => u.id === activePeerId);
  if (!current || !peer) return alert('Select chat user');
  if (!usersConnected(current.id, peer.id)) return alert('Not connected yet');

  const chat = ensureChat(current.id, peer.id);
  const text = els.msgInput.value.trim();
  const file = els.fileInput.files?.[0];

  if (text) {
    chat.push({ id: uid(), from: current.id, to: peer.id, type: 'text', text, at: Date.now() });
  }

  if (file) {
    const base64 = await fileToDataURL(file);
    chat.push({
      id: uid(),
      from: current.id,
      to: peer.id,
      type: 'file',
      file: { name: file.name, data: base64 },
      at: Date.now()
    });
    els.fileInput.value = '';
  }

  els.msgInput.value = '';
  saveAndRender();
};

function fileToDataURL(file) {
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.readAsDataURL(file);
  });
}

async function startMedia(kind) {
  stopMedia();
  try {
    if (kind === 'audio') {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } else if (kind === 'video') {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    } else {
      mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    }

    els.localVideo.srcObject = mediaStream;
  } catch (err) {
    alert(`Media permission error: ${err.message}`);
  }
}

function stopMedia() {
  if (!mediaStream) return;
  mediaStream.getTracks().forEach((t) => t.stop());
  mediaStream = null;
  els.localVideo.srcObject = null;
}

els.audioBtn.onclick = () => startMedia('audio');
els.videoBtn.onclick = () => startMedia('video');
els.screenBtn.onclick = () => startMedia('screen');
els.stopMediaBtn.onclick = stopMedia;

function getBackupPayload() {
  return {
    version: 1,
    backedAt: new Date().toISOString(),
    state
  };
}

async function saveAutoBackup() {
  const user = getCurrentUser();
  const emailPrefix = user?.email ? user.email.split('@')[0] : 'user';
  const payload = {
    data: getBackupPayload(),
    suggestedName: `${emailPrefix}-auto-backup`
  };

  if (!bridge) {
    localStorage.setItem('cc_last_auto_backup', JSON.stringify(payload.data));
    els.backupInfo.textContent = 'Auto backup saved in browser localStorage';
    return;
  }

  const path = await bridge.saveBackup(payload);
  els.backupInfo.textContent = `Auto backup saved: ${path}`;
}

els.saveBackupBtn.onclick = async () => {
  const defaultName = els.backupName.value.trim() || `manual-backup-${Date.now()}`;
  const payload = { data: getBackupPayload(), defaultName };

  if (!bridge) {
    const blob = new Blob([JSON.stringify(payload.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${defaultName}.json`;
    a.click();
    URL.revokeObjectURL(url);
    els.backupInfo.textContent = 'Manual backup downloaded in browser';
    return;
  }

  const result = await bridge.manualBackupDialog(payload);
  if (!result.canceled) {
    els.backupInfo.textContent = `Manual backup saved: ${result.filePath}`;
  }
};

els.restoreInput.onchange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed.state) throw new Error('Invalid backup file');
    Object.assign(state, parsed.state);
    saveAndRender();
    els.backupInfo.textContent = `Backup restored from ${file.name}`;
  } catch (err) {
    alert(`Restore failed: ${err.message}`);
  }
};

setInterval(saveAutoBackup, 30000);
saveAndRender();
