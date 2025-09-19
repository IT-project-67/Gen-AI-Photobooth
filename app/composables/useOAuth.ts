export const useOAuth = () => {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  // Login with Google
  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        return { error: error.message };
      }
      return { error: null };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Google OAuth login failed";
      return { error: errorMessage };
    }
  };

  // Login with Discord using Supabase OAuth
  const loginWithDiscord = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Discord OAuth login failed";
      return { error: errorMessage };
    }
  };

  const loginWithProvider = async (provider: string) => {
    if (provider === "google") {
      return await loginWithGoogle();
    } else if (provider === "discord") {
      return await loginWithDiscord();
    }
    return { error: `Unsupported provider: ${provider}` };
  };

  const handleOAuthProfile = async () => {
    const user = useSupabaseUser();
    if (user.value) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const access_token = session?.access_token;

        if (!access_token) {
          console.error("No access token found for OAuth profile handling.");
          return;
        }

        const result = await $fetch("/api/v1/profile/oauth", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        });
        console.log("OAuth profile handled:", result);
      } catch (error) {
        console.log("OAuth profile creation failed:", error);
      }
    }
  };

  return {
    user: readonly(user),
    loginWithProvider,
    handleOAuthProfile,
  };
};
