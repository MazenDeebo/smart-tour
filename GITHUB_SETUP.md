# 🚀 GitHub Pages Setup Instructions

## ✅ What's Already Done

1. ✅ Comprehensive `.gitignore` created (protects API keys and sensitive files)
2. ✅ Environment configuration system set up
3. ✅ GitHub Actions workflow created (`.github/workflows/deploy.yml`)
4. ✅ Vite configured for GitHub Pages deployment
5. ✅ Code pushed to: https://github.com/MazenDeebo/ArabIQ_matterport

## 🔐 Step 1: Configure GitHub Secrets (CRITICAL)

**You MUST do this before the site will work!**

1. Go to: https://github.com/MazenDeebo/ArabIQ_matterport/settings/secrets/actions

2. Click **"New repository secret"** and add each of these:

   ### Secret 1: VITE_MATTERPORT_SDK_KEY
   - **Name**: `VITE_MATTERPORT_SDK_KEY`
   - **Value**: `bnx9rtn9umenhf4ym8bngu7ud`
   - Click **"Add secret"**

   ### Secret 2: VITE_MATTERPORT_MODEL_ID
   - **Name**: `VITE_MATTERPORT_MODEL_ID`
   - **Value**: `J9fEBnyKuiv`
   - Click **"Add secret"**

   ### Secret 3: VITE_GEMINI_API_KEY
   - **Name**: `VITE_GEMINI_API_KEY`
   - **Value**: `AIzaSyAe5Zh1uy2MFDmVGgiEbXOEPoFsYXeNSWY`
   - Click **"Add secret"**

   ### Secret 4: VITE_SERVER_URL (Optional)
   - **Name**: `VITE_SERVER_URL`
   - **Value**: `https://your-backend-url.com` (or leave as localhost if no backend deployed)
   - Click **"Add secret"**

## 📄 Step 2: Enable GitHub Pages

1. Go to: https://github.com/MazenDeebo/ArabIQ_matterport/settings/pages

2. Under **"Build and deployment"**:
   - **Source**: Select **"GitHub Actions"**
   - Click **"Save"**

## 🎯 Step 3: Trigger Deployment

The GitHub Actions workflow will automatically run when you push to `main`. To trigger it now:

**Option A: Make a small change and push**
```bash
cd "D:/ArabIQ company/Demos/matterport-smart-tour"
git commit --allow-empty -m "Trigger deployment"
git push
```

**Option B: Manually trigger from GitHub**
1. Go to: https://github.com/MazenDeebo/ArabIQ_matterport/actions
2. Click on **"Deploy to GitHub Pages"** workflow
3. Click **"Run workflow"** → **"Run workflow"**

## 👀 Step 4: Monitor Deployment

1. Go to: https://github.com/MazenDeebo/ArabIQ_matterport/actions

2. Watch the workflow progress:
   - **Build** job: Installs dependencies, creates .env, builds the app
   - **Deploy** job: Publishes to GitHub Pages

3. Wait for ✅ green checkmark (usually 2-5 minutes)

## 🌐 Step 5: Access Your Site

Once deployment completes, your site will be live at:

**🔗 https://mazendeebo.github.io/ArabIQ_matterport/**

## 🔍 Verification Checklist

- [ ] All 4 GitHub Secrets are added
- [ ] GitHub Pages source is set to "GitHub Actions"
- [ ] Workflow has run successfully (green checkmark)
- [ ] Site loads at the URL above
- [ ] Matterport 3D viewer appears
- [ ] No API key errors in browser console (F12)

## 🐛 Troubleshooting

### Deployment Fails

**Check the Actions logs:**
1. Go to https://github.com/MazenDeebo/ArabIQ_matterport/actions
2. Click on the failed workflow run
3. Click on the failed job
4. Read the error message

**Common issues:**
- ❌ Secrets not set → Add all 4 secrets
- ❌ Secret names don't match → Must be exact (case-sensitive)
- ❌ Build errors → Check the build logs

### Site Loads but Shows Errors

**Open browser console (F12):**
- ❌ "SDK key invalid" → Check `VITE_MATTERPORT_SDK_KEY` secret
- ❌ "Model not found" → Check `VITE_MATTERPORT_MODEL_ID` secret
- ❌ "Gemini API error" → Check `VITE_GEMINI_API_KEY` secret

### 404 Page Not Found

- Wait 5-10 minutes after first deployment
- Clear browser cache (Ctrl+Shift+R)
- Check that GitHub Pages is enabled
- Verify the URL is correct

## 🔄 Updating the Site

To update your deployed site:

```bash
cd "D:/ArabIQ company/Demos/matterport-smart-tour"

# Make your changes to the code

git add .
git commit -m "Your update message"
git push
```

The site will automatically rebuild and redeploy!

## 📱 Sharing Your Site

Once deployed, you can share this URL with anyone:
**https://mazendeebo.github.io/ArabIQ_matterport/**

No server needed - it's all hosted on GitHub Pages for free!

## 🔒 Security Notes

✅ **What's Protected:**
- `.env` files are NOT in git (blocked by .gitignore)
- API keys are stored as GitHub Secrets (encrypted)
- Secrets are only accessible during build
- No sensitive data in the repository

✅ **What's Safe:**
- Your code is public (if repo is public)
- Built files are public (but no secrets inside)
- Anyone can use your site
- Only you can see the secrets

⚠️ **Important:**
- Never commit `.env` files
- Never hardcode API keys in code
- Rotate keys if accidentally exposed
- Keep GitHub Secrets up to date

## 📞 Need Help?

1. Check the Actions logs for errors
2. Review the browser console (F12)
3. Read the full deployment guide: `DEPLOYMENT.md`
4. Verify all secrets are set correctly

---

**🎉 Congratulations! Your Matterport Smart Tour is ready to deploy!**
