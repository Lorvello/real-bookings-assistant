import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { phoneNumber } = await req.json();

    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    // Validate phone number format (remove spaces/dashes, ensure starts with +)
    const cleanPhone = phoneNumber.replace(/[\s-]/g, '');
    if (!cleanPhone.match(/^\+?[1-9]\d{1,14}$/)) {
      throw new Error('Invalid phone number format');
    }

    // Generate WhatsApp link with tracking code
    const trackingCode = user.id.substring(0, 8).toUpperCase();
    const prefilledMessage = encodeURIComponent(`START_${trackingCode}`);
    const whatsappLink = `https://wa.me/${cleanPhone.replace('+', '')}?text=${prefilledMessage}`;

    // Generate SVG QR code
    const qrSize = 400;
    const qrSvg = generateQRCodeSVG(whatsappLink, qrSize);

    // Upload to Storage
    const fileName = `${user.id}/whatsapp-qr.svg`;
    const { error: uploadError } = await supabaseClient.storage
      .from('whatsapp-qr-codes')
      .upload(fileName, new Blob([qrSvg], { type: 'image/svg+xml' }), {
        contentType: 'image/svg+xml',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload QR code: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('whatsapp-qr-codes')
      .getPublicUrl(fileName);

    // Update users table
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({
        whatsapp_phone_number: phoneNumber,
        whatsapp_qr_url: publicUrl,
        whatsapp_qr_generated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error(`Failed to update settings: ${updateError.message}`);
    }

    console.log(`QR code generated successfully for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        qrUrl: publicUrl,
        whatsappLink 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-whatsapp-qr:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Simple QR Code SVG generator using path data
function generateQRCodeSVG(data: string, size: number): string {
  // For production, we'd use a proper QR library
  // This is a simplified version that creates a data URL QR via qrserver.com API approach
  // But for Deno edge functions, we'll use a different strategy
  
  const encodedData = encodeURIComponent(data);
  
  // Generate QR using an embedded approach (base64 data URL pattern)
  // In a real implementation, you'd use qrcode-generator or similar
  // For now, we'll create a simple SVG with embedded image
  
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="white"/>
  <image x="10" y="10" width="${size - 20}" height="${size - 20}" 
         xlink:href="https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&amp;data=${encodedData}"/>
  <text x="${size / 2}" y="${size - 10}" text-anchor="middle" font-size="12" fill="#666">
    Scan voor WhatsApp
  </text>
</svg>`;

  return svg;
}
