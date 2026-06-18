import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  Bot,
  Mic,
  MicOff,
  Scale,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

const starterMessages = [
  {
    role: 'assistant',
    content:
      'Ask me about the reviewed NDA: riskiest clause, indemnity, governing law, fairness, or negotiation points.',
  },
];

function ChatAssistant({ apiBaseUrl, contractContext, queuedQuestion }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(starterMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const api = useMemo(
    () =>
      axios.create({
        baseURL: apiBaseUrl,
        timeout: 60000,
      }),
    [apiBaseUrl],
  );

  const speechRecognition = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }, []);

  const speechSupported = Boolean(speechRecognition);

  const speak = useCallback(
    (text) => {
      if (!speakerEnabled || typeof window === 'undefined' || !window.speechSynthesis) {
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    },
    [speakerEnabled],
  );

  const sendQuestion = useCallback(
    async (question) => {
      const cleanQuestion = question.trim();
      if (!cleanQuestion || loading) {
        return;
      }
      setOpen(true);
      setInput('');
      setMessages((current) => [...current, { role: 'user', content: cleanQuestion }]);
      setLoading(true);
      try {
        const response = await api.post('/api/chat', {
          message: cleanQuestion,
          contract_context: contractContext,
        });
        const answer = response.data.response;
        setMessages((current) => [...current, { role: 'assistant', content: answer }]);
        speak(answer);
      } catch (error) {
        const answer =
          error.response?.data?.detail ||
          'I could not reach the legal chat endpoint. Please confirm the backend is running.';
        setMessages((current) => [...current, { role: 'assistant', content: answer }]);
      } finally {
        setLoading(false);
      }
    },
    [api, contractContext, loading, speak],
  );

  useEffect(() => {
    if (queuedQuestion?.text) {
      sendQuestion(queuedQuestion.text);
    }
  }, [queuedQuestion, sendQuestion]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleRecording = () => {
    if (!speechSupported) {
      setVoiceStatus('Voice input is not supported in this browser.');
      return;
    }
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      setVoiceStatus('');
      return;
    }
    const recognition = new speechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      setRecording(true);
      setVoiceStatus('Listening... speak now');
    };
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      if (transcript.trim()) {
        setInput(transcript);
        setVoiceStatus(`Heard: "${transcript}"`);
        sendQuestion(transcript);
      } else {
        setVoiceStatus('I did not catch that. Try speaking closer to the mic.');
      }
    };
    recognition.onnomatch = () => {
      setVoiceStatus('I could not understand the audio. Please try again.');
    };
    recognition.onend = () => {
      setRecording(false);
      setTimeout(() => {
        setVoiceStatus((current) => (current.startsWith('Heard:') ? current : ''));
      }, 1800);
    };
    recognition.onerror = (event) => {
      setRecording(false);
      const helpText = voiceErrorMessage(event.error);
      setVoiceStatus(helpText);
      setMessages((current) => [...current, { role: 'assistant', content: helpText }]);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setRecording(false);
      setVoiceStatus('Voice input could not start. Close other mic apps and try again.');
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendQuestion(input);
  };

  return (
    <>
      <button className="chatOrb" type="button" onClick={() => setOpen(true)} aria-label="Open legal chat assistant">
        <Scale size={28} />
        <span className="notificationDot" />
      </button>

      <aside className={`chatPanel ${open ? 'open' : ''}`} aria-label="AI legal chat assistant">
        <header className="chatHeader">
          <div className="chatTitle">
            <div className="chatAvatar">
              <Bot size={22} />
            </div>
            <div>
              <h2>Legal AI Assistant</h2>
              <span>Context-aware NDA guidance</span>
            </div>
          </div>
          <button className="iconButton" type="button" onClick={() => setOpen(false)} aria-label="Close chat">
            <X size={20} />
          </button>
        </header>

        <div className="chatMessages">
          {messages.map((message, index) => (
            <div className={`chatMessage ${message.role}`} key={`${message.role}-${index}`}>
              <span>{message.content}</span>
            </div>
          ))}
          {loading ? (
            <div className="chatMessage assistant typing" aria-label="AI is typing">
              <i />
              <i />
              <i />
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        <div className="chatQuickPrompts">
          {['Riskiest clause?', 'Should I sign?', 'Explain indemnity'].map((prompt) => (
            <button type="button" key={prompt} onClick={() => sendQuestion(prompt)}>
              <Sparkles size={13} />
              {prompt}
            </button>
          ))}
        </div>

        <form className="chatComposer" onSubmit={handleSubmit}>
          {speechSupported ? (
            <button
              className={`micButton ${recording ? 'recording' : ''}`}
              type="button"
              onClick={toggleRecording}
              aria-label={recording ? 'Stop recording' : 'Start voice input'}
            >
              {recording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          ) : null}
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about this NDA..."
            aria-label="Ask the legal assistant"
          />
          <button
            className="speakerButton"
            type="button"
            onClick={() => setSpeakerEnabled((enabled) => !enabled)}
            aria-label={speakerEnabled ? 'Turn voice response off' : 'Turn voice response on'}
          >
            {speakerEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button className="sendButton" type="submit" disabled={loading || !input.trim()} aria-label="Send message">
            <Send size={18} />
          </button>
        </form>
        {voiceStatus ? <p className={`voiceStatus ${recording ? 'active' : ''}`}>{voiceStatus}</p> : null}
      </aside>
    </>
  );
}

function voiceErrorMessage(errorCode) {
  const messages = {
    'not-allowed': 'Microphone permission is blocked. Allow microphone access in the browser address bar and try again.',
    'audio-capture': 'No microphone was detected. Check your mic connection and Windows input settings.',
    network: 'Speech recognition service is unavailable right now. Try Chrome or Edge with internet access.',
    'no-speech': 'No speech was detected. Click the mic and speak after it turns red.',
    aborted: 'Voice recording stopped before speech was captured.',
  };
  return messages[errorCode] || 'Voice input failed. Please try again or type your question.';
}

export default ChatAssistant;
