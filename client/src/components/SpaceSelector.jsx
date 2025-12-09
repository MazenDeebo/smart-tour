import React, { useState } from 'react';
import { useTourStore } from '../store/tourStore';
import { getAllSpaces } from '../config/spaces';
import { Building2, ChevronDown, Check, MapPin, Tv, MessageSquare } from 'lucide-react';
import './SpaceSelector.css';

function SpaceSelector({ currentSpace, onSpaceChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const spaces = getAllSpaces();

  const handleSelect = (space) => {
    if (space.id !== currentSpace?.id) {
      onSpaceChange(space);
    }
    setIsOpen(false);
  };

  const getFeatureIcons = (features) => {
    const icons = [];
    if (features?.includes('live-stream')) {
      icons.push(<Tv key="tv" size={12} title="Live Stream" />);
    }
    if (features?.includes('chatbot')) {
      icons.push(<MessageSquare key="chat" size={12} title="AI Chatbot" />);
    }
    return icons;
  };

  return (
    <div className="space-selector">
      <button 
        className="selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Building2 size={18} />
        <div className="current-space">
          <span className="space-name">{currentSpace?.nameEn || 'Select Space'}</span>
          <span className="space-type">{currentSpace?.type || ''}</span>
        </div>
        <ChevronDown size={18} className={`chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="selector-dropdown">
          <div className="dropdown-header">
            <MapPin size={14} />
            <span>Available Spaces</span>
          </div>
          
          <div className="spaces-list">
            {spaces.map((space) => (
              <button
                key={space.id}
                className={`space-option ${space.id === currentSpace?.id ? 'active' : ''}`}
                onClick={() => handleSelect(space)}
              >
                <div className="space-info">
                  <span className="space-option-name">{space.nameEn}</span>
                  <span className="space-option-arabic">{space.name}</span>
                  <span className="space-option-type">{space.type}</span>
                </div>
                <div className="space-features">
                  {getFeatureIcons(space.features)}
                </div>
                {space.id === currentSpace?.id && (
                  <Check size={16} className="check-icon" />
                )}
              </button>
            ))}
          </div>

          <div className="dropdown-footer">
            <span>{spaces.length} spaces available</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default SpaceSelector;
