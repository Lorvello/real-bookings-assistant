import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, targetLang, sourceLang = 'auto' } = await req.json();

    if (!text || !targetLang) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: text and targetLang' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If target language is English and source is auto, just return the text
    if (targetLang === 'en' && sourceLang === 'auto') {
      return new Response(
        JSON.stringify({ translatedText: text, detectedSourceLang: 'en' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use LibreTranslate free service
    const translateResponse = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: targetLang,
        format: 'text'
      }),
    });

    if (!translateResponse.ok) {
      console.error('LibreTranslate API error:', translateResponse.status);
      return new Response(
        JSON.stringify({ error: 'Translation service unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const translateData = await translateResponse.json();
    
    return new Response(
      JSON.stringify({
        translatedText: translateData.translatedText,
        detectedSourceLang: translateData.detectedLanguage || sourceLang
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Translation error:', error);
    return new Response(
      JSON.stringify({ error: 'Translation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});