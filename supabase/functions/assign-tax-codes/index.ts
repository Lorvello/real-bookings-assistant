import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate the write payload. calendar_id / service_ids constrain WHICH of the
// caller's own services get classified; business_country is an ISO-2 code that
// selects the country tax-code map + rate, so it must be one of the supported
// countries (no arbitrary string reaching the rate/map lookup). zod .object()
// strips any other body fields.
const SUPPORTED_COUNTRIES = ['NL', 'DE', 'FR', 'GB', 'US', 'CA', 'AU', 'ES', 'IT', 'BE', 'AT', 'DK', 'SE', 'FI'] as const;
const AssignSchema = z.object({
  calendar_id: z.string().uuid({ message: 'calendar_id must be a valid uuid' }).optional(),
  service_ids: z.array(z.string().uuid({ message: 'each service_id must be a valid uuid' })).optional(),
  business_country: z
    .string()
    .transform((c) => c.toUpperCase())
    .refine((c) => (SUPPORTED_COUNTRIES as readonly string[]).includes(c), {
      message: 'business_country must be a supported ISO-2 country code',
    })
    .optional()
    .default('NL'),
  bulk_update: z.boolean().optional().default(false),
});

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ASSIGN-TAX-CODES] ${step}${detailsStr}`);
};

// Enhanced service classification with ML-style keyword matching
const ENHANCED_CLASSIFICATIONS = {
  'professional_services': {
    keywords: ['consult', 'advice', 'legal', 'lawyer', 'attorney', 'accounting', 'finance', 'business', 'strategy', 'planning', 'coaching', 'mentor'],
    // F-TAX-08: txcd_30060000 is NOT a valid Stripe tax code (GET /v1/tax_codes
    // returns HTTP 400 "Invalid tax code"); use txcd_20060000 "Professional Services"
    // (HTTP 200, verified on the TEST key). Any downstream Stripe push of the old id failed.
    tax_codes: {
      'NL': 'txcd_20060000', 'DE': 'txcd_20060000', 'FR': 'txcd_20060000', 'GB': 'txcd_20060000',
      'US': 'txcd_20060000', 'CA': 'txcd_20060000', 'AU': 'txcd_20060000'
    },
    confidence_multiplier: 1.2
  },
  'medical': {
    keywords: ['medical', 'health', 'doctor', 'clinic', 'therapy', 'physio', 'dental', 'treatment', 'checkup', 'exam', 'surgery'],
    // F-TAX-08: txcd_30070000 is NOT a valid Stripe tax code (HTTP 400); use
    // txcd_20060027 "Medical Professional Services" (HTTP 200, verified on the TEST key).
    tax_codes: {
      'NL': 'txcd_20060027', 'DE': 'txcd_20060027', 'FR': 'txcd_20060027', 'GB': 'txcd_20060027',
      'US': 'txcd_20060027', 'CA': 'txcd_20060027', 'AU': 'txcd_20060027'
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
    // F-TAX-08: txcd_30060000 is NOT a valid Stripe tax code (HTTP 400); use
    // txcd_20060052 "Educational Services" (HTTP 200, verified on the TEST key).
    tax_codes: {
      'NL': 'txcd_20060052', 'DE': 'txcd_20060052', 'FR': 'txcd_20060052', 'GB': 'txcd_20060052',
      'US': 'txcd_20060052', 'CA': 'txcd_20060052', 'AU': 'txcd_20060052'
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

    const rawBody = await req.json().catch(() => ({}));
    const parsed = AssignSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstMsg = parsed.error.issues[0]?.message || 'Invalid input';
      return new Response(
        JSON.stringify({ success: false, code: 'INVALID_INPUT', error: firstMsg, details: parsed.error.flatten().fieldErrors }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    const { calendar_id, service_ids, business_country, bulk_update } = parsed.data;
    logStep('Function started', {
      userId: user.id, 
      calendarId: calendar_id, 
      serviceIds: service_ids,
      businessCountry: business_country,
      bulkUpdate: bulk_update
    });

    // SECURITY: the service-role client bypasses RLS. service_types has no
    // user_id column (the old `.eq('user_id', user.id)` errored), and filtering by
    // a body calendar_id/service_ids alone let any authenticated user fetch+update
    // ANOTHER tenant's services. Always constrain to the caller's own calendars.
    const { data: userCals } = await supabaseClient
      .from('calendars')
      .select('id')
      .eq('user_id', user.id);
    const userCalendarIds = (userCals || []).map((c: { id: string }) => c.id);

    if (calendar_id && !userCalendarIds.includes(calendar_id)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Calendar not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get services to classify — only ever the caller's own.
    let query = supabaseClient
      .from('service_types')
      .select('*')
      .eq('is_active', true)
      .in('calendar_id', userCalendarIds.length > 0 ? userCalendarIds : ['00000000-0000-0000-0000-000000000000']);

    if (calendar_id) {
      query = query.eq('calendar_id', calendar_id);
    }

    if (service_ids && service_ids.length > 0) {
      query = query.in('id', service_ids);
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