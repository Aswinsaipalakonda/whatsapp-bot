# 🚀 WhatsApp Bot Deployment Guide

This guide will walk you through the complete process of setting up the **WhatsApp Cloud API on Meta for Developers** and deploying your bot to a live server (**Hostinger VPS** or **Vercel**).

---

## 📌 Table of Contents
1. [Phase 1: Meta Developers & WhatsApp Setup](#phase-1-meta-developers--whatsapp-setup)
2. [Phase 2: Obtaining a Permanent Access Token (Critical)](#phase-2-obtaining-a-permanent-access-token-critical)
3. [Phase 3: Deployment - Option A: Hostinger / VPS (Recommended)](#phase-3-deployment---option-a-hostinger--vps-recommended)
4. [Phase 4: Deployment - Option B: Vercel (Serverless Note)](#phase-4-deployment---option-b-vercel-serverless-note)
5. [Phase 5: Configuring the Webhook](#phase-5-configuring-the-webhook)

---

## 🛠️ Phase 1: Meta Developers & WhatsApp Setup

To communicate with WhatsApp, you must use the Meta for Developers platform.

### Step 1: Create a Meta Developer Account
1. Go to [Meta for Developers](https://developers.facebook.com/).
2. Log in with your Facebook account.
3. Click **Get Started** and follow the prompts to register as a developer.

### Step 2: Create a Meta App
1. Go to your **My Apps** dashboard.
2. Click **Create App** in the top right.
3. Choose **Other** -> Click **Next**.
4. Select **Business** as the app type -> Click **Next**.
5. Fill in your **App Name** (e.g., *Nidha Loans Bot*) and choose your **Business Account** (if you don't have one, Meta will create one for you). Click **Create App**.

### Step 3: Add WhatsApp to your App (New Dashboard UI)
1. On your App Dashboard dashboard, click on **Use cases** in the left sidebar OR the **Add use cases** button in the main panel.
2. In the popup window, click on **All** under the "Filter by" section on the left side to see the full list of available use cases.
3. Find **WhatsApp** (usually *"Send messages with WhatsApp"*) and click **Set up** or **Add**.
4. Follow the prompts to select or create your **Meta Business Account**. Click **Continue**.
5. Once set up, look for a new **WhatsApp** option in your left sidebar.

> [!TIP]
> **Troubleshooting:** If you click "All" and still do not see WhatsApp, you may have selected the wrong **App Type** in Step 2. You must create a new app and ensure you select **Other -> Business**.

---

## 🛠️ Phase 2: Obtaining a Permanent Access Token (Critical)

Meta gives you a **Temporary Access Token** explicitly for testing that expires in 24 hours. **Do not use this for deployment.**

### Step 1: Set up a System User
1. Go to [Meta Business Suite Settings](https://business.facebook.com/settings).
2. On the left sidebar, click **Users** -> **System users**.
3. Click **Add**. Name it (e.g., *BotAdmin*), and set the Role to **Admin System User**.
4. Click **Create System User**.

### Step 2: Assign Assets
1. Select the new System User you created.
2. Click **Assign Assets** -> Select **Apps** -> Select your WhatsApp Bot App.
3. Toggle ON **Full control (Manage app)** and click **Save Changes**.

### Step 3: Generate Permanent Token
1. Next to the System User’s name, click **Generate Token**.
2. Select your WhatsApp App from the dropdown.
3. Under available permissions, check:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
4. Click **Generate Token**.
5. ⚠️ **Copy the token immediately!** Place this in your `.env` file as `ACCESS_TOKEN`. This token will never expire.

---

## 🌐 Phase 3: Deployment - Option A: Hostinger / VPS (Recommended)

*💡 **Why VPS?** This application stores user conversation history in memory (`sessions.js`). Traditional Hostinger VPS or standard Dedicated Servers keep the app running 24/7 without wiping memory.*

### Step 1: Prep your VPS
1. Access your VPS terminal via SSH:
   ```bash
   ssh root@your_server_ip
   ```
2. Install Node.js (Version 18+ is recommended):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

### Step 2: Upload or Clone the Bot
Clone your Git repository or use SFTP (like FileZilla) to upload files.
```bash
git clone https://github.com/Aswinsaipalakonda/whatsapp-bot.git
cd whatsapp-bot
```

### Step 3: Install Production Process Manager (PM2)
To keep your app running in the background even after you close the terminal:
```bash
sudo npm install -g pm2
```

### Step 4: Configure Environments
Create and edit your `.env` file on the server:
```bash
nano .env
```
Add your credentials:
```env
PORT=3000
VERIFY_TOKEN=nidhaloans123
PHONE_NUMBER_ID=your_permanent_id
ACCESS_TOKEN=your_permanent_token
ANTHROPIC_API_KEY=your_anthropic_key
ADMIN_PHONE=91XXXXXXXXXX
```
Paste your company PDF knowledge inside the `./data/loan_knowledge.pdf` path on the server.

### Step 5: Boot Up
```bash
npm install
pm2 start index.js --name "whatsapp-bot"
pm2 save
pm2 startup
```
Your app is now running on `http://your_server_ip:3000`. You can tie this to a domain through Reverse Proxy (using Nginx) or test it directly.

---

## 🌐 Phase 4: Deployment - Option B: Vercel (Important Note)

*⚠️ **STATLESS WARNING:** Vercel operates on Serverless Functions. This means every API trigger boots a fresh container. In-memory storage (`sessions.js`) will reset, and loading the PDF will slow down performance marginally.*

**To proceed on Vercel correctly without losing session memories, you MUST change your state mechanics to a database (like MongoDB or Redis) before using this method for scaling.**

### Step 1: Add a Configuration file for Vercel
Create a file named `vercel.json` in your root directory:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "index.js"
    }
  ]
}
```

### Step 2: Deploy using Vercel CLI
1. Install Vercel locally: `npm install -g vercel`
2. Run `vercel` in your project terminal.
3. Log in and follow setup prompts.
4. Add your `.env` secrets on Vercel when prompted or inside the Vercel online dashboard under **Settings -> Environment Variables**.

---

## 🔄 Phase 5: Configuring the Webhook

Once your app is deployed and you have a **Public HTTPS URL** (like `https://your-app.vercel.app` or `https://bot.yourdomain.com`), connect Meta to your server.

### Step 1: Connect Callback URL
1. Go back to your Meta App Dashboard -> **WhatsApp** -> **Configuration**.
2. Click **Edit** next to Webhook configuration.
3. **Callback URL:** `https://your-public-url.com/webhook`
4. **Verify Token:** Type exactly what you defined in your `.env` as `VERIFY_TOKEN` (e.g., `nidhaloans123`).
5. Click **Verify and save**. Meta will hit your server once to confirm it’s online.

### Step 2: Subscribe to Events
1. In the Webhook Configuration settings, find the **Webhook fields** section.
2. Click **Manage**.
3. Scroll down and check the box for **`messages`**.
4. Click **Done**.

🎉 **Congratulations!** Your Node.js WhatsApp bot is now live, monitoring incoming messages, and feeding them to Claude AI for responses. Use your mobile number to send a text and test the flow!
