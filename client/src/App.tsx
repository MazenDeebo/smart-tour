import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { useTourStore } from './store/tourStore';
import socketService from './services/socketService';
import {
  MatterportViewer,
  SpatialOverlay,
  ChatBot,
  AdminLiveStreamPanel,
  VideoCall,
  IncomingCall,
  ControlPanel,
  SpaceSelector,
  ParticipantsList,
  YouTubeOverlay,
} from './components';
import AdminDashboard from './pages/AdminDashboard';
import ClientView from './pages/ClientView';
import { getSpaceConfig, DEFAULT_SPACE } from './config/spaces';
import type { SpaceConfig } from './types';
import './styles/App.css';

// End User Tour View
function TourView(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const [showChat, setShowChat] = useState<boolean>(true);
  const [showParticipants, setShowParticipants] = useState<boolean>(false);
  const { isConnected, isSDKReady, call, participants, setModelId, setSpaceConfig, youtubeOverlay, hideYouTubeOverlay } = useTourStore();
  
  // Get space and admin mode from URL
  const spaceId = searchParams.get('space') || 'awni';
  const isAdmin = searchParams.get('admin') === 'true';
  const [currentSpace, setCurrentSpace] = useState<SpaceConfig | null>(
    (getSpaceConfig(spaceId) as SpaceConfig | null) || DEFAULT_SPACE
  );

  // Connect to server for multi-user features
  useEffect(() => {
    socketService.connect();

    return () => {
      socketService.disconnect();
    };
  }, []);

  // Update model when space changes
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

function App(): React.ReactElement {
  const basename = import.meta.env.BASE_URL || '/';
  
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<TourView />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/client" element={<ClientView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
