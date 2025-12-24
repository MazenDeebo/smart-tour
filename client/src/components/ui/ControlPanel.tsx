import React from 'react';
import { useTourStore } from '../../store/tourStore';
import webrtcService from '../../services/webrtcService';
import { 
  MessageCircle, Users, Video, Phone, 
  Maximize, Share2
} from 'lucide-react';
import './ControlPanel.css';

interface ControlPanelProps {
  showChat: boolean;
  setShowChat: (show: boolean) => void;
  showParticipants: boolean;
  setShowParticipants: (show: boolean) => void;
  participantCount: number;
}

function ControlPanel({ showChat, setShowChat, showParticipants, setShowParticipants, participantCount }: ControlPanelProps): React.ReactElement {
  const { participants, call } = useTourStore();

  const handleVideoCall = (): void => {
    if (participants.length > 0) {
      const target = participants[0];
      webrtcService.startCall(target.socketId, target.name, 'video');
    } else {
      alert('No other participants in the tour to call');
    }
  };

  const handleAudioCall = (): void => {
    if (participants.length > 0) {
      const target = participants[0];
      webrtcService.startCall(target.socketId, target.name, 'audio');
    } else {
      alert('No other participants in the tour to call');
    }
  };

  const handleFullscreen = (): void => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleShare = async (): Promise<void> => {
    try {
      await navigator.share({
        title: 'Virtual Tour',
        text: 'Check out this virtual tour!',
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="control-panel">
      <button 
        onClick={() => setShowChat(!showChat)}
        className={`panel-btn ${showChat ? 'active' : ''}`}
        title="Toggle Chat"
      >
        <MessageCircle size={20} />
      </button>

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

      <button 
        onClick={handleVideoCall}
        className="panel-btn"
        title="Video Call"
        disabled={call.state !== 'idle'}
      >
        <Video size={20} />
      </button>

      <button 
        onClick={handleAudioCall}
        className="panel-btn"
        title="Audio Call"
        disabled={call.state !== 'idle'}
      >
        <Phone size={20} />
      </button>

      <div className="panel-divider" />

      <button 
        onClick={handleShare}
        className="panel-btn"
        title="Share"
      >
        <Share2 size={20} />
      </button>

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
