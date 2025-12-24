# 🏠 Matterport Smart Virtual Tour System

A comprehensive intelligent virtual tour platform that integrates **Matterport 3D spaces**, **Google Gemini AI chatbot**, and **WebRTC video/audio calling** with real-time spatial awareness and multi-user support.

**100% TypeScript** | **Feature-based Architecture** | **Production Ready**

---

## 📋 Table of Contents

1. [System Overview](#-system-overview)
2. [Tech Stack](#-tech-stack)
3. [Features](#-features)
4. [Project Structure](#-project-structure)
5. [Installation & Setup](#-installation--setup)
6. [Configuration](#-configuration)
7. [Configured Spaces](#-configured-spaces)
8. [API Reference](#-api-reference)
9. [Troubleshooting](#-troubleshooting)
10. [License](#-license)

---

## 🎯 System Overview

This system creates an immersive virtual tour experience where users can:
- Explore 3D spaces powered by Matterport
- Chat with an AI assistant that understands their spatial context
- Make video/audio calls with other visitors or support staff
- Access different interfaces based on their role (visitor, client, admin)
- Watch livestreams embedded directly in the 3D space

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT (React + TypeScript + Vite)            │
│                              Port: 3000                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Viewer     │  │    Chat      │  │  Livestream  │          │
│  │  Components  │  │  Components  │  │  Components  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│  ┌──────▼─────────────────▼─────────────────▼───────┐          │
│  │                    Services                       │          │
│  │  matterport | socket | webrtc | gemini | stream  │          │
│  └──────────────────────┬───────────────────────────┘          │
│                         │                                       │
│                  ┌──────▼───────┐                               │
│                  │ Zustand Store │                              │
│                  └──────────────┘                               │
└─────────────────────────┬───────────────────────────────────────┘
                          │ Socket.io
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                SERVER (Node.js + TypeScript + Express)           │
│                              Port: 3001                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    Socket    │  │    Gemini    │  │     REST     │          │
│  │   Handler    │  │   Service    │  │    Routes    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Matterport  │  │ Google Gemini│  │   MongoDB    │          │
│  │   SDK/Cloud  │  │      AI      │  │  (Optional)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.x | UI Framework |
| **TypeScript** | 5.x | Type-safe development |
| **Vite** | 6.x | Build tool & dev server |
| **Zustand** | 5.x | State management |
| **Socket.io-client** | 4.x | Real-time communication |
| **Matterport SDK** | 3.x | 3D space rendering |
| **React Router** | 7.x | Client-side routing |
| **Lucide React** | - | Icons |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime |
| **TypeScript** | 5.x | Type-safe development |
| **Express** | 4.x | HTTP server |
| **Socket.io** | 4.x | WebSocket server |
| **@google/generative-ai** | - | Gemini AI integration |

---

## ✨ Features

### 🏠 Matterport Integration
- SDK Bundle integration for Scene API access
- Real-time spatial tracking (position, rotation, floor)
- Programmatic navigation and camera control
- Custom 3D canvas components for livestream embedding

### 🤖 AI Chatbot (Gemini)
- Context-aware responses based on user's location
- Spatial language understanding
- Action commands: `[NAV:sweepId]`, `[ROTATE:direction:degrees]`, `[HIGHLIGHT:tagId]`
- Voice input/output support

### 📺 Livestream Integration
- Microsoft Teams meeting embedding in 3D space
- Custom canvas screen component
- Admin controls for stream management

### 📞 WebRTC Video/Audio Calls
- Peer-to-peer video calls
- Audio-only option
- Call notifications and controls

### 📊 Role-Based Interfaces

| Route | Interface |
|-------|-----------|
| `/?space=awni` | End User Tour |
| `/?space=eaac&admin=true` | Admin Mode |
| `/client` | Client Dashboard |
| `/admin` | Admin Dashboard |

---

## 📁 Project Structure

```
matterport-smart-tour/
│
├── 📂 client/                          # Frontend (React + TypeScript)
│   └── 📂 src/
│       ├── 📂 components/              # Feature-based components
│       │   ├── 📂 chat/                # ChatBot
│       │   ├── 📂 viewer/              # MatterportViewer, SpatialOverlay
│       │   ├── 📂 livestream/          # AdminLiveStreamPanel, LiveStreamPanel
│       │   ├── 📂 call/                # VideoCall, IncomingCall
│       │   ├── 📂 ui/                  # ControlPanel, SpaceSelector, etc.
│       │   └── index.ts                # Barrel export
│       │
│       ├── 📂 services/                # Service classes
│       │   ├── geminiService.ts
│       │   ├── livestreamService.ts
│       │   ├── matterportService.ts
│       │   ├── socketService.ts
│       │   └── webrtcService.ts
│       │
│       ├── 📂 store/                   # Zustand store
│       ├── 📂 hooks/                   # Custom hooks
│       ├── 📂 constants/               # App constants
│       ├── 📂 utils/                   # Utility functions
│       ├── 📂 config/                  # Space configurations
│       ├── 📂 types/                   # TypeScript types
│       ├── 📂 pages/                   # Page components
│       └── 📂 styles/                  # Global styles
│
├── 📂 server/                          # Backend (Node.js + TypeScript)
│   └── 📂 src/
│       ├── 📂 services/gemini/         # GeminiService
│       ├── 📂 socket/                  # socketHandler
│       ├── 📂 routes/                  # REST API routes
│       ├── 📂 types/                   # Server types
│       └── app.ts                      # Express entry
│
├── render.yaml                         # Deployment config
└── README.md
```

---

## 🚀 Installation & Setup

### Prerequisites

- **Node.js** 18.x+
- **Matterport SDK Key** (from my.matterport.com)
- **Google Gemini API Key** (from ai.google.dev)

### Quick Start

```bash
# Clone repository
git clone https://github.com/ArabIQ/matterport-smart-tour.git
cd matterport-smart-tour

# Install dependencies
cd server && npm install
cd ../client && npm install

# Configure environment variables (see below)

# Start server (Terminal 1)
cd server && npm run dev

# Start client (Terminal 2)
cd client && npm run dev

# Open http://localhost:3000
```

---

## ⚙️ Configuration

### Server (`server/.env`)

```env
PORT=3001
CLIENT_URL=http://localhost:3000
GEMINI_API_KEY=your_gemini_api_key
CORS_ORIGIN=http://localhost:3000
```

### Client (`client/.env`)

```env
VITE_SERVER_URL=http://localhost:3001
VITE_MATTERPORT_SDK_KEY=your_sdk_key
VITE_DEFAULT_MODEL_ID=J9fEBnyKuiv
```

---

## 🏢 Configured Spaces

| ID | Name | Model ID | Features |
|----|------|----------|----------|
| `awni` | Awni Electronics Store | `J9fEBnyKuiv` | Chatbot |
| `eaac` | EAAC Training Center | `4X7veq8Dsye` | Chatbot, Livestream |

---

## 📡 API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/space/:spaceId/config` | Get space config |
| `POST` | `/api/chat` | Send chat message |
| `GET` | `/api/livestream/:spaceId` | Get livestream config |

### Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `session-init` | Client → Server | Initialize session |
| `chat-message` | Client → Server | Send chat |
| `chat-response` | Server → Client | AI response |
| `spatial-update` | Client → Server | Position update |

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Model not available | Check `.env` SDK key and model ID |
| Socket connection failed | Ensure server is running |
| TypeScript errors | Run `npm install` |

### Debug Commands

```bash
# Type check
cd client && npx tsc --noEmit
cd server && npx tsc --noEmit

# Build
cd client && npm run build
cd server && npm run build
```

---

## 📄 License

MIT License

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

**Built with ❤️ by ArabIQ using Matterport, Google Gemini AI, React, and TypeScript**
