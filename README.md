# Carmelo — AI Slack Bot

Carmelo is a Slack bot powered by Google Gemini that responds to mentions in your workspace. Mention `@Carmelo` in any channel and it will respond using Gemini's AI, right in the channel.

---

## Features

- Responds to any `@Carmelo` mention in Slack
- Powered by Google Gemini 2.5 Flash Lite (free tier)
- Special command: `@Carmelo get me @someone here by 6am` → responds with *"it is done"*
- Graceful rate limit messaging when API quota is exceeded
- Runs on free infrastructure (Render + UptimeRobot)

---

## Tech Stack

- [Slack Bolt (Node.js)](https://slack.dev/bolt-js) — Slack app framework
- [Google Generative AI SDK](https://www.npmjs.com/package/@google/generative-ai) — Gemini API client
- [Render](https://render.com) — hosting (free tier)
- [UptimeRobot](https://uptimerobot.com) — keeps the service awake (free tier)

---

## Prerequisites

- A Slack workspace where you have permission to install apps
- A Google AI Studio account for a Gemini API key
- A Render account for hosting
- Node.js installed locally (if running locally)

---

## Setup

### 1. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click **Create New App → From Scratch**
2. Name it `Carmelo` and select your workspace
3. Under **OAuth & Permissions**, add these Bot Token Scopes:
   - `app_mentions:read`
   - `chat:write`
   - `channels:history`
4. Under **Event Subscriptions**, enable events and add the `app_mention` bot event
5. Under **Socket Mode**, enable it and generate an App-Level Token with the `connections:write` scope
6. Click **Install to Workspace** under **OAuth & Permissions** and authorize it

### 2. Get Your Tokens

| Token | Where to find it |
|---|---|
| `SLACK_BOT_TOKEN` | OAuth & Permissions → Bot User OAuth Token (`xoxb-...`) |
| `SLACK_SIGNING_SECRET` | Basic Information → App Credentials → Signing Secret |
| `SLACK_APP_TOKEN` | Basic Information → App-Level Tokens (`xapp-...`) |

### 3. Get a Gemini API Key

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Click **Create API Key** and select **Create new project**
3. Copy the key — no credit card required

### 4. Deploy to Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New Web Service** → connect your repo
3. Set the following:
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
4. Add these environment variables:

```
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_APP_TOKEN=xapp-...
GEMINI_API_KEY=...
```

5. Select the **Free** instance type and deploy

### 5. Keep It Awake with UptimeRobot

Render's free tier spins down after 15 minutes of inactivity. To prevent this:

1. Go to [uptimerobot.com](https://uptimerobot.com) and create a free account
2. Add a new **HTTP(s)** monitor pointing to your Render URL
3. Set the interval to every **5 minutes**

---

## Usage

Invite the bot to a channel first:
```
/invite @Carmelo
```

Then mention it with any question:
```
@Carmelo what is the current sentiment around gaming stocks?
@Carmelo summarize the latest Fed decision
@Carmelo get me @ivan here by 6am
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `SLACK_BOT_TOKEN` | Bot User OAuth Token from Slack |
| `SLACK_SIGNING_SECRET` | Signing secret from Slack app settings |
| `SLACK_APP_TOKEN` | App-level token for Socket Mode |
| `GEMINI_API_KEY` | API key from Google AI Studio |

---

## Free Tier Limits

| Service | Limit |
|---|---|
| Gemini 2.5 Flash Lite | 10 requests/minute, free |
| Render | 750 hours/month |
| UptimeRobot | 50 monitors, 5-minute intervals |

---

## Local Development

```bash
npm install
SLACK_BOT_TOKEN=xoxb-... \
SLACK_SIGNING_SECRET=... \
SLACK_APP_TOKEN=xapp-... \
GEMINI_API_KEY=... \
node index.js
```
