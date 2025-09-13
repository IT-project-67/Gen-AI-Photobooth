<template>
  <div class="forgot-password-page">
    <div class="forgot-password-form">
      <h1>Forgot Password</h1>

      <form @submit.prevent="handleSubmit">
        <AppInputBox
          v-model="email"
          label="Email"
          placeholder="Enter your email address"
          type="email"
          id="email"
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

        <div class="reset">
          <NuxtLink to="/resetPassword">reset</NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import AppInputBox from "~/components/AppInputBox.vue";
import { useAuth } from "~/composables/useAuth";

export default defineComponent({
  name: "ForgotPasswordPage",
  components: {
    AppInputBox,
  },

  data() {
    return {
      email: "",
      isSubmitting: false,
      error: "",
      success: "",
    };
  },

  methods: {
    async handleSubmit(event: Event) {
      event.preventDefault();

      if (!this.email) {
        this.error = "Please enter your email address";
        return;
      }
      this.isSubmitting = true;
      this.error = "";

      try {
        const { forgotPassword } = useAuth();
        const { data, error: forgotError } = await forgotPassword(this.email);

        if (forgotError) {
          this.error = forgotError;
          return;
        }

        if (data) {
          this.success = data.message;
          // Clear form
          this.email = "";
        }
      } catch (err: unknown) {
        console.error("Forgot password error:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "An error occurred while sending reset email";
        this.error = errorMessage;
      } finally {
        this.isSubmitting = false;
      }
    },
  },
});
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

/* .reset-button:hover { background: linear-gradient(to right, #9932cc, #ff1493); } */

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
