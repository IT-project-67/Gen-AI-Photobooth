export const useOAuth = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  
  // Login with Google
  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      })
      
      if (error) {
        return { error: error.message }
      }
      return { error: null }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Google OAuth login failed'
      return { error: errorMessage }
    }
  }

  return {
    user: readonly(user),
    loginWithGoogle
  }
}
