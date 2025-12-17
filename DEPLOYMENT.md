# Deployment Guide for GitHub Pages

## 🔒 Security First - Protecting Your API Keys

This project uses GitHub Secrets to securely store API keys. **NEVER commit `.env` files or expose API keys in your code.**

## 📋 Prerequisites

1. GitHub account
2. Git installed locally
3. Node.js and npm installed

## 🚀 Deployment Steps

### Step 1: Configure GitHub Repository Secrets

1. Go to your GitHub repository: `https://github.com/MazenDeebo/ArabIQ_matterport`
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add the following secrets:

   | Secret Name | Value | Description |
   |------------|-------|-------------|
   | `VITE_MATTERPORT_SDK_KEY` | `bnx9rtn9umenhf4ym8bngu7ud` | Your Matterport SDK key |
   | `VITE_MATTERPORT_MODEL_ID` | `J9fEBnyKuiv` | Your Matterport model ID |
   | `VITE_GEMINI_API_KEY` | `AIzaSyAe5Zh1uy2MFDmVGgiEbXOEPoFsYXeNSWY` | Google Gemini API key |
   | `VITE_SERVER_URL` | `https://your-backend-url.com` | Your backend server URL (if deployed) |

### Step 2: Enable GitHub Pages

1. Go to **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. Save the settings

### Step 3: Push to GitHub

The GitHub Actions workflow will automatically deploy when you push to the `main` branch.

```bash
# Initialize git (if not already done)
cd "D:/ArabIQ company/Demos/matterport-smart-tour"
git init

# Add remote repository
git remote add origin https://github.com/MazenDeebo/ArabIQ_matterport.git

# Add all files (respecting .gitignore)
git add .

# Commit
git commit -m "Initial deployment setup"

# Push to main branch
git push -u origin main
```

### Step 4: Monitor Deployment

1. Go to **Actions** tab in your GitHub repository
2. Watch the deployment workflow progress
3. Once complete, your site will be live at: `https://mazendeebo.github.io/ArabIQ_matterport/`

## 🔧 Local Development

### Setup Environment Variables

1. Copy `.env.example` to `.env` in the `client` directory:
   ```bash
   cd client
   cp .env.example .env
   ```

2. Fill in your actual API keys in the `.env` file

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run development server:
   ```bash
   npm run dev
   ```

## 📦 Manual Deployment (Alternative)

If you prefer to deploy manually without GitHub Actions:

```bash
cd client
npm install
npm run build
npm run deploy
```

This will build and deploy to the `gh-pages` branch.

## ⚠️ Important Security Notes

1. **Never commit these files:**
   - `.env`
   - `.env.local`
   - Any file containing API keys
   - `node_modules/`

2. **The `.gitignore` file is configured to prevent accidental commits of sensitive data**

3. **Always use GitHub Secrets for production deployments**

4. **Rotate your API keys if they are ever exposed**

## 🔄 Updating the Deployment

Simply push changes to the `main` branch:

```bash
git add .
git commit -m "Your update message"
git push
```

The GitHub Actions workflow will automatically rebuild and redeploy.

## 🐛 Troubleshooting

### Build Fails
- Check that all GitHub Secrets are correctly set
- Verify the secret names match exactly (case-sensitive)
- Check the Actions logs for specific error messages

### Site Not Loading
- Ensure GitHub Pages is enabled in repository settings
- Check that the base URL in `vite.config.js` matches your repository name
- Wait a few minutes after deployment completes

### API Keys Not Working
- Verify secrets are set correctly in GitHub
- Check browser console for error messages
- Ensure the secret names in the workflow match the ones in your code

## 📞 Support

For issues related to:
- **Matterport SDK**: Check [Matterport SDK Documentation](https://matterport.github.io/showcase-sdk/)
- **GitHub Pages**: Check [GitHub Pages Documentation](https://docs.github.com/en/pages)
- **Vite**: Check [Vite Documentation](https://vitejs.dev/)

## 🎉 Success!

Once deployed, your Matterport Smart Tour will be accessible at:
**https://mazendeebo.github.io/ArabIQ_matterport/**
