const fallbackResponses = [
  'Command accepted. I mapped the request into a short execution plan and queued the next actions.',
  'I have analyzed the objective, checked the workflow state, and prepared the next response cycle.',
  'The request is now staged. I can continue with implementation, reporting, or verification depending on your next instruction.',
];

function buildJarvisInstructions(workflow, responseLanguage) {
  const workflowSummary = workflow
    ? `Current workflow objective: ${workflow.objective}. Status: ${workflow.status}.`
    : 'No active workflow has been set.';

  return [
    'You are JARVIS, a precise AI operations assistant.',
    'Keep responses concise, practical, and execution-oriented.',
    'If the user asks for planning, present a direct workflow.',
    'If the user asks for action, acknowledge execution, dependencies, and likely next steps.',
    'When using web information, prefer current facts and mention sources clearly.',
    'When the user asks to improve, train, scale, or make the system smarter, respond like a product and engineering assistant, not like a generic ML tutor.',
    'Prefer implementation steps such as data collection, memory, retrieval, prompt improvements, tooling, evaluation, and fine-tuning only when truly appropriate.',
    'Avoid generic disclaimers about being unable to train yourself unless that limitation is directly necessary to answer the user.',
    `Respond in ${responseLanguage || 'English'}.`,
    workflowSummary,
  ].join(' ');
}

function buildTranscriptionPrompt(language) {
  if (language === 'hi') {
    return 'Hindi speech. Return only the spoken Hindi words in Devanagari.';
  }

  if (language === 'ja') {
    return 'Japanese speech. Return only the spoken Japanese words.';
  }

  return 'English speech. Return only the spoken English words.';
}

export async function createAssistantReply({
  apiKey,
  model,
  workflow,
  messages,
  message,
  responseLanguage,
}) {
  if (!apiKey) {
    const reply =
      fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

    return {
      text:
        responseLanguage === 'Hindi'
          ? `आदेश प्राप्त हुआ। मैंने आपके अनुरोध "${message}" को प्रोसेस कर लिया है और अगला कदम तैयार है।`
          : `${reply} Latest request: "${message}".`,
      source: 'mock',
    };
  }

  const input = [
    {
      role: 'system',
      content: buildJarvisInstructions(workflow, responseLanguage),
    },
    ...messages.map((entry) => ({
      role: entry.role === 'jarvis' ? 'assistant' : 'user',
      content: entry.text,
    })),
    {
      role: 'user',
      content: message,
    },
  ];

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input,
      ...(shouldUseWebSearch(message)
        ? {
            tools: [
              {
                type: 'web_search_preview',
              },
            ],
          }
        : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const text =
    data.output_text ||
    data.output
      ?.flatMap((item) => item.content || [])
      .filter((item) => item.type === 'output_text')
      .map((item) => item.text)
      .join('\n')
      .trim();

  if (!text) {
    throw new Error('OpenAI response did not include output text.');
  }

  return {
    text,
    source: shouldUseWebSearch(message) ? 'openai-web' : 'openai',
  };
}

function shouldUseWebSearch(message) {
  const normalized = message.toLowerCase();

  return [
    'latest',
    'today',
    'current',
    'news',
    'recent',
    'price',
    'weather',
    'score',
    'search the web',
    'web search',
    'look up',
    'समाचार',
    'आज',
    'ताज़ा',
    'न्यूज़',
    '最新',
    'ニュース',
  ].some((keyword) => normalized.includes(keyword));
}

export async function transcribeAudio({
  apiKey,
  audioBuffer,
  filename,
  mimeType,
  language,
}) {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for audio transcription.');
  }

  const blob = new Blob([audioBuffer], {
    type: mimeType || 'audio/webm',
  });
  const formData = new FormData();
  formData.append('file', blob, filename || 'jarvis-audio.webm');
  formData.append('model', 'whisper-1');
  formData.append('temperature', '0');
  if (language) {
    formData.append('language', language);
  }
  formData.append('prompt', buildTranscriptionPrompt(language));

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transcription failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  if (!data.text) {
    throw new Error('Transcription response did not include text.');
  }

  return data.text;
}

export async function fetchTopNews({ apiKey }) {
  if (!apiKey) {
    return {
      source: 'mock',
      updatedAt: new Date().toISOString(),
      headlines: [
        {
          title: 'Top news requires OpenAI web access',
          summary: 'Add OPENAI_API_KEY and restart the backend to load live headlines.',
          source: 'Jarvis',
          url: '',
        },
      ],
    };
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content:
            'Return exactly valid JSON with keys: updatedAt, headlines. headlines must be an array of 5 objects with keys title, summary, source, url. Use current major world headlines with concise summaries and direct source links.',
        },
        {
          role: 'user',
          content: 'Give me the top 5 latest news headlines right now.',
        },
      ],
      tools: [
        {
          type: 'web_search_preview',
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`News fetch failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const rawText =
    data.output_text ||
    data.output
      ?.flatMap((item) => item.content || [])
      .filter((item) => item.type === 'output_text')
      .map((item) => item.text)
      .join('\n')
      .trim();

  if (!rawText) {
    throw new Error('News response did not include output text.');
  }

  const parsed = parseJsonPayload(rawText);

  if (!parsed?.headlines || !Array.isArray(parsed.headlines)) {
    throw new Error('News response did not include valid headlines.');
  }

  return {
    source: 'openai-web',
    updatedAt: parsed.updatedAt || new Date().toISOString(),
    headlines: parsed.headlines.slice(0, 5),
  };
}

function parseJsonPayload(rawText) {
  try {
    return JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('Unable to parse JSON payload.');
    }

    return JSON.parse(match[0]);
  }
}
