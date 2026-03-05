# 📅 Content Planner — Setup & Deploy Guide

## Run Locally (test on your machine first)

Make sure you have **Node.js** installed. Download from https://nodejs.org if not.

```bash
# 1. Open terminal in this folder
cd content-planner

# 2. Install dependencies (only once)
npm install

# 3. Start the app
npm start
```
App opens at → http://localhost:3000

---

## 🚀 Deploy to Vercel (free, shareable link)

### Step 1 — Push to GitHub
1. Go to https://github.com and create a **New Repository** (name it `content-planner`)
2. Open terminal in this folder and run:
```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/content-planner.git
git push -u origin main
```
Replace `YOUR_USERNAME` with your actual GitHub username.

### Step 2 — Deploy on Vercel
1. Go to https://vercel.com and sign up (free) with your GitHub account
2. Click **"Add New Project"**
3. Select your `content-planner` repo
4. Click **Deploy** — that's it!

You'll get a link like: `https://content-planner-xyz.vercel.app`

Share this link with your colleagues ✅

---

## 📁 File Structure
```
content-planner/
├── public/
│   └── index.html
├── src/
│   ├── App.jsx       ← Main app code
│   └── index.js      ← Entry point
├── package.json
└── README.md
```

---

## ⚠️ Important Note
The AI features (AI Fill Month, AI Idea, AI Caption, AI Hashtags) use the Anthropic API.
These work automatically when running inside Claude.ai artifacts.

For the standalone deployed version, you'll need to add your Anthropic API key.
Add this to your `src/App.jsx` in the `callClaude` function headers:
```js
"x-api-key": "YOUR_ANTHROPIC_API_KEY",
"anthropic-version": "2023-06-01",
"anthropic-dangerous-direct-browser-access": "true",
```
Get your API key at: https://console.anthropic.com
