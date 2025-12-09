# 🏠 Matterport Smart Virtual Tour System

A comprehensive intelligent virtual tour platform that integrates **Matterport 3D spaces**, **Google Gemini AI chatbot**, and **WebRTC video/audio calling** with real-time spatial awareness and multi-user support.

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Features](#features)
5. [Project Structure](#project-structure)
6. [Installation & Setup](#installation--setup)
7. [Configuration](#configuration)
8. [How It Works](#how-it-works)
9. [API Reference](#api-reference)
10. [Component Documentation](#component-documentation)
11. [Integration Details](#integration-details)
12. [Troubleshooting](#troubleshooting)

---

## 🎯 System Overview

This system creates an immersive virtual tour experience where users can:
- Explore 3D spaces powered by Matterport
- Chat with an AI assistant that understands their spatial context
- Make video/audio calls with other visitors or support staff
- Access different interfaces based on their role (visitor, client, admin)

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React + Vite)                     │
│                         Port: 3000                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Matterport  │  │   ChatBot    │  │  VideoCall   │          │
│  │   Viewer     │  │  Component   │  │  Component   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐          │
│  │  Matterport  │  │   Socket     │  │   WebRTC     │          │
│  │   Service    │  │   Service    │  │   Service    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                     │
│                    ┌──────▼───────┐                             │
│                    │    Zustand   │                             │
│                    │    Store     │                             │
│                    └──────────────┘                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Socket.io / WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SERVER (Node.js + Express)                   │
│                         Port: 3001                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Socket     │  │   Gemini     │  │    REST      │          │
│  │   Handler    │  │   Service    │  │    Routes    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘          │
│         │                 │                                     │
│         │          ┌──────▼───────┐                             │
│         │          │  Google AI   │                             │
│         │          │  Gemini API  │                             │
│         │          └──────────────┘                             │
│         │                                                       │
│  ┌──────▼───────────────────────────────────────────┐          │
│  │              Real-time Event System               │          │
│  │  - User tracking    - Spatial updates            │          │
│  │  - Chat messages    - WebRTC signaling           │          │
│  │  - Call management  - Client dashboard updates   │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Matterport  │  │   Google     │  │   MongoDB    │          │
│  │  Cloud SDK   │  │  Gemini AI   │  │  (Optional)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture

### Data Flow

```
1. USER LOADS PAGE
   └─→ React App initializes
       └─→ Socket.io connects to server (port 3001)
           └─→ Matterport iframe loads 3D model
               └─→ MP_SDK connects via SDK key
                   └─→ Spatial tracking begins

2. USER MOVES IN 3D SPACE
   └─→ Matterport SDK fires position events
       └─→ matterportService captures position/rotation
           └─→ tourStore updates spatial state
               └─→ socketService emits 'spatial-update'
                   └─→ Server broadcasts to client dashboards

3. USER SENDS CHAT MESSAGE
   └─→ ChatBot captures input
       └─→ socketService emits 'chat-message' with:
           - message text
           - current spatial data (position, rotation, floor)
           - tour data (sweeps, tags, rooms)
       └─→ Server's GeminiService:
           - Builds context-aware prompt
           - Includes spatial awareness
           - Calls Gemini API
           - Parses response for actions
       └─→ Response sent back with:
           - AI message
           - Actions (navigate, rotate, measure, etc.)
       └─→ Client executes actions via matterportService

4. VIDEO/AUDIO CALL
   └─→ User clicks call button
       └─→ socketService emits 'call-initiate'
           └─→ Server forwards to target user
               └─→ Target accepts/rejects
                   └─→ WebRTC signaling begins
                       └─→ Peer connection established
```

---

## 🛠️ Tech Stack

### Frontend (Client)

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.x | UI Framework |
| **Vite** | 6.x | Build tool & dev server |
| **Zustand** | 5.x | State management |
| **Socket.io-client** | 4.x | Real-time communication |
| **Matterport SDK** | 3.x | 3D space rendering & interaction |
| **React Router** | 7.x | Client-side routing |
| **Lucide React** | - | Icons |

### Backend (Server)

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime |
| **Express** | 4.x | HTTP server |
| **Socket.io** | 4.x | WebSocket server |
| **@google/generative-ai** | - | Gemini AI integration |
| **MongoDB** | - | Database (optional) |
| **dotenv** | - | Environment variables |
| **cors** | - | Cross-origin requests |
| **nodemon** | - | Development auto-reload |

### External Services

| Service | Purpose |
|---------|---------|
| **Matterport** | 3D space hosting & SDK |
| **Google Gemini** | AI chatbot responses |
| **WebRTC** | Peer-to-peer video/audio |

---

## ✨ Features

### 🏠 Matterport Integration
- Embedded 3D virtual tours via iframe
- Real-time spatial tracking:
  - Position (X, Y, Z coordinates)
  - Rotation (horizontal/vertical angles)
  - Current floor detection
  - Current sweep/viewpoint
- Programmatic navigation to any viewpoint
- Camera rotation control
- Tag/point of interest highlighting
- Measurement mode activation
- Floor switching

### 🤖 AI Chatbot (Gemini)
- **Context-aware responses** based on user's exact location
- **Spatial language** ("to your left", "behind you", "above you")
- **Action commands** parsed from AI responses:
  - `[NAV:sweepId]` - Navigate to viewpoint
  - `[ROTATE:direction:degrees]` - Rotate camera
  - `[HIGHLIGHT:tagId]` - Highlight point of interest
  - `[TOUR:start/stop]` - Guided tour control
  - `[MEASURE:show]` - Activate measurements
  - `[FLOOR:up/down]` - Change floors
- **Voice input** via Web Speech API
- **Voice output** via Speech Synthesis
- **Quick action buttons** for common queries
- **Plain text responses** (no markdown)

### 📞 WebRTC Video/Audio Calls
- Peer-to-peer video calls
- Audio-only option
- Incoming call notifications
- Call accept/reject
- Mute/unmute controls
- Camera on/off toggle

### 👥 Multi-user Support
- Real-time participant tracking
- See other users' positions
- Call any participant
- Shared spatial awareness

### 📊 Role-Based Interfaces

| Route | Interface | Features |
|-------|-----------|----------|
| `/` | **End User Tour** | 3D viewer, chatbot, spatial overlay |
| `/client` | **Client Dashboard** | Live visitor tracking, coordinates, session time, call visitors |
| `/admin` | **Admin Dashboard** | Space management, AI config, analytics, user management |

---

## 📁 Project Structure

```
matterport-smart-tour/
│
├── 📂 client/                          # Frontend React Application
│   ├── 📂 public/
│   │   └── index.html                  # HTML entry point
│   │
│   ├── 📂 src/
│   │   ├── 📂 components/              # React Components
│   │   │   ├── MatterportViewer.jsx    # 3D viewer iframe + SDK init
│   │   │   ├── MatterportViewer.css
│   │   │   ├── ChatBot.jsx             # AI chat interface
│   │   │   ├── ChatBot.css
│   │   │   ├── SpatialOverlay.jsx      # Position/rotation display
│   │   │   ├── SpatialOverlay.css
│   │   │   ├── VideoCall.jsx           # WebRTC video UI
│   │   │   ├── VideoCall.css
│   │   │   ├── IncomingCall.jsx        # Call notification
│   │   │   ├── IncomingCall.css
│   │   │   ├── ControlPanel.jsx        # Bottom control bar
│   │   │   ├── ControlPanel.css
│   │   │   ├── ParticipantsList.jsx    # Active users list
│   │   │   └── ParticipantsList.css
│   │   │
│   │   ├── 📂 pages/                   # Page Components
│   │   │   ├── AdminDashboard.jsx      # Admin interface
│   │   │   ├── AdminDashboard.css
│   │   │   ├── ClientView.jsx          # Client dashboard
│   │   │   └── ClientView.css
│   │   │
│   │   ├── 📂 services/                # Service Classes
│   │   │   ├── socketService.js        # Socket.io client
│   │   │   ├── matterportService.js    # Matterport SDK wrapper
│   │   │   └── webrtcService.js        # WebRTC peer connection
│   │   │
│   │   ├── 📂 store/                   # State Management
│   │   │   └── tourStore.js            # Zustand global store
│   │   │
│   │   ├── 📂 styles/                  # Global Styles
│   │   │   ├── globals.css
│   │   │   └── App.css
│   │   │
│   │   ├── App.jsx                     # Main app with routing
│   │   └── index.js                    # React entry point
│   │
│   ├── .env                            # Environment variables
│   ├── vite.config.js                  # Vite configuration
│   └── package.json
│
├── 📂 server/                          # Backend Node.js Application
│   ├── 📂 src/
│   │   ├── 📂 services/
│   │   │   └── 📂 gemini/
│   │   │       └── GeminiService.js    # Gemini AI integration
│   │   │
│   │   ├── 📂 socket/
│   │   │   └── socketHandler.js        # Socket.io event handlers
│   │   │
│   │   ├── 📂 routes/
│   │   │   └── index.js                # REST API routes
│   │   │
│   │   └── app.js                      # Express server entry
│   │
│   ├── .env                            # Environment variables
│   └── package.json
│
└── README.md                           # This file
```

---

## 🚀 Installation & Setup

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Matterport SDK Key** (from my.matterport.com)
- **Google Gemini API Key** (from ai.google.dev)
- **Matterport Model ID** (your 3D space ID)

### Step-by-Step Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd matterport-smart-tour

# 2. Install server dependencies
cd server
npm install

# 3. Install client dependencies
cd ../client
npm install

# 4. Configure environment variables (see Configuration section)

# 5. Start the server (Terminal 1)
cd server
npm run dev

# 6. Start the client (Terminal 2)
cd client
npm run dev

# 7. Open browser
# http://localhost:3000        - End user tour
# http://localhost:3000/client - Client dashboard
# http://localhost:3000/admin  - Admin dashboard
```

---

## ⚙️ Configuration

### Server Environment Variables (`server/.env`)

```env
# Server Configuration
PORT=3001
CLIENT_URL=http://localhost:3000

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# CORS
CORS_ORIGIN=http://localhost:3000

# Database (Optional)
MONGODB_URI=mongodb://localhost:27017/matterport-tour

# Matterport (for server-side reference)
MATTERPORT_SDK_KEY=your_sdk_key_here
MATTERPORT_MODEL_ID=your_model_id_here
```

### Client Environment Variables (`client/.env`)

```env
# Server URL
VITE_SERVER_URL=http://localhost:3001

# Client Port
VITE_CLIENT_PORT=3000

# Matterport Configuration
VITE_MATTERPORT_SDK_KEY=your_sdk_key_here
VITE_DEFAULT_MODEL_ID=your_model_id_here
```

### Vite Configuration (`client/vite.config.js`)

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,  // Ensures port 3000 is used
    open: true,        // Auto-open browser
  },
  define: {
    'process.env': {
      REACT_APP_SERVER_URL: JSON.stringify('http://localhost:3001'),
      REACT_APP_MATTERPORT_SDK_KEY: JSON.stringify('your_sdk_key'),
      REACT_APP_DEFAULT_MODEL_ID: JSON.stringify('your_model_id'),
    }
  }
});
```

---

## 🔄 How It Works

### 1. Matterport SDK Connection

```javascript
// client/src/services/matterportService.js

class MatterportService {
  async connect(iframe) {
    // Wait for SDK to load
    await this.waitForSDK();
    
    // Connect to iframe with SDK key
    this.mpSdk = await window.MP_SDK.connect(
      iframe, 
      'your_sdk_key', 
      ''
    );
    
    // Load tour data (sweeps, floors, tags, rooms)
    await this.loadTourData();
    
    // Start tracking user position
    this.setupSpatialTracking();
  }
  
  setupSpatialTracking() {
    // Subscribe to camera pose changes
    this.mpSdk.Camera.pose.subscribe((pose) => {
      // Update store with new position/rotation
      store.updateSpatial({
        position: pose.position,
        rotation: { x: pose.rotation.x, y: pose.rotation.y }
      });
      
      // Emit to server for other clients
      socketService.updateSpatial(spatialData);
    });
  }
}
```

### 2. Socket.io Communication

```javascript
// client/src/services/socketService.js

class SocketService {
  connect() {
    this.socket = io('http://localhost:3001');
    
    // Listen for chat responses
    this.socket.on('chat-response', (response) => {
      store.addMessage({
        role: 'assistant',
        content: response.message,
        actions: response.actions
      });
    });
  }
  
  sendChatMessage(message, spatialData, tourData) {
    this.socket.emit('chat-message', {
      message,
      spatialData,  // Current position, rotation, floor
      tourData      // Available sweeps, tags, rooms
    });
  }
}
```

### 3. Gemini AI Integration

```javascript
// server/src/services/gemini/GeminiService.js

class GeminiService {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  async chat(sessionId, userMessage, spatialData, tourData) {
    // Build context-aware prompt
    const prompt = `
      ${this.buildSystemPrompt()}
      
      === USER CONTEXT ===
      Position: X=${spatialData.position.x}, Y=${spatialData.position.y}, Z=${spatialData.position.z}
      Looking: ${spatialData.rotation.y}° horizontal
      Floor: ${spatialData.currentFloor?.name}
      
      === AVAILABLE DATA ===
      Sweeps: ${tourData.sweeps.length}
      Tags: ${tourData.tags.map(t => t.label).join(', ')}
      
      === USER MESSAGE ===
      ${userMessage}
    `;
    
    // Call Gemini API
    const result = await this.model.generateContent(prompt);
    const response = result.response.text();
    
    // Parse for action commands
    const parsed = this.parseResponse(response);
    
    return {
      message: parsed.message,
      actions: parsed.actions  // [NAV:...], [ROTATE:...], etc.
    };
  }
}
```

### 4. Action Execution

```javascript
// client/src/services/matterportService.js

async executeAction(action) {
  switch (action.type) {
    case 'NAVIGATE':
      await this.mpSdk.Sweep.moveTo(action.sweepId);
      break;
      
    case 'ROTATE':
      await this.mpSdk.Camera.rotate(
        action.direction === 'left' ? -action.degrees : action.degrees,
        0
      );
      break;
      
    case 'SHOW_MEASUREMENT':
      await this.mpSdk.Measurements.activate();
      break;
      
    case 'TOUR_CONTROL':
      if (action.action === 'start') {
        // Start guided tour through sweeps
      }
      break;
  }
}
```

### 5. State Management (Zustand)

```javascript
// client/src/store/tourStore.js

export const useTourStore = create((set, get) => ({
  // Connection state
  isConnected: false,
  
  // Matterport state
  mpSdk: null,
  isSDKReady: false,
  
  // Spatial data (updated in real-time)
  spatial: {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0 },
    currentSweep: null,
    currentFloor: null,
    nearbyTags: []
  },
  
  // Tour data (loaded once)
  tourData: {
    sweeps: [],
    floors: [],
    rooms: [],
    tags: []
  },
  
  // Chat state
  chat: {
    messages: [],
    isLoading: false
  },
  
  // Actions
  updateSpatial: (data) => set({ spatial: { ...get().spatial, ...data } }),
  addMessage: (msg) => set({ 
    chat: { ...get().chat, messages: [...get().chat.messages, msg] } 
  })
}));
```

---

## 📡 API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Server status page |
| `GET` | `/api/health` | Health check with model ID |
| `GET` | `/api/space/:spaceId/config` | Get space configuration |
| `POST` | `/api/chat` | Send chat message (REST alternative) |

### Socket.io Events

#### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `initialize-session` | `{ spaceConfig }` | Initialize AI session |
| `join-tour` | `{ tourId, userId, userName, role }` | Join tour room |
| `join-as-client` | `{ role: 'client' }` | Join as client dashboard |
| `chat-message` | `{ message, spatialData, tourData }` | Send chat message |
| `spatial-update` | `{ position, rotation, floor }` | Update position |
| `call-initiate` | `{ targetSocketId, callType }` | Start call |
| `call-accept` | `{ targetSocketId }` | Accept call |
| `call-reject` | `{ targetSocketId }` | Reject call |
| `call-end` | `{ targetSocketId }` | End call |
| `webrtc-offer` | `{ targetSocketId, offer }` | WebRTC offer |
| `webrtc-answer` | `{ targetSocketId, answer }` | WebRTC answer |
| `webrtc-ice-candidate` | `{ targetSocketId, candidate }` | ICE candidate |

#### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `session-initialized` | `{ greeting, capabilities }` | Session ready |
| `chat-response` | `{ message, actions, timestamp }` | AI response |
| `chat-error` | `{ error }` | Chat error |
| `room-state` | `{ participants }` | Current room state |
| `user-joined` | `{ socketId, userName, role }` | User joined |
| `user-left` | `{ socketId, userName }` | User left |
| `participant-moved` | `{ socketId, spatialData }` | User moved |
| `visitors-update` | `[visitors]` | All visitors (for client dashboard) |
| `visitor-spatial-update` | `{ odId, spatialData }` | Visitor position update |
| `call-incoming` | `{ from, callerName, callType }` | Incoming call |
| `call-accepted` | `{ from }` | Call accepted |
| `call-rejected` | `{ from }` | Call rejected |
| `call-ended` | `{ from }` | Call ended |

---

## 🧩 Component Documentation

### MatterportViewer

Renders the Matterport 3D space and initializes the SDK.

```jsx
<MatterportViewer />

// Props: None (uses global store)
// State: Uses tourStore for SDK status and spatial data
```

**Key Functions:**
- `initializeSDK()` - Connects to Matterport SDK
- Renders iframe with model URL
- Shows debug info overlay

### ChatBot

AI chat interface with voice support.

```jsx
<ChatBot />

// Features:
// - Text input with send button
// - Voice input (microphone)
// - Voice output (speaker)
// - Quick action buttons
// - Message history
// - Action execution
```

**Quick Actions:**
- "Where am I?" - Get location description
- "Rooms" - List available rooms
- "Highlights" - Show points of interest
- "Tour" - Start guided tour
- "Measure" - Activate measurements
- "Help" - Show capabilities

### SpatialOverlay

Displays real-time position and rotation data.

```jsx
<SpatialOverlay />

// Displays:
// - X, Y, Z coordinates
// - Horizontal rotation (degrees)
// - Current floor name
// - SDK connection status
```

### ClientView

Dashboard for property owners/clients.

```jsx
// Route: /client

// Features:
// - Live visitor list with coordinates
// - Session duration for each visitor
// - Click to view visitor details
// - Join visitor tour button
// - Audio/video call buttons
// - Real-time position updates
```

### AdminDashboard

Full admin control panel.

```jsx
// Route: /admin

// Tabs:
// - Spaces: Manage Matterport spaces
// - Configuration: AI settings, features
// - Analytics: Usage statistics
// - Users: User management
// - Chat Logs: Conversation history
```

---

## 🔗 Integration Details

### Matterport ↔ Client Integration

1. **Iframe Embedding**: Matterport model loaded via iframe URL
2. **SDK Connection**: `MP_SDK.connect()` establishes control
3. **Data Subscription**: Subscribe to camera, sweep, floor changes
4. **Action Execution**: Programmatic navigation, rotation, measurements

```javascript
// Iframe URL format
const url = `https://my.matterport.com/show?m=${MODEL_ID}&play=1&qs=1&applicationKey=${SDK_KEY}`;

// SDK connection
const mpSdk = await window.MP_SDK.connect(iframe, SDK_KEY, '');

// Subscribe to position changes
mpSdk.Camera.pose.subscribe(pose => {
  // pose.position = { x, y, z }
  // pose.rotation = { x, y }
});

// Navigate to sweep
await mpSdk.Sweep.moveTo(sweepId);
```

### Client ↔ Server Integration

1. **Socket.io**: Real-time bidirectional communication
2. **REST API**: Health checks, configuration
3. **Event-driven**: All interactions via socket events

```javascript
// Client connects
const socket = io('http://localhost:3001');

// Join tour
socket.emit('join-tour', { tourId, userId, userName, role });

// Send chat with context
socket.emit('chat-message', {
  message: "Where am I?",
  spatialData: { position, rotation, floor },
  tourData: { sweeps, tags, rooms }
});

// Receive response
socket.on('chat-response', ({ message, actions }) => {
  // Display message
  // Execute actions
});
```

### Server ↔ Gemini Integration

1. **API Client**: `@google/generative-ai` package
2. **Context Building**: Spatial + tour data → prompt
3. **Response Parsing**: Extract action commands

```javascript
// Initialize
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// Build prompt with context
const prompt = `
  You are a virtual tour assistant...
  User is at position X=${x}, Y=${y}, Z=${z}
  User is looking ${rotation}° horizontal
  Available sweeps: ${sweeps.join(', ')}
  
  User says: "${message}"
`;

// Get response
const result = await model.generateContent(prompt);
const text = result.response.text();

// Parse actions like [NAV:sweep123]
const actions = parseActions(text);
```

---

## 🐛 Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Model not available" | Wrong model ID or SDK key | Check `.env` files |
| Socket connection failed | Server not running | Start server first |
| Coordinates stuck at 0,0,0 | SDK not connected | Wait for SDK ready |
| Gemini 404 error | Invalid model name | Use `gemini-2.0-flash` |
| Port already in use | Previous process running | Kill node processes |
| CORS errors | Wrong origin | Check `CORS_ORIGIN` in server |

### Debug Commands

```bash
# Check running processes (Windows)
netstat -ano | findstr ":3000 :3001"

# Kill all node processes (Windows PowerShell)
Get-Process -Name "node" | Stop-Process -Force

# Check server health
Invoke-WebRequest -Uri "http://localhost:3001/api/health"

# View server logs
npm run dev  # Shows real-time logs
```

### Browser Console Checks

```javascript
// Check SDK connection
console.log(window.MP_SDK);

// Check socket connection
console.log(socketService.socket?.connected);

// Check store state
console.log(useTourStore.getState());
```

---

## 📄 License

MIT License - Feel free to use and modify.

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

**Built with ❤️ using Matterport, Google Gemini, and React**
