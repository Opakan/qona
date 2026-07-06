import { chatCompletion } from '../src/services/deepseek.js';
import { extractIntent } from '../src/services/intent-extractor.js';
import { config } from '../src/config.js';

console.log('API Key config value:', config.DEEPSEEK_API_KEY ? 'Present (starts with ' + config.DEEPSEEK_API_KEY.slice(0, 7) + ')' : 'MISSING');

async function testSimple() {
  try {
    console.log('Sending simple chatCompletion request...');
    const result = await chatCompletion([
      { role: 'user', content: 'Say hello!' }
    ]);
    console.log('SUCCESS! Response:', result);
  } catch (err: any) {
    console.error('FAILED simple chatCompletion!');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Headers:', err.response.headers);
      console.error('Data:', err.response.data);
    } else {
      console.error('Error message:', err.message);
    }
  }
}

async function testIntent() {
  try {
    console.log('Sending extractIntent request for "Save Gmail attachments to Google Drive"...');
    const result = await extractIntent('Save Gmail attachments to Google Drive');
    console.log('SUCCESS! Intent:', JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error('FAILED extractIntent!');
    console.error('Error message:', err.message);
    if (err.rawResponse) {
      console.error('Raw response from AI:', err.rawResponse);
    }
  }
}

async function run() {
  await testSimple();
  await testIntent();
}

run();
