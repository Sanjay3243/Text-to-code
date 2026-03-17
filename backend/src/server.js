import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  closeDesktopApp,
  createDesktopDrawing,
  focusDesktopApp,
  listDesktopApps,
  openDesktopApp,
  openDesktopUrl,
  typeIntoDesktop,
  writeDesktopNote,
} from './desktopActions.js';
import {
  appendConversationLog,
  appendTaskLog,
  buildConversationLog,
  buildTaskLog,
  buildWorkflowFromPreset,
  createDefaultState,
  readStore,
  writeStore,
} from './workflowStore.js';
import { createAssistantReply, fetchTopNews, transcribeAudio } from './openaiClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendBuildPath = path.join(__dirname, '..', '..', 'frontend', 'build');
const app = express();
const upload = multer();
const port = Number(process.env.PORT || 4000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

app.use(cors({ origin: frontendOrigin }));
app.use(express.json());

app.get('/api/health', async (_request, response) => {
  const store = await readStore();
  response.json({
    ok: true,
    model,
    hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
    activeWorkflowId: store.activeWorkflow.id,
  });
});

app.get('/api/workflows', async (_request, response) => {
  const store = await readStore();
  response.json(store);
});

app.get('/api/logs', async (_request, response) => {
  const store = await readStore();
  response.json({
    conversationLogs: store.conversationLogs || [],
    taskLogs: store.taskLogs || [],
  });
});

app.get('/api/news', async (_request, response) => {
  try {
    const news = await fetchTopNews({
      apiKey: process.env.OPENAI_API_KEY,
    });

    await writeStore(
      appendTaskLog(
        await readStore(),
        buildTaskLog({
          taskType: 'news_fetch',
          command: 'top news',
          toolName: 'web_search',
          outputSummary: `Fetched ${news.articles?.length || 0} news items.`,
        })
      )
    );

    response.json(news);
  } catch (error) {
    await writeStore(
      appendTaskLog(
        await readStore(),
        buildTaskLog({
          taskType: 'news_fetch',
          command: 'top news',
          toolName: 'web_search',
          status: 'error',
          errorMessage: error.message || 'News fetch failed.',
        })
      )
    );
    response.status(500).json({
      error: error.message || 'News fetch failed.',
    });
  }
});

app.get('/api/system/time', async (_request, response) => {
  const now = new Date();
  const payload = {
    iso: now.toISOString(),
    localeDate: now.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    localeTime: now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  await writeStore(
    appendTaskLog(
      await readStore(),
      buildTaskLog({
        taskType: 'system_time',
        command: 'get current time',
        toolName: 'system_clock',
        outputSummary: `${payload.localeDate} ${payload.localeTime} (${payload.timezone})`,
      })
    )
  );

  response.json(payload);
});

app.post('/api/workflows/start', async (request, response) => {
  const { presetId, prompt } = request.body || {};
  const store = await readStore();
  const preset = store.presets.find((entry) => entry.id === presetId);

  if (!preset) {
    response.status(404).json({ error: 'Workflow preset not found.' });
    return;
  }

  const activeWorkflow = buildWorkflowFromPreset(preset, prompt);
  const nextState = await writeStore(
    appendTaskLog(
      appendConversationLog(
        {
          ...store,
          activeWorkflow,
          messages: [
            ...store.messages,
            {
              id: store.messages.length + 1,
              role: 'user',
              text: `Activate ${preset.label}.`,
            },
            {
              id: store.messages.length + 2,
              role: 'jarvis',
              text: `Workflow "${preset.label}" staged through the backend and synchronized to mission control.`,
            },
          ],
        },
        buildConversationLog({
          userMessage: `Activate ${preset.label}.`,
          assistantReply: `Workflow "${preset.label}" staged through the backend and synchronized to mission control.`,
          detectedIntent: 'workflow_start',
          language: 'English',
          toolUsed: 'workflow_engine',
          contextSummary: prompt || preset.objective,
        })
      ),
      buildTaskLog({
        taskType: 'workflow_start',
        command: `Activate ${preset.label}`,
        toolName: 'workflow_engine',
        inputPayload: { presetId, prompt },
        outputSummary: `Workflow ${preset.label} staged.`,
      })
    )
  );

  response.json(nextState);
});

app.post('/api/chat', async (request, response) => {
  const { message, responseLanguage } = request.body || {};

  if (!message || typeof message !== 'string') {
    response.status(400).json({ error: 'Message is required.' });
    return;
  }

  const store = await readStore();

  try {
    const reply = await createAssistantReply({
      apiKey: process.env.OPENAI_API_KEY,
      model,
      workflow: store.activeWorkflow,
      messages: store.messages,
      message,
      responseLanguage,
    });

    const progressedWorkflow = {
      ...store.activeWorkflow,
      status: 'Executing',
      progress: Math.min(store.activeWorkflow.progress + 8, 100),
      timeline: [
        {
          id: `activity-${Date.now()}`,
          stage: 'Execution',
          detail: `Processed user command: ${message}`,
        },
        ...store.activeWorkflow.timeline,
      ].slice(0, 5),
    };

    const nextState = await writeStore(
      appendConversationLog(
        {
          ...store,
          activeWorkflow: progressedWorkflow,
          messages: [
            ...store.messages,
            {
              id: store.messages.length + 1,
              role: 'user',
              text: message,
            },
            {
              id: store.messages.length + 2,
              role: 'jarvis',
              text: reply.text,
            },
          ],
        },
        buildConversationLog({
          userMessage: message,
          assistantReply: reply.text,
          detectedIntent: inferIntent(message),
          language: responseLanguage || 'English',
          toolUsed: reply.source,
          contextSummary: store.activeWorkflow.objective,
        })
      )
    );

    response.json({
      reply: reply.text,
      source: reply.source,
      workflow: nextState.activeWorkflow,
      messages: nextState.messages,
    });
  } catch (error) {
    await writeStore(
      appendTaskLog(
        appendConversationLog(
          store,
          buildConversationLog({
            userMessage: message,
            assistantReply: '',
            detectedIntent: inferIntent(message),
            language: responseLanguage || 'English',
            toolUsed: 'chat',
            outcome: 'error',
            contextSummary: store.activeWorkflow.objective,
            errorMessage: error.message || 'Chat request failed.',
          })
        ),
        buildTaskLog({
          taskType: 'chat',
          command: message,
          toolName: 'chat',
          inputPayload: { responseLanguage },
          outputSummary: '',
          status: 'error',
          errorMessage: error.message || 'Chat request failed.',
        })
      )
    );
    response.status(500).json({
      error: error.message || 'Chat request failed.',
    });
  }
});

app.post('/api/transcribe', upload.single('audio'), async (request, response) => {
  if (!request.file) {
    response.status(400).json({ error: 'Audio file is required.' });
    return;
  }

  try {
    const { language } = request.body || {};
    const text = await transcribeAudio({
      apiKey: process.env.OPENAI_API_KEY,
      audioBuffer: request.file.buffer,
      filename: request.file.originalname,
      mimeType: request.file.mimetype,
      language,
    });

    await writeStore(
      appendTaskLog(
        await readStore(),
        buildTaskLog({
          taskType: 'voice_transcription',
          command: 'transcribe audio',
          toolName: 'transcription',
          inputPayload: { language },
          outputSummary: text,
        })
      )
    );

    response.json({ text });
  } catch (error) {
    await writeStore(
      appendTaskLog(
        await readStore(),
        buildTaskLog({
          taskType: 'voice_transcription',
          command: 'transcribe audio',
          toolName: 'transcription',
          inputPayload: request.body || {},
          status: 'error',
          errorMessage: error.message || 'Transcription failed.',
        })
      )
    );
    response.status(500).json({
      error: error.message || 'Transcription failed.',
    });
  }
});

app.post('/api/reset', async (_request, response) => {
  const nextState = await writeStore(createDefaultState());
  response.json(nextState);
});

app.get('/api/desktop/apps', async (_request, response) => {
  const apps = listDesktopApps();
  await writeStore(
    appendTaskLog(
      await readStore(),
      buildTaskLog({
        taskType: 'desktop_list_apps',
        command: 'list desktop apps',
        toolName: 'desktop_registry',
        outputSummary: `Returned ${apps.length} desktop apps.`,
      })
    )
  );
  response.json({
    apps,
  });
});

app.post('/api/desktop/open', async (request, response) => {
  try {
    const result = await openDesktopApp(request.body?.appId);
    await writeStore(
      appendTaskLog(
        await readStore(),
        buildTaskLog({
          taskType: 'desktop_open',
          command: request.body?.appId,
          toolName: 'desktop_open',
          inputPayload: request.body || {},
          outputSummary: result.message,
        })
      )
    );
    response.json(result);
  } catch (error) {
    await writeStore(
      appendTaskLog(
        await readStore(),
        buildTaskLog({
          taskType: 'desktop_open',
          command: request.body?.appId,
          toolName: 'desktop_open',
          inputPayload: request.body || {},
          status: 'error',
          errorMessage: error.message || 'Desktop open failed.',
        })
      )
    );
    response.status(400).json({ error: error.message });
  }
});

app.post('/api/desktop/close', async (request, response) => {
  try {
    const result = await closeDesktopApp(request.body?.appId);
    await writeStore(
      appendTaskLog(
        await readStore(),
        buildTaskLog({
          taskType: 'desktop_close',
          command: request.body?.appId,
          toolName: 'desktop_close',
          inputPayload: request.body || {},
          outputSummary: result.message,
        })
      )
    );
    response.json(result);
  } catch (error) {
    await writeStore(
      appendTaskLog(
        await readStore(),
        buildTaskLog({
          taskType: 'desktop_close',
          command: request.body?.appId,
          toolName: 'desktop_close',
          inputPayload: request.body || {},
          status: 'error',
          errorMessage: error.message || 'Desktop close failed.',
        })
      )
    );
    response.status(400).json({ error: error.message });
  }
});

app.post('/api/desktop/focus', async (request, response) => {
  try {
    const result = await focusDesktopApp(request.body?.appId);
    await writeStore(
      appendTaskLog(
        await readStore(),
        buildTaskLog({
          taskType: 'desktop_focus',
          command: request.body?.appId,
          toolName: 'desktop_focus',
          inputPayload: request.body || {},
          outputSummary: result.message,
        })
      )
    );
    response.json(result);
  } catch (error) {
    await writeStore(
      appendTaskLog(
        await readStore(),
        buildTaskLog({
          taskType: 'desktop_focus',
          command: request.body?.appId,
          toolName: 'desktop_focus',
          inputPayload: request.body || {},
          status: 'error',
          errorMessage: error.message || 'Desktop focus failed.',
        })
      )
    );
    response.status(400).json({ error: error.message });
  }
});

app.post('/api/desktop/write', async (request, response) => {
  try {
    const { filename, content } = request.body || {};
    const result = await writeDesktopNote(filename, content);
    await writeStore(
      appendTaskLog(
        await readStore(),
        buildTaskLog({
          taskType: 'desktop_write',
          command: filename,
          toolName: 'desktop_write',
          inputPayload: request.body || {},
          outputSummary: result.message,
        })
      )
    );
    response.json(result);
  } catch (error) {
    await writeStore(
      appendTaskLog(
        await readStore(),
        buildTaskLog({
          taskType: 'desktop_write',
          command: request.body?.filename,
          toolName: 'desktop_write',
          inputPayload: request.body || {},
          status: 'error',
          errorMessage: error.message || 'Desktop write failed.',
        })
      )
    );
    response.status(400).json({ error: error.message });
  }
});

app.post('/api/desktop/draw', async (request, response) => {
  try {
    const { filename, prompt } = request.body || {};
    const result = await createDesktopDrawing(filename, prompt);
    await writeStore(
      appendTaskLog(
        await readStore(),
        buildTaskLog({
          taskType: 'desktop_draw',
          command: filename,
          toolName: 'desktop_draw',
          inputPayload: request.body || {},
          outputSummary: result.message,
        })
      )
    );
    response.json(result);
  } catch (error) {
    await writeStore(
      appendTaskLog(
        await readStore(),
        buildTaskLog({
          taskType: 'desktop_draw',
          command: request.body?.filename,
          toolName: 'desktop_draw',
          inputPayload: request.body || {},
          status: 'error',
          errorMessage: error.message || 'Desktop draw failed.',
        })
      )
    );
    response.status(400).json({ error: error.message });
  }
});

app.post('/api/desktop/type', async (request, response) => {
  try {
    const result = await typeIntoDesktop(request.body?.text);
    await writeStore(
      appendTaskLog(
        await readStore(),
        buildTaskLog({
          taskType: 'desktop_type',
          command: request.body?.text,
          toolName: 'desktop_type',
          inputPayload: request.body || {},
          outputSummary: result.message,
        })
      )
    );
    response.json(result);
  } catch (error) {
    await writeStore(
      appendTaskLog(
        await readStore(),
        buildTaskLog({
          taskType: 'desktop_type',
          command: request.body?.text,
          toolName: 'desktop_type',
          inputPayload: request.body || {},
          status: 'error',
          errorMessage: error.message || 'Desktop typing failed.',
        })
      )
    );
    response.status(400).json({ error: error.message });
  }
});

app.post('/api/desktop/url', async (request, response) => {
  try {
    const result = await openDesktopUrl(request.body?.url);
    await writeStore(
      appendTaskLog(
        await readStore(),
        buildTaskLog({
          taskType: 'desktop_url',
          command: request.body?.url,
          toolName: 'desktop_url',
          inputPayload: request.body || {},
          outputSummary: result.message,
        })
      )
    );
    response.json(result);
  } catch (error) {
    await writeStore(
      appendTaskLog(
        await readStore(),
        buildTaskLog({
          taskType: 'desktop_url',
          command: request.body?.url,
          toolName: 'desktop_url',
          inputPayload: request.body || {},
          status: 'error',
          errorMessage: error.message || 'Desktop URL open failed.',
        })
      )
    );
    response.status(400).json({ error: error.message });
  }
});

if (existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));

  app.get('*', (request, response, next) => {
    if (request.path.startsWith('/api/')) {
      next();
      return;
    }

    response.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Jarvis backend listening on http://localhost:${port}`);
});

function inferIntent(message) {
  const normalized = message.toLowerCase();

  if (normalized.includes('news') || normalized.includes('समाचार')) {
    return 'news_lookup';
  }

  if (normalized.includes('time') || normalized.includes('date') || normalized.includes('टाइम')) {
    return 'time_lookup';
  }

  if (normalized.includes('open') || normalized.includes('launch')) {
    return 'open_action';
  }

  return 'general_chat';
}
