import React, { useState, useEffect, useRef } from 'react';
import { X, Volume2, VolumeX, Maximize2, Minimize2, Move } from 'lucide-react';
import './YouTubeOverlay.css';

/**
 * YouTubeOverlay - Floating YouTube player that appears over the Matterport viewer
 * This is needed because YouTube videos cannot be rendered to a 3D canvas due to iframe restrictions
 */
function YouTubeOverlay({ videoUrl, title, isVisible, onClose }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  // Extract YouTube video ID
  const extractYouTubeId = (url) => {
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

  // Handle drag start
  const handleMouseDown = (e) => {
    if (e.target.closest('.youtube-controls')) return;
    setIsDragging(true);
    const rect = containerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Handle drag move
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    const handleMouseUp = () => {
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

  // Toggle mute via YouTube API
  const toggleMute = () => {
    setIsMuted(!isMuted);
    // YouTube iframe API would be used here for actual mute control
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
      {/* Header */}
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

      {/* Video Container */}
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

      {/* Minimized indicator */}
      {isMinimized && (
        <div className="youtube-minimized-info">
          <span>▶ Playing: {title}</span>
        </div>
      )}
    </div>
  );
}

export default YouTubeOverlay;
