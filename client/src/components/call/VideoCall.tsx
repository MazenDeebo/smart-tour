import React, { useEffect, useRef } from 'react';
import { useTourStore } from '../../store/tourStore';
import webrtcService from '../../services/webrtcService';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Loader2 } from 'lucide-react';
import './VideoCall.css';

function VideoCall(): React.ReactElement {
  const { call } = useTourStore();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && call.localStream) {
      localVideoRef.current.srcObject = call.localStream;
    }
  }, [call.localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && call.remoteStream) {
      remoteVideoRef.current.srcObject = call.remoteStream;
    }
  }, [call.remoteStream]);

  const isConnecting = call.state === 'calling';

  return (
    <div className="video-call-overlay">
      <div className="video-container">
        {isConnecting ? (
          <div className="connecting-state">
            <Loader2 className="spin" size={48} />
            <p>Calling {call.remoteUser?.name || 'User'}...</p>
          </div>
        ) : (
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="remote-video" 
          />
        )}
        
        {call.localStream && (
          <div className="local-video-wrapper">
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className="local-video" 
            />
            {call.isVideoOff && (
              <div className="video-off-overlay">
                <VideoOff size={24} />
              </div>
            )}
          </div>
        )}

        <div className="call-info">
          <span className="caller-name">{call.remoteUser?.name || 'User'}</span>
          <span className="call-status">
            {isConnecting ? 'Calling...' : 'Connected'}
          </span>
        </div>

        <div className="call-controls">
          <button 
            onClick={() => webrtcService.toggleAudio()}
            className={`control-btn ${call.isMuted ? 'off' : ''}`}
            title={call.isMuted ? 'Unmute' : 'Mute'}
          >
            {call.isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          {call.type === 'video' && (
            <button 
              onClick={() => webrtcService.toggleVideo()}
              className={`control-btn ${call.isVideoOff ? 'off' : ''}`}
              title={call.isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              {call.isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
            </button>
          )}

          <button 
            onClick={() => webrtcService.endCall()} 
            className="control-btn end-call"
            title="End call"
          >
            <PhoneOff size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default VideoCall;
