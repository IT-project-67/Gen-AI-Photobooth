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

      <!-- forget password (Optional)-->
      <div v-if="showForgotPassword" class="extra-links">
        <NuxtLink to="/forgotPassword">Forgot Password?</NuxtLink>
      </div>

      <!-- Submit Button -->
      <button type="submit" class="auth-button">{{ buttonText }}</button>

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
    </form>

    <!-- Social Media Login -->
    <div class="divider">
      <span>Or</span>
    </div>
    <div class="social-login">
      <button class="social-button google">Google</button>
      <button class="social-button instagram">Instagram</button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "AuthForm",
  props: {
    title: {
      type: String,
      required: true,
    },
    buttonText: {
      type: String,
      required: true,
    },
    showConfirmPassword: {
      type: Boolean,
      default: false,
    },
    showForgotPassword: {
      type: Boolean,
      default: false,
    },
    switchToLogIn: {
      type: Boolean,
      default: false,
    },
    switchToSignUp: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      email: "",
      password: "",
      confirmPassword: "",
    };
  },
  methods: {
    handleSubmit() {
      if (this.showConfirmPassword && this.password !== this.confirmPassword) {
        alert("Passwords do not match!");
        return;
      }
      // Emit the form data to the parent component
      this.$emit("submit", { email: this.email, password: this.password });
    },
  },
});
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
  margin-bottom: 15px;
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
  margin-top: 10px;
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

.google,
.instagram {
  background: linear-gradient(to right, #8a2be2, #ff69b4);
  color: white;
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
