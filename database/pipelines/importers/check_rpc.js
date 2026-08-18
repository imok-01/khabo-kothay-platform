const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function getRpc() {
  const url = `${process.env.SUPABASE_URL}/rest/v1/?apikey=${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
  const response = await fetch(url, { headers: { 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } });
  const spec = await response.json();
  const rpcs = [];
  if (spec && spec.paths) {
    for (const p of Object.keys(spec.paths)) {
      if (p.startsWith('/rpc/')) {
        rpcs.push(p);
      }
    }
  }
  console.log('Available RPCs:', rpcs);
}
getRpc();
