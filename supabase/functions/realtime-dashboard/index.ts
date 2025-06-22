
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const { headers } = req
  const upgradeHeader = headers.get("upgrade") || ""
  
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 })
  }

  const { socket, response } = Deno.upgradeWebSocket(req)
  
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  let calendarId: string | null = null

  socket.onopen = () => {
    console.log("🔗 WebSocket connection opened")
    socket.send(JSON.stringify({ type: 'connected', message: 'Real-time dashboard connected' }))
  }

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data)
      
      if (data.type === 'subscribe' && data.calendarId) {
        calendarId = data.calendarId
        console.log(`📡 Subscribed to calendar: ${calendarId}`)
        
        // Set up database change listener
        const channel = supabase
          .channel(`dashboard-${calendarId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'bookings',
              filter: `calendar_id=eq.${calendarId}`,
            },
            (payload) => {
              console.log('📈 Booking change detected:', payload)
              socket.send(JSON.stringify({
                type: 'booking_update',
                payload: payload,
                timestamp: new Date().toISOString()
              }))
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'whatsapp_messages',
            },
            async (payload) => {
              // Check if this message belongs to our calendar
              if (payload.new && payload.new.conversation_id) {
                const { data: conversation } = await supabase
                  .from('whatsapp_conversations')
                  .select('calendar_id')
                  .eq('id', payload.new.conversation_id)
                  .single()
                
                if (conversation?.calendar_id === calendarId) {
                  console.log('💬 WhatsApp message update:', payload)
                  socket.send(JSON.stringify({
                    type: 'whatsapp_update',
                    payload: payload,
                    timestamp: new Date().toISOString()
                  }))
                }
              }
            }
          )
          .subscribe()

        socket.send(JSON.stringify({
          type: 'subscribed',
          calendarId: calendarId,
          message: 'Subscribed to real-time updates'
        }))
      }
    } catch (error) {
      console.error('❌ WebSocket message error:', error)
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message'
      }))
    }
  }

  socket.onclose = () => {
    console.log("🔌 WebSocket connection closed")
  }

  socket.onerror = (error) => {
    console.error("❌ WebSocket error:", error)
  }

  return response
})
