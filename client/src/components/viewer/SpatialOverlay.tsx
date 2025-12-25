import React, { useState } from 'react';
import { useTourStore } from '../../store/tourStore';
import { MapPin, Compass, Layers, Tag, Eye, CheckCircle, XCircle, Crosshair, ChevronDown, ChevronUp } from 'lucide-react';
import '../../static/css/SpatialOverlay.css';

function SpatialOverlay(): React.ReactElement {
  const { spatial, tourData, isSDKReady } = useTourStore();
  const [expanded, setExpanded] = useState<boolean>(true);

  const formatCoord = (val: number | undefined): string => val?.toFixed(2) || '0.00';
  
  const getDirection = (): string => {
    const y = spatial.rotation?.y || 0;
    const directions = [
      { min: -22.5, max: 22.5, dir: 'N' },
      { min: 22.5, max: 67.5, dir: 'NE' },
      { min: 67.5, max: 112.5, dir: 'E' },
      { min: 112.5, max: 157.5, dir: 'SE' },
      { min: -67.5, max: -22.5, dir: 'NW' },
      { min: -112.5, max: -67.5, dir: 'W' },
      { min: -157.5, max: -112.5, dir: 'SW' },
    ];
    
    for (const d of directions) {
      if (y >= d.min && y < d.max) return d.dir;
    }
    return 'S';
  };

  return (
    <div className="spatial-overlay">
      <div className="spatial-card">
        <div className="spatial-header" onClick={() => setExpanded(!expanded)}>
          <span className="header-title">
            {isSDKReady ? <CheckCircle size={12} color="#22c55e" /> : <XCircle size={12} color="#ef4444" />}
            Spatial Data
          </span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>

        {expanded && (
          <>
            <div className="spatial-item">
              <MapPin size={14} />
              <span className="label">Camera</span>
              <span className="value coords">
                X: {formatCoord(spatial.position?.x)} | Y: {formatCoord(spatial.position?.y)} | Z: {formatCoord(spatial.position?.z)}
              </span>
            </div>

            <div className="spatial-item cursor-item">
              <Crosshair size={14} />
              <span className="label">Cursor</span>
              <span className="value coords">
                X: {formatCoord(spatial.cursorPosition?.x)} | Y: {formatCoord(spatial.cursorPosition?.y)} | Z: {formatCoord(spatial.cursorPosition?.z)}
              </span>
            </div>
            
            <div className="spatial-item">
              <Compass size={14} />
              <span className="label">Direction</span>
              <span className="value">{getDirection()} ({spatial.rotation?.y?.toFixed(0) || 0}°)</span>
            </div>
            
            <div className="spatial-item">
              <Layers size={14} />
              <span className="label">Floor</span>
              <span className="value">{spatial.currentFloor || 'Floor 1'}</span>
            </div>
            
            {spatial.nearbyTags?.length > 0 && (
              <div className="spatial-item">
                <Tag size={14} />
                <span className="label">Nearby</span>
                <span className="value">{spatial.nearbyTags.length} points</span>
              </div>
            )}

            {spatial.cursorObject && (
              <div className="spatial-item">
                <Eye size={14} />
                <span className="label">Pointing at</span>
                <span className="value">{spatial.cursorObject}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="tour-stats">
        <span>{tourData.sweeps?.length || 0} views</span>
        <span>{tourData.floors?.length || 0} floors</span>
        <span>{tourData.tags?.length || 0} tags</span>
      </div>
    </div>
  );
}

export default SpatialOverlay;
