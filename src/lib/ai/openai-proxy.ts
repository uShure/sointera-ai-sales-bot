import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const proxyAgent = new HttpsProxyAgent('http://127.0.0.1:10809');

export async function callOpenAI(messages: any[], apiKey: string) {
  try {
    console.log('Calling OpenAI through proxy...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      agent: proxyAgent,
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const data = await response.json() as any;
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      throw new Error(`OpenAI error: ${response.status}`);
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error;
  }
}
