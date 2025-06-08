import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    // Get query parameters
    const url = new URL(req.url);
    const start = parseInt(url.searchParams.get('start') || '0');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const status = url.searchParams.get('status');

    // Create Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
    });

    // Get the Authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user's session
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid user session');
    }

    // Check if user is an admin
    const isAdmin = user.app_metadata?.is_admin === true;
    if (!isAdmin) {
      throw new Error('Unauthorized - Admin access required');
    }

    // Get the list of users
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
      page: Math.floor(start / limit) + 1,
      perPage: limit,
    });
    
    if (error) throw error;

    // Filter users if status is provided
    let filteredUsers = users;
    if (status) {
      if (status === 'verified') {
        filteredUsers = users.filter(u => u.email_confirmed_at !== null);
      } else if (status === 'unverified') {
        filteredUsers = users.filter(u => u.email_confirmed_at === null);
      } else if (status === 'admin') {
        filteredUsers = users.filter(u => u.app_metadata?.is_admin === true);
      }
    }

    return new Response(JSON.stringify({ users: filteredUsers }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred while fetching users',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message.includes('Unauthorized') ? 403 : 500,
      }
    );
  }
});