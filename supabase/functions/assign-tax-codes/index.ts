import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ASSIGN-TAX-CODES] ${step}${detailsStr}`);
};

// Enhanced service classification with ML-style keyword matching
const ENHANCED_CLASSIFICATIONS = {
  'professional_services': {
    keywords: ['consult', 'advice', 'legal', 'lawyer', 'attorney', 'accounting', 'finance', 'business', 'strategy', 'planning', 'coaching', 'mentor'],
    tax_codes: {
      'NL': 'txcd_30060000', 'DE': 'txcd_30060000', 'FR': 'txcd_30060000', 'GB': 'txcd_30060000',
      'US': 'txcd_30060000', 'CA': 'txcd_30060000', 'AU': 'txcd_30060000'
    },
    confidence_multiplier: 1.2
  },
  'medical': {
    keywords: ['medical', 'health', 'doctor', 'clinic', 'therapy', 'physio', 'dental', 'treatment', 'checkup', 'exam', 'surgery'],
    tax_codes: {
      'NL': 'txcd_30070000', 'DE': 'txcd_30070000', 'FR': 'txcd_30070000', 'GB': 'txcd_30070000',
      'US': 'txcd_30070000', 'CA': 'txcd_30070000', 'AU': 'txcd_30070000'
    },
    confidence_multiplier: 1.5
  },
  'personal_care': {
    keywords: ['massage', 'beauty', 'hair', 'salon', 'spa', 'wellness', 'facial', 'manicure', 'pedicure', 'fitness', 'training', 'yoga'],
    tax_codes: {
      'NL': 'txcd_20030000', 'DE': 'txcd_20030000', 'FR': 'txcd_20030000', 'GB': 'txcd_20030000',
      'US': 'txcd_20030000', 'CA': 'txcd_20030000', 'AU': 'txcd_20030000'
    },
    confidence_multiplier: 1.1
  },
  'educational': {
    keywords: ['lesson', 'teaching', 'education', 'class', 'course', 'workshop', 'seminar', 'training', 'tutoring'],
    tax_codes: {
      'NL': 'txcd_30060000', 'DE': 'txcd_30060000', 'FR': 'txcd_30060000', 'GB': 'txcd_30060000',
      'US': 'txcd_30060000', 'CA': 'txcd_30060000', 'AU': 'txcd_30060000'
    },
    confidence_multiplier: 1.0
  },
  'general': {
    keywords: ['service', 'appointment', 'meeting', 'session', 'booking'],
    tax_codes: {
      'NL': 'txcd_10000000', 'DE': 'txcd_10000000', 'FR': 'txcd_10000000', 'GB': 'txcd_10000000',
      'US': 'txcd_10000000', 'CA': 'txcd_10000000', 'AU': 'txcd_10000000'
    },
    confidence_multiplier: 0.5
  }
};

const getCountryTaxRate = (country: string): number => {
  const rates = {
    'NL': 21, 'DE': 19, 'FR': 20, 'GB': 20, 'US': 8.5, 'CA': 13, 'AU': 10,
    'ES': 21, 'IT': 22, 'BE': 21, 'AT': 20, 'DK': 25, 'SE': 25, 'FI': 24
  };
  return rates[country] || 21;
};

const classifyService = (serviceName: string, serviceDescription?: string): { category: string; confidence: number; keywords: string[] } => {
  const text = (serviceName + ' ' + (serviceDescription || '')).toLowerCase();
  const words = text.split(/\s+/);
  
  let bestMatch = { category: 'general', confidence: 0, keywords: [] };
  
  for (const [category, config] of Object.entries(ENHANCED_CLASSIFICATIONS)) {
    let matches = 0;
    const matchedKeywords = [];
    
    for (const keyword of config.keywords) {
      if (words.some(word => word.includes(keyword) || keyword.includes(word))) {
        matches++;
        matchedKeywords.push(keyword);
      }
    }
    
    const confidence = (matches / config.keywords.length) * config.confidence_multiplier;
    
    if (confidence > bestMatch.confidence) {
      bestMatch = {
        category,
        confidence: Math.min(confidence, 1.0),
        keywords: matchedKeywords
      };
    }
  }
  
  logStep('Service classified', {
    service: serviceName,
    category: bestMatch.category,
    confidence: bestMatch.confidence,
    keywords: bestMatch.keywords
  });
  
  return bestMatch;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Authenticate the user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { calendar_id, service_ids, business_country = 'NL', bulk_update = false } = await req.json();
    logStep('Function started', { 
      userId: user.id, 
      calendarId: calendar_id, 
      serviceIds: service_ids,
      businessCountry: business_country,
      bulkUpdate: bulk_update
    });

    // Get services to classify
    let query = supabaseClient
      .from('service_types')
      .select('*')
      .eq('is_active', true);

    if (calendar_id) {
      query = query.eq('calendar_id', calendar_id);
    }

    if (service_ids && service_ids.length > 0) {
      query = query.in('id', service_ids);
    } else if (!bulk_update) {
      // If no specific services and not bulk update, get services owned by user
      query = query.eq('user_id', user.id);
    }

    const { data: services, error: servicesError } = await query;

    if (servicesError) {
      throw new Error('Failed to fetch services: ' + servicesError.message);
    }

    if (!services || services.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No services found to classify',
        classified_count: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    logStep('Services to classify', { count: services.length });

    const results = [];
    let successCount = 0;

    for (const service of services) {
      try {
        const classification = classifyService(service.name, service.description);
        const taxCodes = ENHANCED_CLASSIFICATIONS[classification.category]?.tax_codes;
        const taxCode = taxCodes?.[business_country] || taxCodes?.['NL'] || 'txcd_10000000';
        const taxRate = getCountryTaxRate(business_country);

        // Update service with tax classification
        const { error: updateError } = await supabaseClient
          .from('service_types')
          .update({
            tax_enabled: true,
            tax_code: taxCode,
            applicable_tax_rate: taxRate,
            service_category: classification.category,
            business_country: business_country,
            tax_behavior: 'exclusive'
          })
          .eq('id', service.id);

        if (updateError) {
          logStep('Error updating service', { serviceId: service.id, error: updateError.message });
          results.push({
            service_id: service.id,
            service_name: service.name,
            success: false,
            error: updateError.message
          });
        } else {
          successCount++;
          results.push({
            service_id: service.id,
            service_name: service.name,
            success: true,
            category: classification.category,
            confidence: classification.confidence,
            tax_code: taxCode,
            tax_rate: taxRate,
            keywords_matched: classification.keywords
          });
          
          logStep('Service classified and updated', {
            serviceId: service.id,
            serviceName: service.name,
            category: classification.category,
            taxCode: taxCode,
            confidence: classification.confidence
          });
        }

        // Update service classification cache
        await supabaseClient
          .from('service_classifications')
          .upsert({
            service_name: service.name,
            classification_keywords: classification.keywords,
            suggested_category: classification.category,
            confidence_score: classification.confidence,
            country_specific_tax_codes: { [business_country]: taxCode }
          });

      } catch (serviceError) {
        logStep('Error processing service', { serviceId: service.id, error: serviceError.message });
        results.push({
          service_id: service.id,
          service_name: service.name,
          success: false,
          error: serviceError.message
        });
      }
    }

    logStep('Classification complete', { 
      totalServices: services.length,
      successCount,
      failureCount: services.length - successCount,
      businessCountry: business_country
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Classified ${services.length} services: ${successCount} successful, ${services.length - successCount} failed`,
      classified_count: successCount,
      total_services: services.length,
      business_country: business_country,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    logStep('ERROR', { message: error.message });
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});