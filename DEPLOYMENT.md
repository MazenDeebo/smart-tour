# Deployment Guide

## Overview

This project consists of two parts:
1. **Client** (React/Vite) - Can be deployed to GitHub Pages
2. **Server** (Node.js/Express) - Needs a separate hosting service

## Important: GitHub Pages Limitations

GitHub Pages only hosts **static files**. The server (backend) must be deployed separately to a service like:
- [Render](https://render.com) (Free tier available)
- [Railway](https://railway.app)
- [Vercel](https://vercel.com) (for serverless)
- [Heroku](https://heroku.com)

---

## Step 1: Deploy the Server

### Option A: Deploy to Render (Recommended - Free)

1. Create account at [render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `matterport-smart-tour-server`
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/app.js`
5. Add Environment Variables:
   - `PORT`: `3001`
   - `CLIENT_URL`: `https://mazendeebo.github.io`
   - `GEMINI_API_KEY`: Your Gemini API key
   - `CORS_ORIGIN`: `https://mazendeebo.github.io`
   - `MATTERPORT_SDK_KEY`: Your Matterport SDK key
   - `MATTERPORT_MODEL_ID`: Your model ID
6. Deploy and note the URL (e.g., `https://matterport-smart-tour-server.onrender.com`)

---

## Step 2: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `VITE_SERVER_URL`: Your deployed server URL (from Step 1)
- `VITE_MATTERPORT_SDK_KEY`: `bnx9rtn9umenhf4ym8bngu7ud`
- `VITE_DEFAULT_MODEL_ID`: `J9fEBnyKuiv`

---

## Step 3: Deploy Client to GitHub Pages

### Automatic Deployment (Recommended)

1. Push your code to the `main` branch
2. Go to repository Settings → Pages
3. Under "Build and deployment", select:
   - Source: **GitHub Actions**
4. The workflow will automatically build and deploy

### Manual Deployment

```bash
cd client
npm install
npm run build
# The dist folder contains the static files
```

---

## Step 4: Configure Matterport SDK

Make sure your Matterport SDK key is configured to allow your GitHub Pages domain:

1. Go to [Matterport Developer Portal](https://matterport.com/developers)
2. Find your SDK key
3. Add domain: `mazendeebo.github.io` (https only)
4. Add domain: `localhost:3000` (for local development)

---

## Environment Variables Reference

### Server (.env)
```
PORT=3001
CLIENT_URL=https://mazendeebo.github.io
GEMINI_API_KEY=your_key
CORS_ORIGIN=https://mazendeebo.github.io
MONGODB_URI=mongodb://... (optional)
MATTERPORT_SDK_KEY=your_key
MATTERPORT_MODEL_ID=your_model_id
```

### Client (.env)
```
VITE_SERVER_URL=https://your-server.onrender.com
VITE_MATTERPORT_SDK_KEY=your_key
VITE_DEFAULT_MODEL_ID=your_model_id
```

---

## Troubleshooting

### CORS Errors
- Ensure `CORS_ORIGIN` on server matches your GitHub Pages URL exactly
- Check that the server's `CLIENT_URL` is correct

### Matterport Not Loading
- Verify SDK key is valid and domain is whitelisted
- Check browser console for specific errors

### Socket.io Connection Failed
- Ensure server is running and accessible
- Check `VITE_SERVER_URL` points to correct server

### API Key Errors
- Gemini API key may have expired - regenerate at Google AI Studio
- Matterport SDK key must have correct domain permissions

---

## Local Development

```bash
# Terminal 1 - Server
cd server
npm install
cp .env.example .env  # Edit with your keys
npm run dev

# Terminal 2 - Client
cd client
npm install
cp .env.example .env  # Edit with your keys
npm run dev
```

Visit `http://localhost:3000`
