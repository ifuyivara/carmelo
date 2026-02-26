const { App } = require('@slack/bolt');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const http = require('http');
const { HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

const slack = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
  systemInstruction: {
    parts: [{ text: `You are Carmelo, a degenerate genius senior market analyst who lives and breathes tech stocks. You cover AI, semiconductors, cloud infrastructure, cybersecurity, and consumer tech. You have the analytical depth of a Goldman Sachs MD but communicate like a WSB veteran — raw, unfiltered, confident to the point of arrogance, and occasionally unhinged. You use WSB slang naturally: tendies, apes, retard, smooth brain, diamond hands, paper hands, to the moon, yolo, bags, rekt, theta gang, printing, calls, puts, squeeze. You are not a financial advisor and you don't pretend to be. No emojis. No corporate speak. No hedging your opinion like a coward. All analysis must be factually accurate and grounded in real market data — the slang is the delivery, not a substitute for substance. Keep responses under 150 words. When analyzing a stock always include: current price if known, a one sentence thesis, and the key risk. Always fetch the current real-time price for any stock mentioned using Google Search before responding. Never rely on prices from your training data or any price that is more than 15 minutes old. If you cannot retrieve a current price, say so explicitly rather than stating an outdated one. End every response with a sentiment tag on its own line in this exact format: [SENTIMENT: Bullish | Bearish | Neutral] [CONVICTION: High | Medium | Low]` }],
    role: "system"
  },
  tools: [{ googleSearch: {} }],
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ],
});

// Store conversation history per thread
const threadHistory = {};

async function getGeminiResponse(userMessage, threadTs) {
  if (!threadHistory[threadTs]) {
    threadHistory[threadTs] = [];
  }

  const now = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'long' });
  const timestampedMessage = `[Current time: ${now} Eastern]\n\n${userMessage}`;

  threadHistory[threadTs].push({
    role: 'user',
    parts: [{ text: timestampedMessage }],
  });

  if (threadHistory[threadTs].length > 20) {
    threadHistory[threadTs] = threadHistory[threadTs].slice(-20);
  }

  const chat = model.startChat({
    history: threadHistory[threadTs].slice(0, -1),
  });

  const result = await chat.sendMessage(userMessage);
  const responseText = result.response.text();

  threadHistory[threadTs].push({
    role: 'model',
    parts: [{ text: responseText }],
  });

  return responseText;
}

async function getMorningBrief(tickers) {
  const tickerList = tickers.join(', ');
  const prompt = `Give me a morning brief for the following stocks: ${tickerList}. For each stock provide: current price, one sentence on overnight/premarket movement or key news, and sentiment. Keep each stock to 2 sentences maximum.`;

  const chat = model.startChat({ history: [] });
  const result = await chat.sendMessage(prompt);
  return result.response.text();
}

slack.event('app_mention', async ({ event, say }) => {
  try {
    const rawMessage = event.text;
    const userMessage = rawMessage.replace(/<@[A-Z0-9]+>/g, '').trim();
    const threadTs = event.thread_ts || event.ts;
    console.log(`Received message: ${userMessage}`);

    // Special case: "get me @someone here by 6am"
    if (/get me <@[A-Z0-9]+> here by 6am/i.test(rawMessage)) {
      await say({ text: "it is done", thread_ts: event.ts });
      return;
    }

    // Special case: morning brief with ticker list (supports both $AAPL and AAPL formats)
    const morningBriefMatch = userMessage.match(/morning brief[:\s]+([\$A-Z,\s]+)/i);
    if (morningBriefMatch) {
      const tickers = morningBriefMatch[1]
        .split(/[\s,]+/)
        .map(t => t.replace('$', '').trim().toUpperCase())
        .filter(t => t.length > 0);

      if (tickers.length > 0) {
        const brief = await getMorningBrief(tickers);
        await say({ text: brief, thread_ts: event.ts });
        return;
      }
    }

    // Detect ticker symbols like $AAPL, $NVDA, $U
    const tickers = [...userMessage.matchAll(/\$([A-Z]{1,5})/gi)].map(m => m[1].toUpperCase());
    let enrichedMessage = userMessage;
    if (tickers.length > 0) {
      enrichedMessage = `${userMessage}\n\n[Note: The following ticker symbols were referenced: ${tickers.join(', ')}. Treat these as stock market tickers.]`;
    }

    const responseText = await getGeminiResponse(enrichedMessage, threadTs);
    console.log(`Sending response: ${responseText}`);
    await say({ text: responseText, thread_ts: event.ts });

  } catch (error) {
    console.error('Error:', error);

    if (error.status === 429) {
      await say({ text: "I've hit my rate limit — give me a minute and try again.", thread_ts: event.ts });
    } else {
      await say({ text: "Sorry, I ran into an error. Try again in a moment.", thread_ts: event.ts });
    }
  }
});

// Dummy HTTP server to keep Render happy
http.createServer((req, res) => res.end('Carmelo is alive')).listen(process.env.PORT || 3000);

(async () => await slack.start())();
