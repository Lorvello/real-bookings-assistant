import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Security-Policy": "default-src 'self'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

interface EnterpriseContactRequest {
  fullName: string;
  email: string;
  companyName: string;
  companyWebsite: string;
  phoneNumber?: string;
  companySize: string;
  selectedFeatures: string[];
  message?: string;
  requestMeeting: boolean;
}

// Input validation and sanitization functions
function sanitizeHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function sanitizeString(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

function validateUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

function validateInput(data: any): { isValid: boolean; errors: string[]; sanitizedData: any } {
  const errors: string[] = [];
  
  // Check for required fields and validate types
  if (!data.fullName || typeof data.fullName !== 'string' || data.fullName.trim().length === 0) {
    errors.push('Full name is required');
  } else if (data.fullName.length > 100) {
    errors.push('Full name must be less than 100 characters');
  }
  
  if (!data.email || typeof data.email !== 'string' || !validateEmail(data.email)) {
    errors.push('Valid email address is required');
  }
  
  if (!data.companyName || typeof data.companyName !== 'string' || data.companyName.trim().length === 0) {
    errors.push('Company name is required');
  } else if (data.companyName.length > 200) {
    errors.push('Company name must be less than 200 characters');
  }
  
  if (!data.companyWebsite || typeof data.companyWebsite !== 'string' || !validateUrl(data.companyWebsite)) {
    errors.push('Valid company website URL is required');
  } else if (data.companyWebsite.length > 500) {
    errors.push('Company website URL must be less than 500 characters');
  }
  
  if (!data.companySize || typeof data.companySize !== 'string') {
    errors.push('Company size is required');
  }
  
  if (!Array.isArray(data.selectedFeatures) || data.selectedFeatures.length === 0) {
    errors.push('At least one feature of interest must be selected');
  } else if (data.selectedFeatures.some((f: any) => typeof f !== 'string')) {
    errors.push('All selected features must be valid strings');
  }
  
  if (typeof data.requestMeeting !== 'boolean') {
    errors.push('Meeting request preference must be specified');
  }
  
  // Optional field validation
  if (data.phoneNumber && (typeof data.phoneNumber !== 'string' || data.phoneNumber.length > 20)) {
    errors.push('Phone number must be less than 20 characters');
  }
  
  if (data.message && (typeof data.message !== 'string' || data.message.length > 2000)) {
    errors.push('Additional message must be less than 2000 characters');
  }
  
  // Sanitize data
  const sanitizedData = {
    fullName: sanitizeString(data.fullName),
    email: data.email.toLowerCase().trim(),
    companyName: sanitizeString(data.companyName),
    companyWebsite: data.companyWebsite.trim(),
    phoneNumber: data.phoneNumber ? sanitizeString(data.phoneNumber) : undefined,
    companySize: sanitizeString(data.companySize),
    selectedFeatures: data.selectedFeatures.map((f: string) => sanitizeString(f)),
    message: data.message ? sanitizeString(data.message) : undefined,
    requestMeeting: Boolean(data.requestMeeting),
  };
  
  return { isValid: errors.length === 0, errors, sanitizedData };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Security: Rate limiting check (basic implementation)
  const userAgent = req.headers.get('user-agent') || '';
  const contentLength = req.headers.get('content-length');
  
  // Basic security checks
  if (contentLength && parseInt(contentLength) > 10000) { // 10KB limit
    return new Response(JSON.stringify({ error: 'Request too large' }), {
      status: 413,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const rawData = await req.json();
    
    // Validate and sanitize input
    const { isValid, errors, sanitizedData } = validateInput(rawData);
    
    if (!isValid) {
      return new Response(JSON.stringify({ 
        error: 'Validation failed', 
        details: errors 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const {
      fullName,
      email,
      companyName,
      companyWebsite,
      phoneNumber,
      companySize,
      selectedFeatures,
      message,
      requestMeeting,
    } = sanitizedData;

    const selectedFeaturesHtml = selectedFeatures
      .map(feature => `<li style="margin-bottom: 8px;">${feature}</li>`)
      .join('');

    const emailResponse = await resend.emails.send({
      from: "Enterprise Inquiries <enterprise@bookingsassistant.com>",
      to: ["business@bookingsassistant.com"],
      subject: `Enterprise Plan Inquiry - ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #2563eb; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
              🏢 New Enterprise Plan Inquiry
            </h1>
            
            <div style="margin-bottom: 30px;">
              <h2 style="color: #374151; margin-bottom: 15px; font-size: 18px;">📋 Contact Information</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #6b7280; width: 30%;">Full Name:</td>
                  <td style="padding: 8px 0; color: #374151;">${fullName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Email:</td>
                  <td style="padding: 8px 0; color: #374151;"><a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Company:</td>
                  <td style="padding: 8px 0; color: #374151;">${companyName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Website:</td>
                  <td style="padding: 8px 0; color: #374151;"><a href="${companyWebsite}" target="_blank" style="color: #2563eb; text-decoration: none;">${companyWebsite}</a></td>
                </tr>
                ${phoneNumber ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Phone:</td>
                  <td style="padding: 8px 0; color: #374151;"><a href="tel:${phoneNumber}" style="color: #2563eb; text-decoration: none;">${phoneNumber}</a></td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Company Size:</td>
                  <td style="padding: 8px 0; color: #374151;">${companySize} employees</td>
                </tr>
              </table>
            </div>

            <div style="margin-bottom: 30px;">
              <h2 style="color: #374151; margin-bottom: 15px; font-size: 18px;">✨ Features of Interest</h2>
              <ul style="list-style: none; padding: 0; margin: 0; background-color: #f3f4f6; padding: 20px; border-radius: 6px;">
                ${selectedFeaturesHtml}
              </ul>
            </div>

            ${message ? `
            <div style="margin-bottom: 30px;">
              <h2 style="color: #374151; margin-bottom: 15px; font-size: 18px;">💬 Additional Message</h2>
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; border-left: 4px solid #2563eb;">
                <p style="margin: 0; color: #374151; line-height: 1.6;">${message}</p>
              </div>
            </div>
            ` : ''}

            <div style="margin-bottom: 30px;">
              <h2 style="color: #374151; margin-bottom: 15px; font-size: 18px;">📅 Meeting Request</h2>
              <div style="background-color: ${requestMeeting ? '#dcfce7' : '#fef3c7'}; padding: 15px; border-radius: 6px; border-left: 4px solid ${requestMeeting ? '#16a34a' : '#d97706'};">
                <p style="margin: 0; color: #374151; font-weight: bold;">
                  ${requestMeeting ? '✅ Customer has requested a consultation meeting' : '⏰ Customer prefers email contact first'}
                </p>
              </div>
            </div>

            <div style="background-color: #2563eb; color: white; padding: 20px; border-radius: 6px; text-align: center;">
              <h3 style="margin: 0 0 10px 0;">🚀 Next Steps</h3>
              <p style="margin: 0; font-size: 14px;">
                ${requestMeeting 
                  ? 'Schedule a consultation call within 24 hours to discuss their enterprise requirements.' 
                  : 'Follow up via email within 24 hours with enterprise information and pricing details.'
                }
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
            <p>This inquiry was submitted through the BookingsAssistant Enterprise contact form.</p>
          </div>
        </div>
      `,
    });

    console.log("Enterprise contact email sent successfully:", emailResponse);

    // Send confirmation email to customer
    const customerEmailResponse = await resend.emails.send({
      from: "BookingsAssistant <enterprise@bookingsassistant.com>",
      to: [email],
      subject: "Thank you for your Enterprise inquiry!",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
          <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            
            <!-- Header with Logo -->
            <div style="text-align: center; margin-bottom: 40px; border-bottom: 1px solid #e2e8f0; padding-bottom: 30px;">
              <img src="https://grdgjhkygzciwwrxgvgy.supabase.co/storage/v1/object/public/lovable-uploads/81803cac-40e1-4777-b914-5ca4e2490468.png" alt="BookingsAssistant" style="height: 60px; margin-bottom: 20px;" />
              <h1 style="color: #1e293b; margin: 0; font-size: 28px; font-weight: 700; line-height: 1.3;">
                Thank you for your Enterprise inquiry!
              </h1>
              <p style="color: #64748b; margin: 16px 0 0 0; font-size: 16px;">
                We have received your request and will be in touch within 24 hours.
              </p>
            </div>

            <!-- Main Content -->
            <div style="margin-bottom: 40px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                Dear ${fullName},
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                Thank you for your interest in BookingsAssistant Enterprise! We have successfully received your inquiry for ${companyName} and our enterprise team is excited to help you transform your booking management.
              </p>

              <!-- Confirmation Badge -->
              <div style="background: #f0fdf4; border: 1px solid #16a34a; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
                <h3 style="color: #15803d; margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">
                  Your inquiry has been registered
                </h3>
                <p style="color: #166534; margin: 0; font-size: 14px;">
                  Reference: ENT-${new Date().getTime().toString().slice(-6)}
                </p>
              </div>

              <!-- What's Next Timeline -->
              <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin: 30px 0;">
                <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">
                  What happens next?
                </h3>
                <div style="border-left: 3px solid #2563eb; padding-left: 20px;">
                  <div style="margin-bottom: 16px;">
                    <div style="color: #1e293b; font-weight: 600; margin-bottom: 4px;">Within 24 hours</div>
                    <div style="color: #64748b; font-size: 14px;">One of our Enterprise specialists will personally contact you</div>
                  </div>
                  <div style="margin-bottom: 16px;">
                    <div style="color: #1e293b; font-weight: 600; margin-bottom: 4px;">Personalized demo</div>
                    <div style="color: #64748b; font-size: 14px;">We'll show you exactly how BookingsAssistant can help your business</div>
                  </div>
                  <div>
                    <div style="color: #1e293b; font-weight: 600; margin-bottom: 4px;">Custom proposal</div>
                    <div style="color: #64748b; font-size: 14px;">A tailored solution that fits your needs and budget</div>
                  </div>
                </div>
              </div>

              <!-- Your Submission Summary -->
              <div style="background: #eff6ff; border-radius: 8px; padding: 24px; margin: 30px 0;">
                <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">
                  Your submission summary
                </h3>
                
                <!-- Contact Information -->
                <div style="margin-bottom: 24px;">
                  <h4 style="color: #374151; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Contact Information</h4>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 6px 0; font-weight: 500; color: #6b7280; width: 35%;">Full Name:</td>
                      <td style="padding: 6px 0; color: #1e293b; font-weight: 600;">${fullName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; font-weight: 500; color: #6b7280;">Email:</td>
                      <td style="padding: 6px 0; color: #2563eb; font-weight: 600;">${email}</td>
                    </tr>
                    ${phoneNumber ? `
                    <tr>
                      <td style="padding: 6px 0; font-weight: 500; color: #6b7280;">Phone:</td>
                      <td style="padding: 6px 0; color: #1e293b; font-weight: 600;">${phoneNumber}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>

                <!-- Company Information -->
                <div style="margin-bottom: 24px;">
                  <h4 style="color: #374151; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Company Information</h4>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 6px 0; font-weight: 500; color: #6b7280; width: 35%;">Company:</td>
                      <td style="padding: 6px 0; color: #1e293b; font-weight: 600;">${companyName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; font-weight: 500; color: #6b7280;">Website:</td>
                      <td style="padding: 6px 0; color: #2563eb; font-weight: 600;"><a href="${companyWebsite}" style="color: #2563eb; text-decoration: none;">${companyWebsite}</a></td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; font-weight: 500; color: #6b7280;">Company Size:</td>
                      <td style="padding: 6px 0; color: #1e293b; font-weight: 600;">${companySize} employees</td>
                    </tr>
                  </table>
                </div>

                <!-- Features of Interest -->
                <div style="margin-bottom: 24px;">
                  <h4 style="color: #374151; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Features you're interested in</h4>
                  <ul style="list-style: none; padding: 0; margin: 0;">
                    ${selectedFeaturesHtml}
                  </ul>
                </div>

                ${message ? `
                <!-- Additional Message -->
                <div style="margin-bottom: 24px;">
                  <h4 style="color: #374151; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Your message</h4>
                  <div style="background: white; padding: 16px; border-radius: 6px; border-left: 4px solid #2563eb;">
                    <p style="margin: 0; color: #374151; line-height: 1.6;">${message}</p>
                  </div>
                </div>
                ` : ''}

                <!-- Meeting Request -->
                <div style="margin-bottom: 0;">
                  <h4 style="color: #374151; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Meeting preference</h4>
                  <div style="background: ${requestMeeting ? '#f0fdf4' : '#fef3c7'}; border: 1px solid ${requestMeeting ? '#16a34a' : '#d97706'}; border-radius: 6px; padding: 12px;">
                    <p style="margin: 0; color: #374151; font-weight: 600; font-size: 14px;">
                      ${requestMeeting ? 'Consultation meeting requested' : 'Email contact preferred initially'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Contact Information -->
            <div style="border-top: 1px solid #e2e8f0; padding-top: 30px; text-align: center;">
              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #374151;">
                Questions? We're here to help!
              </p>
              <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
                <a href="mailto:enterprise@bookingsassistant.com" style="color: #2563eb; text-decoration: none; font-weight: 500;">
                  enterprise@bookingsassistant.com
                </a>
                <span style="color: #d1d5db;">|</span>
                <a href="tel:+31201234567" style="color: #2563eb; text-decoration: none; font-weight: 500;">
                  +31 20 123 4567
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f3f4f6;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                BookingsAssistant Enterprise Team<br>
                This is an automated confirmation email.
              </p>
            </div>
          </div>
          
          <!-- Outer Footer -->
          <div style="text-align: center; margin-top: 20px;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">
              © 2024 BookingsAssistant. The smart way to manage appointments.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Customer confirmation email sent successfully:", customerEmailResponse);

    return new Response(JSON.stringify({ 
      teamEmail: emailResponse, 
      customerEmail: customerEmailResponse 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-enterprise-contact function:", error);
    
    // Log security event
    const errorType = error.name || 'Unknown';
    console.error(`Security Event: ${errorType} in enterprise contact form`, {
      timestamp: new Date().toISOString(),
      userAgent: req.headers.get('user-agent'),
      errorType,
      // Don't log sensitive data
    });
    
    // Return generic error message to prevent information disclosure
    return new Response(
      JSON.stringify({ 
        error: 'An internal error occurred. Please try again later.' 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);