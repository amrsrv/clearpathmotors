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
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', { 
        hasUrl: !!supabaseUrl, 
        hasServiceKey: !!supabaseServiceKey 
      });
      throw new Error('Missing required environment variables');
    }

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the Authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the user's session using the admin client with the JWT token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('User verification failed:', userError);
      throw new Error('Invalid user session');
    }

    // Check if user is an admin by querying user_profiles
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single();
      
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      throw new Error('Error verifying admin status');
    }
    
    const isAdmin = userProfile?.is_admin === true;
    if (!isAdmin) {
      throw new Error('Unauthorized - Admin access required');
    }

    // Handle different request methods
    if (req.method === 'POST') {
      // Handle POST request for specific user IDs (for MessageCenter)
      const body = await req.json();
      const { userIds } = body;
      
      if (!userIds || !Array.isArray(userIds)) {
        throw new Error('userIds array is required in request body');
      }

      // Get users with their profiles
      const { data: users, error } = await supabaseAdmin
        .from('users')
        .select(`
          id,
          email,
          created_at,
          last_sign_in_at,
          email_confirmed_at,
          raw_app_meta_data,
          user_profiles (
            is_admin
          )
        `)
        .in('id', userIds);
      
      if (error) {
        console.error('Error listing users:', error);
        throw error;
      }

      // Transform data to match expected format
      const userData = users.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        app_metadata: {
          is_admin: u.user_profiles?.is_admin || false
        }
      }));

      return new Response(JSON.stringify({ users: userData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      // Handle GET request (existing functionality for Users page)
      const url = new URL(req.url);
      const start = parseInt(url.searchParams.get('start') || '0');
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const status = url.searchParams.get('status');

      // Get users with their profiles
      const { data: users, error } = await supabaseAdmin
        .from('users')
        .select(`
          id,
          email,
          created_at,
          last_sign_in_at,
          email_confirmed_at,
          raw_app_meta_data,
          user_profiles (
            is_admin
          )
        `)
        .range(start, start + limit - 1)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error listing users:', error);
        throw error;
      }

      // Filter users if status is provided
      let filteredUsers = users || [];
      if (status) {
        if (status === 'verified') {
          filteredUsers = filteredUsers.filter(u => u.email_confirmed_at !== null);
        } else if (status === 'unverified') {
          filteredUsers = filteredUsers.filter(u => u.email_confirmed_at === null);
        } else if (status === 'admin') {
          filteredUsers = filteredUsers.filter(u => u.user_profiles?.is_admin === true);
        } else if (status === 'non_admin') {
          filteredUsers = filteredUsers.filter(u => u.user_profiles?.is_admin !== true);
        }
      }

      // Transform data to match expected format
      const userData = filteredUsers.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        app_metadata: {
          is_admin: u.user_profiles?.is_admin || false
        }
      }));

      return new Response(JSON.stringify({ users: userData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

  } catch (error) {
    console.error('Error in list-users function:', error);
    
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