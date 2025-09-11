<template>
  <div class="forgot-password-page">
    <div class="forgot-password-form">
      <h1>Forget Password</h1>

      <form @submit.prevent="handleSubmit">
        <AppInputBox
          v-model="email"
          label="Email"
          placeholder="Enter your email address"
          type="email"
          id="email"
          :required="true"
        />

        <!-- Confirmation message-->
        <p v-if="message" class="confirmation_message">
          {{ message }}
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

<script lang="ts">
import { defineComponent } from "vue";
import AppInputBox from "~/components/AppInputBox.vue";

export default defineComponent({
  name: "ForgetPasswordPage",
  components: {
    AppInputBox,
  },

  data() {
    return {
      email: "",
      isSubmitting: false,
      message: "",
    };
  },

  methods: {
    handleSubmit() {
      this.isSubmitting = true;
      this.message = "";

      setTimeout(() => {
        this.email = "";
        this.isSubmitting = false;
        this.message =
          "If an account with this email exists, you will receive a password reset link.";
      }, 1500);
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

.confirmation_message {
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
