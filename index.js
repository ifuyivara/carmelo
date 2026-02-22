const { App } = require('@slack/bolt');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const http = require('http');

const slack = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  systemInstruction: {
    parts: [{ text: "You are Carmelo, a sharp market analyst in a Slack workspace. Keep answers concise and conversational, suited for Slack messages." }],
    role: "system"
  }
});

slack.event('app_mention', async ({ event, say }) => {
  try {
    const userMessage = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
    console.log(`Received message: ${userMessage}`);

    const result = await model.generateContent(userMessage);
    const responseText = result.response.text();

    console.log(`Sending response: ${responseText}`);

    await say({
      text: responseText,
      thread_ts: event.ts,
    });
  } catch (error) {
    console.error('Error:', error);
    await say({
      text: "Sorry, I ran into an error. Try again in a moment.",
      thread_ts: event.ts,
    });
  }
});

// Dummy HTTP server to keep Render happy
http.createServer((req, res) => res.end('Carmelo is alive')).listen(process.env.PORT || 3000);

(async () => await slack.start())();
