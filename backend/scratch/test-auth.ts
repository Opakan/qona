import { config } from '../src/config.js';
import axios from 'axios';

const header = { alg: 'HS256', typ: 'JWT' };
const payload = {
  sub: 'mock-user-12345',
  email: 'tester@qona.ai',
  email_verified: true,
  user_metadata: {
    full_name: 'Guest User',
  },
  role: 'USER',
  aud: 'authenticated',
  exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
};

const base64UrlEncode = (obj: any) => {
  const str = JSON.stringify(obj);
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const token = `${base64UrlEncode(header)}.${base64UrlEncode(payload)}.mocksignature`;

console.log('Sending request to http://localhost:4000/api/conversations with Bearer token...');

axios.get('http://localhost:4000/api/conversations', {
  headers: {
    Authorization: `Bearer ${token}`
  }
})
.then(res => {
  console.log('SUCCESS!');
  console.log('Status:', res.status);
  console.log('Data:', JSON.stringify(res.data, null, 2));
})
.catch(err => {
  console.error('ERROR!');
  if (err.response) {
    console.error('Status:', err.response.status);
    console.error('Data:', JSON.stringify(err.response.data, null, 2));
  } else {
    console.error('Message:', err.message);
  }
});
