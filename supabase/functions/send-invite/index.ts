import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { Resend } from "npm:resend";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not set in Edge Function secrets.");
    }

    const resend = new Resend(resendApiKey);

    // Get the request body
    const body = await req.json();
    const { email, companyName, inviterName } = body;

    if (!email || !companyName) {
      throw new Error("email and companyName are required parameters.");
    }

    // Default sender or verified domain from environment
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
    
    const subject = `You've been invited to join ${companyName} on BrandGen!`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4f46e5;">Invitation to BrandGen</h2>
        <p>Hello!</p>
        <p>You have been invited${inviterName ? ` by <strong>${inviterName}</strong>` : ''} to join the <strong>${companyName}</strong> workspace on BrandGen.</p>
        <p>To accept this invitation, simply sign up for BrandGen using this email address (${email}), and you will automatically be added to the company's workspace.</p>
        <br>
        <p>If you don't expect this invitation, you can safely ignore this email.</p>
        <br>
        <p>Thanks,<br>The BrandGen Team</p>
      </div>
    `;

    // Send the email
    const data = await resend.emails.send({
      from: `BrandGen <${fromEmail}>`,
      to: [email],
      subject: subject,
      html: html,
    });

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error("Error in send-invite function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
