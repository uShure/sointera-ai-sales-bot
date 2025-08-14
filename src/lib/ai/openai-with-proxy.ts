import OpenAI from 'openai';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Настраиваем глобальный агент для всех HTTPS запросов
const proxyUrl = 'http://127.0.0.1:10809';
const agent = new HttpsProxyAgent(proxyUrl);

// Патчим глобальный fetch чтобы использовать прокси
const originalFetch = global.fetch;
global.fetch = async (url: any, options: any = {}) => {
  if (typeof url === 'string' && url.includes('api.openai.com')) {
    console.log('Routing OpenAI request through proxy...');
    options.agent = agent;
  }
  return originalFetch(url, options);
};

// Создаем клиент OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  httpAgent: agent as any,
  maxRetries: 2,
});

export async function callOpenAIWithProxy(messages: any[]) {
  try {
    console.log('Calling OpenAI API through proxy...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });
    
    return completion.choices[0].message.content;
  } catch (error: any) {
    console.error('OpenAI API Error:', error.message);
    throw error;
  }
}

export { openai };
