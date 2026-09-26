(function () {
  const projectUrl = "https://hrhhbahxwbolhvhrbhjn.supabase.co";
  const publishableKey = "sb_publishable_6zmdKYSlhgqar4pHSeXSAA_7Z1tUS-5";

  window.getSupabaseClient = function () {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error("Supabase client library did not load.");
    }
    if (!window.supabaseClient) {
      window.supabaseClient = window.supabase.createClient(projectUrl, publishableKey);
    }
    return window.supabaseClient;
  };
})();
