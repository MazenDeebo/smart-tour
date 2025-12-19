# Deployment Guide - 100% Serverless

## Overview

This project runs **entirely on GitHub Pages** - NO SERVER REQUIRED!

All features work client-side:
- ✅ Matterport 3D Virtual Tour
- ✅ AI Chat Assistant (Gemini runs in browser)
- ✅ Livestream/Video embedding
- ✅ Spatial tracking and navigation
- ✅ Admin controls (stored in localStorage)

---

## Quick Deploy to GitHub Pages

### Step 1: Configure GitHub Secrets

Go to: **https://github.com/MazenDeebo/smart-tour/settings/secrets/actions**

Add these secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `VITE_GEMINI_API_KEY` | Your Gemini API key | Get from [Google AI Studio](https://makersuite.google.com/app/apikey) |
| `VITE_MATTERPORT_SDK_KEY` | `bnx9rtn9umenhf4ym8bngu7ud` | Your Matterport SDK key |
| `VITE_DEFAULT_MODEL_ID` | `J9fEBnyKuiv` | Default Matterport model |

### Step 2: Configure Matterport SDK Domain

1. Go to [Matterport Developer Portal](https://matterport.com/developers)
2. Find your SDK key settings
3. Add allowed domain: `mazendeebo.github.io` (https only)

### Step 3: Enable GitHub Pages

1. Go to: **https://github.com/MazenDeebo/smart-tour/settings/pages**
2. Under "Build and deployment":
   - Source: **GitHub Actions**
3. Push to `main` branch to trigger deployment

### Step 4: Access Your Site

After deployment completes:
- **Main Tour**: `https://mazendeebo.github.io/smart-tour/`
- **Admin Mode**: `https://mazendeebo.github.io/smart-tour/?admin=true`
- **EAAC Space**: `https://mazendeebo.github.io/smart-tour/?space=eaac`

---

## Local Development

```bash
cd client
npm install
cp .env.example .env  # Edit with your API keys
npm run dev
```

Visit `http://localhost:3000`

---

## Environment Variables

Create `client/.env` with:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_MATTERPORT_SDK_KEY=bnx9rtn9umenhf4ym8bngu7ud
VITE_DEFAULT_MODEL_ID=J9fEBnyKuiv
```

---

## Security Notes

⚠️ **API Key Exposure**: Since this runs entirely in the browser, API keys are visible to users. To protect your keys:

1. **Gemini API Key**: 
   - Use [API key restrictions](https://console.cloud.google.com/apis/credentials) 
   - Restrict to your domain only
   - Set usage quotas

2. **Matterport SDK Key**:
   - Already domain-restricted by Matterport
   - Only works on whitelisted domains

---

## Troubleshooting

### Matterport Not Loading
- Check SDK key is valid
- Verify domain is whitelisted in Matterport settings
- Check browser console for errors

### AI Chat Not Working
- Verify `VITE_GEMINI_API_KEY` is set correctly
- Check if API key has expired
- Look for CORS errors in console

### Build Fails on GitHub Actions
- Check all secrets are configured
- Verify secret names match exactly (case-sensitive)

---

## Architecture

```
┌─────────────────────────────────────────────┐
│           GitHub Pages (Static)             │
│  ┌───────────────────────────────────────┐  │
│  │         React + Vite Client           │  │
│  │  ┌─────────────┐  ┌────────────────┐  │  │
│  │  │  Matterport │  │  Gemini AI     │  │  │
│  │  │  SDK Bundle │  │  (Browser SDK) │  │  │
│  │  └─────────────┘  └────────────────┘  │  │
│  │  ┌─────────────┐  ┌────────────────┐  │  │
│  │  │ Livestream  │  │  localStorage  │  │  │
│  │  │  Service    │  │  (Config)      │  │  │
│  │  └─────────────┘  └────────────────┘  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
   Matterport API      Google Gemini API
```

No server needed! Everything runs in the browser.
