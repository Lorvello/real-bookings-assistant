
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Verificatie van WhatsApp webhook (indien nodig)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      // Verificeer token (stel je eigen verify token in)
      const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'your_verify_token';
      
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verified');
        return new Response(challenge, { 
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      } else {
        console.log('Webhook verification failed');
        return new Response('Forbidden', { status: 403 });
      }
    }

    // Verwerk inkomende webhook data
    if (req.method === 'POST') {
      const payload = await req.json();
      console.log('Received WhatsApp webhook:', JSON.stringify(payload, null, 2));

      // Bepaal webhook type op basis van payload structuur
      let webhookType = 'message';
      
      if (payload.entry?.[0]?.changes?.[0]?.value?.messages) {
        webhookType = 'message';
      } else if (payload.entry?.[0]?.changes?.[0]?.value?.statuses) {
        webhookType = 'status';
      } else if (payload.entry?.[0]?.changes?.[0]?.value?.contacts) {
        webhookType = 'contact_update';
      }

      // Voeg webhook toe aan queue voor verwerking
      const { error } = await supabaseClient
        .from('whatsapp_webhook_queue')
        .insert([{
          webhook_type: webhookType,
          payload: payload
        }]);

      if (error) {
        console.error('Error adding webhook to queue:', error);
        return new Response(JSON.stringify({ error: 'Failed to queue webhook' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Voor messages, probeer direct te verwerken
      if (webhookType === 'message') {
        try {
          const messages = payload.entry?.[0]?.changes?.[0]?.value?.messages;
          const contacts = payload.entry?.[0]?.changes?.[0]?.value?.contacts;
          
          if (messages && messages.length > 0 && contacts && contacts.length > 0) {
            const message = messages[0];
            const contact = contacts[0];
            
            // Extract calendar_id from business phone number or metadata
            // Dit zou je moeten aanpassen op basis van je WhatsApp Business setup
            const businessPhoneNumberId = payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
            
            // Voor nu gebruiken we een default calendar_id - dit moet je aanpassen
            const calendarId = Deno.env.get('DEFAULT_CALENDAR_ID');
            
            if (calendarId && message.type === 'text') {
              await supabaseClient.rpc('process_whatsapp_message', {
                p_phone_number: contact.wa_id,
                p_message_id: message.id,
                p_message_content: message.text?.body || '',
                p_calendar_id: calendarId
              });
            }
          }
        } catch (processError) {
          console.error('Error processing message:', processError);
          // Continue - webhook is queued for retry
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405 });

  } catch (error) {
    console.error('Error in WhatsApp webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
