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
  model: 'gemini-2.5-flash-lite',
  systemInstruction: {
    parts: [{ text: "You are Carmelo, a sharp market analyst in a Slack workspace. Keep answers concise and conversational, suited for Slack messages." }],
    role: "system"
  }
});

slack.event('app_mention', async ({ event, say }) => {
  try {
    const userMessage = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
    console.log(`Received message: ${userMessage}`);

    // Special case: "get me [name] here by 6am"
    if (/get me (<@[A-Z0-9]+>|\w+) here by 6am/i.test(userMessage)) {
      await say({ text: "it is done" });
      return;
    }

    const result = await model.generateContent(userMessage);
    const responseText = result.response.text();

    console.log(`Sending response: ${responseText}`);

    await say({ text: responseText });
  } catch (error) {
    console.error('Error:', error);

    if (error.status === 429) {
      await say({ text: "I've hit my rate limit — give me a minute and try again." });
    } else {
      await say({ text: "Sorry, I ran into an error. Try again in a moment." });
    }
  }
});

// Dummy HTTP server to keep Render happy
http.createServer((req, res) => res.end('Carmelo is alive')).listen(process.env.PORT || 3000);

(async () => await slack.start())();
