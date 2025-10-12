import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  mockSetSession,
  mockSignOut,
  mockUpdateUser,
  mockUser,
  mockFetch,
  mockNavigateTo,
} from "~/tests/app/jest.setup";

describe("useAuth Composable", () => {
  let useAuth: typeof import("~/app/composables/useAuth").useAuth;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    // Reset mocks to default state
    mockSetSession.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue({ error: null });
    mockUpdateUser.mockResolvedValue({ error: null });
    mockNavigateTo.mockResolvedValue(undefined);
    mockUser.value = null;

    try {
      const module = await import("~/app/composables/useAuth");
      useAuth = module.useAuth;
    } catch (error) {
      console.error("Failed to import useAuth:", error);
      throw error;
    }
  });

  describe("Composable Structure", () => {
    it("should create composable instance", () => {
      const composable = useAuth();

      expect(composable).toBeDefined();
      expect(composable.user).toBeDefined();
      expect(typeof composable.loginWithEmail).toBe("function");
      expect(typeof composable.registerWithEmail).toBe("function");
      expect(typeof composable.forgotPassword).toBe("function");
      expect(typeof composable.resetPassword).toBe("function");
      expect(typeof composable.logout).toBe("function");
    });

    it("should have all required methods", () => {
      const composable = useAuth();

      expect(typeof composable.loginWithEmail).toBe("function");
      expect(typeof composable.registerWithEmail).toBe("function");
      expect(typeof composable.forgotPassword).toBe("function");
      expect(typeof composable.resetPassword).toBe("function");
      expect(typeof composable.logout).toBe("function");
    });

    it("should have readonly user property", () => {
      const composable = useAuth();

      expect(composable.user).toBeDefined();
      expect(composable.user.value).toBeNull();
    });
  });

  describe("loginWithEmail", () => {
    it("should login successfully with valid credentials", async () => {
      const mockResponse = {
        success: true,
        data: {
          session: {
            access_token: "test-access-token",
            refresh_token: "test-refresh-token",
          },
          user: {
            id: "user-123",
            email: "test@example.com",
          },
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.loginWithEmail("test@example.com", "password123");

      expect(mockFetch).toHaveBeenCalledWith("/api/v1/auth/login", {
        method: "POST",
        body: { email: "test@example.com", password: "password123" },
      });
      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
      });
      expect(result.data).toEqual(mockResponse.data);
      expect(result.error).toBeNull();
    });

    it("should handle API error response", async () => {
      const mockResponse = {
        success: false,
        error: {
          message: "Invalid credentials",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.loginWithEmail("test@example.com", "wrongpassword");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Invalid credentials");
    });

    it("should handle API error without message", async () => {
      const mockResponse = {
        success: false,
        error: {},
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.loginWithEmail("test@example.com", "password123");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Login failed");
    });

    it("should handle fetch error with nested error message", async () => {
      const mockError = {
        data: {
          error: {
            message: "Network error occurred",
          },
        },
      };

      mockFetch.mockRejectedValue(mockError as never);

      const composable = useAuth();
      const result = await composable.loginWithEmail("test@example.com", "password123");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Network error occurred");
    });

    it("should handle fetch error with direct message", async () => {
      const mockError = {
        data: {
          message: "Direct error message",
        },
      };

      mockFetch.mockRejectedValue(mockError as never);

      const composable = useAuth();
      const result = await composable.loginWithEmail("test@example.com", "password123");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Direct error message");
    });

    it("should handle Error instance", async () => {
      mockFetch.mockRejectedValue(new Error("Standard error") as never);

      const composable = useAuth();
      const result = await composable.loginWithEmail("test@example.com", "password123");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Standard error");
    });

    it("should handle unknown error type", async () => {
      mockFetch.mockRejectedValue("String error" as never);

      const composable = useAuth();
      const result = await composable.loginWithEmail("test@example.com", "password123");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Login failed");
    });

    it("should handle response without session", async () => {
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
          },
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.loginWithEmail("test@example.com", "password123");

      expect(mockSetSession).not.toHaveBeenCalled();
      expect(result.data).toEqual(mockResponse.data);
      expect(result.error).toBeNull();
    });

    it("should handle empty email and password", async () => {
      const mockResponse = {
        success: false,
        error: {
          message: "Email and password are required",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.loginWithEmail("", "");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Email and password are required");
    });

    it("should handle fetch error with data.message only (no error.message)", async () => {
      const mockError = {
        data: {
          message: "Direct login error message",
        },
      };

      mockFetch.mockRejectedValue(mockError as never);

      const composable = useAuth();
      const result = await composable.loginWithEmail("test@example.com", "password123");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Direct login error message");
    });

    it("should handle API error with null error object", async () => {
      const mockResponse = {
        success: false,
        error: null,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.loginWithEmail("test@example.com", "password123");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Login failed");
    });

    it("should handle success response with null data", async () => {
      const mockResponse = {
        success: true,
        data: null,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.loginWithEmail("test@example.com", "password123");

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });
  });

  describe("registerWithEmail", () => {
    it("should register successfully with valid credentials", async () => {
      const mockResponse = {
        success: true,
        data: {
          session: {
            access_token: "test-access-token",
            refresh_token: "test-refresh-token",
          },
          user: {
            id: "user-123",
            email: "newuser@example.com",
          },
          isRecovered: false,
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.registerWithEmail("newuser@example.com", "password123");

      expect(mockFetch).toHaveBeenCalledWith("/api/v1/auth/register", {
        method: "POST",
        body: { email: "newuser@example.com", password: "password123" },
      });
      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
      });
      expect(result.data).toEqual(mockResponse.data);
      expect(result.error).toBeNull();
    });

    it("should handle recovered account", async () => {
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: "user-123",
            email: "recovered@example.com",
          },
          isRecovered: true,
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.registerWithEmail("recovered@example.com", "password123");

      expect(mockSetSession).not.toHaveBeenCalled();
      expect(result.data).toEqual(mockResponse.data);
      expect(result.error).toBeNull();
    });

    it("should handle registration without session (email confirmation required)", async () => {
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: "user-123",
            email: "newuser@example.com",
          },
          isRecovered: false,
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.registerWithEmail("newuser@example.com", "password123");

      expect(mockSetSession).not.toHaveBeenCalled();
      expect(result.data).toEqual(mockResponse.data);
      expect(result.error).toBeNull();
    });

    it("should handle API error response", async () => {
      const mockResponse = {
        success: false,
        error: {
          message: "User already exists",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.registerWithEmail("existing@example.com", "password123");

      expect(result.data).toBeNull();
      expect(result.error).toBe("User already exists");
    });

    it("should handle API error without message", async () => {
      const mockResponse = {
        success: false,
        error: {},
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.registerWithEmail("test@example.com", "password123");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Registration failed");
    });

    it("should handle fetch error with nested error message", async () => {
      const mockError = {
        data: {
          error: {
            message: "Email validation failed",
          },
        },
      };

      mockFetch.mockRejectedValue(mockError as never);

      const composable = useAuth();
      const result = await composable.registerWithEmail("invalid@", "password123");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Email validation failed");
    });

    it("should handle fetch error with direct message", async () => {
      const mockError = {
        data: {
          message: "Registration service unavailable",
        },
      };

      mockFetch.mockRejectedValue(mockError as never);

      const composable = useAuth();
      const result = await composable.registerWithEmail("test@example.com", "password123");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Registration service unavailable");
    });

    it("should handle Error instance", async () => {
      mockFetch.mockRejectedValue(new Error("Network timeout") as never);

      const composable = useAuth();
      const result = await composable.registerWithEmail("test@example.com", "password123");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Network timeout");
    });

    it("should handle unknown error type", async () => {
      mockFetch.mockRejectedValue({ random: "error" } as never);

      const composable = useAuth();
      const result = await composable.registerWithEmail("test@example.com", "password123");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Registration failed");
    });

    it("should handle fetch error with data.message only (no error.message)", async () => {
      const mockError = {
        data: {
          message: "Direct registration error message",
        },
      };

      mockFetch.mockRejectedValue(mockError as never);

      const composable = useAuth();
      const result = await composable.registerWithEmail("test@example.com", "password123");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Direct registration error message");
    });

    it("should handle API error with null error object", async () => {
      const mockResponse = {
        success: false,
        error: null,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.registerWithEmail("test@example.com", "password123");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Registration failed");
    });

    it("should handle success response with null data", async () => {
      const mockResponse = {
        success: true,
        data: null,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.registerWithEmail("test@example.com", "password123");

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });
  });

  describe("forgotPassword", () => {
    it("should send reset email successfully", async () => {
      const mockResponse = {
        success: true,
        data: {
          message: "Password reset email sent",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.forgotPassword("test@example.com");

      expect(mockFetch).toHaveBeenCalledWith("/api/v1/auth/forgot-password", {
        method: "POST",
        body: { email: "test@example.com" },
      });
      expect(result.data).toEqual(mockResponse.data);
      expect(result.error).toBeNull();
    });

    it("should handle success response with null data", async () => {
      const mockResponse = {
        success: true,
        data: null,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.forgotPassword("test@example.com");

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it("should handle API error response", async () => {
      const mockResponse = {
        success: false,
        error: {
          message: "Email not found",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.forgotPassword("nonexistent@example.com");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Email not found");
    });

    it("should handle API error without message", async () => {
      const mockResponse = {
        success: false,
        error: {},
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.forgotPassword("test@example.com");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Failed to send reset email");
    });

    it("should handle API error with null error object", async () => {
      const mockResponse = {
        success: false,
        error: null,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.forgotPassword("test@example.com");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Failed to send reset email");
    });

    it("should handle fetch error with nested error message", async () => {
      const mockError = {
        data: {
          error: {
            message: "Email service unavailable",
          },
        },
      };

      mockFetch.mockRejectedValue(mockError as never);

      const composable = useAuth();
      const result = await composable.forgotPassword("test@example.com");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Email service unavailable");
    });

    it("should handle fetch error with data but no nested error.message", async () => {
      const mockError = {
        data: {
          message: "Direct data message",
        },
      };

      mockFetch.mockRejectedValue(mockError as never);

      const composable = useAuth();
      const result = await composable.forgotPassword("test@example.com");

      // forgotPassword only checks error.data?.error?.message, not error.data?.message
      expect(result.data).toBeNull();
      expect(result.error).toBe("Failed to send reset email");
    });

    it("should handle Error instance", async () => {
      mockFetch.mockRejectedValue(new Error("SMTP connection failed") as never);

      const composable = useAuth();
      const result = await composable.forgotPassword("test@example.com");

      expect(result.data).toBeNull();
      expect(result.error).toBe("SMTP connection failed");
    });

    it("should handle unknown error type", async () => {
      mockFetch.mockRejectedValue(null as never);

      const composable = useAuth();
      const result = await composable.forgotPassword("test@example.com");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Failed to send reset email");
    });

    it("should handle empty email", async () => {
      const mockResponse = {
        success: false,
        error: {
          message: "Email is required",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.forgotPassword("");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Email is required");
    });
  });

  describe("resetPassword", () => {
    it("should reset password successfully", async () => {
      mockSetSession.mockResolvedValue({ error: null });
      mockUpdateUser.mockResolvedValue({ error: null });

      const composable = useAuth();
      const result = await composable.resetPassword(
        "access-token-123",
        "refresh-token-123",
        "newpassword123",
      );

      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: "access-token-123",
        refresh_token: "refresh-token-123",
      });
      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: "newpassword123",
      });
      expect(result.data).toEqual({
        message: "Password has been successfully reset. You can now log in with your new password.",
      });
      expect(result.error).toBeNull();
    });

    it("should handle invalid or expired token", async () => {
      mockSetSession.mockResolvedValue({
        error: { message: "Invalid refresh token" },
      });

      const composable = useAuth();
      const result = await composable.resetPassword(
        "invalid-token",
        "invalid-refresh",
        "newpassword123",
      );

      expect(mockSetSession).toHaveBeenCalled();
      expect(mockUpdateUser).not.toHaveBeenCalled();
      expect(result.data).toBeNull();
      expect(result.error).toBe("Invalid refresh token");
    });

    it("should handle session error without message", async () => {
      mockSetSession.mockResolvedValue({
        error: {},
      } as never);

      const composable = useAuth();
      const result = await composable.resetPassword("token-123", "refresh-123", "newpassword123");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Invalid or expired reset token");
    });

    it("should handle password update error", async () => {
      mockSetSession.mockResolvedValue({ error: null });
      mockUpdateUser.mockResolvedValue({
        error: { message: "Password too weak" },
      });

      const composable = useAuth();
      const result = await composable.resetPassword(
        "access-token-123",
        "refresh-token-123",
        "weak",
      );

      expect(mockSetSession).toHaveBeenCalled();
      expect(mockUpdateUser).toHaveBeenCalled();
      expect(result.data).toBeNull();
      expect(result.error).toBe("Password too weak");
    });

    it("should handle password update error without message", async () => {
      mockSetSession.mockResolvedValue({ error: null });
      mockUpdateUser.mockResolvedValue({
        error: {},
      } as never);

      const composable = useAuth();
      const result = await composable.resetPassword(
        "access-token-123",
        "refresh-token-123",
        "newpassword123",
      );

      expect(result.data).toBeNull();
      expect(result.error).toBe("Failed to update password");
    });

    it("should handle Error instance", async () => {
      mockSetSession.mockRejectedValue(new Error("Session error") as never);

      const composable = useAuth();
      const result = await composable.resetPassword(
        "access-token-123",
        "refresh-token-123",
        "newpassword123",
      );

      expect(result.data).toBeNull();
      expect(result.error).toBe("Session error");
    });

    it("should handle unknown error type", async () => {
      mockSetSession.mockRejectedValue("Unknown error" as never);

      const composable = useAuth();
      const result = await composable.resetPassword(
        "access-token-123",
        "refresh-token-123",
        "newpassword123",
      );

      expect(result.data).toBeNull();
      expect(result.error).toBe("Failed to reset password");
    });

    it("should handle empty tokens", async () => {
      mockSetSession.mockResolvedValue({
        error: { message: "Tokens are required" },
      });

      const composable = useAuth();
      const result = await composable.resetPassword("", "", "newpassword123");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Tokens are required");
    });

    it("should handle empty password", async () => {
      mockSetSession.mockResolvedValue({ error: null });
      mockUpdateUser.mockResolvedValue({
        error: { message: "Password cannot be empty" },
      });

      const composable = useAuth();
      const result = await composable.resetPassword("access-token-123", "refresh-token-123", "");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Password cannot be empty");
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const composable = useAuth();
      const result = await composable.logout();

      expect(mockSignOut).toHaveBeenCalled();
      expect(mockNavigateTo).toHaveBeenCalledWith("/");
      expect(result.error).toBeNull();
    });

    it("should handle logout error", async () => {
      mockSignOut.mockResolvedValue({
        error: { message: "Failed to sign out" },
      });

      const composable = useAuth();
      const result = await composable.logout();

      expect(mockSignOut).toHaveBeenCalled();
      expect(mockNavigateTo).not.toHaveBeenCalled();
      expect(result.error).toBe("Failed to sign out");
    });

    it("should handle Error instance during logout", async () => {
      mockSignOut.mockRejectedValue(new Error("Network error") as never);

      const composable = useAuth();
      const result = await composable.logout();

      expect(result.error).toBe("Network error");
    });

    it("should handle unknown error type during logout", async () => {
      mockSignOut.mockRejectedValue("String error" as never);

      const composable = useAuth();
      const result = await composable.logout();

      expect(result.error).toBe("Logout failed");
    });

    it("should navigate to home page after successful logout", async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const composable = useAuth();
      await composable.logout();

      expect(mockNavigateTo).toHaveBeenCalledTimes(1);
      expect(mockNavigateTo).toHaveBeenCalledWith("/");
    });
  });

  describe("Edge Cases and Integration", () => {
    it("should handle multiple login attempts", async () => {
      const mockResponse1 = {
        success: false,
        error: { message: "Invalid credentials" },
      };
      const mockResponse2 = {
        success: true,
        data: {
          session: {
            access_token: "token",
            refresh_token: "refresh",
          },
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse1 as never);
      mockFetch.mockResolvedValueOnce(mockResponse2 as never);

      const composable = useAuth();

      const result1 = await composable.loginWithEmail("test@example.com", "wrong");
      expect(result1.error).toBe("Invalid credentials");

      const result2 = await composable.loginWithEmail("test@example.com", "correct");
      expect(result2.error).toBeNull();
      expect(result2.data).toEqual(mockResponse2.data);
    });

    it("should handle concurrent authentication requests", async () => {
      const mockResponse = {
        success: true,
        data: {
          session: {
            access_token: "token",
            refresh_token: "refresh",
          },
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();

      const promises = [
        composable.loginWithEmail("user1@example.com", "pass1"),
        composable.loginWithEmail("user2@example.com", "pass2"),
        composable.loginWithEmail("user3@example.com", "pass3"),
      ];

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.error).toBeNull();
        expect(result.data).toEqual(mockResponse.data);
      });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should handle special characters in email and password", async () => {
      const mockResponse = {
        success: true,
        data: {
          session: {
            access_token: "token",
            refresh_token: "refresh",
          },
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.loginWithEmail("user+test@example.com", "p@ssw0rd!#$%");

      expect(mockFetch).toHaveBeenCalledWith("/api/v1/auth/login", {
        method: "POST",
        body: { email: "user+test@example.com", password: "p@ssw0rd!#$%" },
      });
      expect(result.error).toBeNull();
    });

    it("should handle very long email and password", async () => {
      const longEmail = "a".repeat(100) + "@example.com";
      const longPassword = "p".repeat(200);

      const mockResponse = {
        success: true,
        data: { session: { access_token: "token", refresh_token: "refresh" } },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.loginWithEmail(longEmail, longPassword);

      expect(result.error).toBeNull();
    });

    it("should handle unicode characters in credentials", async () => {
      const mockResponse = {
        success: true,
        data: { session: { access_token: "token", refresh_token: "refresh" } },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.loginWithEmail("user@example.com", "password123");

      expect(result.error).toBeNull();
    });

    it("should maintain user state across method calls", () => {
      mockUser.value = { id: "user-123", email: "test@example.com" } as never;

      const composable1 = useAuth();
      const composable2 = useAuth();

      expect(composable1.user.value).toEqual(mockUser.value);
      expect(composable2.user.value).toEqual(mockUser.value);
    });

    it("should handle null and undefined in error responses", async () => {
      const mockResponse = {
        success: false,
        error: null,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.loginWithEmail("test@example.com", "password");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Login failed");
    });
  });

  describe("Type Safety and Error Handling", () => {
    it("should handle malformed API responses", async () => {
      const mockResponse = {
        success: true,
        // Missing data field
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.loginWithEmail("test@example.com", "password");

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it("should handle response with unexpected structure", async () => {
      const mockResponse = {
        success: true,
        data: {
          // Missing session field
          user: { id: "123" },
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useAuth();
      const result = await composable.loginWithEmail("test@example.com", "password");

      expect(mockSetSession).not.toHaveBeenCalled();
      expect(result.data).toBeDefined();
    });

    it("should handle fetch error with null data", async () => {
      const mockError = {
        data: null,
      };

      mockFetch.mockRejectedValue(mockError as never);

      const composable = useAuth();
      const result = await composable.loginWithEmail("test@example.com", "password");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Login failed");
    });

    it("should handle setSession failure during login", async () => {
      const mockResponse = {
        success: true,
        data: {
          session: {
            access_token: "token",
            refresh_token: "refresh",
          },
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);
      mockSetSession.mockRejectedValue(new Error("Session error") as never);

      const composable = useAuth();

      // setSession error should be caught by try-catch and returned as error
      const result = await composable.loginWithEmail("test@example.com", "password");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Session error");
    });

    it("should handle setSession failure during registration", async () => {
      const mockResponse = {
        success: true,
        data: {
          session: {
            access_token: "token",
            refresh_token: "refresh",
          },
          isRecovered: false,
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);
      mockSetSession.mockRejectedValue(new Error("Session error") as never);

      const composable = useAuth();

      // setSession error should be caught by try-catch and returned as error
      const result = await composable.registerWithEmail("test@example.com", "password");

      expect(result.data).toBeNull();
      expect(result.error).toBe("Session error");
    });
  });

  describe("Realistic User Flows", () => {
    it("should complete full registration and login flow", async () => {
      // Step 1: Register
      const registerResponse = {
        success: true,
        data: {
          user: { id: "user-123", email: "newuser@example.com" },
          isRecovered: false,
        },
      };
      mockFetch.mockResolvedValueOnce(registerResponse as never);

      const composable = useAuth();
      const registerResult = await composable.registerWithEmail(
        "newuser@example.com",
        "password123",
      );
      expect(registerResult.error).toBeNull();

      // Step 2: Login
      const loginResponse = {
        success: true,
        data: {
          session: { access_token: "token", refresh_token: "refresh" },
          user: { id: "user-123", email: "newuser@example.com" },
        },
      };
      mockFetch.mockResolvedValueOnce(loginResponse as never);

      const loginResult = await composable.loginWithEmail("newuser@example.com", "password123");
      expect(loginResult.error).toBeNull();
      expect(mockSetSession).toHaveBeenCalled();
    });

    it("should complete password reset flow", async () => {
      // Step 1: Request password reset
      const forgotResponse = {
        success: true,
        data: { message: "Reset email sent" },
      };
      mockFetch.mockResolvedValueOnce(forgotResponse as never);

      const composable = useAuth();
      const forgotResult = await composable.forgotPassword("user@example.com");
      expect(forgotResult.error).toBeNull();

      // Step 2: Reset password with tokens
      mockSetSession.mockResolvedValue({ error: null });
      mockUpdateUser.mockResolvedValue({ error: null });

      const resetResult = await composable.resetPassword(
        "access-token",
        "refresh-token",
        "newpassword123",
      );
      expect(resetResult.error).toBeNull();
      expect(resetResult.data?.message).toContain("successfully reset");
    });

    it("should handle login, session management, and logout flow", async () => {
      // Step 1: Login
      const loginResponse = {
        success: true,
        data: {
          session: { access_token: "token", refresh_token: "refresh" },
        },
      };
      mockFetch.mockResolvedValueOnce(loginResponse as never);

      const composable = useAuth();
      const loginResult = await composable.loginWithEmail("user@example.com", "password");
      expect(loginResult.error).toBeNull();

      // Step 2: Logout
      mockSignOut.mockResolvedValue({ error: null });
      const logoutResult = await composable.logout();
      expect(logoutResult.error).toBeNull();
      expect(mockNavigateTo).toHaveBeenCalledWith("/");
    });
  });
});
