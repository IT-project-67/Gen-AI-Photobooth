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
      @social-login="handleSocialLogin"
    />
  </div>
</template>

<script setup lang="ts">
import AuthForm from "@/components/AuthForm.vue";

const { registerWithEmail } = useAuth()
const { loginWithGoogle } = useOAuth()

const formErrorMessage = ref("")

const handleSignUpError = (msg: string) => {
  console.log("Signup error:", msg)
  formErrorMessage.value = msg
}

const handleSignUp = () => {
  // reset form error message
  formErrorMessage.value = ""
  try{
    const { data, error: registerError } = await registerWithEmail(form.email, form.password)

  if (registerError) {
    // registerError is already a string, use it directly
    error.value = registerError
    return
  }
  } catch (err: any){
    errorMessage.value = err.message
  } catch (err: any){
    errorMessage.value = err.message
  }
}

const handleSocialLogin = () => {
  // auth-form emits submit event
}

const handleSignUp = async ({email, password}:{email: string; password: string}) => {
  auth-form emits error

  auth-form emits submit event
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
