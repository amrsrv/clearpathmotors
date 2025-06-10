import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import { v4 as uuidv4 } from 'npm:uuid@9.0.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OpenAI API configuration
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-3.5-turbo'; // You can upgrade to gpt-4 if needed

// System message to guide the AI's behavior
const SYSTEM_MESSAGE = `You are a helpful, friendly, and knowledgeable auto financing assistant for Clearpath Motors.

Your primary goals are:
1. Build trust with potential customers by providing accurate, helpful information about auto financing
2. Encourage users to apply for financing through Clearpath Motors
3. Answer questions about the application process, loan terms, credit requirements, etc.
4. Be conversational and personable, but professional

Key information about Clearpath Motors:
- 95% approval rate for all credit situations
- Rates starting at 4.99% for qualified borrowers
- Specializes in helping people with bad credit, no credit, or newcomers to Canada
- Quick online application process that takes just 30 seconds
- No impact on credit score for pre-qualification
- Flexible terms up to 84 months
- Works with a network of trusted dealerships across Ontario

When appropriate, encourage users to:
- Start their application at clearpathmotors.com/get-prequalified
- Use the payment calculator at clearpathmotors.com/calculator
- Contact support at info@clearpathmotors.com or (647) 451-3830

Always be honest, never make up information, and if you don't know something, suggest the user contact customer support.`;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { userId, anonymousId, userMessage } = await req.json();

    // Validate required parameters
    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: 'userMessage is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Ensure we have either userId or anonymousId
    if (!userId && !anonymousId) {
      return new Response(
        JSON.stringify({ error: 'Either userId or anonymousId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if OpenAI API key is available
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key is not configured',
          response: 'I apologize, but I am currently unable to process your request. Please try again later or contact our support team at info@clearpathmotors.com.'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get or create chat
    let chatId;
    if (userId) {
      // For authenticated users
      const { data: existingChat, error: fetchError } = await supabase
        .from('chats')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching chat:', fetchError);
      }

      if (existingChat?.id) {
        chatId = existingChat.id;
      } else {
        // Create new chat for authenticated user
        const { data: newChat, error: createError } = await supabase
          .from('chats')
          .insert({ user_id: userId })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating chat:', createError);
          throw new Error('Failed to create chat');
        }

        chatId = newChat.id;
      }
    } else {
      // For anonymous users
      const { data: existingChat, error: fetchError } = await supabase
        .from('chats')
        .select('id')
        .eq('anonymous_id', anonymousId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching chat:', fetchError);
      }

      if (existingChat?.id) {
        chatId = existingChat.id;
      } else {
        // Create new chat for anonymous user
        const { data: newChat, error: createError } = await supabase
          .from('chats')
          .insert({ anonymous_id: anonymousId })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating chat:', createError);
          throw new Error('Failed to create chat');
        }

        chatId = newChat.id;
      }
    }

    // Fetch conversation history
    const { data: chatHistory, error: historyError } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(10); // Limit to last 10 messages for context

    if (historyError) {
      console.error('Error fetching chat history:', historyError);
    }

    // Prepare messages for OpenAI API
    const messages = [
      { role: 'system', content: SYSTEM_MESSAGE },
      // Add conversation history
      ...(chatHistory || []).map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      // Add the new user message
      { role: 'user', content: userMessage },
    ];

    // Call OpenAI API
    const openAIResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const openAIData = await openAIResponse.json();
    const assistantResponse = openAIData.choices[0]?.message?.content || 
      "I'm sorry, I couldn't process your request. Please try again or contact our support team.";

    // Save user message to database
    const userMessageId = uuidv4();
    await supabase
      .from('chat_messages')
      .insert({
        id: userMessageId,
        chat_id: chatId,
        user_id: userId || null,
        anonymous_id: anonymousId || null,
        role: 'user',
        content: userMessage,
        read: true, // User messages are always "read"
      });

    // Save assistant response to database
    const assistantMessageId = uuidv4();
    await supabase
      .from('chat_messages')
      .insert({
        id: assistantMessageId,
        chat_id: chatId,
        user_id: userId || null,
        anonymous_id: anonymousId || null,
        role: 'assistant',
        content: assistantResponse,
        read: false, // Assistant messages start as unread
      });

    return new Response(
      JSON.stringify({ 
        response: assistantResponse,
        chatId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred',
        response: "I'm sorry, I'm having trouble processing your request right now. Please try again later or contact our support team at info@clearpathmotors.com."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});