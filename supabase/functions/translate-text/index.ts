import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Language code mapping for LibreTranslate compatibility
const languageCodeMap: { [key: string]: string } = {
  'zh': 'zh-cn', // Chinese simplified
  'pt': 'pt-br', // Portuguese
  'no': 'nb',    // Norwegian
  'he': 'iw',    // Hebrew
};

// Get compatible language code for LibreTranslate
const getCompatibleLangCode = (code: string): string => {
  return languageCodeMap[code] || code;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Translation request received');
    // Default to {} on unparseable JSON so the validation below returns a clean
    // 400 instead of the catch-all 500.
    const { text, targetLang, sourceLang = 'auto' } = await req.json().catch(() => ({}));
    console.log(`Translating from ${sourceLang} to ${targetLang}: "${text}"`);

    if (!text || !targetLang) {
      console.error('Missing parameters:', { text: !!text, targetLang: !!targetLang });
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: text and targetLang' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // This endpoint is public (verify_jwt=false) and proxies an external API.
    // Cap the payload size so it can't be abused to push huge bodies through the
    // function / upstream. Legit callers (conversational messages) are short. NOTE:
    // a per-IP request-rate limit would further bound spam, but is intentionally
    // NOT added here because the n8n WhatsApp agent may call this at volume from a
    // single IP — set that only once the agent's call pattern is known.
    if (typeof text !== 'string' || text.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Text too long (max 5000 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If target language is English and source is auto, just return the text
    if (targetLang === 'en' && sourceLang === 'auto') {
      console.log('Returning original text for English');
      return new Response(
        JSON.stringify({ translatedText: text, detectedSourceLang: 'en' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert language codes to LibreTranslate compatible format
    const compatibleTargetLang = getCompatibleLangCode(targetLang);
    const compatibleSourceLang = sourceLang === 'auto' ? 'auto' : getCompatibleLangCode(sourceLang);

    console.log(`Using compatible codes: ${compatibleSourceLang} -> ${compatibleTargetLang}`);

    try {
      // Use LibreTranslate free service with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const translateResponse = await fetch('https://libretranslate.com/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: compatibleSourceLang,
          target: compatibleTargetLang,
          format: 'text'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log(`LibreTranslate response status: ${translateResponse.status}`);

      if (!translateResponse.ok) {
        const errorText = await translateResponse.text();
        console.error('LibreTranslate API error:', translateResponse.status, errorText);
        
        // Return fallback response instead of error
        return new Response(
          JSON.stringify({ 
            translatedText: `[${targetLang.toUpperCase()}] ${text}`,
            detectedSourceLang: sourceLang 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const translateData = await translateResponse.json();
      console.log('Translation successful:', translateData);
      
      return new Response(
        JSON.stringify({
          translatedText: translateData.translatedText,
          detectedSourceLang: translateData.detectedLanguage || sourceLang
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (fetchError) {
      console.error('LibreTranslate fetch error:', fetchError);
      
      // Return fallback response for network errors
      return new Response(
        JSON.stringify({ 
          translatedText: `[${targetLang.toUpperCase()}] ${text}`,
          detectedSourceLang: sourceLang 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Translation error:', error);
    return new Response(
      JSON.stringify({ error: 'Translation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});