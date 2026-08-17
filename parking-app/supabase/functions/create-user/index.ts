// Supabase Edge Function: create-user
// Creates a new auth user + matching public.users profile row.
// Must be invoked by an already-authenticated admin (checked below via RLS-equivalent lookup).
// Deploy with: supabase functions deploy create-user
// Requires these secrets set on the project: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// (the anon key from the caller's Authorization header is used only to verify the caller is an admin)

import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client scoped to the caller's JWT, used only to verify who is calling.
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });
    }

    // Admin client with the service role key, used to check the caller's role and create the user.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile } = await adminClient
      .from("users")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Only admins can create accounts" }), {
        status: 403,
      });
    }

    const { email, password, full_name, role, contact_no } = await req.json();
    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      return new Response(JSON.stringify({ error: createError?.message ?? "User creation failed" }), {
        status: 400,
      });
    }

    const { error: profileError } = await adminClient.from("users").insert({
      id: created.user.id,
      full_name,
      role,
      contact_no: contact_no ?? null,
    });
    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ id: created.user.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
