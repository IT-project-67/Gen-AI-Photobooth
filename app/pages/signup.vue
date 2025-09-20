<template>
  <div class="auth-page">
    <AuthForm
      ref="authFormRef"
      v-model:is-submitting="isSubmitting"
      title="Create an Account"
      button-text="Sign Up"
      :show-confirm-password="true"
      :switch-to-log-in="true"
      :error-message="signupError"
      :success-message="success"
      :verify="success !== ''"
      @submit="handleSignUp"
      @error="handleSignUpError"
      @social-login="handleSocialLogin"
    />
  </div>

  <!-- Modal for informing messages -->
  <!-- <Modal v-if = "success === 'Waiting for verfication'">
    <h2>
      Verify Your Email
    </h2>
    <p>
      You're almost there! We have sent you a verification email. Please check your inbox and click the link to verify your email address.
    </p>
   </Modal> -->
</template>

<script setup lang="ts">
import AuthForm from "@/components/AuthForm.vue";
import { useOAuth } from "@/composables/useOAuth";
const authFormRef = ref<InstanceType<typeof AuthForm> | null>(null);

const { loginWithProvider } = useOAuth();
const { registerWithEmail } = useAuth();
const signupError = ref("");
const success = ref("");
const isSubmitting = ref(false);

// Signing up with email
const handleSignUpError = (msg: string) => {
  signupError.value = msg;
};

const handleSignUp = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  isSubmitting.value = true;

  // reset error message
  signupError.value = "";

  try {
    const { data, error: registerError } = await registerWithEmail(
      email,
      password,
    );

    if (registerError) {
      // registerError is already a string, use it directly
      console.log("Registration error:", registerError);
      signupError.value = registerError;
      return;
    }

    if (data) {
      if (data.isRecovered) {
        success.value = "verify_recovered";
        authFormRef.value?.resetForm();
        setTimeout(() => {
          navigateTo("/login");
        }, 2000);
      } else if (data.emailSent) {
        success.value = "verify_email";
        await nextTick();
        authFormRef.value?.resetForm();
      } else if (data.session) {
        success.value = "verify_success";
        // Redirect to home page after a short delay
        setTimeout(() => {
          navigateTo("/");
        }, 2000);
      }
    }
  } catch (err: unknown) {
    console.error("Registration error:", err);
    const errorMessage =
      err instanceof Error
        ? err.message
        : "An error occurred during registration";
    signupError.value = errorMessage;
  } finally {
    isSubmitting.value = false;
  }
};

// provider login
const handleSocialLogin = async (provider: string) => {
  const { error } = await loginWithProvider(provider);
  if (error) signupError.value = error;
};
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
}

.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  overflow: hidden; /* prevent scrollbars */
  box-sizing: border-box;
  padding: 0 16px; /* horizontal padding only */
}
</style>
