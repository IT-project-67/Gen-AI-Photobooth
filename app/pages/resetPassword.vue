<template>
  <div class="reset-password-page">
    <div class="reset-password-form">
      <h1>Reset Password</h1>

      <form @submit.prevent="handleSubmit">
        <AppInputBox
          id="newPassword"
          v-model="newPassword"
          label="New Password"
          placeholder="Enter your new password"
          type="password"
          :required="true"
        />

        <AppInputBox
          id="confirmPassword"
          v-model="confirmPassword"
          label="Confirm New Password"
          placeholder="Confirm your new password"
          type="password"
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

<script setup lang="ts">
import AppInputBox from "~/components/AppInputBox.vue";
import { useRoute } from "#app";
import { navigateTo } from "#imports";

const newPassword = ref("");
const confirmPassword = ref("");
const isSubmitting = ref(false);
const error = ref("");
const success = ref("");
const accessToken = ref("");
const refreshToken = ref("");

const route = useRoute();
const { resetPassword } = useAuth();

onMounted(() => {
  if (window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessTokenParam = hashParams.get("access_token");
    const refreshTokenParam = hashParams.get("refresh_token");

    if (accessTokenParam && refreshTokenParam) {
      accessToken.value = accessTokenParam;
      refreshToken.value = refreshTokenParam;
    } else {
      error.value = "Invalid or missing reset tokens. Please request a new password reset.";
    }
  } else {
    // Fallback to query parameters
    const accessTokenParam = (route.query.access_token as string) || (route.query.token as string);
    const refreshTokenParam = route.query.refresh_token as string;

    if (accessTokenParam && typeof accessTokenParam === "string") {
      accessToken.value = accessTokenParam;
      refreshToken.value = (refreshTokenParam as string) || accessTokenParam;
    } else {
      error.value = "Invalid or missing reset tokens. Please request a new password reset.";
    }
  }
});

const handleSubmit = async (event: Event) => {
  event.preventDefault();

  if (!accessToken.value) {
    error.value = "Invalid or missing reset tokens";
    return;
  }

  if (!newPassword.value || !confirmPassword.value) {
    error.value = "Please fill in all fields";
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    error.value = "Passwords do not match";
    return;
  }

  if (newPassword.value.length < 6) {
    error.value = "Password must be at least 6 characters long";
    return;
  }

  isSubmitting.value = true;
  error.value = "";
  success.value = "";

  try {
    const { data, error: resetError } = await resetPassword(
      accessToken.value,
      refreshToken.value,
      newPassword.value,
    );

    if (resetError) {
      error.value = resetError;
      return;
    }

    if (data) {
      success.value = data.message;
      // Clear form
      newPassword.value = "";
      confirmPassword.value = "";

      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigateTo("/login");
      }, 3000);
    }
  } catch (err: unknown) {
    console.error("Reset password error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "An error occurred while resetting password";
    error.value = errorMessage;
  } finally {
    isSubmitting.value = false;
  }
};
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
