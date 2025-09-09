<template>
  <div class="auth-page">
    <AuthForm
      title="Create an Account"
      button-text="Sign Up"
      :show-confirm-password="true"
      :switch-to-log-in="true"
      @submit="handleSignUp"
      @social-login="handleSocialLogin"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import AuthForm from "@/components/AuthForm.vue";

export default defineComponent({
  name: "SignUpPage",
  components: { AuthForm },
  methods: {
    handleSignUp(formData: { email: string; password: string }) {
      // Handle sign-up logic here
      alert(`Sign up successful for ${formData.email}`);
    },
    handleSocialLogin(platform: string) {
      // Handle social login logic here
      alert(`Log in with ${platform} clicked`);
    },
  },
});
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
