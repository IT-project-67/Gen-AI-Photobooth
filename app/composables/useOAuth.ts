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

  return {
    user: readonly(user),
    loginWithProvider,
  };
};
