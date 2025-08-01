import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    }: EnterpriseContactRequest = await req.json();

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
      subject: "We hebben jouw Enterprise aanvraag ontvangen! 🚀",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);">
          <div style="background: white; padding: 40px; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 40px;">
              <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; width: 80px; height: 80px; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; margin-bottom: 20px;">
                BA
              </div>
              <h1 style="color: #1e293b; margin: 0; font-size: 28px; font-weight: 700; line-height: 1.3;">
                Bedankt voor jouw interesse in BookingsAssistant Enterprise! 
              </h1>
              <div style="width: 60px; height: 4px; background: linear-gradient(90deg, #2563eb, #3b82f6); margin: 20px auto; border-radius: 2px;"></div>
            </div>

            <!-- Main Content -->
            <div style="margin-bottom: 40px;">
              <p style="color: #475569; font-size: 18px; line-height: 1.6; margin-bottom: 24px;">
                Beste ${fullName},
              </p>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                We hebben jouw Enterprise aanvraag succesvol ontvangen en zijn enthousiast over jouw interesse in onze oplossingen voor ${companyName}!
              </p>

              <!-- Success Badge -->
              <div style="background: linear-gradient(135deg, #dcfce7, #bbf7d0); border: 2px solid #16a34a; border-radius: 12px; padding: 20px; margin: 30px 0; text-align: center;">
                <div style="color: #15803d; font-size: 48px; margin-bottom: 10px;">✅</div>
                <h3 style="color: #15803d; margin: 0; font-size: 18px; font-weight: 600;">
                  Jouw aanvraag is geregistreerd!
                </h3>
                <p style="color: #166534; margin: 8px 0 0 0; font-size: 14px;">
                  Referentienummer: ENT-${new Date().getTime().toString().slice(-6)}
                </p>
              </div>

              <!-- Timeline -->
              <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin: 30px 0;">
                <h3 style="color: #2563eb; margin: 0 0 20px 0; font-size: 18px; font-weight: 600; display: flex; align-items: center;">
                  <span style="background: #2563eb; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 12px;">📅</span>
                  Wat gebeurt er nu?
                </h3>
                <div style="border-left: 3px solid #2563eb; padding-left: 20px; margin-left: 12px;">
                  <div style="margin-bottom: 16px;">
                    <div style="color: #1e293b; font-weight: 600; margin-bottom: 4px;">Binnen 24 uur</div>
                    <div style="color: #64748b; font-size: 14px;">Een van onze Enterprise specialisten neemt persoonlijk contact met je op</div>
                  </div>
                  <div style="margin-bottom: 16px;">
                    <div style="color: #1e293b; font-weight: 600; margin-bottom: 4px;">Persoonlijke demo</div>
                    <div style="color: #64748b; font-size: 14px;">We laten je precies zien hoe BookingsAssistant jouw bedrijf kan helpen</div>
                  </div>
                  <div>
                    <div style="color: #1e293b; font-weight: 600; margin-bottom: 4px;">Op maat gemaakte offerte</div>
                    <div style="color: #64748b; font-size: 14px;">Een voorstel dat perfect aansluit bij jouw wensen en budget</div>
                  </div>
                </div>
              </div>

              <!-- Company Info Summary -->
              <div style="background: linear-gradient(135deg, #eff6ff, #dbeafe); border-radius: 12px; padding: 24px; margin: 30px 0;">
                <h3 style="color: #2563eb; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">
                  📋 Jouw aanvraag samenvatting:
                </h3>
                <div style="display: grid; gap: 12px;">
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-weight: 500;">Bedrijf:</span>
                    <span style="color: #1e293b; font-weight: 600;">${companyName}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-weight: 500;">Bedrijfsgrootte:</span>
                    <span style="color: #1e293b; font-weight: 600;">${companySize} medewerkers</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-weight: 500;">Website:</span>
                    <span style="color: #2563eb;"><a href="${companyWebsite}" style="color: #2563eb; text-decoration: none;">${companyWebsite}</a></span>
                  </div>
                  ${requestMeeting ? `
                  <div style="background: #dcfce7; border: 1px solid #16a34a; border-radius: 8px; padding: 12px; margin-top: 8px;">
                    <span style="color: #15803d; font-weight: 600;">✅ Consultatie gesprek gewenst</span>
                  </div>
                  ` : ''}
                </div>
              </div>
            </div>

            <!-- CTA Section -->
            <div style="text-align: center; margin: 40px 0;">
              <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); border-radius: 12px; padding: 24px; color: white;">
                <h3 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600;">
                  Ondertussen meer weten? 🤔
                </h3>
                <p style="margin: 0 0 20px 0; opacity: 0.9; font-size: 16px;">
                  Bekijk onze Enterprise features en succes verhalen
                </p>
                <a href="${companyWebsite.includes('bookingsassistant') ? companyWebsite : 'https://bookingsassistant.com'}/enterprise" 
                   style="background: white; color: #2563eb; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; transition: all 0.3s ease;">
                  Enterprise Informatie →
                </a>
              </div>
            </div>

            <!-- Contact Info -->
            <div style="border-top: 2px solid #e2e8f0; padding-top: 30px; text-align: center; color: #64748b;">
              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">
                Vragen? We staan voor je klaar! 💬
              </p>
              <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
                <a href="mailto:enterprise@bookingsassistant.com" style="color: #2563eb; text-decoration: none; font-weight: 500;">
                  📧 enterprise@bookingsassistant.com
                </a>
                <a href="tel:+31201234567" style="color: #2563eb; text-decoration: none; font-weight: 500;">
                  📞 +31 20 123 4567
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                BookingsAssistant Enterprise Team<br>
                Dit is een automatisch gegenereerde bevestigingsmail.
              </p>
            </div>
          </div>
          
          <!-- Outer Footer -->
          <div style="text-align: center; margin-top: 20px;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">
              © 2024 BookingsAssistant. De slimste manier om afspraken te beheren.
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
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);