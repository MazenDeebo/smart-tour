import React, { useEffect, useRef, useCallback } from 'react';
import { useTourStore } from '../store/tourStore';
import matterportService from '../services/matterportService';
import socketService from '../services/socketService';
import './MatterportViewer.css';

const SDK_KEY = import.meta.env.VITE_MATTERPORT_SDK_KEY || 'bnx9rtn9umenhf4ym8bngu7ud';
const DEFAULT_MODEL_ID = import.meta.env.VITE_DEFAULT_MODEL_ID || 'J9fEBnyKuiv';

  // Use SDK Bundle for Scene API support (3D objects, canvas renderer, etc.)
const USE_SDK_BUNDLE = true;

function MatterportViewer({ modelId }) {
  const iframeRef = useRef(null);
  const { isSDKReady, spatial, userId, userName, spaceConfig } = useTourStore();
  const initRef = useRef(false);
  
  // Use prop modelId or fall back to default
  const currentModelId = modelId || DEFAULT_MODEL_ID;

  const initializeSDK = useCallback(async () => {
    if (!iframeRef.current || initRef.current) return;
    initRef.current = true;

    try {
      console.log('🚀 Initializing Matterport SDK for model:', currentModelId);
      await matterportService.connect(iframeRef.current);
      
      // Join tour room
      socketService.joinTour(currentModelId, userId, userName, 'guest');
      
      // Initialize AI session with space config
      socketService.initializeSession({
        spaceId: currentModelId,
        spaceName: spaceConfig?.nameEn || 'Virtual Tour',
        spaceType: spaceConfig?.type || 'property',
        spaceInfo: {
          description: spaceConfig?.description || '',
          features: spaceConfig?.features || [],
          sections: spaceConfig?.sections || [],
        }
      });
      
      console.log('✅ SDK initialized successfully');
    } catch (error) {
      console.error('❌ SDK initialization failed:', error);
      initRef.current = false;
    }
  }, [userId, userName, currentModelId, spaceConfig]);

  // Load SDK script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://static.matterport.com/showcase-sdk/latest.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      matterportService.disconnect();
    };
  }, []);

  // Broadcast spatial updates
  useEffect(() => {
    if (!isSDKReady) return;

    const interval = setInterval(() => {
      socketService.updateSpatial(spatial);
    }, 500);

    return () => clearInterval(interval);
  }, [isSDKReady, spatial]);

  const handleIframeLoad = () => {
    console.log('📺 Iframe loaded');
    setTimeout(initializeSDK, 1000);
  };

  // Build iframe URL
  // Use SDK Bundle (local) for Scene API support, or hosted version for basic SDK
  const iframeSrc = USE_SDK_BUNDLE
    ? `/bundle/showcase.html?m=${currentModelId}&applicationKey=${SDK_KEY}&play=1&qs=1&title=0&mls=2&header=0&help=0&brand=0`
    : `https://my.matterport.com/show?m=${currentModelId}&play=1&qs=1&applicationKey=${SDK_KEY}&title=0&mls=2&header=0&help=0&brand=0`;

  return (
    <div className="matterport-viewer">
      <iframe
        ref={iframeRef}
        id="matterport-iframe"
        src={iframeSrc}
        title="Matterport Virtual Tour"
        allow="fullscreen; vr; xr; gyroscope; accelerometer"
        allowFullScreen
        onLoad={handleIframeLoad}
      />
      
      {!isSDKReady && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p>Loading Virtual Tour...</p>
          <small style={{color: '#666', marginTop: '10px'}}>
            {spaceConfig?.nameEn || 'Virtual Tour'} ({currentModelId})
          </small>
        </div>
      )}
    </div>
  );
}

export default MatterportViewer;
