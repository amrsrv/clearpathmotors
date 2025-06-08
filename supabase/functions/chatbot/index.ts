import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import OpenAI from 'npm:openai@4.33.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const { userId, userMessage } = await req.json();

    if (!userId || !userMessage) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or userMessage in request body' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    // Fetch existing chat history
    let { data: chat, error: fetchError } = await supabaseAdmin
      .from('chats')
      .select('messages')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
      throw new Error(`Supabase fetch error: ${fetchError.message}`);
    }

    let messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [];

    if (chat) {
      messages = chat.messages;
    } else {
      // Initialize with system prompt if no chat exists
      messages.push({
        role: 'system',
        content: 'You are a helpful assistant for car financing questions.',
      });
    }

    // Append user's message
    messages.push({ role: 'user', content: userMessage });

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
    });

    const aiMessage = completion.choices[0].message?.content || 'No response from AI.';

    // Append AI's response
    messages.push({ role: 'assistant', content: aiMessage });

    // Save updated chat history
    const { error: upsertError } = await supabaseAdmin
      .from('chats')
      .upsert(
        {
          user_id: userId,
          messages: messages,
        },
        { onConflict: 'user_id' }
      );

    if (upsertError) {
      throw new Error(`Supabase upsert error: ${upsertError.message}`);
    }

    return new Response(
      JSON.stringify({ aiMessage }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Edge Function error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});