<template>
  <div class="auth-page">
    <AuthForm
      title="Create an Account"
      button-text="Sign Up"
      :show-confirm-password="true"
      :switch-to-log-in="true"
      :error-message="formErrorMessage"
      @submit="handleSignUp"
      @error="handleSignUpError"
      @social-login="handleGoogleLogin"
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
// import InformModal from "@/components/InformModal.vue";

const { registerWithEmail } = useAuth();
const { loginWithGoogle } = useOAuth();

const formErrorMessage = ref("");
const registerErrorMessage = ref("");
const oauthError = ref("");
const success = ref("");

// Signing up with email
const handleSignUpError = (msg: string) => {
  console.log("Signup error:", msg);
  formErrorMessage.value = msg;
};

const handleSignUp = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  // reset error message
  formErrorMessage.value = "";

  try {
    const { data, error: registerError } = await registerWithEmail(
      email,
      password,
    );

    if (registerError) {
      // registerError is already a string, use it directly
      registerErrorMessage.value = registerError;
      return;
    }

    if (data) {
      if (data.emailSent) {
        success.value = "Waiting for verification.";
      } else if (data.session) {
        success.value = "Registration successful";
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
    registerErrorMessage.value = errorMessage;
  }
};

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
