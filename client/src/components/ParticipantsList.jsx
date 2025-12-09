import React from 'react';
import { useTourStore } from '../store/tourStore';
import webrtcService from '../services/webrtcService';
import { User, Video, Phone, MapPin, X } from 'lucide-react';
import './ParticipantsList.css';

function ParticipantsList({ onClose }) {
  const { participants, call } = useTourStore();

  const handleVideoCall = (participant) => {
    webrtcService.startCall(participant.socketId, participant.userName, 'video');
  };

  const handleAudioCall = (participant) => {
    webrtcService.startCall(participant.socketId, participant.userName, 'audio');
  };

  return (
    <div className="participants-panel">
      <div className="participants-header">
        <h3>Participants ({participants.length})</h3>
      </div>

      <div className="participants-list">
        {participants.length === 0 ? (
          <div className="no-participants">
            <User size={32} />
            <p>No other participants yet</p>
            <span>Share the tour link to invite others</span>
          </div>
        ) : (
          participants.map((participant) => (
            <div key={participant.socketId} className="participant-item">
              <div className="participant-avatar">
                <User size={20} />
              </div>
              
              <div className="participant-info">
                <span className="participant-name">
                  {participant.userName || 'Guest'}
                </span>
                {participant.spatialData && (
                  <span className="participant-location">
                    <MapPin size={12} />
                    {participant.spatialData.currentFloor?.name || 'Exploring'}
                  </span>
                )}
              </div>

              <div className="participant-actions">
                <button 
                  onClick={() => handleVideoCall(participant)}
                  disabled={call.state !== 'idle'}
                  title="Video call"
                >
                  <Video size={16} />
                </button>
                <button 
                  onClick={() => handleAudioCall(participant)}
                  disabled={call.state !== 'idle'}
                  title="Audio call"
                >
                  <Phone size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ParticipantsList;
