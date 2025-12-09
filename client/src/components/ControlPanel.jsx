import React from 'react';
import { useTourStore } from '../store/tourStore';
import webrtcService from '../services/webrtcService';
import { 
  MessageCircle, Users, Video, Phone, 
  Maximize, Settings, Share2, Map
} from 'lucide-react';
import './ControlPanel.css';

function ControlPanel({ showChat, setShowChat, showParticipants, setShowParticipants, participantCount }) {
  const { participants, call } = useTourStore();

  const handleVideoCall = () => {
    if (participants.length > 0) {
      const target = participants[0];
      webrtcService.startCall(target.socketId, target.userName, 'video');
    } else {
      alert('No other participants in the tour to call');
    }
  };

  const handleAudioCall = () => {
    if (participants.length > 0) {
      const target = participants[0];
      webrtcService.startCall(target.socketId, target.userName, 'audio');
    } else {
      alert('No other participants in the tour to call');
    }
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'Virtual Tour',
        text: 'Check out this virtual tour!',
        url: window.location.href,
      });
    } catch (e) {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="control-panel">
      {/* Chat Toggle */}
      <button 
        onClick={() => setShowChat(!showChat)}
        className={`panel-btn ${showChat ? 'active' : ''}`}
        title="Toggle Chat"
      >
        <MessageCircle size={20} />
      </button>

      {/* Participants */}
      <button 
        onClick={() => setShowParticipants(!showParticipants)}
        className={`panel-btn ${showParticipants ? 'active' : ''}`}
        title="Participants"
      >
        <Users size={20} />
        {participantCount > 0 && (
          <span className="badge">{participantCount}</span>
        )}
      </button>

      <div className="panel-divider" />

      {/* Video Call */}
      <button 
        onClick={handleVideoCall}
        className="panel-btn"
        title="Video Call"
        disabled={call.state !== 'idle'}
      >
        <Video size={20} />
      </button>

      {/* Audio Call */}
      <button 
        onClick={handleAudioCall}
        className="panel-btn"
        title="Audio Call"
        disabled={call.state !== 'idle'}
      >
        <Phone size={20} />
      </button>

      <div className="panel-divider" />

      {/* Share */}
      <button 
        onClick={handleShare}
        className="panel-btn"
        title="Share"
      >
        <Share2 size={20} />
      </button>

      {/* Fullscreen */}
      <button 
        onClick={handleFullscreen}
        className="panel-btn"
        title="Fullscreen"
      >
        <Maximize size={20} />
      </button>
    </div>
  );
}

export default ControlPanel;
