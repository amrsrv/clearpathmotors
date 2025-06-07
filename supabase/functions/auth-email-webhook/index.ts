import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const MAKE_WEBHOOK_URL = 'https://hook.us2.make.com/j99faww55ghbbanssh4os6jk40d37p74';

serve(async (req) => {
  try {
    const { type, email, data } = await req.json();

    // Only handle password reset emails
    if (type !== 'reset_password') {
      return new Response(JSON.stringify({ message: 'Not a password reset email' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Forward the reset URL to Make.com webhook
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'reset_password',
        email,
        resetUrl: data.reset_password_url,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Webhook error: ${response.statusText}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});