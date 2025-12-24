import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Users, MessageSquare, Eye, 
  Phone, Video, Share2, Settings, Bell,
  MapPin, Clock, Layers
} from 'lucide-react';
import './ClientView.css';

interface SpatialData {
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number };
  currentFloor?: { name: string };
}

interface Visitor {
  socketId?: string;
  id?: string;
  odId?: string;
  userName?: string;
  spatial?: SpatialData;
  joinedAt: number;
  sessionDuration?: string;
}

interface Chat {
  id: number;
  visitor: string;
  message: string;
  time: string;
}

interface Stats {
  todayVisitors: number;
  activeNow: number;
  todayChats: number;
  callRequests: number;
}

function ClientView(): React.ReactElement {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeVisitors, setActiveVisitors] = useState<Visitor[]>([]);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);

  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Client dashboard connected');
      newSocket.emit('join-as-client', { role: 'client' });
    });

    newSocket.on('visitors-update', (visitors: Visitor[]) => {
      setActiveVisitors(visitors.map(v => ({
        ...v,
        sessionDuration: formatDuration(Date.now() - v.joinedAt)
      })));
    });

    newSocket.on('visitor-spatial-update', ({ odId, spatialData }: { odId: string; spatialData: SpatialData }) => {
      setActiveVisitors(prev => prev.map(v => 
        v.odId === odId ? { ...v, spatial: spatialData } : v
      ));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveVisitors(prev => prev.map(v => ({
        ...v,
        sessionDuration: formatDuration(Date.now() - v.joinedAt)
      })));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatCoord = (val: number | undefined): string => val?.toFixed(2) || '0.00';

  const [recentChats] = useState<Chat[]>([
    { id: 1, visitor: 'Visitor #1042', message: 'What brands do you carry?', time: '2 min ago' },
    { id: 2, visitor: 'Visitor #1043', message: 'Do you have washing machines?', time: '5 min ago' },
  ]);

  const [stats] = useState<Stats>({
    todayVisitors: 45,
    activeNow: 3,
    todayChats: 12,
    callRequests: 2
  });

  const handleJoinVisitor = (visitorId: string | undefined): void => {
    window.open(`/?join=${visitorId}`, '_blank');
  };

  const handleCallVisitor = (visitorId: string | undefined, type: string): void => {
    alert(`Initiating ${type} call with visitor...`);
  };

  return (
    <div className="client-view">
      <header className="client-header">
        <div className="header-left">
          <h1>مؤسسة عوني للاجهزه الكهربائي</h1>
          <span className="status-badge online">Tour Active</span>
        </div>
        <div className="header-right">
          <button className="icon-btn">
            <Bell size={20} />
            <span className="notification-dot"></span>
          </button>
          <button className="icon-btn">
            <Settings size={20} />
          </button>
          <a href="/" target="_blank" className="btn btn-primary">
            <Eye size={16} />
            View Tour
          </a>
        </div>
      </header>

      <div className="stats-bar">
        <div className="stat-item">
          <Users size={20} />
          <div>
            <span className="stat-value">{stats.todayVisitors}</span>
            <span className="stat-label">Today's Visitors</span>
          </div>
        </div>
        <div className="stat-item highlight">
          <div className="pulse-dot"></div>
          <div>
            <span className="stat-value">{stats.activeNow}</span>
            <span className="stat-label">Active Now</span>
          </div>
        </div>
        <div className="stat-item">
          <MessageSquare size={20} />
          <div>
            <span className="stat-value">{stats.todayChats}</span>
            <span className="stat-label">Chats Today</span>
          </div>
        </div>
        <div className="stat-item">
          <Phone size={20} />
          <div>
            <span className="stat-value">{stats.callRequests}</span>
            <span className="stat-label">Call Requests</span>
          </div>
        </div>
      </div>

      <div className="client-content">
        <div className="panel visitors-panel">
          <div className="panel-header">
            <h2><Users size={18} /> Active Visitors</h2>
            <span className="count">{activeVisitors.length}</span>
          </div>
          <div className="visitors-list">
            {activeVisitors.map(visitor => (
              <div 
                key={visitor.socketId || visitor.id} 
                className={`visitor-card ${selectedVisitor?.socketId === visitor.socketId ? 'selected' : ''}`}
                onClick={() => setSelectedVisitor(visitor)}
              >
                <div className="visitor-info">
                  <div className="visitor-avatar">
                    <div className="online-indicator"></div>
                  </div>
                  <div>
                    <span className="visitor-name">{visitor.userName || `Visitor #${visitor.odId?.slice(-4) || '0000'}`}</span>
                    <span className="visitor-location">
                      <Layers size={10} /> {visitor.spatial?.currentFloor?.name || 'Floor 1'}
                    </span>
                  </div>
                </div>
                <div className="visitor-meta">
                  <div className="visitor-time">
                    <Clock size={12} />
                    {visitor.sessionDuration || '0s'}
                  </div>
                  <div className="visitor-coords">
                    <MapPin size={12} />
                    {formatCoord(visitor.spatial?.position?.x)}, {formatCoord(visitor.spatial?.position?.z)}
                  </div>
                </div>
                <div className="visitor-actions">
                  <button 
                    className="action-btn"
                    onClick={(e) => { e.stopPropagation(); handleJoinVisitor(visitor.socketId); }}
                    title="Join Tour"
                  >
                    <Eye size={16} />
                  </button>
                  <button 
                    className="action-btn"
                    onClick={(e) => { e.stopPropagation(); handleCallVisitor(visitor.socketId, 'audio'); }}
                    title="Audio Call"
                  >
                    <Phone size={16} />
                  </button>
                  <button 
                    className="action-btn"
                    onClick={(e) => { e.stopPropagation(); handleCallVisitor(visitor.socketId, 'video'); }}
                    title="Video Call"
                  >
                    <Video size={16} />
                  </button>
                </div>
              </div>
            ))}
            {activeVisitors.length === 0 && (
              <div className="empty-state">
                <Users size={32} />
                <p>No active visitors right now</p>
              </div>
            )}
          </div>

          {selectedVisitor && (
            <div className="visitor-details">
              <h4>Visitor Details</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Position</span>
                  <span className="detail-value">
                    X: {formatCoord(selectedVisitor.spatial?.position?.x)}<br/>
                    Y: {formatCoord(selectedVisitor.spatial?.position?.y)}<br/>
                    Z: {formatCoord(selectedVisitor.spatial?.position?.z)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Looking</span>
                  <span className="detail-value">
                    {selectedVisitor.spatial?.rotation?.y?.toFixed(0) || 0}°
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Floor</span>
                  <span className="detail-value">
                    {selectedVisitor.spatial?.currentFloor?.name || 'Floor 1'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Session</span>
                  <span className="detail-value">{selectedVisitor.sessionDuration}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="panel preview-panel">
          <div className="panel-header">
            <h2><Eye size={18} /> Live Tour Preview</h2>
            <button className="btn btn-secondary btn-sm">
              <Share2 size={14} /> Share Link
            </button>
          </div>
          <div className="tour-preview">
            <iframe
              src="https://my.matterport.com/show?m=J9fEBnyKuiv&play=1&qs=1"
              title="Tour Preview"
            />
          </div>
        </div>

        <div className="panel chats-panel">
          <div className="panel-header">
            <h2><MessageSquare size={18} /> Recent Chats</h2>
          </div>
          <div className="chats-list">
            {recentChats.map(chat => (
              <div key={chat.id} className="chat-item">
                <div className="chat-avatar">V</div>
                <div className="chat-content">
                  <div className="chat-header">
                    <span className="chat-visitor">{chat.visitor}</span>
                    <span className="chat-time">{chat.time}</span>
                  </div>
                  <p className="chat-message">{chat.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClientView;
