import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { type } = await req.json();

    let prompt = '';
    let size = '1024x1024';

    switch (type) {
      case 'global-network':
        prompt = 'Global network visualization showing WhatsApp connections across world map with green connectivity lines and phone icons, dark background, professional tech aesthetic, emerald green accents, modern digital art style';
        size = '1536x1024';
        break;
      case 'automation-24-7':
        prompt = 'Modern digital interface showing multiple time zones with automation symbols, chat bubbles floating around clocks, calendar booking icons, dark tech aesthetic with green accents, 24/7 operations concept, professional UI design';
        break;
      case 'payment-success':
        prompt = 'Clean WhatsApp payment interface mockup with green checkmarks, payment confirmation screens, upward trending financial graphs, reduced cancellation icons, professional fintech aesthetic, dark theme, modern app design';
        break;
      default:
        throw new Error('Invalid image type');
    }

    console.log(`Generating image for type: ${type} with prompt: ${prompt}`);

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: prompt,
        n: 1,
        size: size,
        quality: 'hd',
        output_format: 'png'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data[0] || !data.data[0].b64_json) {
      throw new Error('No image data received from OpenAI');
    }

    const imageBase64 = data.data[0].b64_json;

    return new Response(
      JSON.stringify({ 
        imageUrl: `data:image/png;base64,${imageBase64}`,
        success: true 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-whatsapp-benefits-images function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});