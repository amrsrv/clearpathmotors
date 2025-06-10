import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req) => {
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
        JSON.stringify({ error: 'userId and userMessage are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Simple response mapping for common questions
    const responses: Record<string, string> = {
      'hello': 'Hello! How can I help you with your auto financing needs today?',
      'hi': 'Hi there! How can I assist you with your car financing journey?',
      'help': 'I can help you with information about our auto financing options, application process, or answer questions about your existing application. What would you like to know?',
      'rates': 'Our auto loan rates start from 4.99% APR for qualified borrowers. The exact rate depends on your credit score, income, and the vehicle you choose. Would you like to get pre-qualified to see your personalized rate?',
      'credit': 'We work with all credit situations! Whether you have excellent credit, bad credit, or no credit history, we have financing options for you. Our approval rate is 95%, and we specialize in helping people with credit challenges.',
      'documents': 'For your auto loan application, you\'ll typically need to provide: government-issued ID, proof of income (pay stubs), proof of residence (utility bill), and sometimes bank statements. You can upload these directly through your dashboard after starting an application.',
      'process': 'Our process is simple: 1) Complete the online application (takes about 2 minutes), 2) Get pre-qualified instantly, 3) Upload required documents, 4) Receive final approval, 5) Choose your vehicle, and 6) Drive away! The entire process can be completed in as little as 24-48 hours.',
      'contact': 'You can reach our customer support team at info@clearpathmotors.com or call us at (647) 451-3830. Our office hours are Monday-Friday, 9AM-6PM EST.',
      'application': 'You can start your application by clicking the "Get Started" or "Apply Now" button on our website. The initial application takes just 2 minutes to complete, and you\'ll receive an instant pre-qualification decision.',
      'down payment': 'Down payment requirements vary based on your credit profile and the vehicle you choose. While some customers may qualify with $0 down, we typically recommend at least 10% down payment for the best rates and terms.',
      'approval': 'Our approval rate is 95%! We work with a network of lenders who specialize in all credit situations, including bad credit, no credit, and even bankruptcy.',
      'time': 'The entire process from application to driving away in your new car can be as quick as 24-48 hours, depending on how quickly you provide the required documents and select your vehicle.',
    };

    // Process the message and generate a response
    let response = "I'm not sure how to respond to that. Could you please ask about our auto financing options, application process, or required documents?";
    
    // Check for keyword matches
    const lowercaseMessage = userMessage.toLowerCase();
    for (const [keyword, reply] of Object.entries(responses)) {
      if (lowercaseMessage.includes(keyword)) {
        response = reply;
        break;
      }
    }

    // Save the conversation to the database
    const { data: existingChat, error: fetchError } = await supabase
      .from('chats')
      .select('messages')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching chat:', fetchError);
    }

    const newUserMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    const newAssistantMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
    };

    const messages = existingChat?.messages || [];
    const updatedMessages = [...messages, newUserMessage, newAssistantMessage];

    const { error: upsertError } = await supabase
      .from('chats')
      .upsert({
        user_id: userId,
        messages: updatedMessages,
      });

    if (upsertError) {
      console.error('Error saving chat:', upsertError);
    }

    return new Response(
      JSON.stringify({ response }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});