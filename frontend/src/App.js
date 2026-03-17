import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import {
  createDesktopDrawing,
  closeDesktopApp,
  focusDesktopApp,
  getDesktopApps,
  getHealth,
  getLogs,
  getSystemTime,
  getTopNews,
  getWorkflows,
  openDesktopApp,
  openDesktopUrl,
  resetSession,
  sendChat,
  startWorkflow,
  typeIntoDesktop,
  transcribeAudio,
  writeDesktopNote,
} from './api';

const quickCommands = [
  'Run deployment readiness scan',
  'Summarize open tasks',
  'Prepare investor update',
  'Start voice diagnostics',
];

const baseMessages = [
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
];

function App() {
  const synthRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const processorNodeRef = useRef(null);
  const audioChunksRef = useRef([]);
  const sampleRateRef = useRef(44100);
  const [presets, setPresets] = useState([]);
  const [activePreset, setActivePreset] = useState(null);
  const [activeWorkflow, setActiveWorkflow] = useState(null);
  const [messages, setMessages] = useState(baseMessages);
  const [input, setInput] = useState('');
  const [systemMode, setSystemMode] = useState('Booting');
  const [voiceState, setVoiceState] = useState('Standby');
  const [speechState, setSpeechState] = useState('Voice Ready');
  const [missionProgress, setMissionProgress] = useState(0);
  const [backendStatus, setBackendStatus] = useState('Connecting');
  const [modelStatus, setModelStatus] = useState('offline');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [desktopApps, setDesktopApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState('notepad');
  const [noteName, setNoteName] = useState('jarvis-note');
  const [noteContent, setNoteContent] = useState('');
  const [drawingName, setDrawingName] = useState('jarvis-art');
  const [drawingPrompt, setDrawingPrompt] = useState('फ्यूचरिस्टिक जार्विस इंटरफ़ेस');
  const [desktopResult, setDesktopResult] = useState('');
  const [typingText, setTypingText] = useState('नमस्ते, मैं जार्विस हूँ।');
  const [websiteUrl, setWebsiteUrl] = useState('google.com');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [voiceDebug, setVoiceDebug] = useState('Ready for microphone test.');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState('hi');
  const [outputVoiceLanguage, setOutputVoiceLanguage] = useState('auto');
  const [outputVoiceRate, setOutputVoiceRate] = useState(1);
  const [outputVoicePitch, setOutputVoicePitch] = useState(1);
  const [autoSpeakReplies, setAutoSpeakReplies] = useState(true);
  const [isSpeechMuted, setIsSpeechMuted] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState('auto');
  const [topNews, setTopNews] = useState([]);
  const [newsUpdatedAt, setNewsUpdatedAt] = useState('');
  const [newsStatus, setNewsStatus] = useState('Loading');
  const [systemTime, setSystemTime] = useState(null);
  const [timeStatus, setTimeStatus] = useState('Loading');
  const [autoRefreshTime, setAutoRefreshTime] = useState(true);
  const [conversationLogs, setConversationLogs] = useState([]);
  const [taskLogs, setTaskLogs] = useState([]);
  const [logsStatus, setLogsStatus] = useState('Loading');

  useEffect(() => {
    async function bootstrap() {
      try {
        const [health, workflowState, appsState] = await Promise.all([
          getHealth(),
          getWorkflows(),
          getDesktopApps(),
        ]);
        setBackendStatus('Connected');
        setModelStatus(health.hasOpenAiKey ? health.model : 'mock mode');
        setPresets(workflowState.presets);
        setDesktopApps(appsState.apps || []);
        setSelectedApp(appsState.apps?.[0]?.id || 'notepad');
        const preset =
          workflowState.presets.find(
            (entry) => entry.id === workflowState.activeWorkflow.presetId
          ) || workflowState.presets[0];
        setActivePreset(preset);
        setActiveWorkflow(workflowState.activeWorkflow);
        setMessages(workflowState.messages || baseMessages);
        setSystemMode(workflowState.activeWorkflow.status);
        setMissionProgress(workflowState.activeWorkflow.progress);
      } catch (loadError) {
        setBackendStatus('Offline');
        setError(loadError.message);
        setSystemMode('Degraded');
      }
    }

    bootstrap();
  }, []);

  useEffect(() => {
    async function loadNews() {
      try {
        setNewsStatus('Loading');
        const news = await getTopNews();
        setTopNews(news.headlines || []);
        setNewsUpdatedAt(news.updatedAt || '');
        setNewsStatus('Ready');
      } catch (newsError) {
        setNewsStatus('Unavailable');
      }
    }

    loadNews();
  }, []);

  useEffect(() => {
    refreshSystemTime();
  }, []);

  useEffect(() => {
    refreshLogs();
  }, []);

  useEffect(() => {
    if (!autoRefreshTime) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      refreshSystemTime();
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoRefreshTime]);

  useEffect(() => {
    if (!window.speechSynthesis) {
      return undefined;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const operationFeed = useMemo(
    () => [
      {
        label: 'Mission objective',
        value: activeWorkflow?.objective || 'Waiting for workflow sync.',
      },
      {
        label: 'Current mode',
        value: systemMode,
      },
      {
        label: 'Voice channel',
        value: voiceState,
      },
      {
        label: 'Inference',
        value: modelStatus,
      },
      {
        label: 'Speech output',
        value: speechState,
      },
    ],
    [activeWorkflow?.objective, modelStatus, speechState, systemMode, voiceState]
  );

  const syncWorkflow = (workflow, presetOverride = null) => {
    setActiveWorkflow(workflow);
    setSystemMode(workflow.status);
    setMissionProgress(workflow.progress);
    if (presetOverride) {
      setActivePreset(presetOverride);
    }
  };

  const handlePreset = async (preset) => {
    try {
      setError('');
      const data = await startWorkflow({
        presetId: preset.id,
        prompt: preset.objective,
      });
      syncWorkflow(data.activeWorkflow, preset);
      setMessages(data.messages);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleDesktopOpen = async () => {
    try {
      setError('');
      const result = await openDesktopApp({ appId: selectedApp });
      setDesktopResult(result.message);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleDesktopClose = async () => {
    try {
      setError('');
      const result = await closeDesktopApp({ appId: selectedApp });
      setDesktopResult(result.message);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleDesktopFocus = async () => {
    try {
      setError('');
      const result = await focusDesktopApp({ appId: selectedApp });
      setDesktopResult(result.message);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleWriteNote = async () => {
    try {
      setError('');
      const result = await writeDesktopNote({
        filename: noteName,
        content: noteContent,
      });
      setDesktopResult(result.message);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleCreateDrawing = async () => {
    try {
      setError('');
      const result = await createDesktopDrawing({
        filename: drawingName,
        prompt: drawingPrompt,
      });
      setDesktopResult(result.message);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleTypeIntoDesktop = async () => {
    try {
      setError('');
      const result = await typeIntoDesktop({
        text: typingText,
      });
      setDesktopResult(result.message);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleOpenWebsite = async () => {
    try {
      setError('');
      const result = await openDesktopUrl({
        url: websiteUrl,
      });
      setDesktopResult(result.message);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const refreshSystemTime = async () => {
    try {
      setTimeStatus('Loading');
      const time = await getSystemTime();
      setSystemTime(time);
      setTimeStatus('Ready');
    } catch {
      setSystemTime(null);
      setTimeStatus('Unavailable');
    }
  };

  const refreshLogs = async () => {
    try {
      setLogsStatus('Loading');
      const logs = await getLogs();
      setConversationLogs(logs.conversationLogs || []);
      setTaskLogs(logs.taskLogs || []);
      setLogsStatus('Ready');
    } catch {
      setConversationLogs([]);
      setTaskLogs([]);
      setLogsStatus('Unavailable');
    }
  };

  const handleExportLogs = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      conversationLogs,
      taskLogs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `jarvis-logs-${Date.now()}.json`;
    link.click();
    window.URL.revokeObjectURL(objectUrl);
  };

  const speakText = (text) => {
    if (isSpeechMuted) {
      setSpeechState('Muted');
      return;
    }

    if (!window.speechSynthesis) {
      setSpeechState('Unsupported');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = availableVoices.length
      ? availableVoices
      : window.speechSynthesis.getVoices();
    const targetLanguage = resolveSpeechLanguage(outputVoiceLanguage, text);
    const selectedVoice =
      (selectedVoiceName !== 'auto'
        ? voices.find((voice) => voice.name === selectedVoiceName)
        : null) || findBestVoice(voices, targetLanguage);

    utterance.lang = targetLanguage;
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = outputVoiceRate;
    utterance.pitch = outputVoicePitch;
    utterance.onstart = () => {
      setSpeechState('Speaking');
    };
    utterance.onend = () => {
      setSpeechState('Ready');
    };
    utterance.onerror = () => {
      setSpeechState('Speech Error');
    };
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const latestJarvisReply =
    [...messages].reverse().find((message) => message.role === 'jarvis')?.text || '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = input.trim();

    if (!trimmed) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: current.length + 1,
        role: 'user',
        text: trimmed,
      },
    ]);
    setInput('');
    setIsSubmitting(true);
    setError('');

    try {
      const data = await sendChat({
        message: trimmed,
        responseLanguage: detectResponseLanguage(trimmed),
      });

      setMessages(data.messages);
      syncWorkflow(data.workflow);
      if (autoSpeakReplies && !isSpeechMuted) {
        speakText(data.reply);
      }
    } catch (requestError) {
      setError(requestError.message);
      setMessages((current) => [
        ...current,
        {
          id: current.length + 1,
          role: 'jarvis',
          text: `Execution failed: ${requestError.message}`,
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitialize = async () => {
    setSystemMode('Systems Live');
    setVoiceState('Listening Ready');
    setMissionProgress((value) => Math.max(value, 86));
    setMessages((current) => [
      ...current,
      {
        id: current.length + 1,
        role: 'jarvis',
        text:
          'Core systems initialized. Voice channel and backend orchestration are available for live commands.',
      },
    ]);
  };

  const handleConsole = () => {
    setSystemMode('Console Open');
    setMessages((current) => [
      ...current,
      {
        id: current.length + 1,
        role: 'jarvis',
        text:
          'Command console expanded. You can issue tasks, review active missions, or switch orchestration modes.',
      },
    ]);
  };

  const handleReset = async () => {
    try {
      setError('');
      const data = await resetSession();
      setPresets(data.presets);
      const preset =
        data.presets.find((entry) => entry.id === data.activeWorkflow.presetId) ||
        data.presets[0];
      setActivePreset(preset);
      setMessages(data.messages || baseMessages);
      syncWorkflow(data.activeWorkflow, preset);
      setVoiceState('Standby');
      setSpeechState('Ready');
      setBackendStatus('Connected');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleVoiceToggle = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Microphone access is not available in this browser.');
      setVoiceState('Mic Unsupported');
      setVoiceDebug('Browser microphone APIs are unavailable.');
      return;
    }

    setVoiceState('Requesting Mic');
    setError('');
    setVoiceDebug('Requesting microphone permission from the browser...');
    setLiveTranscript('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      audioChunksRef.current = [];
      mediaStreamRef.current = stream;

      const audioContext = new window.AudioContext();
      audioContextRef.current = audioContext;
      sampleRateRef.current = audioContext.sampleRate;

      const sourceNode = audioContext.createMediaStreamSource(stream);
      const processorNode = audioContext.createScriptProcessor(4096, 1, 1);
      sourceNodeRef.current = sourceNode;
      processorNodeRef.current = processorNode;

      processorNode.onaudioprocess = (event) => {
        const channelData = event.inputBuffer.getChannelData(0);
        audioChunksRef.current.push(new Float32Array(channelData));
      };

      sourceNode.connect(processorNode);
      processorNode.connect(audioContext.destination);

      setIsRecording(true);
      setVoiceState('Recording');
      setVoiceDebug('Recording started with raw PCM audio. Speak clearly, then press Stop Recording.');
    } catch (micError) {
      setVoiceState('Mic Blocked');
      setError(
        micError?.message || 'Microphone permission is required for voice input.'
      );
      setVoiceDebug('Microphone permission was blocked or unavailable.');
    }
  };

  const handleStopVoice = async () => {
    if (!isRecording) {
      return;
    }

    setIsRecording(false);
    setVoiceState('Transcribing');
    setVoiceDebug('Recording stopped. Preparing WAV audio for transcription...');

    try {
      if (processorNodeRef.current && sourceNodeRef.current && audioContextRef.current) {
        processorNodeRef.current.disconnect();
        sourceNodeRef.current.disconnect();
        await audioContextRef.current.close();
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const wavBlob = encodeWav(audioChunksRef.current, sampleRateRef.current);

      if (!wavBlob.size) {
        setVoiceState('Standby');
        setVoiceDebug('No audio was captured. Please try again.');
        return;
      }

      const result = await transcribeAudio(wavBlob, {
        language: voiceLanguage,
      });

      if (result.text === '[unclear]' || looksLikeHallucinatedTranscript(result.text)) {
        setVoiceState('Retry Needed');
        setLiveTranscript('');
        setVoiceDebug(
          'Transcription looked unreliable. Please retry with a shorter and clearer recording.'
        );
        setError('Voice input was unclear. Please try again.');
        return;
      }

      setInput(result.text);
      setLiveTranscript(result.text);
      setVoiceState('Transcript Ready');
      setVoiceDebug(
        `Audio transcribed successfully using language hint: ${voiceLanguage}.`
      );
    } catch (transcriptionError) {
      setVoiceState('Voice Error');
      setError(transcriptionError.message);
      setVoiceDebug(
        `Audio recording worked, but transcription failed: ${transcriptionError.message}`
      );
    } finally {
      mediaStreamRef.current = null;
      audioContextRef.current = null;
      sourceNodeRef.current = null;
      processorNodeRef.current = null;
      audioChunksRef.current = [];
    }
  };

  const handleSpeakLatest = () => {
    if (!latestJarvisReply) {
      setError('No Jarvis reply is available to speak yet.');
      return;
    }

    setError('');
    speakText(latestJarvisReply);
  };

  const handleMuteSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeechMuted(true);
    setAutoSpeakReplies(false);
    setSpeechState('Muted');
  };

  const handleUnmuteSpeech = () => {
    setIsSpeechMuted(false);
    setAutoSpeakReplies(true);
    setSpeechState('Ready');
  };

  const handlePlaySpeech = () => {
    if (!window.speechSynthesis) {
      setSpeechState('Unsupported');
      return;
    }

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setSpeechState('Speaking');
      return;
    }

    if (window.speechSynthesis.speaking) {
      setSpeechState('Speaking');
      return;
    }

    if (!latestJarvisReply) {
      setError('No Jarvis reply is available to play yet.');
      return;
    }

    setError('');
    if (isSpeechMuted) {
      setIsSpeechMuted(false);
    }
    speakText(latestJarvisReply);
  };

  const handlePauseSpeech = () => {
    if (!window.speechSynthesis) {
      setSpeechState('Unsupported');
      return;
    }

    if (!window.speechSynthesis.speaking || window.speechSynthesis.paused) {
      setSpeechState('Ready');
      return;
    }

    window.speechSynthesis.pause();
    setSpeechState('Paused');
  };

  const handleResumeSpeech = () => {
    if (!window.speechSynthesis) {
      setSpeechState('Unsupported');
      return;
    }

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setSpeechState('Speaking');
      return;
    }

    if (window.speechSynthesis.speaking) {
      setSpeechState('Speaking');
      return;
    }

    handlePlaySpeech();
  };

  const handleStopSpeech = () => {
    if (!window.speechSynthesis) {
      setSpeechState('Unsupported');
      return;
    }

    window.speechSynthesis.cancel();
    setSpeechState('Stopped');
  };

  return (
    <main className="jarvis-app">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Personal AI Command Center</p>
          <h1>JARVIS</h1>
          <p className="summary">
            Autonomous workflow cockpit for chat, mission planning, execution
            tracking, and assistant-guided operations.
          </p>
          <div className="cta-row">
            <button className="primary-btn" type="button" onClick={handleInitialize}>
              Initialize System
            </button>
            <button className="ghost-btn" type="button" onClick={handleConsole}>
              Open Console
            </button>
            <button className="ghost-btn" type="button" onClick={handleVoiceToggle}>
              Voice Input
            </button>
            <button className="ghost-btn" type="button" onClick={handleSpeakLatest}>
              Speak Jarvis
            </button>
            <button className="ghost-btn" type="button" onClick={handleReset}>
              Reset Session
            </button>
          </div>
        </div>
        <div className="orbital-panel" aria-hidden="true">
          <div className="orb-core" />
          <div className="orb-ring ring-one" />
          <div className="orb-ring ring-two" />
          <div className="orb-ring ring-three" />
        </div>
      </section>

      <section className="status-grid">
        <article className="status-card">
          <span className="card-label">Neural Core</span>
          <strong>{systemMode}</strong>
          <p>Response routing calibrated for planning, verification, and action.</p>
        </article>
        <article className="status-card">
          <span className="card-label">Voice Channel</span>
          <strong>{voiceState}</strong>
          <p>Speech pipeline can be attached to microphone input in the next step.</p>
        </article>
        <article className="status-card">
          <span className="card-label">Mission Queue</span>
          <strong>{activeWorkflow?.steps.length || 0}</strong>
          <p>
            {activeWorkflow?.steps.map((step) => step.label).join(', ') ||
              'Waiting for workflow steps.'}
            .
          </p>
        </article>
      </section>

      <section className="workflow-grid">
        <article className="panel mission-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Mission Library</p>
              <h2>Workflow Presets</h2>
            </div>
            <span className="panel-badge">{activePreset?.label || 'Loading'}</span>
          </div>
          <div className="preset-list">
            {presets.map((preset) => (
              <button
                key={preset.id}
                className={
                  preset.id === activePreset?.id ? 'preset-card active' : 'preset-card'
                }
                type="button"
                onClick={() => handlePreset(preset)}
              >
                <strong>{preset.label}</strong>
                <span>{preset.objective}</span>
              </button>
            ))}
          </div>
          <div className="mission-steps">
            <div className="panel-heading compact">
              <h3>Execution Chain</h3>
              <span>{missionProgress}% synced</span>
            </div>
            <div className="progress-rail" aria-hidden="true">
              <span style={{ width: `${missionProgress}%` }} />
            </div>
            <ul className="step-list">
              {(activeWorkflow?.steps || []).map((step, index) => (
                <li key={step.id}>
                  <span className="step-index">0{index + 1}</span>
                  <span>{step.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <article className="panel console-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Assistant Console</p>
              <h2>Conversation</h2>
            </div>
            <span className="panel-badge live">{backendStatus}</span>
          </div>
          <div className="message-list">
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === 'jarvis' ? 'message-row jarvis' : 'message-row user'
                }
              >
                <span className="message-role">
                  {message.role === 'jarvis' ? 'JR' : 'You'}
                </span>
                <p>{message.text}</p>
              </div>
            ))}
          </div>
          <form className="command-form" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="command-input">
              Command input
            </label>
            <input
              id="command-input"
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Issue a command to JARVIS..."
            />
            <button className="primary-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Running...' : 'Execute'}
            </button>
          </form>
          {error ? <p className="error-banner">{error}</p> : null}
          <div className="quick-actions">
            {quickCommands.map((command) => (
              <button
                key={command}
                className="command-chip"
                type="button"
                onClick={() => setInput(command)}
              >
                {command}
              </button>
            ))}
          </div>
          <div className="voice-panel">
            <div className="panel-heading compact">
              <h3>Voice Test</h3>
              <span>{voiceState}</span>
            </div>
            <label className="field-label" htmlFor="voice-language">
              Spoken Language
            </label>
            <select
              id="voice-language"
              className="desktop-select"
              value={voiceLanguage}
              onChange={(event) => setVoiceLanguage(event.target.value)}
            >
              <option value="hi">Hindi</option>
              <option value="en">English</option>
              <option value="ja">Japanese</option>
            </select>
            <p className="voice-hint">
              This mode records real microphone audio and sends it to Jarvis for
              transcription when you stop recording. Pick the language you will
              actually speak for better accuracy.
            </p>
            <div className="desktop-actions">
              <button className="ghost-btn" type="button" onClick={handleVoiceToggle}>
                Start Recording
              </button>
              <button className="ghost-btn" type="button" onClick={handleStopVoice}>
                Stop Recording
              </button>
            </div>
            <p className="voice-debug">{voiceDebug}</p>
            <div className="voice-transcript">
              {liveTranscript || 'Transcript will appear here after you speak.'}
            </div>
          </div>
          <div className="voice-panel">
            <div className="panel-heading compact">
              <h3>Output Voice Controller</h3>
              <span>{speechState}</span>
            </div>
            <label className="field-label" htmlFor="output-voice-language">
              Output Language
            </label>
            <select
              id="output-voice-language"
              className="desktop-select"
              value={outputVoiceLanguage}
              onChange={(event) => setOutputVoiceLanguage(event.target.value)}
            >
              <option value="auto">Auto</option>
              <option value="hi-IN">Hindi</option>
              <option value="en-US">English</option>
              <option value="ja-JP">Japanese</option>
            </select>
            <label className="field-label" htmlFor="output-voice-name">
              Browser Voice
            </label>
            <select
              id="output-voice-name"
              className="desktop-select"
              value={selectedVoiceName}
              onChange={(event) => setSelectedVoiceName(event.target.value)}
            >
              <option value="auto">Auto Select</option>
              {availableVoices.map((voice) => (
                <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
            <label className="field-label" htmlFor="output-voice-rate">
              Speed
            </label>
            <input
              id="output-voice-rate"
              className="voice-range"
              type="range"
              min="0.7"
              max="1.3"
              step="0.1"
              value={outputVoiceRate}
              onChange={(event) => setOutputVoiceRate(Number(event.target.value))}
            />
            <p className="voice-value">Rate: {outputVoiceRate.toFixed(1)}</p>
            <label className="field-label" htmlFor="output-voice-pitch">
              Pitch
            </label>
            <input
              id="output-voice-pitch"
              className="voice-range"
              type="range"
              min="0.7"
              max="1.3"
              step="0.1"
              value={outputVoicePitch}
              onChange={(event) => setOutputVoicePitch(Number(event.target.value))}
            />
            <p className="voice-value">Pitch: {outputVoicePitch.toFixed(1)}</p>
            <label className="voice-toggle">
              <input
                type="checkbox"
                checked={autoSpeakReplies}
                onChange={(event) => setAutoSpeakReplies(event.target.checked)}
              />
              <span>Auto speak Jarvis replies</span>
            </label>
            <div className="desktop-actions">
              <button
                className="icon-audio-btn"
                type="button"
                onClick={handlePlaySpeech}
                aria-label="Play"
                title="Play"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="audio-icon"
                >
                  <path
                    d="M8 6l10 6-10 6z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                className="icon-audio-btn"
                type="button"
                onClick={handlePauseSpeech}
                aria-label="Pause"
                title="Pause"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="audio-icon"
                >
                  <path
                    d="M8 6v12M16 6v12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                className="icon-audio-btn"
                type="button"
                onClick={handleResumeSpeech}
                aria-label="Resume"
                title="Resume"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="audio-icon"
                >
                  <path
                    d="M8 6l10 6-10 6z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M5 6v12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                className="icon-audio-btn"
                type="button"
                onClick={handleStopSpeech}
                aria-label="Stop"
                title="Stop"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="audio-icon"
                >
                  <rect
                    x="7"
                    y="7"
                    width="10"
                    height="10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
              </button>
              <button
                className="icon-audio-btn"
                type="button"
                onClick={handleMuteSpeech}
                aria-label="Mute"
                title="Mute"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="audio-icon"
                >
                  <path
                    d="M4 9h4l5-4v14l-5-4H4z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M17 9l4 6M21 9l-4 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                className="icon-audio-btn"
                type="button"
                onClick={handleUnmuteSpeech}
                aria-label="Unmute"
                title="Unmute"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="audio-icon"
                >
                  <path
                    d="M4 9h4l5-4v14l-5-4H4z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16 9.5a4.5 4.5 0 0 1 0 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M18.8 7a8 8 0 0 1 0 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </article>

        <article className="panel desktop-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Desktop Control</p>
              <h2>Local Actions</h2>
            </div>
            <span className="panel-badge">Windows</span>
          </div>
          <div className="desktop-section">
            <label className="field-label" htmlFor="desktop-app-select">
              App
            </label>
            <select
              id="desktop-app-select"
              className="desktop-select"
              value={selectedApp}
              onChange={(event) => setSelectedApp(event.target.value)}
            >
              {desktopApps.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.label}
                </option>
              ))}
            </select>
            <div className="desktop-actions">
              <button className="ghost-btn" type="button" onClick={handleDesktopOpen}>
                Open App
              </button>
              <button className="ghost-btn" type="button" onClick={handleDesktopFocus}>
                Focus App
              </button>
              <button className="ghost-btn" type="button" onClick={handleDesktopClose}>
                Close App
              </button>
            </div>
          </div>

          <div className="desktop-section">
            <label className="field-label" htmlFor="note-name">
              Writing
            </label>
            <input
              id="note-name"
              className="desktop-input"
              value={noteName}
              onChange={(event) => setNoteName(event.target.value)}
              placeholder="File name"
            />
            <textarea
              className="desktop-textarea"
              value={noteContent}
              onChange={(event) => setNoteContent(event.target.value)}
              placeholder="Write content for Jarvis to save..."
            />
            <button className="ghost-btn" type="button" onClick={handleWriteNote}>
              Save Writing
            </button>
          </div>

          <div className="desktop-section">
            <label className="field-label" htmlFor="typing-text">
              Type In App
            </label>
            <textarea
              id="typing-text"
              className="desktop-textarea"
              value={typingText}
              onChange={(event) => setTypingText(event.target.value)}
              placeholder="Text to type into the active desktop window"
            />
            <button className="ghost-btn" type="button" onClick={handleTypeIntoDesktop}>
              Type Text
            </button>
          </div>

          <div className="desktop-section">
            <label className="field-label" htmlFor="drawing-name">
              Drawing
            </label>
            <input
              id="drawing-name"
              className="desktop-input"
              value={drawingName}
              onChange={(event) => setDrawingName(event.target.value)}
              placeholder="Drawing file name"
            />
            <input
              className="desktop-input"
              value={drawingPrompt}
              onChange={(event) => setDrawingPrompt(event.target.value)}
              placeholder="Drawing prompt"
            />
            <button className="ghost-btn" type="button" onClick={handleCreateDrawing}>
              Create Drawing
            </button>
          </div>

          <div className="desktop-section">
            <label className="field-label" htmlFor="website-url">
              Website
            </label>
            <input
              id="website-url"
              className="desktop-input"
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
              placeholder="example.com"
            />
            <button className="ghost-btn" type="button" onClick={handleOpenWebsite}>
              Open Website
            </button>
          </div>

          {desktopResult ? <p className="desktop-result">{desktopResult}</p> : null}
        </article>

        <article className="panel news-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Top News</p>
              <h2>Latest Headlines</h2>
            </div>
            <span className="panel-badge">{newsStatus}</span>
          </div>
          {newsUpdatedAt ? (
            <p className="voice-hint">Updated: {new Date(newsUpdatedAt).toLocaleString()}</p>
          ) : null}
          <div className="news-list">
            {topNews.length ? (
              topNews.map((item, index) => (
                <article key={`${item.title}-${index}`} className="news-item">
                  <strong>{item.title}</strong>
                  <p>{item.summary}</p>
                  <span>{item.source}</span>
                  {item.url ? (
                    <a
                      className="news-link"
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Source
                    </a>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="voice-hint">No headlines available right now.</p>
            )}
          </div>
        </article>

        <article className="panel time-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Time Tool</p>
              <h2>Current Date & Time</h2>
            </div>
            <span className="panel-badge">{timeStatus}</span>
          </div>
          {systemTime ? (
            <div className="time-card">
              <strong>{systemTime.localeTime}</strong>
              <p>{systemTime.localeDate}</p>
              <span>{systemTime.timezone}</span>
            </div>
          ) : (
            <p className="voice-hint">
              Current time is not available right now. If this continues, restart the
              backend and refresh the page.
            </p>
          )}
          <div className="desktop-actions">
            <button className="ghost-btn" type="button" onClick={refreshSystemTime}>
              Refresh Time
            </button>
            <button
              className="ghost-btn"
              type="button"
              onClick={() => setAutoRefreshTime((current) => !current)}
            >
              {autoRefreshTime ? 'Auto Refresh On' : 'Auto Refresh Off'}
            </button>
          </div>
        </article>

        <article className="panel logs-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Dataset Logs</p>
              <h2>Interaction Memory</h2>
            </div>
            <span className="panel-badge">{logsStatus}</span>
          </div>
          <div className="logs-summary">
            <div className="log-stat">
              <span>Conversation Logs</span>
              <strong>{conversationLogs.length}</strong>
            </div>
            <div className="log-stat">
              <span>Task Logs</span>
              <strong>{taskLogs.length}</strong>
            </div>
          </div>
          <div className="logs-columns">
            <section className="log-column">
              <h3>Recent Conversations</h3>
              <div className="log-list">
                {conversationLogs.length ? (
                  [...conversationLogs]
                    .slice(-4)
                    .reverse()
                    .map((entry) => (
                      <article key={entry.id} className="log-card">
                        <div className="log-meta">
                          <span>{entry.detectedIntent || 'general_chat'}</span>
                          <span>{formatLogTime(entry.timestamp)}</span>
                        </div>
                        <strong>{entry.userMessage || 'No user message saved.'}</strong>
                        <p>{entry.assistantReply || entry.errorMessage || 'No reply saved.'}</p>
                      </article>
                    ))
                ) : (
                  <p className="voice-hint">No conversation logs available yet.</p>
                )}
              </div>
            </section>
            <section className="log-column">
              <h3>Recent Tasks</h3>
              <div className="log-list">
                {taskLogs.length ? (
                  [...taskLogs]
                    .slice(-4)
                    .reverse()
                    .map((entry) => (
                      <article key={entry.id} className="log-card">
                        <div className="log-meta">
                          <span>{entry.taskType || 'task'}</span>
                          <span>{formatLogTime(entry.timestamp)}</span>
                        </div>
                        <strong>{entry.command || 'System task'}</strong>
                        <p>{entry.outputSummary || entry.errorMessage || 'No output saved.'}</p>
                      </article>
                    ))
                ) : (
                  <p className="voice-hint">No task logs available yet.</p>
                )}
              </div>
            </section>
          </div>
          <div className="desktop-actions">
            <button className="ghost-btn" type="button" onClick={refreshLogs}>
              Refresh Logs
            </button>
            <button className="ghost-btn" type="button" onClick={handleExportLogs}>
              Export JSON
            </button>
          </div>
        </article>

        <article className="panel telemetry-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">System Telemetry</p>
                <h2>Orchestration Status</h2>
            </div>
          </div>
          <div className="telemetry-stack">
            {operationFeed.map((item) => (
              <div key={item.label} className="telemetry-item">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
          <div className="activity-timeline">
            {(activeWorkflow?.timeline || []).map((item) => (
              <div key={item.id} className="timeline-item">
                <span className="timeline-dot" />
                <div>
                  <strong>{item.stage}</strong>
                  <p>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function detectResponseLanguage(text) {
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text)) {
    return 'Japanese';
  }

  if (/[\u0900-\u097f]/.test(text)) {
    return 'Hindi';
  }

  return 'English';
}

function resolveSpeechLanguage(outputLanguage, text) {
  if (outputLanguage !== 'auto') {
    return outputLanguage;
  }

  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text)) {
    return 'ja-JP';
  }

  if (/[\u0900-\u097f]/.test(text)) {
    return 'hi-IN';
  }

  return 'en-US';
}

function findBestVoice(voices, targetLanguage) {
  return (
    voices.find((voice) => voice.lang === targetLanguage) ||
    voices.find((voice) => voice.lang.startsWith(targetLanguage.split('-')[0])) ||
    null
  );
}

function looksLikeHallucinatedTranscript(text) {
  const normalized = text.trim();

  if (!normalized) {
    return true;
  }

  if (/beadaholique\.com/i.test(normalized)) {
    return true;
  }

  if (normalized.split(/\s+/).length > 14) {
    return true;
  }

  return false;
}

function encodeWav(chunks, sampleRate) {
  const merged = mergeAudioChunks(chunks);
  const buffer = new ArrayBuffer(44 + merged.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + merged.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, merged.length * 2, true);

  floatTo16BitPcm(view, 44, merged);

  return new Blob([buffer], { type: 'audio/wav' });
}

function mergeAudioChunks(chunks) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Float32Array(length);
  let offset = 0;

  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });

  return result;
}

function floatTo16BitPcm(view, offset, input) {
  let writeOffset = offset;

  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index]));
    view.setInt16(
      writeOffset,
      sample < 0 ? sample * 0x8000 : sample * 0x7fff,
      true
    );
    writeOffset += 2;
  }
}

function writeString(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function formatLogTime(value) {
  if (!value) {
    return 'Just now';
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default App;
