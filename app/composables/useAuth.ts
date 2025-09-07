import type {
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  RegisterResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
} from "~~/server/types/auth";
import type { ApiResponse } from "~~/server/types/api";

// Define a type for fetch errors
interface FetchError {
  data?: {
    error?: {
      message?: string;
    };
    message?: string;
  };
  message?: string;
}

// Define a type guard to check if an error is a FetchError
const isFetchError = (error: unknown): error is FetchError => {
  if (error === null || error === undefined) return false;
  if (typeof error !== "object") return false;
  if (!("data" in error)) return false;
  return true;
};

export const useAuth = () => {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  // Login with email and password via API
  const loginWithEmail = async (email: string, password: string) => {
    try {
      const loginData: LoginRequest = { email, password };

      const response = await $fetch<ApiResponse<LoginResponse>>(
        "/api/v1/auth/login",
        {
          method: "POST",
          body: loginData,
        },
      );

      if (!response.success) {
        return {
          data: null,
          error: response.error?.message || "Login failed",
        };
      }

      // Set session in Supabase client
      if (response.data?.session) {
        await supabase.auth.setSession({
          access_token: response.data.session.access_token,
          refresh_token: response.data.session.refresh_token,
        });
      }

      return {
        data: response.data || null,
        error: null,
      };
    } catch (error: unknown) {
      console.error("Login error:", error);
      let errorMessage = "Login failed";

      if (isFetchError(error)) {
        if (error.data?.error?.message) {
          errorMessage = error.data.error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        data: null,
        error: errorMessage,
      };
    }
  };

  // Register with email and password via API
  const registerWithEmail = async (email: string, password: string) => {
    try {
      const registerData: RegisterRequest = { email, password };

      const response = await $fetch<ApiResponse<RegisterResponse>>(
        "/api/v1/auth/register",
        {
          method: "POST",
          body: registerData,
        },
      );

      if (!response.success) {
        return {
          data: null,
          error: response.error?.message || "Registration failed",
        };
      }

      // Set session in Supabase client if available (auto-confirmed)
      if (response.data?.session) {
        await supabase.auth.setSession({
          access_token: response.data.session.access_token,
          refresh_token: response.data.session.refresh_token,
        });
      }

      return {
        data: response.data || null,
        error: null,
      };
    } catch (error: unknown) {
      let errorMessage = "Registration failed";

      // If it's a fetch error with data, try to extract the API error message
      if (isFetchError(error)) {
        if (error.data?.error?.message) {
          errorMessage = error.data.error.message;
        } else if (error.data?.message) {
          errorMessage = error.data.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        data: null,
        error: errorMessage,
      };
    }
  };

  // Forgot password
  const forgotPassword = async (email: string) => {
    try {
      const forgotPasswordData: ForgotPasswordRequest = { email };

      const response = await $fetch<ApiResponse<ForgotPasswordResponse>>(
        "/api/v1/auth/forgot-password",
        {
          method: "POST",
          body: forgotPasswordData,
        },
      );

      if (!response.success) {
        return {
          data: null,
          error: response.error?.message || "Failed to send reset email",
        };
      }

      return {
        data: response.data || null,
        error: null,
      };
    } catch (error: unknown) {
      console.error("Forgot password error:", error);
      let errorMessage = "Failed to send reset email";

      if (isFetchError(error)) {
        if (error.data?.error?.message) {
          errorMessage = error.data.error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        data: null,
        error: errorMessage,
      };
    }
  };

  // Reset password
  const resetPassword = async (
    accessToken: string,
    refreshToken: string,
    newPassword: string,
  ) => {
    try {
      // First, set the session using the tokens
      const { data: sessionData, error: sessionError } =
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

      if (sessionError) {
        console.error("Session error:", sessionError);
        return {
          data: null,
          error: sessionError.message || "Invalid or expired reset token",
        };
      }

      console.log("Session set successfully:", sessionData);

      // Now update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error("Update password error:", updateError);
        return {
          data: null,
          error: updateError.message || "Failed to update password",
        };
      }

      console.log("Password updated successfully");

      return {
        data: {
          message:
            "Password has been successfully reset. You can now log in with your new password.",
        },
        error: null,
      };
    } catch (error: unknown) {
      console.error("Reset password error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to reset password";

      return {
        data: null,
        error: errorMessage,
      };
    }
  };

  // Logout
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { error: error.message };
      }

      // Redirect to home page
      await navigateTo("/");

      return { error: null };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Logout failed";
      return { error: errorMessage };
    }
  };

  return {
    user: readonly(user),
    loginWithEmail,
    registerWithEmail,
    forgotPassword,
    resetPassword,
    logout,
  };
};
