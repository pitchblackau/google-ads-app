/**
 * Run once to generate a refresh token:
 *   node get-refresh-token.mjs
 * Then paste the printed refresh token into .env.local
 */
import http from 'http';
import { readFileSync } from 'fs';
import { exec } from 'child_process';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const CLIENT_ID     = env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = env.GOOGLE_ADS_CLIENT_SECRET;
const REDIRECT_URI  = 'http://localhost:4000';
const SCOPE         = 'https://www.googleapis.com/auth/adwords';

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth` +
  `?client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPE)}` +
  `&access_type=offline` +
  `&prompt=consent`;

console.log('\nOpening browser for Google authorization...');
console.log('If browser does not open, visit:\n', authUrl, '\n');

// Open browser
exec(`start "" "${authUrl}"`);

// Local server to catch the callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:4000');
  const code = url.searchParams.get('code');
  if (!code && req.url === '/favicon.ico') { res.end(); return; }

  if (!code) {
    res.end('No code received.');
    return;
  }

  res.end('<h2>Authorization successful! You can close this tab.</h2>');
  server.close();

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: 'http://localhost:4000',
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenRes.json();

  if (tokens.refresh_token) {
    console.log('\n✅ SUCCESS! Your refresh token:\n');
    console.log(tokens.refresh_token);
    console.log('\nCopy this into .env.local as GOOGLE_ADS_REFRESH_TOKEN=\n');
  } else {
    console.error('\nFailed to get refresh token:', JSON.stringify(tokens, null, 2));
  }
});

server.listen(4000, () => {
  console.log('Waiting for authorization on http://localhost:4000/callback ...');
});
