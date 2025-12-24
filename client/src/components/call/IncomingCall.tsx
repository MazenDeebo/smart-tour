import React from 'react';
import { useTourStore } from '../../store/tourStore';
import webrtcService from '../../services/webrtcService';
import { Phone, PhoneOff, Video, User } from 'lucide-react';
import './IncomingCall.css';

function IncomingCall(): React.ReactElement {
  const { call } = useTourStore();

  return (
    <div className="incoming-call-overlay">
      <div className="incoming-call-modal">
        <div className="caller-avatar">
          {call.type === 'video' ? <Video size={36} /> : <User size={36} />}
        </div>
        
        <h3>{call.remoteUser?.name || 'Someone'}</h3>
        <p>Incoming {call.type} call...</p>

        <div className="incoming-call-type">
          {call.type === 'video' ? (
            <><Video size={16} /> Video Call</>
          ) : (
            <><Phone size={16} /> Audio Call</>
          )}
        </div>

        <div className="call-actions">
          <button 
            onClick={() => webrtcService.rejectCall()} 
            className="reject-btn"
            title="Decline"
          >
            <PhoneOff size={28} />
          </button>
          <button 
            onClick={() => webrtcService.acceptCall()} 
            className="accept-btn"
            title="Accept"
          >
            <Phone size={28} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default IncomingCall;
