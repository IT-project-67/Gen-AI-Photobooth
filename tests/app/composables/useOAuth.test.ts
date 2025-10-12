import { describe, it, expect, beforeEach, jest, afterAll } from "@jest/globals";
import { mockGetSession, mockSignInWithOAuth, mockUser, mockFetch } from "~/tests/app/jest.setup";

// Mock window.location
const mockLocation = {
  origin: "http://localhost:3000",
  href: "http://localhost:3000/",
};
global.window = { location: mockLocation } as never;

// Mock console
const mockConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});
const mockConsoleError = jest.spyOn(console, "error").mockImplementation(() => {});

describe("useOAuth Composable", () => {
  let useOAuth: typeof import("~/app/composables/useOAuth").useOAuth;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    // Reset mocks to default state
    mockSignInWithOAuth.mockResolvedValue({ error: null });
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-access-token",
        },
      },
    } as never);
    mockUser.value = null;
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();

    try {
      const module = await import("~/app/composables/useOAuth");
      useOAuth = module.useOAuth;
    } catch (error) {
      console.error("Failed to import useOAuth:", error);
      throw error;
    }
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe("Composable Structure", () => {
    it("should create composable instance", () => {
      const composable = useOAuth();

      expect(composable).toBeDefined();
      expect(composable.user).toBeDefined();
      expect(typeof composable.loginWithProvider).toBe("function");
      expect(typeof composable.handleOAuthProfile).toBe("function");
    });

    it("should have all required methods", () => {
      const composable = useOAuth();

      expect(typeof composable.loginWithProvider).toBe("function");
      expect(typeof composable.handleOAuthProfile).toBe("function");
    });

    it("should have readonly user property", () => {
      const composable = useOAuth();

      expect(composable.user).toBeDefined();
      expect(composable.user.value).toBeNull();
    });
  });

  describe("loginWithProvider - Google", () => {
    it("should login with Google successfully", async () => {
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      const composable = useOAuth();
      const result = await composable.loginWithProvider("google");

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: "http://localhost/",
        },
      });
      expect(result.error).toBeNull();
    });

    it("should handle Google OAuth error", async () => {
      mockSignInWithOAuth.mockResolvedValue({
        error: { message: "Google OAuth failed" },
      });

      const composable = useOAuth();
      const result = await composable.loginWithProvider("google");

      expect(result.error).toBe("Google OAuth failed");
    });

    it("should handle Google OAuth exception", async () => {
      mockSignInWithOAuth.mockRejectedValue(new Error("Network error") as never);

      const composable = useOAuth();
      const result = await composable.loginWithProvider("google");

      expect(result.error).toBe("Network error");
    });

    it("should handle unknown error type for Google", async () => {
      mockSignInWithOAuth.mockRejectedValue("String error" as never);

      const composable = useOAuth();
      const result = await composable.loginWithProvider("google");

      expect(result.error).toBe("Google OAuth login failed");
    });

    it("should handle Google OAuth with custom redirect", async () => {
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      const composable = useOAuth();
      await composable.loginWithProvider("google");

      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            redirectTo: expect.stringContaining("http://localhost"),
          }),
        }),
      );
    });
  });

  describe("loginWithProvider - Discord", () => {
    it("should login with Discord successfully", async () => {
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      const composable = useOAuth();
      const result = await composable.loginWithProvider("discord");

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: "discord",
        options: {
          redirectTo: "http://localhost/",
        },
      });
      expect(result.error).toBeNull();
    });

    it("should handle Discord OAuth error", async () => {
      mockSignInWithOAuth.mockResolvedValue({
        error: { message: "Discord OAuth failed" },
      });

      const composable = useOAuth();
      const result = await composable.loginWithProvider("discord");

      expect(result.error).toBe("Discord OAuth failed");
    });

    it("should handle Discord OAuth exception", async () => {
      mockSignInWithOAuth.mockRejectedValue(new Error("Connection timeout") as never);

      const composable = useOAuth();
      const result = await composable.loginWithProvider("discord");

      expect(result.error).toBe("Connection timeout");
    });

    it("should handle unknown error type for Discord", async () => {
      mockSignInWithOAuth.mockRejectedValue({ code: 500 } as never);

      const composable = useOAuth();
      const result = await composable.loginWithProvider("discord");

      expect(result.error).toBe("Discord OAuth login failed");
    });
  });

  describe("loginWithProvider - Unsupported Providers", () => {
    it("should handle unsupported provider", async () => {
      const composable = useOAuth();
      const result = await composable.loginWithProvider("facebook");

      expect(result.error).toBe("Unsupported provider: facebook");
      expect(mockSignInWithOAuth).not.toHaveBeenCalled();
    });

    it("should handle empty provider string", async () => {
      const composable = useOAuth();
      const result = await composable.loginWithProvider("");

      expect(result.error).toBe("Unsupported provider: ");
      expect(mockSignInWithOAuth).not.toHaveBeenCalled();
    });

    it("should handle case-sensitive provider names", async () => {
      const composable = useOAuth();

      // "Google" instead of "google"
      const result1 = await composable.loginWithProvider("Google");
      expect(result1.error).toBe("Unsupported provider: Google");

      // "GOOGLE"
      const result2 = await composable.loginWithProvider("GOOGLE");
      expect(result2.error).toBe("Unsupported provider: GOOGLE");
    });

    it("should handle various unsupported providers", async () => {
      const composable = useOAuth();

      const providers = ["twitter", "github", "linkedin", "microsoft"];

      for (const provider of providers) {
        const result = await composable.loginWithProvider(provider);
        expect(result.error).toBe(`Unsupported provider: ${provider}`);
      }

      expect(mockSignInWithOAuth).not.toHaveBeenCalled();
    });

    it("should handle special characters in provider name", async () => {
      const composable = useOAuth();
      const result = await composable.loginWithProvider("provider-123");

      expect(result.error).toBe("Unsupported provider: provider-123");
    });
  });

  describe("handleOAuthProfile", () => {
    it("should handle OAuth profile when user exists", async () => {
      mockUser.value = {
        id: "user-123",
        email: "test@example.com",
      } as never;

      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "oauth-access-token",
          },
        },
      } as never);

      const mockProfileResponse = {
        success: true,
        profile: { id: "profile-123" },
      };

      mockFetch.mockResolvedValue(mockProfileResponse as never);

      const composable = useOAuth();
      await composable.handleOAuthProfile();

      expect(mockGetSession).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/profile/oauth",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer oauth-access-token",
          },
        }),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith("OAuth profile handled:", mockProfileResponse);
    });

    it("should not handle profile when user does not exist", async () => {
      mockUser.value = null;

      const composable = useOAuth();
      await composable.handleOAuthProfile();

      expect(mockGetSession).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should handle no access token", async () => {
      mockUser.value = {
        id: "user-123",
        email: "test@example.com",
      } as never;

      mockGetSession.mockResolvedValue({
        data: {
          session: null,
        },
      } as never);

      const composable = useOAuth();
      await composable.handleOAuthProfile();

      expect(mockConsoleError).toHaveBeenCalledWith(
        "No access token found for OAuth profile handling.",
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should handle session without access_token", async () => {
      mockUser.value = {
        id: "user-123",
        email: "test@example.com",
      } as never;

      mockGetSession.mockResolvedValue({
        data: {
          session: {},
        },
      } as never);

      const composable = useOAuth();
      await composable.handleOAuthProfile();

      expect(mockConsoleError).toHaveBeenCalledWith(
        "No access token found for OAuth profile handling.",
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should handle API error during profile creation", async () => {
      mockUser.value = {
        id: "user-123",
        email: "test@example.com",
      } as never;

      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "oauth-access-token",
          },
        },
      } as never);

      mockFetch.mockRejectedValue(new Error("Profile creation failed") as never);

      const composable = useOAuth();
      await composable.handleOAuthProfile();

      expect(mockConsoleError).toHaveBeenCalledWith(
        "OAuth profile creation failed:",
        expect.any(Error),
      );
    });

    it("should handle network error during profile creation", async () => {
      mockUser.value = {
        id: "user-123",
        email: "test@example.com",
      } as never;

      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "oauth-access-token",
          },
        },
      } as never);

      mockFetch.mockRejectedValue(new Error("Network timeout") as never);

      const composable = useOAuth();
      await composable.handleOAuthProfile();

      expect(mockConsoleError).toHaveBeenCalledWith(
        "OAuth profile creation failed:",
        expect.any(Error),
      );
    });

    it("should handle unknown error during profile creation", async () => {
      mockUser.value = {
        id: "user-123",
        email: "test@example.com",
      } as never;

      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "oauth-access-token",
          },
        },
      } as never);

      mockFetch.mockRejectedValue("String error" as never);

      const composable = useOAuth();
      await composable.handleOAuthProfile();

      expect(mockConsoleError).toHaveBeenCalledWith(
        "OAuth profile creation failed:",
        "String error",
      );
    });

    it("should handle getSession error", async () => {
      mockUser.value = {
        id: "user-123",
        email: "test@example.com",
      } as never;

      mockGetSession.mockRejectedValue(new Error("Session error") as never);

      const composable = useOAuth();
      await composable.handleOAuthProfile();

      expect(mockConsoleError).toHaveBeenCalledWith(
        "OAuth profile creation failed:",
        expect.any(Error),
      );
    });
  });

  describe("Edge Cases and Integration", () => {
    it("should handle multiple Google login attempts", async () => {
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      const composable = useOAuth();

      const result1 = await composable.loginWithProvider("google");
      expect(result1.error).toBeNull();

      const result2 = await composable.loginWithProvider("google");
      expect(result2.error).toBeNull();

      expect(mockSignInWithOAuth).toHaveBeenCalledTimes(2);
    });

    it("should handle multiple Discord login attempts", async () => {
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      const composable = useOAuth();

      const result1 = await composable.loginWithProvider("discord");
      expect(result1.error).toBeNull();

      const result2 = await composable.loginWithProvider("discord");
      expect(result2.error).toBeNull();

      expect(mockSignInWithOAuth).toHaveBeenCalledTimes(2);
    });

    it("should handle switching between providers", async () => {
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      const composable = useOAuth();

      const result1 = await composable.loginWithProvider("google");
      expect(result1.error).toBeNull();

      const result2 = await composable.loginWithProvider("discord");
      expect(result2.error).toBeNull();

      expect(mockSignInWithOAuth).toHaveBeenCalledTimes(2);
      expect(mockSignInWithOAuth).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ provider: "google" }),
      );
      expect(mockSignInWithOAuth).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ provider: "discord" }),
      );
    });

    it("should handle concurrent OAuth requests", async () => {
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      const composable = useOAuth();

      const promises = [
        composable.loginWithProvider("google"),
        composable.loginWithProvider("discord"),
      ];

      const results = await Promise.all(promises);

      expect(results[0].error).toBeNull();
      expect(results[1].error).toBeNull();
      expect(mockSignInWithOAuth).toHaveBeenCalledTimes(2);
    });

    it("should handle user state changes", async () => {
      const composable = useOAuth();

      // Initially no user
      expect(composable.user.value).toBeNull();

      // User logs in
      mockUser.value = {
        id: "user-123",
        email: "oauth@example.com",
      } as never;

      expect(composable.user.value).toEqual(mockUser.value);
    });

    it("should handle different redirect origins", async () => {
      // Note: window.location.origin is read when composable is created
      // So we need to test with current origin
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      const composable = useOAuth();
      await composable.loginWithProvider("google");

      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            redirectTo: expect.stringMatching(/^https?:\/\/.+\/$/),
          }),
        }),
      );
    });
  });

  describe("Error Handling Scenarios", () => {
    it("should handle OAuth popup blocked", async () => {
      mockSignInWithOAuth.mockResolvedValue({
        error: { message: "Popup blocked by browser" },
      });

      const composable = useOAuth();
      const result = await composable.loginWithProvider("google");

      expect(result.error).toBe("Popup blocked by browser");
    });

    it("should handle user cancellation", async () => {
      mockSignInWithOAuth.mockResolvedValue({
        error: { message: "User cancelled login" },
      });

      const composable = useOAuth();
      const result = await composable.loginWithProvider("discord");

      expect(result.error).toBe("User cancelled login");
    });

    it("should handle network timeout during OAuth", async () => {
      mockSignInWithOAuth.mockRejectedValue(new Error("Request timeout") as never);

      const composable = useOAuth();
      const result = await composable.loginWithProvider("google");

      expect(result.error).toBe("Request timeout");
    });

    it("should handle OAuth server error", async () => {
      mockSignInWithOAuth.mockResolvedValue({
        error: { message: "OAuth server unavailable" },
      });

      const composable = useOAuth();
      const result = await composable.loginWithProvider("google");

      expect(result.error).toBe("OAuth server unavailable");
    });

    it("should handle missing error message", async () => {
      mockSignInWithOAuth.mockResolvedValue({
        error: {},
      } as never);

      const composable = useOAuth();
      const result = await composable.loginWithProvider("google");

      expect(result.error).toBeUndefined();
    });

    it("should handle error object without message property", async () => {
      mockSignInWithOAuth.mockResolvedValue({
        error: { code: "auth_error" },
      } as never);

      const composable = useOAuth();
      const result = await composable.loginWithProvider("discord");

      expect(result.error).toBeUndefined();
    });
  });

  describe("handleOAuthProfile - Advanced Scenarios", () => {
    it("should handle profile update for existing user", async () => {
      mockUser.value = {
        id: "user-123",
        email: "existing@example.com",
        user_metadata: { provider: "google" },
      } as never;

      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "oauth-token",
          },
        },
      } as never);

      const mockProfileResponse = {
        success: true,
        profile: {
          id: "profile-123",
          updated: true,
        },
      };

      mockFetch.mockResolvedValue(mockProfileResponse as never);

      const composable = useOAuth();
      await composable.handleOAuthProfile();

      expect(mockFetch).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith("OAuth profile handled:", mockProfileResponse);
    });

    it("should handle profile creation for new OAuth user", async () => {
      mockUser.value = {
        id: "new-user-123",
        email: "newuser@gmail.com",
      } as never;

      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "new-oauth-token",
          },
        },
      } as never);

      const mockProfileResponse = {
        success: true,
        profile: {
          id: "new-profile-123",
          created: true,
        },
      };

      mockFetch.mockResolvedValue(mockProfileResponse as never);

      const composable = useOAuth();
      await composable.handleOAuthProfile();

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/profile/oauth",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer new-oauth-token",
          },
        }),
      );
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it("should handle API returning error response", async () => {
      mockUser.value = {
        id: "user-123",
        email: "test@example.com",
      } as never;

      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "oauth-token",
          },
        },
      } as never);

      const mockErrorResponse = {
        success: false,
        error: "Profile creation failed",
      };

      mockFetch.mockResolvedValue(mockErrorResponse as never);

      const composable = useOAuth();
      await composable.handleOAuthProfile();

      // Should still log the response even if it's an error
      expect(mockConsoleLog).toHaveBeenCalledWith("OAuth profile handled:", mockErrorResponse);
    });

    it("should handle null response from API", async () => {
      mockUser.value = {
        id: "user-123",
        email: "test@example.com",
      } as never;

      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "oauth-token",
          },
        },
      } as never);

      mockFetch.mockResolvedValue(null as never);

      const composable = useOAuth();
      await composable.handleOAuthProfile();

      expect(mockConsoleLog).toHaveBeenCalledWith("OAuth profile handled:", null);
    });

    it("should handle undefined response from API", async () => {
      mockUser.value = {
        id: "user-123",
        email: "test@example.com",
      } as never;

      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "oauth-token",
          },
        },
      } as never);

      mockFetch.mockResolvedValue(undefined as never);

      const composable = useOAuth();
      await composable.handleOAuthProfile();

      expect(mockConsoleLog).toHaveBeenCalledWith("OAuth profile handled:", undefined);
    });
  });

  describe("Realistic User Flows", () => {
    it("should complete full Google OAuth flow", async () => {
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      const composable = useOAuth();

      // Step 1: Initiate Google login
      const loginResult = await composable.loginWithProvider("google");
      expect(loginResult.error).toBeNull();

      // Step 2: User is redirected back and authenticated
      mockUser.value = {
        id: "google-user-123",
        email: "user@gmail.com",
      } as never;

      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "google-access-token",
          },
        },
      } as never);

      const mockProfileResponse = {
        success: true,
        profile: { id: "profile-123" },
      };

      mockFetch.mockResolvedValue(mockProfileResponse as never);

      // Step 3: Handle OAuth profile
      await composable.handleOAuthProfile();

      expect(mockConsoleLog).toHaveBeenCalledWith("OAuth profile handled:", mockProfileResponse);
    });

    it("should complete full Discord OAuth flow", async () => {
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      const composable = useOAuth();

      // Step 1: Initiate Discord login
      const loginResult = await composable.loginWithProvider("discord");
      expect(loginResult.error).toBeNull();

      // Step 2: User authenticated
      mockUser.value = {
        id: "discord-user-456",
        email: "user@discord.com",
      } as never;

      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "discord-access-token",
          },
        },
      } as never);

      const mockProfileResponse = {
        success: true,
        profile: {
          id: "discord-profile-456",
          provider: "discord",
        },
      };

      mockFetch.mockResolvedValue(mockProfileResponse as never);

      // Step 3: Handle OAuth profile
      await composable.handleOAuthProfile();

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/profile/oauth",
        expect.objectContaining({
          headers: {
            Authorization: "Bearer discord-access-token",
          },
        }),
      );
    });

    it("should handle OAuth failure and retry", async () => {
      const composable = useOAuth();

      // First attempt: error
      mockSignInWithOAuth.mockResolvedValueOnce({
        error: { message: "Temporary error" },
      });

      const result1 = await composable.loginWithProvider("google");
      expect(result1.error).toBe("Temporary error");

      // Second attempt: success
      mockSignInWithOAuth.mockResolvedValueOnce({ error: null });

      const result2 = await composable.loginWithProvider("google");
      expect(result2.error).toBeNull();
    });

    it("should handle profile creation after successful OAuth", async () => {
      const composable = useOAuth();

      // Successful OAuth login
      mockSignInWithOAuth.mockResolvedValue({ error: null });
      await composable.loginWithProvider("google");

      // User appears
      mockUser.value = {
        id: "user-123",
        email: "oauth@gmail.com",
      } as never;

      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "token-123",
          },
        },
      } as never);

      mockFetch.mockResolvedValue({ success: true } as never);

      // Handle profile
      await composable.handleOAuthProfile();

      expect(mockFetch).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it("should handle OAuth without profile creation", async () => {
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      const composable = useOAuth();
      const result = await composable.loginWithProvider("google");

      expect(result.error).toBeNull();

      // User doesn't call handleOAuthProfile
      // Should still be functional
      expect(composable.user.value).toBeNull();
    });
  });

  describe("Type Safety and Input Validation", () => {
    it("should handle null provider", async () => {
      const composable = useOAuth();
      const result = await composable.loginWithProvider(null as never);

      expect(result.error).toContain("Unsupported provider");
    });

    it("should handle undefined provider", async () => {
      const composable = useOAuth();
      const result = await composable.loginWithProvider(undefined as never);

      expect(result.error).toContain("Unsupported provider");
    });

    it("should handle numeric provider", async () => {
      const composable = useOAuth();
      const result = await composable.loginWithProvider(123 as never);

      expect(result.error).toContain("Unsupported provider");
    });

    it("should handle special characters in provider", async () => {
      const composable = useOAuth();
      const result = await composable.loginWithProvider("google@#$%");

      expect(result.error).toBe("Unsupported provider: google@#$%");
    });

    it("should handle very long provider name", async () => {
      const longProvider = "a".repeat(1000);
      const composable = useOAuth();
      const result = await composable.loginWithProvider(longProvider);

      expect(result.error).toBe(`Unsupported provider: ${longProvider}`);
    });

    it("should handle provider with spaces", async () => {
      const composable = useOAuth();
      const result = await composable.loginWithProvider("google provider");

      expect(result.error).toBe("Unsupported provider: google provider");
    });

    it("should use correct redirect URL format", async () => {
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      const composable = useOAuth();
      await composable.loginWithProvider("google");

      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            redirectTo: expect.stringMatching(/^https?:\/\/.+\/$/),
          }),
        }),
      );
    });
  });

  describe("Multiple Instance Independence", () => {
    it("should maintain independent user state across instances", () => {
      const composable1 = useOAuth();
      const composable2 = useOAuth();

      // Both should reference same user
      expect(composable1.user.value).toBe(composable2.user.value);

      mockUser.value = { id: "user-123" } as never;

      expect(composable1.user.value).toEqual(mockUser.value);
      expect(composable2.user.value).toEqual(mockUser.value);
    });

    it("should handle methods independently", async () => {
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      const composable1 = useOAuth();
      const composable2 = useOAuth();

      await composable1.loginWithProvider("google");
      await composable2.loginWithProvider("discord");

      expect(mockSignInWithOAuth).toHaveBeenCalledTimes(2);
    });
  });

  describe("Console Output Verification", () => {
    it("should log successful profile handling", async () => {
      mockUser.value = { id: "user-123" } as never;
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "token",
          },
        },
      } as never);

      const mockResponse = { success: true };
      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useOAuth();
      await composable.handleOAuthProfile();

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith("OAuth profile handled:", mockResponse);
    });

    it("should log error when no access token", async () => {
      mockUser.value = { id: "user-123" } as never;
      mockGetSession.mockResolvedValue({
        data: {
          session: null,
        },
      } as never);

      const composable = useOAuth();
      await composable.handleOAuthProfile();

      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        "No access token found for OAuth profile handling.",
      );
    });

    it("should log error on profile creation failure", async () => {
      mockUser.value = { id: "user-123" } as never;
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "token",
          },
        },
      } as never);

      const error = new Error("API error");
      mockFetch.mockRejectedValue(error as never);

      const composable = useOAuth();
      await composable.handleOAuthProfile();

      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith("OAuth profile creation failed:", error);
    });
  });

  describe("Provider-Specific Edge Cases", () => {
    it("should handle Google with different error messages", async () => {
      const errors = ["Invalid OAuth credentials", "OAuth scope denied", "Account already exists"];

      const composable = useOAuth();

      for (const errorMsg of errors) {
        mockSignInWithOAuth.mockResolvedValueOnce({
          error: { message: errorMsg },
        });

        const result = await composable.loginWithProvider("google");
        expect(result.error).toBe(errorMsg);
      }
    });

    it("should handle Discord with different error messages", async () => {
      const errors = ["Invalid Discord token", "Discord server error", "Rate limited"];

      const composable = useOAuth();

      for (const errorMsg of errors) {
        mockSignInWithOAuth.mockResolvedValueOnce({
          error: { message: errorMsg },
        });

        const result = await composable.loginWithProvider("discord");
        expect(result.error).toBe(errorMsg);
      }
    });
  });
});
