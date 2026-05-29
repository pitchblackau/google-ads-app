import { GoogleAdsApi } from 'google-ads-api';
import { readFileSync } from 'fs';

// Parse .env.local manually
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => l.split('=').map(s => s.trim()))
    .map(([k, ...v]) => [k, v.join('=')])
);

const client = new GoogleAdsApi({
  client_id: env.GOOGLE_ADS_CLIENT_ID,
  client_secret: env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: env.GOOGLE_ADS_DEVELOPER_TOKEN,
});

const customer = client.Customer({
  customer_id: env.GOOGLE_ADS_MCC_CUSTOMER_ID,
  refresh_token: env.GOOGLE_ADS_REFRESH_TOKEN,
  login_customer_id: env.GOOGLE_ADS_MCC_CUSTOMER_ID,
});

console.log('Testing Google Ads API connection...');

try {
  const rows = await customer.query(`
    SELECT customer_client.id, customer_client.descriptive_name, customer_client.status
    FROM customer_client
    WHERE customer_client.status = 'ENABLED' AND customer_client.manager = false
  `);
  console.log(`\nConnected! Found ${rows.length} active client accounts:`);
  rows.forEach(r => console.log(` - ${r.customer_client.descriptive_name} (ID: ${r.customer_client.id})`));
} catch (err) {
  console.error('\nFailed:', err.message ?? err);
}
