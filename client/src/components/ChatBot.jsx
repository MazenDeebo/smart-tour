import React, { useState, useRef, useEffect } from 'react';
import { useTourStore } from '../store/tourStore';
import socketService from '../services/socketService';
import matterportService from '../services/matterportService';
import { 
  MessageCircle, Send, Minimize2, Mic, MicOff, 
  Volume2, VolumeX, Loader2, Navigation, MapPin,
  Home, Ruler, Play, HelpCircle, Compass, X
} from 'lucide-react';
import './ChatBot.css';

function ChatBot() {
  const { chat, spatial, tourData, isConnected } = useTourStore();
  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages]);

  // Handle AI actions
  useEffect(() => {
    const lastMessage = chat.messages[chat.messages.length - 1];
    if (lastMessage?.role === 'assistant' && lastMessage.actions?.length > 0) {
      executeActions(lastMessage.actions);
    }
    if (lastMessage?.shouldSpeak && !isSpeaking) {
      speak(lastMessage.content);
    }
  }, [chat.messages]);

  // Setup speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        // Auto-send
        setTimeout(() => {
          sendMessageWithText(transcript);
        }, 300);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const executeActions = async (actions) => {
    for (const action of actions) {
      await matterportService.executeAction(action);
      await new Promise(r => setTimeout(r, 500));
    }
  };

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const cleanText = text.replace(/\*\*/g, '').replace(/\[.*?\]/g, '');
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 0.9;
      utterance.onend = () => setIsSpeaking(false);
      speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const sendMessageWithText = (text) => {
    if (!text.trim() || !isConnected || chat.isLoading) return;
    socketService.sendChatMessage(text.trim(), spatial, tourData);
    setInput('');
  };

  const sendMessage = () => sendMessageWithText(input);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Format message - remove markdown syntax for clean display
  const formatMessage = (text) => {
    if (!text) return '';
    return text
      .replace(/\*\*/g, '')  // Remove bold **
      .replace(/\*/g, '')    // Remove italic *
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/`/g, '')     // Remove code backticks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/•/g, '→')    // Replace bullets
      .trim();
  };

  const quickActions = [
    { icon: <MapPin size={14} />, label: "Where am I?", msg: "Where am I right now and what's around me?" },
    { icon: <Home size={14} />, label: "Rooms", msg: "How many rooms are in this space?" },
    { icon: <Compass size={14} />, label: "Highlights", msg: "What are the main highlights?" },
    { icon: <Play size={14} />, label: "Tour", msg: "Give me a guided tour" },
    { icon: <Ruler size={14} />, label: "Measure", msg: "What are the dimensions here?" },
    { icon: <HelpCircle size={14} />, label: "Help", msg: "What can you help me with?" },
  ];

  const getActionButton = (action) => {
    const labels = {
      'NAVIGATE': 'Go there',
      'ROTATE': `Turn ${action.direction}`,
      'HIGHLIGHT_TAG': 'View this',
      'TOUR_CONTROL': action.action === 'start' ? 'Start tour' : 'Control tour',
    };
    return labels[action.type] || 'Execute';
  };

  if (isMinimized) {
    return (
      <button className="chat-minimized" onClick={() => setIsMinimized(false)}>
        <MessageCircle size={22} />
        <span>Tour Assistant</span>
        {chat.messages.length > 1 && <span className="badge">{chat.messages.length - 1}</span>}
      </button>
    );
  }

  return (
    <div className="chatbot">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-title">
          <MessageCircle size={20} />
          <span>Tour Assistant</span>
          <span className={`status-dot ${isConnected ? 'online' : ''}`} />
        </div>
        <div className="chat-controls">
          <button onClick={isSpeaking ? stopSpeaking : null} className={`ctrl-btn ${isSpeaking ? 'active' : ''}`}>
            {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button onClick={() => setIsMinimized(true)} className="ctrl-btn">
            <Minimize2 size={18} />
          </button>
        </div>
      </div>

      {/* Context */}
      <div className="chat-context">
        <span>📍 {spatial.currentFloor?.name || 'Exploring'}</span>
        {spatial.nearbyTags?.length > 0 && <span>🏷️ {spatial.nearbyTags.length} nearby</span>}
        {tourData.sweeps?.length > 0 && <span>📸 {tourData.sweeps.length} views</span>}
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {chat.messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-content">{formatMessage(msg.content)}</div>
            {msg.actions?.length > 0 && (
              <div className="message-actions">
                {msg.actions.map((action, i) => (
                  <button key={i} onClick={() => matterportService.executeAction(action)} className="action-btn">
                    <Navigation size={12} />
                    {getActionButton(action)}
                  </button>
                ))}
              </div>
            )}
            <span className="message-time">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {chat.isLoading && (
          <div className="message assistant loading">
            <Loader2 className="spin" size={18} />
            <span>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        {quickActions.map((qa, i) => (
          <button key={i} onClick={() => sendMessageWithText(qa.msg)} disabled={chat.isLoading}>
            {qa.icon}
            <span>{qa.label}</span>
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about this space..."
            disabled={chat.isLoading || !isConnected}
            rows={1}
          />
          <button onClick={toggleVoice} className={`voice-btn ${isListening ? 'listening' : ''}`}>
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            {isListening && <span className="pulse-ring" />}
          </button>
          <button onClick={sendMessage} disabled={!input.trim() || chat.isLoading} className="send-btn">
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatBot;
