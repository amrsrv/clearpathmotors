// This function is no longer needed as we're using Supabase's built-in email functionality
// We're keeping this file as a placeholder to avoid deployment issues

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const { type, email } = await req.json();

    console.log(`Received email event: ${type} for ${email}`);
    
    // Simply log the event and return success
    // The actual email sending is handled by Supabase
    return new Response(JSON.stringify({ 
      success: true,
      message: "Email event received. Emails are handled by Supabase directly."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});