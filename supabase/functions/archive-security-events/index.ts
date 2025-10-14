import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

Deno.cron("Archive old security events", "0 2 * * *", async () => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  console.log('Running security event archival...');

  try {
    const { data, error } = await supabaseClient.rpc('archive_old_security_events');

    if (error) {
      console.error('Archival failed:', error);
    } else {
      console.log(`Archived ${data} security events`);
    }
  } catch (err) {
    console.error('Archival process error:', err);
  }
});

Deno.serve(async () => {
  return new Response(
    JSON.stringify({ message: 'Archive security events cron job is running' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
