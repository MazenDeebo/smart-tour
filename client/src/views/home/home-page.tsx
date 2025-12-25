import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTourStore } from '../../store/tourStore';
import socketService from '../../services/socket/socketService';
import { MatterportViewer } from '../../components/viewer';
import { SpatialOverlay } from '../../components/viewer';
import { ChatBot } from '../../components/chat';
import { AdminLiveStreamPanel } from '../../components/livestream';
import { VideoCall, IncomingCall } from '../../components/call';
import { ControlPanel } from '../../components/controls';
import { SpaceSelector } from '../../components/space-selector';
import { ParticipantsList } from '../../components/participants';
import { YouTubeOverlay } from '../../components/youtube';
import { getSpaceConfig, DEFAULT_SPACE } from '../../models/spaces';
import type { SpaceConfig } from '../../types.d';

export function HomePage(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const [showChat, setShowChat] = useState<boolean>(true);
  const [showParticipants, setShowParticipants] = useState<boolean>(false);
  const { 
    isConnected, 
    isSDKReady, 
    call, 
    participants, 
    setModelId, 
    setSpaceConfig, 
    youtubeOverlay, 
    hideYouTubeOverlay 
  } = useTourStore();

  const spaceId = searchParams.get('space') || 'awni';
  const isAdmin = searchParams.get('admin') === 'true';
  const [currentSpace, setCurrentSpace] = useState<SpaceConfig | null>(
    (getSpaceConfig(spaceId) as SpaceConfig | null) || DEFAULT_SPACE
  );

  useEffect(() => {
    socketService.connect();
    return () => {
      socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    if (currentSpace) {
      setModelId(currentSpace.modelId);
      setSpaceConfig(currentSpace);
    }
  }, [currentSpace, setModelId, setSpaceConfig]);

  const handleSpaceChange = (newSpace: SpaceConfig): void => {
    setCurrentSpace(newSpace);
    const adminParam = isAdmin ? '&admin=true' : '';
    const basePath = import.meta.env.BASE_URL || '/';
    window.location.href = `${basePath}?space=${newSpace.id}${adminParam}`;
  };

  return (
    <div className="app">
      <SpaceSelector 
        currentSpace={currentSpace} 
        onSpaceChange={handleSpaceChange} 
      />
      <MatterportViewer modelId={currentSpace?.modelId} />
      {isSDKReady && <SpatialOverlay />}
      {isSDKReady && <AdminLiveStreamPanel spaceConfig={currentSpace} isAdmin={isAdmin} />}
      <ControlPanel 
        showChat={showChat} 
        setShowChat={setShowChat}
        showParticipants={showParticipants}
        setShowParticipants={setShowParticipants}
        participantCount={participants.length}
      />
      {showChat && <ChatBot />}
      {showParticipants && <ParticipantsList />}
      {call.state === 'ringing' && <IncomingCall />}
      {(call.state === 'active' || call.state === 'calling') && <VideoCall />}
      <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
        <span className="status-indicator" />
        <span>{isConnected ? 'Connected' : 'Ready'}</span>
      </div>
      {isAdmin && (
        <div className="admin-badge">
          <span>Admin Mode</span>
        </div>
      )}
      <YouTubeOverlay 
        videoUrl={youtubeOverlay.videoUrl}
        title={youtubeOverlay.title}
        isVisible={youtubeOverlay.isVisible}
        onClose={hideYouTubeOverlay}
      />
    </div>
  );
}

export default HomePage;
