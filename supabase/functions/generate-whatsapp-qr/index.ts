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

    // Parse optional refresh flag from request body
    let refresh = false;
    try {
      const body = await req.json();
      refresh = !!body?.refresh;
      if (refresh) console.log(`QR refresh requested for user ${user.id}`);
    } catch (_) {
      // No JSON body provided
    }

    // Check if QR code already exists (QR codes are permanent)
    const { data: existingUser } = await supabaseClient
      .from('users')
      .select('whatsapp_qr_url, whatsapp_qr_generated_at')
      .eq('id', user.id)
      .single();

    if (existingUser?.whatsapp_qr_url) {
      // If it's an old SVG format, force regeneration to PNG
      if (existingUser.whatsapp_qr_url.endsWith('.svg')) {
        console.log(`Migrating old SVG QR to PNG for user ${user.id}`);
        const oldFileName = `${user.id}/whatsapp-qr.svg`;
        await supabaseClient.storage
          .from('whatsapp-qr-codes')
          .remove([oldFileName]);
        // Continue to generate new PNG below (don't return early)
      } else if (!refresh) {
        // QR already exists as PNG - return existing URL unless refresh was requested
        const PLATFORM_WHATSAPP_NUMBER = Deno.env.get('WHATSAPP_NUMBER') || '+15551766290';
        const cleanPhone = PLATFORM_WHATSAPP_NUMBER.replace(/[\s-]/g, '');

        // Haal business_name op uit users tabel voor existing QR
        const { data: userData } = await supabaseClient
          .from('users')
          .select('business_name')
          .eq('id', user.id)
          .single();

        const businessName = userData?.business_name || 'Ons bedrijf';
        const prefilledMessage = `👋 Hallo ${businessName}!\n(Verstuur dit bericht om de chat op te slaan, dan kun je altijd via WhatsApp een afspraak maken.)`;
        const whatsappLink = `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(prefilledMessage)}`;

        console.log(`QR code already exists for user ${user.id}, returning existing URL`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            qrUrl: existingUser.whatsapp_qr_url,
            whatsappLink,
            alreadyExists: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.log(`Refresh requested, regenerating QR for user ${user.id}`);
        // Fall through to generation below
      }
    }


    // Generate new QR code
    const PLATFORM_WHATSAPP_NUMBER = Deno.env.get('WHATSAPP_NUMBER') || '+15551766290';
    const cleanPhone = PLATFORM_WHATSAPP_NUMBER.replace(/[\s-]/g, '');
    
    // Haal business_name op uit users tabel
    const { data: userData } = await supabaseClient
      .from('users')
      .select('business_name')
      .eq('id', user.id)
      .single();

    const businessName = userData?.business_name || 'Ons bedrijf';
    const prefilledMessage = `👋 Hallo ${businessName}!\n(Verstuur dit bericht om de chat op te slaan, dan kun je altijd via WhatsApp een afspraak maken.)`;
    const whatsappLink = `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(prefilledMessage)}`;

    // Fetch QR code PNG from QRServer.com
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(whatsappLink)}`;
    const qrResponse = await fetch(qrApiUrl);
    
    if (!qrResponse.ok) {
      console.error('QR API error:', qrResponse.statusText);
      throw new Error(`Failed to generate QR code: ${qrResponse.statusText}`);
    }

    const qrImageBlob = await qrResponse.blob();

    // Upload PNG to Storage with unique filename to prevent CDN caching
    const timestamp = Date.now();
    const fileName = `${user.id}/whatsapp-qr-${timestamp}.png`;
    console.log(`Uploading new QR code: ${fileName}`);
    
    const { error: uploadError } = await supabaseClient.storage
      .from('whatsapp-qr-codes')
      .upload(fileName, qrImageBlob, {
        contentType: 'image/png',
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

    // Update users table with permanent QR URL
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({
        whatsapp_qr_url: publicUrl,
        whatsapp_qr_generated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error(`Failed to update user record: ${updateError.message}`);
    }

    // Clean up old QR code files
    try {
      const { data: existingFiles } = await supabaseClient.storage
        .from('whatsapp-qr-codes')
        .list(user.id);
      
      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles
          .filter(f => `${user.id}/${f.name}` !== fileName)
          .map(f => `${user.id}/${f.name}`);
        
        if (filesToDelete.length > 0) {
          const { error: deleteError } = await supabaseClient.storage
            .from('whatsapp-qr-codes')
            .remove(filesToDelete);
          
          if (deleteError) {
            console.warn('Failed to clean up old QR files:', deleteError);
          } else {
            console.log(`Cleaned up ${filesToDelete.length} old QR file(s)`);
          }
        }
      }
    } catch (cleanupError) {
      console.warn('Error during cleanup:', cleanupError);
    }

    console.log(`QR code generated successfully for user ${user.id} at ${fileName}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        qrUrl: publicUrl,
        whatsappLink,
        alreadyExists: false
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

