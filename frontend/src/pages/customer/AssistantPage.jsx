import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlinePaperAirplane, HiOutlineMicrophone, HiOutlineStop, HiOutlineGlobeAlt, HiOutlineBars3 } from 'react-icons/hi2';
import { assistantAPI, conversationsAPI } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useCity } from '../../contexts/CityContext';
import ChatBubble from '../../components/assistant/ChatBubble';
import TypingIndicator from '../../components/assistant/TypingIndicator';
import SuggestionChips from '../../components/assistant/SuggestionChips';
import ConversationSidebar from '../../components/assistant/ConversationSidebar';
import Button from '../../components/ui/Button';

export default function AssistantPage() {
  const { user } = useAuth();
  const { selectedCity } = useCity();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [language, setLanguage] = useState('en');
  const [recording, setRecording] = useState(false);
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState([]);

  const messagesEndRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioStreamRef = useRef(null);
  const processorRef = useRef(null);
  const chunksRef = useRef([]);

  const fetchConversations = async () => {
    try {
      const res = await conversationsAPI.getMy();
      setConversations(res.data || []);
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleSelectConversation = async (id) => {
    setConversationId(id);
    setSidebarOpen(false);
    setLoading(true);
    try {
      const res = await conversationsAPI.getById(id);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Failed to load conversation', err);
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = () => {
    setConversationId(null);
    setSidebarOpen(false);
    setMessages([{
      role: 'assistant',
      content: selectedCity
        ? `Hello ${user?.name || 'there'}! 👋 I'm your AI travel assistant. I see you're exploring **${selectedCity.name}**! I can help you find hotels, check availability, book rooms, browse itineraries, and much more. How can I help you today?`
        : `Hello ${user?.name || 'there'}! 👋 I'm your AI travel assistant. I can help you explore cities, find hotels, make reservations, and plan your trip. What would you like to do?`,
    }]);
  };

  // Initial welcome message (only if no conversation is selected)
  useEffect(() => {
    if (!conversationId && messages.length === 0) {
      startNewConversation();
    }
  }, [selectedCity, user, conversationId, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await assistantAPI.chat({
        message: userMsg,
        conversation_id: conversationId,
        city_id: selectedCity?.id || null,
        language,
      });
      if (res.data.conversation_id !== conversationId) {
        setConversationId(res.data.conversation_id);
        fetchConversations();
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.response,
        toolCalls: res.data.tool_calls,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    stopSpeaking();
    
    let cleanText = text;
    // 1. Convert star ratings
    cleanText = cleanText.replace(/⭐+\s*\(([\d.]+)\)/g, 'rated $1 out of 5');
    cleanText = cleanText.replace(/⭐+/g, '');
    
    // 2. Currency
    cleanText = cleanText.replace(/₹\s*([\d,.]+)/g, '$1 rupees');
    
    // 3. Tables to sentences
    const lines = cleanText.split('\n');
    const outLines = [];
    let inTable = false;
    for (let line of lines) {
      if (line.includes('|')) {
        if (/^[\s|:\-]+$/.test(line)) continue;
        const cells = line.split('|').map(c => c.trim()).filter(c => c);
        if (!inTable) {
          inTable = true;
          continue;
        }
        if (cells.length >= 4) {
          const num = cells[0];
          const hotel = cells[1].replace(/[^\w\s.,]/g, '').trim();
          const rating = cells[2];
          const address = cells[3];
          const extra = cells.length > 4 ? ', for ' + cells[4] : '';
          outLines.push('Hotel ' + num + ' is ' + hotel + ', ' + rating + ', on ' + address + extra + '.');
        } else {
          outLines.push(cells.join(', '));
        }
      } else {
        inTable = false;
        outLines.push(line);
      }
    }
    cleanText = outLines.join(' ');
    
    // 4. Remove HTML tags
    cleanText = cleanText.replace(/<[^>]+>/g, ' ');
    
    // 5. Remove Markdown syntax characters
    cleanText = cleanText.replace(/[*_\`#~|]/g, '');
    
    // 6. Remove remaining emojis (ignore non-ascii)
    cleanText = cleanText.replace(/[^\x00-\x7F]/g, '');
    
    // 7. Collapse spaces
    cleanText = cleanText.replace(/\s+/g, ' ').trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const langMap = { en: 'en-US', hi: 'hi-IN', te: 'te-IN' };
    const targetLang = langMap[language] || 'en-US';
    utterance.lang = targetLang;
    utterance.rate = 0.92;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const langPrefix = targetLang.split('-')[0];
    const langVoices = voices.filter(
      v => v.lang.startsWith(langPrefix) && !v.name.toLowerCase().includes('cortana')
    );

    const naturalKeywords = ['natural', 'neural', 'online', 'jenny', 'aria', 'guy'];
    let bestVoice = langVoices.find(v =>
      naturalKeywords.some(k => v.name.toLowerCase().includes(k))
    );
    if (!bestVoice) {
      bestVoice = langVoices.find(v =>
        v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('swara') || v.name.toLowerCase().includes('sudha')
      );
    }
    if (!bestVoice) bestVoice = langVoices[0];
    if (!bestVoice) bestVoice = voices.find(v => !v.name.toLowerCase().includes('cortana'));

    if (bestVoice) {
      utterance.voice = bestVoice;
    }
    window.speechSynthesis.speak(utterance);
  };

  const startTimeRef = useRef(null);

  const encodeWAV = (samples, sampleRate) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    
    const writeString = (v, offset, string) => {
      for (let i = 0; i < string.length; i++) {
        v.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
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
    view.setUint32(40, samples.length * 2, true);
    
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([view], { type: 'audio/wav' });
  };

  const startRecording = async () => {
    stopSpeaking();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      const workletCode = `
        class RecorderProcessor extends AudioWorkletProcessor {
          process(inputs, outputs) {
            const input = inputs[0];
            const output = outputs[0];
            if (input && input.length > 0) {
              this.port.postMessage(new Float32Array(input[0]));
            }
            if (output && output.length > 0) {
              for (let i = 0; i < output[0].length; i++) {
                output[0][i] = 0;
              }
            }
            return true;
          }
        }
        registerProcessor('recorder-worklet', RecorderProcessor);
      `;
      
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      try {
        await audioContext.audioWorklet.addModule(workletUrl);
      } finally {
        URL.revokeObjectURL(workletUrl);
      }
      
      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContext, 'recorder-worklet');
      processorRef.current = workletNode;

      chunksRef.current = [];
      
      workletNode.port.onmessage = (e) => {
        chunksRef.current.push(e.data);
      };

      source.connect(workletNode);
      workletNode.connect(audioContext.destination);

      startTimeRef.current = Date.now();
      setRecording(true);
    } catch (err) {
      console.error(err);
      alert('Microphone access denied. Please allow microphone access and try again.');
    }
  };

  const stopRecording = async () => {
    setRecording(false);
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.port.onmessage = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
    }
    
    const sampleRate = audioContextRef.current ? audioContextRef.current.sampleRate : 44100;
    if (audioContextRef.current) {
      await audioContextRef.current.close();
    }

    const totalLength = chunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
    const flattenedData = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunksRef.current) {
      flattenedData.set(chunk, offset);
      offset += chunk.length;
    }
    
    audioContextRef.current = null;
    audioStreamRef.current = null;
    processorRef.current = null;
    chunksRef.current = [];

    const audioBlob = encodeWAV(flattenedData, sampleRate);
    uploadAudio(audioBlob);
  };

  const uploadAudio = async (audioBlob) => {
    setMessages(prev => [...prev, { role: 'user', content: '🎤 Processing voice...' }]);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      if (conversationId) formData.append('conversation_id', conversationId);
      if (selectedCity?.id) formData.append('city_id', selectedCity.id);
      formData.append('language', language);
      const res = await assistantAPI.voice(formData);
      
      if (res.data.conversation_id !== conversationId) {
        setConversationId(res.data.conversation_id);
        fetchConversations();
      }

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'user', content: `🎤 "${res.data.transcription}"` };
        return [...updated, { role: 'assistant', content: res.data.response, toolCalls: res.data.tool_calls }];
      });
      speakText(res.data.response);
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Voice processing failed. Please try text input.';
      setMessages(prev => [...prev, { role: 'assistant', content: detail }]);
    } finally { setLoading(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const regenerateResponse = async () => {
    alert('Regenerate functionality placeholder.');
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-transparent">
      {/* Conversation Sidebar */}
      <ConversationSidebar 
        conversations={conversations}
        activeId={conversationId}
        onSelect={handleSelectConversation}
        onNew={startNewConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* Header Options */}
        <div className="flex-shrink-0 mx-4 mt-4 glass-surface-strong border border-[var(--glass-border)] rounded-2xl px-4 py-3 flex items-center justify-between z-10 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]">
              <HiOutlineBars3 className="w-5 h-5" />
            </button>
            {selectedCity && (
              <span className="text-sm font-medium text-[var(--color-brand-600)]">
                🏙️ Exploring: {selectedCity.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]">
            <HiOutlineGlobeAlt className="text-[var(--color-text-tertiary)] w-4 h-4" />
            <select value={language} onChange={e => setLanguage(e.target.value)} className="text-sm font-medium bg-transparent border-none outline-none text-[var(--color-text-secondary)] cursor-pointer focus:outline-none focus:ring-0">
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="te">తెలుగు (Telugu)</option>
            </select>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-8 pb-10">
            {messages.map((msg, i) => (
              <ChatBubble 
                key={i}
                role={msg.sender || msg.role}
                content={msg.content}
                toolCalls={msg.tool_calls}
                timestamp={Date.now()} // Placeholder for timestamp
                onCopy={(text) => navigator.clipboard.writeText(text)}
                onSpeak={() => speakText(msg.content)}
                onRegenerate={regenerateResponse}
              />
            ))}
            {loading && <TypingIndicator />}
            
            {!loading && messages.length === 1 && !conversationId && (
              <SuggestionChips 
                suggestions={[
                  "Hotels in Hyderabad",
                  "Plan a trip to Goa",
                  "Show my bookings",
                  "What's special about Jaipur?"
                ]}
                onSelect={(text) => { setInput(text); }}
              />
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Bar */}
        <div className="flex-shrink-0 mx-4 mb-4 border border-[var(--glass-border)] glass-surface-strong rounded-3xl p-4 z-10 shadow-[var(--shadow-md)]">
          <div className="max-w-4xl mx-auto flex items-end gap-3 relative">
            <button
              onClick={recording ? stopRecording : startRecording}
              className={`flex-shrink-0 p-3.5 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] ${recording ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/20' : 'glass-interactive border border-[var(--glass-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
              title={recording ? 'Stop recording' : 'Start voice input'}
            >
              {recording ? <HiOutlineStop className="w-5 h-5" /> : <HiOutlineMicrophone className="w-5 h-5" />}
            </button>
            <div className="flex-1 relative glass-surface-strong border border-[var(--glass-border)] rounded-xl focus-within:ring-2 focus-within:ring-[var(--color-brand-500)] focus-within:border-[var(--color-brand-500)] transition-all">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="w-full bg-transparent border-none outline-none text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] py-3 px-4 resize-none max-h-32 min-h-[52px]"
                rows={1}
                disabled={loading}
                style={{ height: 'auto' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                }}
              />
            </div>
            <button 
              onClick={sendMessage} 
              disabled={loading || !input.trim()} 
              className="flex-shrink-0 p-3.5 rounded-xl bg-[var(--color-brand-600)] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-[var(--color-brand-700)] focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:ring-[var(--color-brand-500)] shadow-sm"
              title="Send message"
            >
              <HiOutlinePaperAirplane className="w-5 h-5 -rotate-45 ml-0.5" />
            </button>
          </div>
          <div className="text-center mt-2">
            <span className="text-[11px] text-[var(--color-text-tertiary)]">
              TravelBot can make mistakes. Verify important information.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
