import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');
const workspaceDir = path.join(os.homedir(), 'JarvisWorkspace');

const appMap = {
  notepad: {
    processName: 'notepad',
    launch: 'notepad.exe',
    label: 'Notepad',
  },
  calculator: {
    processName: 'CalculatorApp',
    launch: 'calc.exe',
    label: 'Calculator',
  },
  paint: {
    processName: 'mspaint',
    launch: 'mspaint.exe',
    label: 'Paint',
  },
  vscode: {
    processName: 'Code',
    launch: 'code.cmd',
    label: 'Visual Studio Code',
    args: [projectRoot],
  },
};

async function runPowerShell(command) {
  return execFileAsync('powershell', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    command,
  ]);
}

export function listDesktopApps() {
  return Object.entries(appMap).map(([id, app]) => ({
    id,
    label: app.label,
  }));
}

export async function openDesktopApp(appId) {
  const app = appMap[appId];

  if (!app) {
    throw new Error('Unsupported application.');
  }

  if (appId === 'vscode') {
    await runPowerShell(
      `Start-Process '${app.launch}' -ArgumentList '${projectRoot.replaceAll("'", "''")}'`
    );

    return {
      action: 'open',
      appId,
      message: `Visual Studio Code opened for ${projectRoot}.`,
    };
  }

  await runPowerShell(
    `Start-Process '${app.launch}'; Start-Sleep -Milliseconds 700; $wshell = New-Object -ComObject WScript.Shell; $wshell.AppActivate('${app.label}') | Out-Null`
  );

  return {
    action: 'open',
    appId,
    message: `${app.label} opened successfully.`,
  };
}

export async function focusDesktopApp(appId) {
  const app = appMap[appId];

  if (!app) {
    throw new Error('Unsupported application.');
  }

  await runPowerShell(
    `$wshell = New-Object -ComObject WScript.Shell; if (-not $wshell.AppActivate('${app.label}')) { throw 'Unable to focus the requested application.' }`
  );

  return {
    action: 'focus',
    appId,
    message: `${app.label} brought to front.`,
  };
}

export async function closeDesktopApp(appId) {
  const app = appMap[appId];

  if (!app) {
    throw new Error('Unsupported application.');
  }

  await runPowerShell(
    `Get-Process -Name '${app.processName}' -ErrorAction SilentlyContinue | Stop-Process -Force`
  );

  return {
    action: 'close',
    appId,
    message: `${app.label} close command sent.`,
  };
}

export async function writeDesktopNote(filename, content) {
  const safeFilename = (filename || 'jarvis-note').replace(/[^a-zA-Z0-9-_]/g, '_');
  await mkdir(workspaceDir, { recursive: true });
  const filePath = path.join(workspaceDir, `${safeFilename}.txt`);
  await writeFile(filePath, content || '', 'utf8');

  return {
    action: 'write',
    filePath,
    message: `Saved note to ${filePath}`,
  };
}

export async function createDesktopDrawing(filename, prompt) {
  const safeFilename = (filename || 'jarvis-drawing').replace(/[^a-zA-Z0-9-_]/g, '_');
  await mkdir(workspaceDir, { recursive: true });
  const filePath = path.join(workspaceDir, `${safeFilename}.svg`);
  const title = prompt || 'Jarvis drawing';
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#03141f" />
      <stop offset="100%" stop-color="#0f3954" />
    </linearGradient>
    <radialGradient id="orb" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#b6f0ff" />
      <stop offset="55%" stop-color="#2ebeff" />
      <stop offset="100%" stop-color="#04141d" />
    </radialGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)" rx="36" />
  <circle cx="840" cy="280" r="150" fill="url(#orb)" />
  <circle cx="840" cy="280" r="220" fill="none" stroke="#2ebeff" stroke-opacity="0.25" stroke-width="2" />
  <circle cx="840" cy="280" r="280" fill="none" stroke="#2ebeff" stroke-opacity="0.16" stroke-width="2" stroke-dasharray="6 6" />
  <text x="120" y="180" fill="#dff6ff" font-family="Segoe UI, Arial, sans-serif" font-size="96" font-weight="700">JARVIS</text>
  <text x="120" y="250" fill="#7ecfff" font-family="Segoe UI, Arial, sans-serif" font-size="26" letter-spacing="6">DESKTOP DRAWING</text>
  <text x="120" y="360" fill="#a9c9da" font-family="Segoe UI, Arial, sans-serif" font-size="38">${escapeXml(
    title
  )}</text>
  <rect x="120" y="430" width="420" height="110" rx="24" fill="#081d2b" stroke="#2ebeff" stroke-opacity="0.2" />
  <text x="150" y="495" fill="#dff6ff" font-family="Segoe UI, Arial, sans-serif" font-size="34">Created by Jarvis</text>
</svg>`;
  await writeFile(filePath, svg, 'utf8');

  return {
    action: 'draw',
    filePath,
    message: `Saved drawing to ${filePath}`,
  };
}

export async function typeIntoDesktop(text) {
  if (!text || !text.trim()) {
    throw new Error('Text is required for typing.');
  }

  const escapedText = escapeSendKeys(text);
  await runPowerShell(
    `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escapedText}')`
  );

  return {
    action: 'type',
    message: 'Typed text into the active desktop window.',
  };
}

export async function openDesktopUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('A URL is required.');
  }

  const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;

  await runPowerShell(`Start-Process '${normalizedUrl}'`);

  return {
    action: 'url',
    message: `Opened ${normalizedUrl}`,
    url: normalizedUrl,
  };
}

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function escapeSendKeys(value) {
  return value
    .replaceAll('{', '{{}')
    .replaceAll('}', '{}}')
    .replaceAll('+', '{+}')
    .replaceAll('^', '{^}')
    .replaceAll('%', '{%}')
    .replaceAll('~', '{~}')
    .replaceAll('(', '{(}')
    .replaceAll(')', '{)}')
    .replaceAll('[', '{[}')
    .replaceAll(']', '{]}')
    .replaceAll('\r\n', '{ENTER}')
    .replaceAll('\n', '{ENTER}')
    .replaceAll("'", "''");
}
