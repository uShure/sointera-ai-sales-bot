import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function callOpenAI(messages: any[], apiKey: string): Promise<string> {
  try {
    console.log('Calling OpenAI through proxy with curl...');

    const data = JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    });

    // Экранируем данные для shell
    const escapedData = data.replace(/'/g, "'\\''").replace(/"/g, '\\"');

    const curlCommand = `curl -x http://127.0.0.1:10809 -s -X POST https://api.openai.com/v1/chat/completions \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${apiKey}" \
      -d '${data.replace(/'/g, "'\\''")}'`;

    console.log('Executing curl command through proxy...');
    const { stdout, stderr } = await execPromise(curlCommand);

    if (stderr) {
      console.error('Curl error:', stderr);
      throw new Error(stderr);
    }

    console.log('OpenAI response received successfully');
    const response = JSON.parse(stdout);

    if (response.error) {
      console.error('OpenAI API error:', response.error);
      throw new Error(response.error.message);
    }

    return response.choices[0].message.content;

  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error;
  }
}
