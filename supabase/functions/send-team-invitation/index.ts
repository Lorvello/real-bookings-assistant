import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TeamInvitationRequest {
  calendar_id: string;
  email: string;
  full_name: string;
  role: 'editor' | 'viewer';
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get the JWT token from the authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // Set the auth context for supabase client
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { calendar_id, email, full_name, role }: TeamInvitationRequest = await req.json();

    console.log('Processing team invitation for:', { calendar_id, email, full_name, role });

    // Use the invite_team_member function to create invitation and get token
    const { data: invitationResult, error: inviteError } = await supabase.rpc('invite_team_member', {
      p_calendar_id: calendar_id,
      p_email: email,
      p_full_name: full_name,
      p_role: role
    });

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      throw new Error(`Failed to create invitation: ${inviteError.message}`);
    }

    // Get calendar and business information
    const { data: calendarData, error: calendarError } = await supabase
      .from('calendars')
      .select(`
        name,
        users!inner(business_name, full_name)
      `)
      .eq('id', calendar_id)
      .single();

    if (calendarError) {
      console.error('Error fetching calendar data:', calendarError);
      throw new Error('Failed to fetch calendar information');
    }

    const businessName = calendarData.users.business_name || calendarData.users.full_name || 'Team';
    const calendarName = calendarData.name;
    const invitationToken = invitationResult.token;
    
    // Create invitation acceptance URL
    const inviteUrl = `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '')}/team-invite?token=${invitationToken}`;

    // Send invitation email
    const emailResponse = await resend.emails.send({
      from: `${businessName} <onboarding@resend.dev>`,
      to: [email],
      subject: `Team uitnodiging voor ${businessName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Team Uitnodiging</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #3B82F6, #1E40AF); color: white; padding: 40px 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; background: #3B82F6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .button:hover { background: #1E40AF; }
            .role-badge { display: inline-block; background: #F3F4F6; color: #374151; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 500; }
            .footer { background: #F8FAFC; padding: 30px; text-align: center; color: #6B7280; font-size: 14px; }
            .expire-notice { background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 16px; margin: 20px 0; color: #92400E; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">Team Uitnodiging</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Je bent uitgenodigd om deel te nemen aan ons team</p>
            </div>
            
            <div class="content">
              <p>Hallo ${full_name || email.split('@')[0]},</p>
              
              <p>Je bent uitgenodigd door <strong>${businessName}</strong> om toegang te krijgen tot de kalender <strong>${calendarName}</strong>.</p>
              
              <p><strong>Jouw rol:</strong> <span class="role-badge">${role === 'editor' ? 'Editor (Kan bewerken)' : 'Viewer (Alleen bekijken)'}</span></p>
              
              <div class="expire-notice">
                <strong>⏰ Belangrijk:</strong> Deze uitnodiging verloopt over 48 uur. Accepteer zo snel mogelijk!
              </div>
              
              <p>Klik op de knop hieronder om je uitnodiging te accepteren:</p>
              
              <div style="text-align: center;">
                <a href="${inviteUrl}" class="button">Uitnodiging Accepteren</a>
              </div>
              
              <p style="margin-top: 30px; color: #6B7280; font-size: 14px;">
                Als de knop niet werkt, kopieer en plak deze link in je browser:<br>
                <a href="${inviteUrl}" style="color: #3B82F6; word-break: break-all;">${inviteUrl}</a>
              </p>
              
              <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
              
              <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #374151;">Wat kun je verwachten?</h3>
                <ul style="margin: 0; padding-left: 20px; color: #6B7280;">
                  <li>Toegang tot de agenda van ${businessName}</li>
                  <li>Je eigen persoonlijke kalender</li>
                  <li>${role === 'editor' ? 'Mogelijkheid om afspraken in te plannen en te bewerken' : 'Overzicht van alle geplande afspraken'}</li>
                  <li>Samenwerken met het team</li>
                </ul>
              </div>
            </div>
            
            <div class="footer">
              <p>Deze uitnodiging is verstuurd door ${businessName}</p>
              <p>Als je deze uitnodiging niet verwachtte, kun je deze email negeren.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (emailResponse.error) {
      console.error('Error sending email:', emailResponse.error);
      throw new Error(`Failed to send email: ${emailResponse.error.message}`);
    }

    console.log('Team invitation sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Team invitation sent successfully',
        invitation_id: invitationResult.invitation_id
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error in send-team-invitation function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);