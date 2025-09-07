export const useOAuth = () => {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  // Login with Google using Supabase OAuth
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
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = "Google OAuth login failed";
      }
      return { error: errorMessage };
    }
  };

  return {
    user: readonly(user),
    loginWithGoogle,
  };
};
