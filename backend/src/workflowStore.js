import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data');
const storePath = path.join(dataDir, 'workflows.json');

const defaultPresets = [
  {
    id: 'morning-brief',
    label: 'Morning Brief',
    objective: 'Assemble schedule, priorities, and system alerts for the day.',
    steps: ['Calendar sync', 'Priority sort', 'Alert digest'],
  },
  {
    id: 'focus-mode',
    label: 'Focus Mode',
    objective: 'Silence noise and prepare a two-hour deep work session.',
    steps: ['Mute distractions', 'Queue critical tasks', 'Start concentration timer'],
  },
  {
    id: 'launch-sequence',
    label: 'Launch Sequence',
    objective: 'Prepare product release checklist and cross-team handoff.',
    steps: ['Verify build', 'Confirm approvals', 'Send launch summary'],
  },
];

const defaultState = {
  presets: defaultPresets,
  activeWorkflow: {
    id: 'mission-demo',
    presetId: 'morning-brief',
    status: 'Mission Ready',
    progress: 64,
    objective: defaultPresets[0].objective,
    steps: defaultPresets[0].steps.map((label, index) => ({
      id: `${defaultPresets[0].id}-${index}`,
      label,
      status: index === 0 ? 'in_progress' : 'pending',
    })),
    timeline: [
      {
        id: 'planner',
        stage: 'Planner',
        detail: 'Intent parsed and routed into executable subtasks.',
      },
      {
        id: 'verifier',
        stage: 'Verifier',
        detail: 'Dependencies checked before assistant action is approved.',
      },
      {
        id: 'responder',
        stage: 'Responder',
        detail: 'Status updates are written back to the conversation stream.',
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
    {
      id: 2,
      role: 'user',
      text: 'Prepare the system for a full assistant workflow.',
    },
    {
      id: 3,
      role: 'jarvis',
      text:
        'Workflow initialized. I can stage missions, coordinate actions, and track execution status from this console.',
    },
  ],
  conversationLogs: [],
  taskLogs: [],
};

async function ensureStore() {
  await mkdir(dataDir, { recursive: true });

  try {
    await readFile(storePath, 'utf8');
  } catch {
    await writeFile(storePath, JSON.stringify(defaultState, null, 2));
  }
}

export async function readStore() {
  await ensureStore();
  const raw = await readFile(storePath, 'utf8');
  return JSON.parse(raw);
}

export async function writeStore(nextState) {
  await ensureStore();
  await writeFile(storePath, JSON.stringify(nextState, null, 2));
  return nextState;
}

export function appendConversationLog(state, entry) {
  return {
    ...state,
    conversationLogs: [...(state.conversationLogs || []), entry].slice(-500),
  };
}

export function appendTaskLog(state, entry) {
  return {
    ...state,
    taskLogs: [...(state.taskLogs || []), entry].slice(-500),
  };
}

export function buildWorkflowFromPreset(preset, prompt) {
  return {
    id: `workflow-${Date.now()}`,
    presetId: preset.id,
    status: 'Mission Staged',
    progress: 78,
    objective: prompt || preset.objective,
    steps: preset.steps.map((label, index) => ({
      id: `${preset.id}-${index}`,
      label,
      status: index === 0 ? 'in_progress' : 'pending',
    })),
    timeline: [
      {
        id: `planner-${Date.now()}`,
        stage: 'Planner',
        detail: `Mission "${preset.label}" staged with objective alignment.`,
      },
      {
        id: `verifier-${Date.now()}`,
        stage: 'Verifier',
        detail: 'Execution constraints and available tools validated.',
      },
      {
        id: `responder-${Date.now()}`,
        stage: 'Responder',
        detail: 'Assistant console synchronized with current workflow state.',
      },
    ],
  };
}

export function createDefaultState() {
  return JSON.parse(JSON.stringify(defaultState));
}

export function buildConversationLog({
  userMessage,
  assistantReply,
  detectedIntent,
  language,
  toolUsed,
  outcome,
  contextSummary,
  errorMessage,
}) {
  return {
    id: `conversation-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userMessage,
    assistantReply,
    detectedIntent,
    language,
    contextSummary: contextSummary || '',
    toolUsed: toolUsed || '',
    outcome: outcome || 'success',
    errorMessage: errorMessage || '',
  };
}

export function buildTaskLog({
  taskType,
  command,
  toolName,
  inputPayload,
  outputSummary,
  status,
  errorMessage,
}) {
  return {
    id: `task-${Date.now()}`,
    timestamp: new Date().toISOString(),
    taskType,
    command,
    toolName,
    inputPayload: inputPayload || {},
    outputSummary: outputSummary || '',
    status: status || 'success',
    errorMessage: errorMessage || '',
  };
}
