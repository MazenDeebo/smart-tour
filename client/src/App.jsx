import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { useTourStore } from './store/tourStore';
import socketService from './services/socketService';
import MatterportViewer from './components/MatterportViewer';
import ChatBot from './components/ChatBot';
import VideoCall from './components/VideoCall';
import IncomingCall from './components/IncomingCall';
import ControlPanel from './components/ControlPanel';
import SpatialOverlay from './components/SpatialOverlay';
import ParticipantsList from './components/ParticipantsList';
import SpaceSelector from './components/SpaceSelector';
import AdminLiveStreamPanel from './components/AdminLiveStreamPanel';
import AdminDashboard from './pages/AdminDashboard';
import ClientView from './pages/ClientView';
import { SPACES, getSpaceConfig, DEFAULT_SPACE } from './config/spaces';
import './styles/App.css';

// End User Tour View
function TourView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showChat, setShowChat] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);
  const { isConnected, isSDKReady, call, participants, setModelId, setSpaceConfig } = useTourStore();
  
  // Get space and admin mode from URL
  const spaceId = searchParams.get('space') || 'awni';
  const isAdmin = searchParams.get('admin') === 'true';
  const [currentSpace, setCurrentSpace] = useState(getSpaceConfig(spaceId) || DEFAULT_SPACE);

  useEffect(() => {
    socketService.connect();
    return () => socketService.disconnect();
  }, []);

  // Update model when space changes
  useEffect(() => {
    if (currentSpace) {
      setModelId(currentSpace.modelId);
      setSpaceConfig(currentSpace);
    }
  }, [currentSpace, setModelId, setSpaceConfig]);

  const handleSpaceChange = (newSpace) => {
    setCurrentSpace(newSpace);
    const adminParam = isAdmin ? '&admin=true' : '';
    // Force page reload to reinitialize Matterport with new model
    window.location.href = `/?space=${newSpace.id}${adminParam}`;
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
      {showChat && <ChatBot spaceConfig={currentSpace} />}
      {showParticipants && <ParticipantsList />}
      {call.state === 'ringing' && <IncomingCall />}
      {(call.state === 'active' || call.state === 'calling') && <VideoCall />}
      <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
        <span className="status-indicator" />
        <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
      </div>
      {isAdmin && (
        <div className="admin-badge">
          <span>Admin Mode</span>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter basename="/ArabIQ_matterport">
      <Routes>
        <Route path="/" element={<TourView />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/client" element={<ClientView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
