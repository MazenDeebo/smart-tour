import React, { useEffect, useRef, useCallback } from 'react';
import { useTourStore } from '../../store/tourStore';
import matterportService from '../../services/matterport/matterportService';
import socketService from '../../services/socket/socketService';
import '../../static/css/MatterportViewer.css';

const SDK_KEY = import.meta.env.VITE_MATTERPORT_SDK_KEY || 'bnx9rtn9umenhf4ym8bngu7ud';
const DEFAULT_MODEL_ID = import.meta.env.VITE_DEFAULT_MODEL_ID || 'J9fEBnyKuiv';

const USE_SDK_BUNDLE = true;

interface MatterportViewerProps {
  modelId?: string;
}

function MatterportViewer({ modelId }: MatterportViewerProps): React.ReactElement {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { isSDKReady, spatial, userId, userName, spaceConfig } = useTourStore();
  const initRef = useRef<boolean>(false);
  
  const currentModelId = modelId || DEFAULT_MODEL_ID;

  const initializeSDK = useCallback(async () => {
    if (!iframeRef.current || initRef.current) return;
    initRef.current = true;

    try {
      console.log('🚀 Initializing Matterport SDK for model:', currentModelId);
      await matterportService.connect(iframeRef.current);
      
      socketService.joinTour(currentModelId, userId, userName, 'guest');
      
      socketService.initializeSession({
        id: currentModelId,
        modelId: currentModelId,
        nameEn: spaceConfig?.nameEn || 'Virtual Tour',
        type: spaceConfig?.type || 'property',
        description: spaceConfig?.description || '',
      });
      
      console.log('✅ SDK initialized successfully');
    } catch (error) {
      console.error('❌ SDK initialization failed:', error);
      initRef.current = false;
    }
  }, [userId, userName, currentModelId, spaceConfig]);

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

  useEffect(() => {
    if (!isSDKReady) return;

    const interval = setInterval(() => {
      socketService.updateSpatial(spatial);
    }, 500);

    return () => clearInterval(interval);
  }, [isSDKReady, spatial]);

  const handleIframeLoad = (): void => {
    console.log('📺 Iframe loaded');
    setTimeout(initializeSDK, 1000);
  };

  const basePath = import.meta.env.BASE_URL || '/';
  const iframeSrc = USE_SDK_BUNDLE
    ? `${basePath}bundle/showcase.html?m=${currentModelId}&applicationKey=${SDK_KEY}&play=1&qs=1&title=0&mls=2&header=0&help=0&brand=0`
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
