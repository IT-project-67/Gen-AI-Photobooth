<template>
  <div class="login-page">
    <AuthForm
      title="Log in to Your Account"
      button-text="Log in"
      :show-confirm-password="false"
      :show-forgot-password="true"
      :switch-to-sign-up="true"
      @submite="handleSubmit"
      @social-login="handleGoogleLogin"
    />
  </div>
</template>

<script setup lang="ts">
import AuthForm from "@/components/AuthForm.vue";

const { loginWithEmail } = useAuth();
const { getUserFriendlyMessage } = useApiError();
const { loginWithGoogle } = useOAuth();

const error = ref("");

const handleSubmit = async (email: string, password: string) => {
  error.value = "";

  try {
    const { data, error: loginError } = await loginWithEmail(email, password);

    if (loginError) {
      // Try to parse error for user-friendly message
      try {
        const errorObj = JSON.parse(loginError);
        error.value = getUserFriendlyMessage(errorObj);
      } catch {
        error.value = loginError;
      }
      return;
    }

    if (data) {
      // Redirect to home page on success
      await navigateTo("/");
    }
  } catch (err: unknown) {
    console.error("Login error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "An error occurred during sign in";
    error.value = errorMessage;
  }
};

const oauthError = ref("");
const handleGoogleLogin = async () => {
  try {
    const { error } = await loginWithGoogle();

    if (error) {
      oauthError.value = error;
    }
    // If successful, user will be redirected to Google OAuth page
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Google OAuth registration failed";
    oauthError.value = errorMessage;
  }
};
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
}

.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  overflow: hidden; /* prevent scrollbars */
  box-sizing: border-box;
  padding: 0 16px; /* horizontal padding only */
}
</style>
