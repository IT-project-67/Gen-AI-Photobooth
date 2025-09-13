<template>
  <div class="forgot-password-page">
    <div class="forgot-password-form">
      <h1>Forgot Password</h1>

      <form @submit.prevent="handleSubmit">
        <AppInputBox
          id="email"
          v-model="email"
          label="Email"
          placeholder="Enter your email address"
          type="email"
          :required="true"
        />

        <!-- Error message -->
        <p v-if="error" class="error_message">
          {{ error }}
        </p>

        <!-- Success message -->
        <p v-if="success" class="success_message">
          {{ success }}
        </p>

        <div class="submit">
          <button type="submit" class="reset-button" :disabled="isSubmitting">
            {{ isSubmitting ? "Sending..." : "Send Reset Email" }}
          </button>
        </div>

        <div class="back-to-login">
          <span>Remember your password? </span>
          <NuxtLink to="/login">Login Here</NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppInputBox from "~/components/AppInputBox.vue";

const email = ref("");
const isSubmitting = ref(false);
const error = ref("");
const success = ref("");

const { forgotPassword } = useAuth();

const handleSubmit = async (event: Event) => {
  event.preventDefault();

  if (!email.value) {
    error.value = "Please enter your email address";
    return;
  }

  isSubmitting.value = true;
  error.value = "";
  success.value = "";

  try {
    const { data, error: forgotError } = await forgotPassword(email.value);

    if (forgotError) {
      error.value = forgotError;
      return;
    }

    if (data) {
      success.value = data.message;
      // Clear form
      email.value = "";
    }
  } catch (err: unknown) {
    console.error("Forgot password error:", err);
    const errorMessage =
      err instanceof Error
        ? err.message
        : "An error occurred while sending reset email";
    error.value = errorMessage;
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.forgot-password-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  overflow: hidden;
  box-sizing: border-box;
  padding: 0 16px;
}

.forgot-password-form {
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

.submit {
  margin-top: 20px;
}

.reset-button {
  padding: 10px 20px;
  font-size: 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: linear-gradient(to right, #8a2be2, #ff69b4);
  color: white;
  width: 100%;
}

.back-to-login {
  margin-top: 15px;
  font-size: 1rem;
}

.success_message {
  margin: 15px 0;
  font-size: 0.95rem;
  color: #555;
  background: #f9f9ff;
  border: 1px solid #e0dfff;
  padding: 10px 14px;
  border-radius: 6px;
  line-height: 1.4;
  text-align: left;
}

.error_message {
  color: red;
  font-size: 0.9rem;
  margin-top: 7px;
  text-align: left;
}

/* .success_message {
  color: green;
  font-size: 0.9rem;
  margin-top: 7px;
  text-align: left;
} */

/* Responsive styles */
@media (min-width: 768px) {
  .forgot-password-form {
    margin: 28px auto;
    max-width: 500px;
  }
}

@media (min-width: 1024px) {
  .forgot-password-form {
    max-width: 600px;
  }
}
</style>
