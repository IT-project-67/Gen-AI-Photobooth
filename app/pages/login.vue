<template>
  <div class="login-page">
    <AuthForm
      title="Log in to Your Account"
      button-text="Log in"
      :show-confirm-password="false"
      :show-forgot-password="true"
      :switch-to-sign-up="true"
      :error-message="loginError"
      @submit="handleSubmit"
      @social-login="handleSocialLogin"
    />
  </div>
</template>

<script setup lang="ts">
import AuthForm from "@/components/AuthForm.vue";
import { useOAuth } from "@/composables/useOAuth";

const { loginWithProvider } = useOAuth();
const { loginWithEmail } = useAuth();
const loginError = ref("");

const handleSubmit = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  loginError.value = "";

  try {
    const { data, error: err } = await loginWithEmail(email, password);
    if (err) {
      // display the error
      console.log("Login error:", err);
      loginError.value = err;
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
    loginError.value = errorMessage;
  }
};

// provider login
const handleSocialLogin = async (provider: string) => {
  const { error } = await loginWithProvider(provider);
  if (error) loginError.value = error;
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
