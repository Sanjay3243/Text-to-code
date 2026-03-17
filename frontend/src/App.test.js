import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (String(url).includes('/health')) {
      return Promise.resolve({
        ok: true,
      json: () =>
        Promise.resolve({
          hasOpenAiKey: false,
          model: 'mock mode',
          }),
      });
    }

    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve(
          String(url).includes('/news')
            ? {
                updatedAt: '2026-03-16T10:00:00.000Z',
                headlines: [
                  {
                    title: 'Sample headline',
                    summary: 'Sample summary',
                    source: 'Sample Source',
                    url: 'https://example.com',
                  },
                ],
              }
            : String(url).includes('/system/time')
            ? {
                iso: '2026-03-16T15:00:00.000Z',
                localeDate: 'Monday, 16 March 2026',
                localeTime: '08:30:00 pm',
                timezone: 'Asia/Calcutta',
              }
            : String(url).includes('/logs')
            ? {
                conversationLogs: [
                  {
                    id: 'conversation-1',
                    timestamp: '2026-03-16T10:10:00.000Z',
                    userMessage: 'Hello Jarvis',
                    assistantReply: 'Hello. Systems are online.',
                    detectedIntent: 'general_chat',
                  },
                ],
                taskLogs: [
                  {
                    id: 'task-1',
                    timestamp: '2026-03-16T10:11:00.000Z',
                    taskType: 'system_time',
                    command: 'get current time',
                    outputSummary: 'Monday, 16 March 2026 08:30:00 pm',
                  },
                ],
              }
            : String(url).includes('/desktop/apps')
            ? {
                apps: [
                  { id: 'notepad', label: 'Notepad' },
                  { id: 'calculator', label: 'Calculator' },
                ],
              }
            : {
                presets: [
                  {
                    id: 'morning-brief',
                    label: 'Morning Brief',
                    objective: 'Assemble schedule, priorities, and system alerts for the day.',
                    steps: ['Calendar sync', 'Priority sort', 'Alert digest'],
                  },
                ],
                activeWorkflow: {
                  presetId: 'morning-brief',
                  status: 'Mission Ready',
                  progress: 64,
                  objective: 'Assemble schedule, priorities, and system alerts for the day.',
                  steps: [
                    { id: '1', label: 'Calendar sync' },
                    { id: '2', label: 'Priority sort' },
                  ],
                  timeline: [
                    {
                      id: 'planner',
                      stage: 'Planner',
                      detail: 'Intent parsed and routed into executable subtasks.',
                    },
                  ],
                },
                messages: [
                  {
                    id: 1,
                    role: 'jarvis',
                    text:
                      'JARVIS online. Mission control is synchronized and awaiting your next objective.',
                  },
                ],
              }
        ),
    });
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

test('renders jarvis heading', async () => {
  render(<App />);
  const headingElement = await screen.findByRole('heading', { name: /^jarvis$/i });
  expect(headingElement).toBeInTheDocument();
});

test('renders assistant console', async () => {
  render(<App />);
  const consoleElement = await screen.findByRole('heading', {
    name: /^conversation$/i,
  });
  expect(consoleElement).toBeInTheDocument();
});

test('renders reset session action', async () => {
  render(<App />);
  const resetButton = await screen.findByRole('button', {
    name: /reset session/i,
  });
  expect(resetButton).toBeInTheDocument();
});

test('renders speak jarvis action', async () => {
  render(<App />);
  const speakButton = await screen.findByRole('button', {
    name: /speak jarvis/i,
  });
  expect(speakButton).toBeInTheDocument();
});

test('renders desktop controls', async () => {
  render(<App />);
  const desktopHeading = await screen.findByRole('heading', {
    name: /local actions/i,
  });
  expect(desktopHeading).toBeInTheDocument();
});

test('renders desktop typing controls', async () => {
  render(<App />);
  const typeButton = await screen.findByRole('button', {
    name: /type text/i,
  });
  expect(typeButton).toBeInTheDocument();
});

test('renders voice test controls', async () => {
  render(<App />);
  const voiceButton = await screen.findByRole('button', {
    name: /start recording/i,
  });
  expect(voiceButton).toBeInTheDocument();
});

test('renders output voice controller', async () => {
  render(<App />);
  const outputVoiceHeading = await screen.findByRole('heading', {
    name: /output voice controller/i,
  });
  expect(outputVoiceHeading).toBeInTheDocument();
});

test('renders top news panel', async () => {
  render(<App />);
  const newsHeading = await screen.findByRole('heading', {
    name: /latest headlines/i,
  });
  expect(newsHeading).toBeInTheDocument();
});

test('renders time tool panel', async () => {
  render(<App />);
  const timeHeading = await screen.findByRole('heading', {
    name: /current date & time/i,
  });
  expect(timeHeading).toBeInTheDocument();
});

test('renders dataset logs panel', async () => {
  render(<App />);
  const logsHeading = await screen.findByRole('heading', {
    name: /interaction memory/i,
  });
  expect(logsHeading).toBeInTheDocument();
});

test('renders logs actions', async () => {
  render(<App />);
  const refreshLogsButton = await screen.findByRole('button', {
    name: /refresh logs/i,
  });
  const exportButton = await screen.findByRole('button', {
    name: /export json/i,
  });
  expect(refreshLogsButton).toBeInTheDocument();
  expect(exportButton).toBeInTheDocument();
});

test('renders auto refresh time control', async () => {
  render(<App />);
  const autoRefreshButton = await screen.findByRole('button', {
    name: /auto refresh on|auto refresh off/i,
  });
  expect(autoRefreshButton).toBeInTheDocument();
});

test('renders mute and unmute controls', async () => {
  render(<App />);
  const muteButton = await screen.findByRole('button', {
    name: /^mute$/i,
  });
  const unmuteButton = await screen.findByRole('button', {
    name: /^unmute$/i,
  });
  expect(muteButton).toBeInTheDocument();
  expect(unmuteButton).toBeInTheDocument();
});

test('renders play and pause controls', async () => {
  render(<App />);
  const playButton = await screen.findByRole('button', {
    name: /^play$/i,
  });
  const pauseButton = await screen.findByRole('button', {
    name: /^pause$/i,
  });
  expect(playButton).toBeInTheDocument();
  expect(pauseButton).toBeInTheDocument();
});

test('renders resume and stop controls', async () => {
  render(<App />);
  const resumeButton = await screen.findByRole('button', {
    name: /^resume$/i,
  });
  const stopButton = await screen.findByRole('button', {
    name: /^stop$/i,
  });
  expect(resumeButton).toBeInTheDocument();
  expect(stopButton).toBeInTheDocument();
});
