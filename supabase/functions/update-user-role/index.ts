import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

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
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables");
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify the user's session using the admin client with the JWT token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid user session");
    }

    // Check if user is a super_admin (only super_admins can update roles)
    const role = user.app_metadata?.role;
    if (role !== "super_admin") {
      throw new Error("Unauthorized - Super Admin access required");
    }

    // Parse request body
    const { targetUserId, newRole } = await req.json();

    if (!targetUserId || !newRole) {
      throw new Error("targetUserId and newRole are required");
    }

    // Validate newRole is one of the allowed values
    const allowedRoles = ["super_admin", "dealer", "customer"];
    if (!allowedRoles.includes(newRole)) {
      throw new Error(`Invalid role. Must be one of: ${allowedRoles.join(", ")}`);
    }

    // Update the user's role
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      {
        app_metadata: { role: newRole },
      }
    );

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `User role updated to ${newRole}`,
        user: {
          id: updatedUser.user.id,
          email: updatedUser.user.email,
          role: newRole
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in update-user-role function:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred while updating user role",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: error.message.includes("Unauthorized") ? 403 : 500,
      }
    );
  }
});