import React, { useState } from 'react';
import { useTourStore } from '../../store/tourStore';
import matterportService from '../../services/matterport/matterportService';
import { 
  VideoOff, Monitor, ExternalLink, 
  Play, Settings, Maximize2,
  Copy, Check, X, Tv, Navigation
} from 'lucide-react';
import type { SpaceConfig, Position } from '../../types.d';
import '../../static/css/LiveStreamPanel.css';

interface LiveStreamPanelProps {
  spaceConfig: SpaceConfig | null;
}

interface StreamConfig {
  position: Position;
  rotation: Position;
  scale: Position;
}

function LiveStreamPanel({ spaceConfig }: LiveStreamPanelProps): React.ReactElement | null {
  const { tourData } = useTourStore();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [teamsUrl, setTeamsUrl] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [embedId, setEmbedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [scanNumber, setScanNumber] = useState<number>(10);

  const [streamConfig, setStreamConfig] = useState<StreamConfig>({
    position: { x: 0, y: 1.5, z: 2 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1.8, y: 1.0, z: 0.01 }
  });

  const startStream = async (): Promise<void> => {
    if (!teamsUrl.trim()) {
      alert('Please enter a Microsoft Teams meeting URL');
      return;
    }

    try {
      if (embedId) {
        await matterportService.removeHtmlEmbed(embedId);
      }

      const newEmbedId = await matterportService.createHtmlLivestream({
        position: streamConfig.position,
        rotation: streamConfig.rotation,
        scale: streamConfig.scale,
        streamUrl: teamsUrl,
        type: 'teams'
      });

      if (newEmbedId) {
        setEmbedId(newEmbedId);
        setIsStreaming(true);
        console.log('🎬 Teams stream started at Scan', scanNumber);
      }
    } catch (error) {
      console.error('Failed to start stream:', error);
      alert('Failed to start stream. Please check the URL and try again.');
    }
  };

  const stopStream = async (): Promise<void> => {
    if (embedId) {
      await matterportService.removeHtmlEmbed(embedId);
      setEmbedId(null);
    }
    setIsStreaming(false);
    setTeamsUrl('');
  };

  const navigateToStream = async (): Promise<void> => {
    try {
      await matterportService.navigateToScan(scanNumber);
    } catch (error) {
      console.error('Failed to navigate:', error);
    }
  };

  const copyMeetingLink = (): void => {
    if (teamsUrl) {
      navigator.clipboard.writeText(teamsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openTeamsExternal = (): void => {
    if (teamsUrl) {
      window.open(teamsUrl, '_blank');
    }
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
        title="Live Stream"
      >
        <Tv size={20} />
        {isStreaming && <span className="live-indicator">LIVE</span>}
      </button>

      {isOpen && (
        <div className="livestream-panel">
          <div className="livestream-header">
            <div className="header-title">
              <Monitor size={18} />
              <span>Microsoft Teams Live Stream</span>
            </div>
            <button className="close-btn" onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="livestream-content">
            <div className={`stream-status ${isStreaming ? 'active' : 'inactive'}`}>
              <div className="status-dot"></div>
              <span>{isStreaming ? 'Stream Active' : 'No Active Stream'}</span>
            </div>

            <div className="url-input-group">
              <label>Target Scan Location</label>
              <div className="input-row">
                <select 
                  value={scanNumber}
                  onChange={(e) => setScanNumber(parseInt(e.target.value))}
                  disabled={isStreaming}
                  className="scan-select"
                >
                  {tourData.sweeps?.map((sweep, index) => (
                    <option key={sweep.id} value={index + 1}>
                      Scan {index + 1} {index === 9 ? '(Meeting Room)' : ''}
                    </option>
                  ))}
                </select>
                <button 
                  className="icon-btn"
                  onClick={navigateToStream}
                  title="Go to Scan"
                >
                  <Navigation size={16} />
                </button>
              </div>
            </div>

            <div className="url-input-group">
              <label>Teams Meeting URL</label>
              <div className="input-row">
                <input
                  type="text"
                  placeholder="https://teams.microsoft.com/l/meetup-join/..."
                  value={teamsUrl}
                  onChange={(e) => setTeamsUrl(e.target.value)}
                  disabled={isStreaming}
                />
                {teamsUrl && (
                  <button 
                    className="icon-btn"
                    onClick={copyMeetingLink}
                    title="Copy URL"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                )}
              </div>
            </div>

            <div className="quick-actions">
              <button 
                className="action-btn primary"
                onClick={navigateToStream}
                title="Go to Selected Scan"
              >
                <Maximize2 size={16} />
                <span>Go to Scan {scanNumber}</span>
              </button>
              
              {teamsUrl && (
                <button 
                  className="action-btn"
                  onClick={openTeamsExternal}
                  title="Open in Teams"
                >
                  <ExternalLink size={16} />
                  <span>Open in Teams</span>
                </button>
              )}
            </div>

            <div className="stream-controls">
              {!isStreaming ? (
                <button 
                  className="control-btn start"
                  onClick={startStream}
                  disabled={!teamsUrl.trim()}
                >
                  <Play size={18} />
                  <span>Start Stream in 3D Space</span>
                </button>
              ) : (
                <button 
                  className="control-btn stop"
                  onClick={stopStream}
                >
                  <VideoOff size={18} />
                  <span>Stop Stream</span>
                </button>
              )}
            </div>

            <div className="stream-info">
              <h4>How it works:</h4>
              <ol>
                <li>Paste your Teams meeting URL above</li>
                <li>Click "Start Stream in 3D Space"</li>
                <li>Navigate to the Meeting Room (Scan 10)</li>
                <li>The stream will appear on the conference room TV</li>
              </ol>
            </div>

            {showSettings && (
              <div className="position-settings">
                <h4>Stream Position in 3D Space</h4>
                <div className="position-inputs">
                  <label>
                    X: <input 
                      type="number" 
                      step="0.1" 
                      value={streamConfig.position.x}
                      onChange={(e) => setStreamConfig(prev => ({
                        ...prev,
                        position: { ...prev.position, x: parseFloat(e.target.value) }
                      }))}
                    />
                  </label>
                  <label>
                    Y: <input 
                      type="number" 
                      step="0.1" 
                      value={streamConfig.position.y}
                      onChange={(e) => setStreamConfig(prev => ({
                        ...prev,
                        position: { ...prev.position, y: parseFloat(e.target.value) }
                      }))}
                    />
                  </label>
                  <label>
                    Z: <input 
                      type="number" 
                      step="0.1" 
                      value={streamConfig.position.z}
                      onChange={(e) => setStreamConfig(prev => ({
                        ...prev,
                        position: { ...prev.position, z: parseFloat(e.target.value) }
                      }))}
                    />
                  </label>
                </div>
                <h4>Scale</h4>
                <div className="position-inputs">
                  <label>
                    W: <input 
                      type="number" 
                      step="0.1" 
                      value={streamConfig.scale.x}
                      onChange={(e) => setStreamConfig(prev => ({
                        ...prev,
                        scale: { ...prev.scale, x: parseFloat(e.target.value) }
                      }))}
                    />
                  </label>
                  <label>
                    H: <input 
                      type="number" 
                      step="0.1" 
                      value={streamConfig.scale.y}
                      onChange={(e) => setStreamConfig(prev => ({
                        ...prev,
                        scale: { ...prev.scale, y: parseFloat(e.target.value) }
                      }))}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="livestream-footer">
            <button 
              className="settings-btn"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings size={14} />
              <span>Settings</span>
            </button>
            <span className="footer-info">
              Powered by Matterport SDK
            </span>
          </div>
        </div>
      )}
    </>
  );
}

export default LiveStreamPanel;
