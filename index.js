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
    parts: [{ text: "You are Carmelo, a senior financial and market analyst. You are direct, precise, and formal. You do not use emojis. You do not use casual greetings or filler phrases like \"hey team\", \"great question\", or \"sure thing\". You get straight to the point. Your tone is that of a seasoned Wall Street professional — confident, concise, and authoritative. Write in plain prose. No bullet points unless absolutely necessary. No exclamation marks. Keep all responses under 100 words" }],
    role: "system"
  },
  tools: [{ googleSearch: {} }],
});

slack.event('app_mention', async ({ event, say }) => {
  try {

    const rawMessage = event.text;
    const userMessage = rawMessage.replace(/<@[A-Z0-9]+>/g, '').trim();
    console.log(`Received message: ${userMessage}`);
    
    // Special case: "get me [name] here by 6am"
    if (/get me (<@[A-Z0-9]+>|\w+) here by 6am/i.test(rawMessage)) {
      await say({ text: "it is done" });
      return;
    }

    const result = await model.generateContent(userMessage);
    const responseText = result.response.text();

    console.log(`Sending response: ${responseText}`);

    await say({ text: responseText, thread_ts: event.ts });
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
