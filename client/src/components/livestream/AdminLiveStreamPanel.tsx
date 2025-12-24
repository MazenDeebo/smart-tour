import React, { useState, useEffect } from 'react';
import { useTourStore } from '../../store/tourStore';
import livestreamService from '../../services/livestreamService';
import matterportService from '../../services/matterportService';
import { 
  Video, VideoOff, Monitor, 
  Play, Square, Navigation, Sliders,
  Copy, Check, X, Tv, Users, ExternalLink,
  Camera, Settings
} from 'lucide-react';
import type { SpaceConfig, Position, Rotation } from '../../types';
import './AdminLiveStreamPanel.css';

interface AdminLiveStreamPanelProps {
  spaceConfig: SpaceConfig | null;
  isAdmin?: boolean;
}

interface ScreenConfig {
  position: Position;
  rotation: Rotation;
  scale: Position;
  resolution: { w: number; h: number };
}

interface TagOption {
  name: string;
  label: string;
}

function AdminLiveStreamPanel({ spaceConfig, isAdmin = false }: AdminLiveStreamPanelProps): React.ReactElement | null {
  const { mpSdk, isSDKReady, tourData } = useTourStore();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [streamTitle, setStreamTitle] = useState<string>('Live Stream');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [showPositionSettings, setShowPositionSettings] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [videoType, setVideoType] = useState<string>('none');
  const [isWebcamMode, setIsWebcamMode] = useState<boolean>(false);
  const [webcamAvailable, setWebcamAvailable] = useState<boolean>(false);
  const [selectedTag, setSelectedTag] = useState<string>('video streaming');
  
  const availableTags: TagOption[] = [
    { name: 'video streaming', label: 'Video Streaming (Meeting Room)' },
    { name: 'video streaming 2', label: 'Video Streaming 2 (TV Screen)' },
    { name: 'video streaming 3', label: 'Video Streaming 3' },
    { name: 'video streaming 4', label: 'Video Streaming 4' }
  ];
  
  const [screenConfig, setScreenConfig] = useState<ScreenConfig>({
    position: { x: -4.37, y: 1.04, z: 5.54 },
    rotation: { x: 0, y: 91 },
    scale: { x: 1.6, y: 0.975, z: 1 },
    resolution: { w: 1280, h: 720 }
  });

  const spaceId = spaceConfig?.id || 'eaac';

  useEffect(() => {
    if (mpSdk && isSDKReady) {
      livestreamService.initialize(mpSdk);
      checkExistingStream();
      livestreamService.checkWebcamAvailable().then(setWebcamAvailable);
    }
  }, [mpSdk, isSDKReady]);

  useEffect(() => {
    if (tourData) {
      livestreamService.updateSdkData({
        sweeps: tourData.sweeps,
        floors: tourData.floors,
        tags: tourData.tags,
        rooms: tourData.rooms || [],
        labels: [],
        modelName: spaceConfig?.nameEn || 'Training Center'
      });
    }
  }, [tourData, spaceConfig]);

  useEffect(() => {
    if (videoUrl) {
      const type = livestreamService.detectVideoType(videoUrl);
      setVideoType(type);
    } else {
      setVideoType('none');
    }
  }, [videoUrl]);

  const checkExistingStream = async (): Promise<void> => {
    const config = await livestreamService.fetchConfig(spaceId);
    if (config.active && (config.teamsUrl || config.videoUrl)) {
      setVideoUrl(config.teamsUrl || config.videoUrl || '');
      setStreamTitle(config.title || 'Live Stream');
      setIsStreaming(true);
      
      if (!isAdmin) {
        await createEmbed(config);
      }
    }
    if (config.whiteboard) {
      setScreenConfig(prev => ({
        ...prev,
        position: config.whiteboard.position || prev.position,
        rotation: config.whiteboard.rotation || prev.rotation,
        scale: config.whiteboard.scale || prev.scale
      }));
    }
  };

  const createEmbed = async (config: any = null): Promise<void> => {
    livestreamService.updateConfig(screenConfig);
    await livestreamService.createStreamAtVideoTag(
      config?.teamsUrl || config?.videoUrl || videoUrl,
      config?.title || streamTitle
    );
  };

  useEffect(() => {
    const tagConfig = livestreamService.getTagConfig(selectedTag);
    setScreenConfig(tagConfig);
  }, [selectedTag]);

  const startStream = async (): Promise<void> => {
    if (!videoUrl.trim()) {
      alert('Please enter a video URL (MP4, YouTube, HLS, Teams, etc.)');
      return;
    }

    setLoading(true);
    try {
      const tagConfig = livestreamService.getTagConfig(selectedTag);
      const result = await livestreamService.setLivestreamUrl(spaceId, videoUrl, streamTitle);
      
      if (result.success) {
        await livestreamService.createStreamAtTag(selectedTag, videoUrl, streamTitle);
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Failed to start stream:', error);
      alert('Failed to start stream: ' + (error as Error).message);
    }
    setLoading(false);
  };

  const stopStream = async (): Promise<void> => {
    setLoading(true);
    try {
      await livestreamService.stopLivestream(spaceId);
      await livestreamService.removeScreen();
      setIsStreaming(false);
      setIsWebcamMode(false);
    } catch (error) {
      console.error('Failed to stop stream:', error);
    }
    setLoading(false);
  };

  const startWebcam = async (): Promise<void> => {
    setLoading(true);
    try {
      await livestreamService.startWebcam(selectedTag, streamTitle || 'Live Webcam');
      setIsStreaming(true);
      setIsWebcamMode(true);
      setVideoType('webcam');
    } catch (error) {
      console.error('Failed to start webcam:', error);
      alert('Failed to start webcam: ' + (error as Error).message);
    }
    setLoading(false);
  };

  const applyConfig = async (): Promise<void> => {
    if (isStreaming) {
      setLoading(true);
      try {
        await livestreamService.removeScreen();
        await livestreamService.createScreen({
          ...screenConfig,
          videoUrl: videoUrl,
          title: streamTitle
        });
      } catch (error) {
        console.error('Failed to apply config:', error);
      }
      setLoading(false);
    }
  };

  const navigateToScreen = async (tagName: string = selectedTag): Promise<void> => {
    try {
      const tag = await livestreamService.findTagByLabel(tagName);
      
      if (tag) {
        await livestreamService.navigateToTag(tag.sid || tag.id);
        return;
      }
      
      const tagConfig = livestreamService.getTagConfig(tagName);
      const sweeps = tourData?.sweeps;
      if (sweeps && sweeps.length > 0) {
        let closestSweep = sweeps[0];
        let minDist = Infinity;
        
        sweeps.forEach(sweep => {
          if (sweep.position) {
            const dist = Math.sqrt(
              Math.pow(sweep.position.x - tagConfig.position.x, 2) +
              Math.pow(sweep.position.z - tagConfig.position.z, 2)
            );
            if (dist < minDist) {
              minDist = dist;
              closestSweep = sweep;
            }
          }
        });
        
        await matterportService.navigateToSweep(closestSweep.id);
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const copyUrl = (): void => {
    if (videoUrl) {
      navigator.clipboard.writeText(videoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openExternal = (): void => {
    if (videoUrl) {
      window.open(videoUrl, '_blank');
    }
  };

  const detectVideoTypeLocal = (): string => {
    if (!videoUrl) return 'none';
    const url = videoUrl.toLowerCase();
    if (url.match(/\.(mp4|webm|ogg|mov|avi)($|\?)/)) return 'direct';
    if (url.includes('.m3u8')) return 'hls';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('vimeo.com')) return 'vimeo';
    if (url.includes('teams.microsoft.com') || url.includes('zoom.us') || url.includes('meet.google.com')) return 'meeting';
    if (url.startsWith('rtmp://') || url.startsWith('rtsp://')) return 'rtmp';
    return 'direct';
  };

  const getVideoTypeLabel = (): string => {
    const type = detectVideoTypeLocal();
    const labels: Record<string, string> = {
      'direct': '🎬 MP4/WebM',
      'hls': '📡 HLS Stream',
      'youtube': '📺 YouTube',
      'vimeo': '🎬 Vimeo',
      'meeting': '📞 Meeting',
      'rtmp': '📡 RTMP',
      'webcam': '📹 Webcam',
      'none': '❓ Unknown'
    };
    return labels[type] || type;
  };

  const features = (spaceConfig as any)?.features as string[] | undefined;
  if (!features?.includes('live-stream')) {
    return null;
  }

  return (
    <>
      <button 
        className={`livestream-toggle ${isStreaming ? 'streaming' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={isAdmin ? 'Admin: Manage Live Stream' : 'View Live Stream'}
      >
        <Tv size={20} />
        {isStreaming && <span className="live-indicator">LIVE</span>}
      </button>

      {isOpen && (
        <div className="admin-livestream-panel">
          <div className="panel-header">
            <div className="header-title">
              <Monitor size={18} />
              <span>{isAdmin ? 'Admin: Live Stream Control' : 'Live Stream'}</span>
            </div>
            <button className="close-btn" onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="panel-content">
            <div className={`stream-status ${isStreaming ? 'active' : 'inactive'}`}>
              <div className="status-dot"></div>
              <span>{isStreaming ? `Stream Active (${getVideoTypeLabel()})` : 'No Active Stream'}</span>
            </div>

            {isAdmin ? (
              <>
                <div className="input-group">
                  <label>Screen Location (Static Coordinates)</label>
                  <div className="input-row">
                    <select
                      value={selectedTag}
                      onChange={(e) => setSelectedTag(e.target.value)}
                      disabled={isStreaming}
                    >
                      {availableTags.map(tag => (
                        <option key={tag.name} value={tag.name}>
                          {tag.label}
                        </option>
                      ))}
                    </select>
                    <button 
                      className="icon-btn" 
                      onClick={() => navigateToScreen(selectedTag)} 
                      title="Go to Screen Location"
                    >
                      <Navigation size={16} />
                    </button>
                  </div>
                </div>

                <div className="input-group">
                  <label>Stream Title</label>
                  <input
                    type="text"
                    placeholder="Live Stream"
                    value={streamTitle}
                    onChange={(e) => setStreamTitle(e.target.value)}
                    disabled={isStreaming}
                  />
                </div>

                <div className="input-group">
                  <label>Video URL (MP4, HLS, YouTube, Teams, etc.)</label>
                  <div className="input-row">
                    <input
                      type="text"
                      placeholder="https://example.com/video.mp4 or YouTube/Teams URL"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      disabled={isStreaming}
                    />
                    {videoUrl && (
                      <button className="icon-btn" onClick={copyUrl} title="Copy URL">
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    )}
                  </div>
                  {videoUrl && (
                    <small className="video-type-hint">
                      Detected: {getVideoTypeLabel()}
                    </small>
                  )}
                </div>

                <div className="stream-controls">
                  {!isStreaming ? (
                    <>
                      <button 
                        className="control-btn start"
                        onClick={startStream}
                        disabled={!videoUrl.trim() || loading}
                      >
                        <Play size={18} />
                        <span>{loading ? 'Starting...' : 'Start Stream'}</span>
                      </button>
                      {webcamAvailable && (
                        <button 
                          className="control-btn webcam"
                          onClick={startWebcam}
                          disabled={loading}
                          title="Start Webcam"
                        >
                          <Camera size={18} />
                          <span>{loading ? 'Starting...' : 'Webcam'}</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <button 
                      className="control-btn stop"
                      onClick={stopStream}
                      disabled={loading}
                    >
                      <Square size={18} />
                      <span>{loading ? 'Stopping...' : 'Stop Stream'}</span>
                    </button>
                  )}
                  
                  {isStreaming && videoUrl && (detectVideoTypeLocal() === 'youtube' || detectVideoTypeLocal() === 'meeting') && (
                    <button 
                      className="control-btn external"
                      onClick={() => window.open(videoUrl, '_blank')}
                    >
                      <ExternalLink size={18} />
                      <span>Open in Browser</span>
                    </button>
                  )}
                </div>

                <button 
                  className="settings-toggle"
                  onClick={() => setShowPositionSettings(!showPositionSettings)}
                >
                  <Sliders size={16} />
                  <span>Screen Position & Rotation</span>
                </button>

                {showPositionSettings && (
                  <div className="position-settings">
                    <h5>Position</h5>
                    <div className="position-row">
                      <label>X:</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={screenConfig.position.x}
                        onChange={(e) => setScreenConfig(prev => ({
                          ...prev,
                          position: { ...prev.position, x: parseFloat(e.target.value) || 0 }
                        }))}
                      />
                      <label>Y:</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={screenConfig.position.y}
                        onChange={(e) => setScreenConfig(prev => ({
                          ...prev,
                          position: { ...prev.position, y: parseFloat(e.target.value) || 0 }
                        }))}
                      />
                      <label>Z:</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={screenConfig.position.z}
                        onChange={(e) => setScreenConfig(prev => ({
                          ...prev,
                          position: { ...prev.position, z: parseFloat(e.target.value) || 0 }
                        }))}
                      />
                    </div>
                    
                    <h5>Rotation (degrees)</h5>
                    <div className="position-row">
                      <label>X:</label>
                      <input 
                        type="number" 
                        step="5"
                        value={screenConfig.rotation.x}
                        onChange={(e) => setScreenConfig(prev => ({
                          ...prev,
                          rotation: { ...prev.rotation, x: parseFloat(e.target.value) || 0 }
                        }))}
                      />
                      <label>Y:</label>
                      <input 
                        type="number" 
                        step="5"
                        value={screenConfig.rotation.y}
                        onChange={(e) => setScreenConfig(prev => ({
                          ...prev,
                          rotation: { ...prev.rotation, y: parseFloat(e.target.value) || 0 }
                        }))}
                      />
                    </div>
                    
                    <h5>Scale</h5>
                    <div className="position-row">
                      <label>W:</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={screenConfig.scale.x}
                        onChange={(e) => setScreenConfig(prev => ({
                          ...prev,
                          scale: { ...prev.scale, x: parseFloat(e.target.value) || 1 }
                        }))}
                      />
                      <label>H:</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={screenConfig.scale.y}
                        onChange={(e) => setScreenConfig(prev => ({
                          ...prev,
                          scale: { ...prev.scale, y: parseFloat(e.target.value) || 1 }
                        }))}
                      />
                    </div>
                    
                    {isStreaming && (
                      <button 
                        className="action-btn apply"
                        onClick={applyConfig}
                        disabled={loading}
                      >
                        <Settings size={14} />
                        <span>Apply Changes</span>
                      </button>
                    )}
                    
                    <div className="size-info">
                      <small>Resolution: {screenConfig.resolution.w} × {screenConfig.resolution.h}</small>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {isStreaming ? (
                  <div className="user-stream-info">
                    <div className="meeting-card">
                      <div className="meeting-icon">
                        <Users size={24} />
                      </div>
                      <div className="meeting-details">
                        <h4>{streamTitle}</h4>
                        <p>{getVideoTypeLabel()} in progress</p>
                      </div>
                    </div>
                    
                    {videoType === 'meeting' && (
                      <button 
                        className="action-btn primary"
                        onClick={openExternal}
                      >
                        <Video size={16} />
                        <span>Join Meeting</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="no-stream-message">
                    <VideoOff size={32} />
                    <p>No active stream at this time</p>
                    <small>Check back later or contact the administrator</small>
                  </div>
                )}
              </>
            )}

            <button 
              className="action-btn navigate"
              onClick={() => navigateToScreen()}
            >
              <Navigation size={16} />
              <span>Go to Screen</span>
            </button>

            <div className="sdk-data-panel">
              <h4>Space Data</h4>
              <div className="data-grid">
                <div className="data-item">
                  <span className="data-value">{tourData.sweeps?.length || 0}</span>
                  <span className="data-label">Views</span>
                </div>
                <div className="data-item">
                  <span className="data-value">{tourData.floors?.length || 0}</span>
                  <span className="data-label">Floors</span>
                </div>
                <div className="data-item">
                  <span className="data-value">{tourData.tags?.length || 0}</span>
                  <span className="data-label">Tags</span>
                </div>
                <div className="data-item">
                  <span className="data-value">{tourData.rooms?.length || 0}</span>
                  <span className="data-label">Rooms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminLiveStreamPanel;
