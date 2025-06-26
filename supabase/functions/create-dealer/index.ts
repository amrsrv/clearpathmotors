import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
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

    // Check if user is a super_admin
    const role = user.app_metadata?.role;
    if (role !== "super_admin") {
      throw new Error("Unauthorized - Super Admin access required");
    }

    // Parse request body
    const { name, email, phone, username, password } = await req.json();

    if (!name || !email || !username || !password) {
      throw new Error("Name, email, username and password are required");
    }

    // Generate a unique slug for the dealer
    const generateSlug = (name: string): string => {
      // Convert name to lowercase, replace spaces with hyphens, remove special chars
      let slug = name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "-");
      
      return slug;
    };

    const baseSlug = generateSlug(name);
    
    // Check if the slug already exists and generate a unique one
    const checkSlugUniqueness = async (baseSlug: string): Promise<string> => {
      let finalSlug = baseSlug;
      let counter = 0;
      const maxAttempts = 5;
      
      while (counter < maxAttempts) {
        const { data, error } = await supabaseAdmin
          .from("dealer_profiles")
          .select("public_slug")
          .eq("public_slug", finalSlug)
          .maybeSingle();
        
        if (error) throw error;
        
        // If no data found, slug is unique
        if (!data) break;
        
        // Try with a suffix
        counter++;
        finalSlug = `${baseSlug}-${counter}`;
      }
      
      // If we've tried all attempts and still have a conflict, raise an error
      if (counter >= maxAttempts) {
        const { data } = await supabaseAdmin
          .from("dealer_profiles")
          .select("public_slug")
          .eq("public_slug", finalSlug)
          .maybeSingle();
          
        if (data) {
          throw new Error(`Could not generate a unique slug after ${maxAttempts} attempts`);
        }
      }
      
      return finalSlug;
    };

    const uniqueSlug = await checkSlugUniqueness(baseSlug);

    // Insert into dealers table
    const { data: newDealer, error: dealerError } = await supabaseAdmin
      .from("dealers")
      .insert({
        dealer_name: name,
        username,
        password,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dealerError) {
      throw dealerError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Dealer created successfully",
        dealer: {
          id: newDealer.id,
          name,
          email,
          username,
          phone
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in create-dealer function:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred while creating dealer",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: error.message.includes("Unauthorized") ? 403 : 500,
      }
    );
  }
});