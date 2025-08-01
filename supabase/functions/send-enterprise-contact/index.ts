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
      from: "Enterprise Inquiries <business@bookingsassistant.com>",
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

    return new Response(JSON.stringify(emailResponse), {
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