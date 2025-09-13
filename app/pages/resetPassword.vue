<template>
  <div class="reset-password-page">
    <div class="reset-password-form">
      <h1>Reset Password</h1>

      <form @submit.prevent="handleSubmit">
        <AppInputBox
          v-model="newPassword"
          label="New Password"
          placeholder="Enter your new password"
          type="password"
          id="newPassword"
          :required="true"
        />

        <AppInputBox
          v-model="confirmPassword"
          label="Confirm New Password"
          placeholder="Confirm your new password"
          type="password"
          id="confirmPassword"
          :required="true"
        />

        <!-- Confirmation message-->
        <p v-if="message" class="confirmation_message">
          {{ message }}
        </p>

        <div class="submit">
          <button type="submit" class="reset-button" :disabled="isSubmitting">
            {{ isSubmitting ? "Resetting..." : "Reset Password" }}
          </button>
        </div>

        <div class="back-to-login">
          <NuxtLink to="/login">Back to Login</NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import AppInputBox from "~/components/AppInputBox.vue";

export default defineComponent({
  name: "ResetPasswordPage",
  components: {
    AppInputBox,
  },

  data() {
    return {
      newPassword: "",
      confirmPassword: "",
      isSubmitting: false,
      message: "",
    };
  },

  methods: {
    handleSubmit() {
      this.isSubmitting = true;
      this.message = "";

      if (this.newPassword !== this.confirmPassword) {
        this.newPassword = "";
        this.confirmPassword = "";
        this.isSubmitting = false;
        this.message = "Passwords do not match!";
        return;
      }

      setTimeout(() => {
        this.newPassword = "";
        this.confirmPassword = "";
        this.isSubmitting = false;
        this.message =
          "Password has been successfully reset. You can now log in with your new password.";
      }, 500);
    },
  },
});
</script>

<style scoped>
.reset-password-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  overflow: hidden;
  box-sizing: border-box;
  padding: 0 16px;
}

.reset-password-form {
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
  .reset-password-form {
    margin: 28px auto;
    max-width: 500px;
  }
}

@media (min-width: 1024px) {
  .reset-password-form {
    max-width: 600px;
  }
}
</style>
