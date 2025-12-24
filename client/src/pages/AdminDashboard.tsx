import React, { useState } from 'react';
import { 
  Settings, Users, MessageSquare, BarChart3, 
  Home, Save, Plus, Trash2, Edit2, Eye,
  Globe, Bot, Mic, Video, Map
} from 'lucide-react';
import './AdminDashboard.css';

interface Space {
  id: string;
  name: string;
  type: string;
  status: string;
  visitors: number;
  chats: number;
}

interface SpaceConfig {
  spaceName: string;
  spaceType: string;
  description: string;
  language: string;
  aiPersonality: string;
  features: Record<string, boolean>;
  customPrompt: string;
}

interface Stats {
  totalVisitors: number;
  activeUsers: number;
  totalChats: number;
  avgSessionTime: string;
}

interface Tab {
  id: string;
  label: string;
  icon: React.ReactElement;
}

function AdminDashboard(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<string>('spaces');
  const [spaces] = useState<Space[]>([
    {
      id: 'J9fEBnyKuiv',
      name: 'مؤسسة عوني للاجهزه الكهربائي',
      type: 'retail',
      status: 'active',
      visitors: 156,
      chats: 42
    }
  ]);
  
  const [spaceConfig, setSpaceConfig] = useState<SpaceConfig>({
    spaceName: 'مؤسسة عوني للاجهزه الكهربائي',
    spaceType: 'retail',
    description: 'Electronics and appliances store',
    language: 'ar',
    aiPersonality: 'friendly',
    features: {
      chat: true,
      voiceInput: true,
      videoCalls: true,
      guidedTours: true,
      measurements: true
    },
    customPrompt: ''
  });

  const [stats] = useState<Stats>({
    totalVisitors: 1250,
    activeUsers: 12,
    totalChats: 342,
    avgSessionTime: '4:32'
  });

  const tabs: Tab[] = [
    { id: 'spaces', label: 'Spaces', icon: <Home size={18} /> },
    { id: 'config', label: 'Configuration', icon: <Settings size={18} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { id: 'users', label: 'Users', icon: <Users size={18} /> },
    { id: 'chat-logs', label: 'Chat Logs', icon: <MessageSquare size={18} /> },
  ];

  const handleSaveConfig = (): void => {
    alert('Configuration saved!');
  };

  const featuresList = [
    { key: 'chat', label: 'AI Chat', icon: <MessageSquare size={20} /> },
    { key: 'voiceInput', label: 'Voice Input', icon: <Mic size={20} /> },
    { key: 'videoCalls', label: 'Video Calls', icon: <Video size={20} /> },
    { key: 'guidedTours', label: 'Guided Tours', icon: <Map size={20} /> },
    { key: 'measurements', label: 'Measurements', icon: <Settings size={20} /> },
  ];

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <Globe size={24} />
          <span>Tour Admin</span>
        </div>
        
        <nav className="admin-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-user">
          <div className="user-avatar">A</div>
          <div className="user-info">
            <span className="user-name">Admin</span>
            <span className="user-role">Administrator</span>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>{tabs.find(t => t.id === activeTab)?.label}</h1>
          <div className="header-actions">
            <a href="/" target="_blank" className="btn btn-secondary">
              <Eye size={16} />
              View Tour
            </a>
          </div>
        </header>

        <div className="admin-content">
          {activeTab === 'spaces' && (
            <div className="spaces-grid">
              {spaces.map(space => (
                <div key={space.id} className="space-card">
                  <div className="space-preview">
                    <iframe
                      src={`https://my.matterport.com/show?m=${space.id}&play=1&qs=1`}
                      title={space.name}
                    />
                  </div>
                  <div className="space-info">
                    <h3>{space.name}</h3>
                    <p>ID: {space.id}</p>
                    <div className="space-stats">
                      <span><Users size={14} /> {space.visitors} visitors</span>
                      <span><MessageSquare size={14} /> {space.chats} chats</span>
                    </div>
                    <div className="space-actions">
                      <button className="btn btn-primary">
                        <Edit2 size={14} /> Configure
                      </button>
                      <button className="btn btn-secondary">
                        <Eye size={14} /> Preview
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="space-card add-space">
                <Plus size={48} />
                <span>Add New Space</span>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="config-panel">
              <div className="config-section">
                <h2>Space Information</h2>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Space Name</label>
                    <input 
                      type="text" 
                      value={spaceConfig.spaceName}
                      onChange={e => setSpaceConfig({...spaceConfig, spaceName: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Space Type</label>
                    <select 
                      value={spaceConfig.spaceType}
                      onChange={e => setSpaceConfig({...spaceConfig, spaceType: e.target.value})}
                    >
                      <option value="retail">Retail Store</option>
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                      <option value="hospitality">Hospitality</option>
                      <option value="museum">Museum/Gallery</option>
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <label>Description</label>
                    <textarea 
                      value={spaceConfig.description}
                      onChange={e => setSpaceConfig({...spaceConfig, description: e.target.value})}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="config-section">
                <h2><Bot size={20} /> AI Assistant Settings</h2>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Language</label>
                    <select 
                      value={spaceConfig.language}
                      onChange={e => setSpaceConfig({...spaceConfig, language: e.target.value})}
                    >
                      <option value="en">English</option>
                      <option value="ar">Arabic</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>AI Personality</label>
                    <select 
                      value={spaceConfig.aiPersonality}
                      onChange={e => setSpaceConfig({...spaceConfig, aiPersonality: e.target.value})}
                    >
                      <option value="friendly">Friendly & Casual</option>
                      <option value="professional">Professional</option>
                      <option value="enthusiastic">Enthusiastic</option>
                      <option value="concise">Concise & Direct</option>
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <label>Custom AI Prompt (Optional)</label>
                    <textarea 
                      value={spaceConfig.customPrompt}
                      onChange={e => setSpaceConfig({...spaceConfig, customPrompt: e.target.value})}
                      rows={4}
                      placeholder="Add custom instructions for the AI assistant..."
                    />
                  </div>
                </div>
              </div>

              <div className="config-section">
                <h2>Features</h2>
                <div className="features-grid">
                  {featuresList.map(feature => (
                    <label key={feature.key} className="feature-toggle">
                      <input 
                        type="checkbox"
                        checked={spaceConfig.features[feature.key]}
                        onChange={e => setSpaceConfig({
                          ...spaceConfig,
                          features: {...spaceConfig.features, [feature.key]: e.target.checked}
                        })}
                      />
                      <div className="toggle-content">
                        {feature.icon}
                        <span>{feature.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="config-actions">
                <button className="btn btn-primary" onClick={handleSaveConfig}>
                  <Save size={16} />
                  Save Configuration
                </button>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="analytics-panel">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon"><Users size={24} /></div>
                  <div className="stat-info">
                    <span className="stat-value">{stats.totalVisitors}</span>
                    <span className="stat-label">Total Visitors</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon active"><Users size={24} /></div>
                  <div className="stat-info">
                    <span className="stat-value">{stats.activeUsers}</span>
                    <span className="stat-label">Active Now</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon"><MessageSquare size={24} /></div>
                  <div className="stat-info">
                    <span className="stat-value">{stats.totalChats}</span>
                    <span className="stat-label">Total Chats</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon"><BarChart3 size={24} /></div>
                  <div className="stat-info">
                    <span className="stat-value">{stats.avgSessionTime}</span>
                    <span className="stat-label">Avg. Session</span>
                  </div>
                </div>
              </div>

              <div className="chart-placeholder">
                <BarChart3 size={64} />
                <p>Analytics charts will be displayed here</p>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="users-panel">
              <div className="users-table">
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Last Active</th>
                      <th>Sessions</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div className="user-cell">
                          <div className="avatar">A</div>
                          <span>Admin User</span>
                        </div>
                      </td>
                      <td><span className="badge admin">Admin</span></td>
                      <td>Just now</td>
                      <td>24</td>
                      <td>
                        <button className="btn-icon"><Edit2 size={14} /></button>
                        <button className="btn-icon"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className="user-cell">
                          <div className="avatar">C</div>
                          <span>Client User</span>
                        </div>
                      </td>
                      <td><span className="badge client">Client</span></td>
                      <td>2 hours ago</td>
                      <td>12</td>
                      <td>
                        <button className="btn-icon"><Edit2 size={14} /></button>
                        <button className="btn-icon"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <button className="btn btn-primary">
                <Plus size={16} /> Add User
              </button>
            </div>
          )}

          {activeTab === 'chat-logs' && (
            <div className="chat-logs-panel">
              <div className="logs-list">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="log-item">
                    <div className="log-header">
                      <span className="log-user">Guest #{1000 + i}</span>
                      <span className="log-time">Today, 12:{30 + i} PM</span>
                    </div>
                    <div className="log-preview">
                      <p><strong>User:</strong> Where am I right now?</p>
                      <p><strong>AI:</strong> You're currently in the main showroom area...</p>
                    </div>
                    <button className="btn btn-secondary btn-sm">View Full Chat</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
