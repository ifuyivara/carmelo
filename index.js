const { App } = require('@slack/bolt');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const slack = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // free tier model

slack.event('app_mention', async ({ event, say }) => {
  try {
    const userMessage = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();

    const chat = model.startChat({
        history: [],
        systemInstruction: "You are Carmelo, a sharp market analyst in a Slack workspace. Keep answers concise and conversational, suited for Slack messages.",
    });

    const result = await chat.sendMessage(userMessage);
    const responseText = result.response.text();

    await say({
      text: responseText,
      thread_ts: event.ts,
    });
  } catch (error) {
    console.error(error);
    await say({
      text: "Sorry, I ran into an error. Try again in a moment.",
      thread_ts: event.ts,
    });
  }
});

(async () => await slack.start())();