<template>
  <div class="auth-form">
    <h1>{{ title }}</h1>
    <form @submit.prevent="handleSubmit">
      <!-- Email Input -->
      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          placeholder="Enter your email"
          required
        />
      </div>

      <!-- Password Input -->
      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          placeholder="Enter your password"
          required
        />
      </div>

      <!-- Confirm Password Input (Optional) -->
      <div v-if="showConfirmPassword" class="form-group">
        <label for="confirm-password">Confirm Password</label>
        <input
          id="confirm-password"
          v-model="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          required
        />
      </div>

      <!-- password don't match error message -->
      <p
        v-if="errorMessage === 'Passwords do not match!'"
        class="error-message"
      >
        Passwords don't match. Try again.
      </p>

      <!-- forget password (Optional)-->
      <div v-if="showForgotPassword" class="extra-links">
        <NuxtLink to="/forgotPassword">Forgot Password?</NuxtLink>
      </div>

      <!-- Submit Button -->
      <button type="submit" class="auth-button">{{ buttonText }}</button>
    </form>
    <!-- switch to log in (Optional)-->
    <div v-if="switchToLogIn" class="extra-links">
      <span>Already have an account? </span>
      <NuxtLink to="/login">Log in</NuxtLink>
    </div>

    <!-- switch to sign up (Optional) -->
    <div v-if="switchToSignUp" class="extra-links">
      <span>Don't have an account? </span>
      <NuxtLink to="/signup">Sign up</NuxtLink>
    </div>

    <!-- divider -->
    <div class="divider">
      <span>Or</span>
    </div>

    <!-- Social Media Login -->
    <div class="social-login">
      <button class="social-button google" @click="emit('social-login', 'google')">
        <span>Continue with Google</span>
      </button>

      <button class="social-button discord" @click="emit('social-login', 'google')">
        <span>Continue with Discord</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

// props
const props = defineProps<{
  title: string;
  buttonText: string;
  errorMessage?: string;
  showConfirmPassword?: boolean;
  showForgotPassword?: boolean;
  switchToLogIn?: boolean;
  switchToSignUp?: boolean;
}>();

//emits
const emit = defineEmits<{
  (e: "submit", payload: { email: string; password: string }): void;
  (e: "error" | "social-login", payload: string): void
}>();

// local state
const email = ref("");
const password = ref("");
const confirmPassword = ref("");

// methods
const handleSubmit = () => {
  if (props.showConfirmPassword && password.value !== confirmPassword.value) {
    emit("error", "Passwords do not match!");
    return;
  }
  emit("submit", { email: email.value, password: password.value });
};
</script>

<style scoped>
.auth-form {
  width: 90%;
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

h1 {
  margin-bottom: 20px;
  font-size: 2rem;
}

.form-group {
  width: 100%;
  box-sizing: border-box;
  margin-top: 15px;
  text-align: left;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input {
  width: 100%;
  padding: 10px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  padding: 10px 20px;
  font-size: 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.auth-button {
  background: linear-gradient(to right, #8a2be2, #ff69b4);
  color: white;
  margin-top: 15px;
  width: 100%;
}

.social-login {
  margin-top: 20px;
}

.social-button {
  display: block;
  width: 100%;
  margin: 10px 0;
  padding: 10px;
  font-size: 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.social-button.google {
  background: white;
  color: black;
  border: 1px solid #ccc; 
}

.social-button.discord {
  background: #5865F2;  
  color: white;   
  border: none; 
}
.social-button.discord:hover {
  background: #4752C4;   /* darker blurple on hover */
}

.extra-links {
  margin-top: 15px;
  font-size: 1rem;
}

.divider {
  margin-top: 20px;
  display: flex;
  align-items: center;
  text-align: center;
}

.divider::before,
.divider::after {
  content: "";
  flex: 1;
  border-bottom: 1px solid #ccc;
}

.divider:not(:empty)::before {
  margin-right: 0.75em;
}
.divider:not(:empty)::after {
  margin-left: 0.75em;
}
.divider span {
  font-size: 0.9rem;
  color: #666;
}
.error-message {
  color: red;
  font-size: 0.9rem;
  margin-top: 7px;
  text-align: left;
}

/* Tablet and small desktops: adjust spacing and font-sizes */
@media (min-width: 768px) {
  .auth-form {
    margin: 28px auto;
    max-width: 500px; /* allow slightly wider "column" feel on tablets */
  }

  .auth-button,
  .social-button {
    font-size: 0.98rem;
    padding: 10px;
  }
}

/* Large desktops: further increase max-width */
@media (min-width: 1024px) {
  .auth-form {
    max-width: 600px;
  }
}
</style>
