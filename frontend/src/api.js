const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'https://text-to-code-epfu.onrender.com';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed.');
  }

  return data;
}

export function getHealth() {
  return request('/health');
}

export function getWorkflows() {
  return request('/workflows');
}

export function getLogs() {
  return request('/logs');
}

export function getTopNews() {
  return request('/news');
}

export function getSystemTime() {
  return request('/system/time');
}

export function startWorkflow(payload) {
  return request('/workflows/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function sendChat(payload) {
  return request('/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function resetSession() {
  return request('/reset', {
    method: 'POST',
  });
}

export function getDesktopApps() {
  return request('/desktop/apps');
}

export function openDesktopApp(payload) {
  return request('/desktop/open', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function closeDesktopApp(payload) {
  return request('/desktop/close', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function focusDesktopApp(payload) {
  return request('/desktop/focus', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function writeDesktopNote(payload) {
  return request('/desktop/write', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createDesktopDrawing(payload) {
  return request('/desktop/draw', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function typeIntoDesktop(payload) {
  return request('/desktop/type', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function openDesktopUrl(payload) {
  return request('/desktop/url', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function transcribeAudio(blob, options = {}) {
  const formData = new FormData();
  formData.append('audio', blob, 'jarvis-recording.wav');
  if (options.language) {
    formData.append('language', options.language);
  }

  const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Transcription failed.');
  }

  return data;
}
