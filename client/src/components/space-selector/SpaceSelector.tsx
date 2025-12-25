import React, { useState } from 'react';
import { getAllSpaces } from '../../models/spaces';
import { Building2, ChevronDown, Check, MapPin, Tv, MessageSquare } from 'lucide-react';
import type { SpaceConfig } from '../../types.d';
import '../../static/css/SpaceSelector.css';

interface SpaceSelectorProps {
  currentSpace: SpaceConfig | null;
  onSpaceChange: (space: SpaceConfig) => void;
}

interface ExtendedSpace {
  id: string;
  name: string;
  nameEn: string;
  type: string;
  features?: string[];
}

function SpaceSelector({ currentSpace, onSpaceChange }: SpaceSelectorProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const spaces = getAllSpaces() as ExtendedSpace[];

  const handleSelect = (space: ExtendedSpace): void => {
    if (space.id !== currentSpace?.id) {
      onSpaceChange(space as unknown as SpaceConfig);
    }
    setIsOpen(false);
  };

  const getFeatureIcons = (features: string[] | undefined): React.ReactElement[] => {
    const icons: React.ReactElement[] = [];
    if (features?.includes('live-stream')) {
      icons.push(<Tv key="tv" size={12} aria-label="Live Stream" />);
    }
    if (features?.includes('chatbot')) {
      icons.push(<MessageSquare key="chat" size={12} aria-label="AI Chatbot" />);
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
