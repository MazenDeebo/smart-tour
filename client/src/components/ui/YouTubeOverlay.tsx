import React, { useState, useEffect, useRef } from 'react';
import { X, Volume2, VolumeX, Maximize2, Minimize2, Move } from 'lucide-react';
import './YouTubeOverlay.css';

interface YouTubeOverlayProps {
  videoUrl: string;
  title: string;
  isVisible: boolean;
  onClose: () => void;
}

/**
 * YouTubeOverlay - Floating YouTube player that appears over the Matterport viewer
 * This is needed because YouTube videos cannot be rendered to a 3D canvas due to iframe restrictions
 */
function YouTubeOverlay({ videoUrl, title, isVisible, onClose }: YouTubeOverlayProps): React.ReactElement | null {
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 50, y: 100 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLIFrameElement>(null);

  const extractYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
      /youtube\.com\/embed\/([^?&\s]+)/,
      /youtube\.com\/v\/([^?&\s]+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const videoId = extractYouTubeId(videoUrl);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    const target = e.target as HTMLElement;
    if (target.closest('.youtube-controls')) return;
    setIsDragging(true);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    const handleMouseUp = (): void => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const toggleMute = (): void => {
    setIsMuted(!isMuted);
  };

  if (!isVisible || !videoId) return null;

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${isMuted ? 1 : 0}&enablejsapi=1&rel=0`;

  return (
    <div
      ref={containerRef}
      className={`youtube-overlay ${isMinimized ? 'minimized' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      <div className="youtube-header">
        <div className="youtube-title">
          <Move size={14} className="drag-icon" />
          <span>{title || 'YouTube Video'}</span>
        </div>
        <div className="youtube-controls">
          <button onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button onClick={() => setIsMinimized(!isMinimized)} title={isMinimized ? 'Expand' : 'Minimize'}>
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button onClick={onClose} title="Close" className="close-btn">
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="youtube-video-container">
          <iframe
            ref={playerRef}
            src={embedUrl}
            title={title || 'YouTube Video'}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {isMinimized && (
        <div className="youtube-minimized-info">
          <span>▶ Playing: {title}</span>
        </div>
      )}
    </div>
  );
}

export default YouTubeOverlay;
