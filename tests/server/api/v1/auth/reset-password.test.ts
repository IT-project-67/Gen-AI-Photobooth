import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import {
  mockCreateError,
  mockDefineEventHandler,
  mockSetHeader,
  mockReadBody,
  mockValidateResetPasswordRequest,
  mockHandleAuthError,
  mockHandleApiError,
  mockSetSession,
  mockUpdateUser,
  mockCreateAuthClient,
  mockCreateSuccessResponse,
  mockCreateErrorResponse,
} from "~/tests/server/mocks/mocks";
import { ERROR_STATUS_MAP } from "~/server/types/core";

// Set up global functions for Nuxt auto-imports
(global as unknown as Record<string, unknown>).defineEventHandler = mockDefineEventHandler;
(global as unknown as Record<string, unknown>).readBody = mockReadBody;
(global as unknown as Record<string, unknown>).createError = mockCreateError;

jest.mock("h3", () => ({
  defineEventHandler: mockDefineEventHandler,
  createError: mockCreateError,
  setHeader: mockSetHeader,
  readBody: mockReadBody,
}));

jest.mock("~~/server/clients", () => ({
  createAuthClient: mockCreateAuthClient,
}));

jest.mock("~~/server/utils/auth", () => ({
  validateResetPasswordRequest: mockValidateResetPasswordRequest,
  handleAuthError: mockHandleAuthError,
  handleApiError: mockHandleApiError,
}));

jest.mock("~~/server/utils/core", () => ({
  createSuccessResponse: mockCreateSuccessResponse,
  createErrorResponse: mockCreateErrorResponse,
}));

type MockEvent = {
  node: {
    req: Record<string, unknown>;
    res: Record<string, unknown>;
  };
};

type SuccessResponse = {
  success: boolean;
  message: string;
  data: {
    message: string;
  };
};

type ErrorOptions = {
  statusCode: number;
  statusMessage: string;
  data: {
    error: {
      code: string;
      message: string;
    };
  };
};

const createMockSessionData = () => ({
  user: {
    id: "user-123",
    email: "test@example.com",
    email_confirmed_at: "2024-01-01T00:00:00Z",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  session: {
    access_token: "new-access-token",
    refresh_token: "new-refresh-token",
    expires_at: 1234567890,
    expires_in: 3600,
    token_type: "bearer",
  },
});

describe("API: POST /api/v1/auth/reset-password", () => {
  let handler: (event: unknown) => Promise<unknown>;
  let mockEvent: MockEvent;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(async () => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    mockEvent = {
      node: {
        req: {},
        res: {},
      },
    };

    const module = await import("~/server/api/v1/auth/reset-password.post");
    handler = module.default as (event: unknown) => Promise<unknown>;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Validation", () => {
    it("should validate all required fields from request body", async () => {
      const mockSessionData = createMockSessionData();
      mockReadBody.mockResolvedValue({
        access_token: "valid-access-token",
        refresh_token: "valid-refresh-token",
        password: "newpassword123",
      });
      mockValidateResetPasswordRequest.mockReturnValue(null);
      mockSetSession.mockResolvedValue({ data: mockSessionData, error: null });
      mockUpdateUser.mockResolvedValue({ error: null });

      await handler(mockEvent);

      expect(mockReadBody).toHaveBeenCalledWith(mockEvent);
      expect(mockValidateResetPasswordRequest).toHaveBeenCalledWith(
        "valid-access-token",
        "valid-refresh-token",
        "newpassword123",
      );
    });

    it("should reject when access_token is missing", async () => {
      mockReadBody.mockResolvedValue({
        access_token: "",
        refresh_token: "valid-refresh-token",
        password: "newpassword123",
      });
      mockValidateResetPasswordRequest.mockReturnValue({
        code: "ACCESS_TOKEN_REQUIRED",
        message: "Access token is required",
        statusCode: ERROR_STATUS_MAP.ACCESS_TOKEN_REQUIRED,
      });

      mockHandleApiError.mockReturnValue({
        code: "ACCESS_TOKEN_REQUIRED",
        message: "Access token is required",
        statusCode: ERROR_STATUS_MAP.ACCESS_TOKEN_REQUIRED,
      });

      const error = new Error("Access token is required");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow("Access token is required");
    });

    it("should reject when refresh_token is missing", async () => {
      mockReadBody.mockResolvedValue({
        access_token: "valid-access-token",
        refresh_token: "",
        password: "newpassword123",
      });
      mockValidateResetPasswordRequest.mockReturnValue({
        code: "REFRESH_TOKEN_REQUIRED",
        message: "Refresh token is required",
        statusCode: ERROR_STATUS_MAP.REFRESH_TOKEN_REQUIRED,
      });

      mockHandleApiError.mockReturnValue({
        code: "REFRESH_TOKEN_REQUIRED",
        message: "Refresh token is required",
        statusCode: ERROR_STATUS_MAP.REFRESH_TOKEN_REQUIRED,
      });

      const error = new Error("Refresh token is required");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow("Refresh token is required");
    });

    it("should reject when password is missing", async () => {
      mockReadBody.mockResolvedValue({
        access_token: "valid-access-token",
        refresh_token: "valid-refresh-token",
        password: "",
      });
      mockValidateResetPasswordRequest.mockReturnValue({
        code: "PASSWORD_REQUIRED",
        message: "Password is required",
        statusCode: ERROR_STATUS_MAP.PASSWORD_REQUIRED,
      });

      mockHandleApiError.mockReturnValue({
        code: "PASSWORD_REQUIRED",
        message: "Password is required",
        statusCode: ERROR_STATUS_MAP.PASSWORD_REQUIRED,
      });

      const error = new Error("Password is required");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow("Password is required");
    });

    it("should reject weak password", async () => {
      mockReadBody.mockResolvedValue({
        access_token: "valid-access-token",
        refresh_token: "valid-refresh-token",
        password: "123",
      });
      mockValidateResetPasswordRequest.mockReturnValue({
        code: "PASSWORD_TOO_SHORT",
        message: "Password must be at least 6 characters long",
        statusCode: ERROR_STATUS_MAP.PASSWORD_TOO_SHORT,
      });

      mockHandleApiError.mockReturnValue({
        code: "PASSWORD_TOO_SHORT",
        message: "Password must be at least 6 characters long",
        statusCode: ERROR_STATUS_MAP.PASSWORD_TOO_SHORT,
      });

      const error = new Error("Password must be at least 6 characters long");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow(
        "Password must be at least 6 characters long",
      );
    });

    it("should use default VALIDATION_ERROR statusCode when not provided", async () => {
      mockReadBody.mockResolvedValue({
        access_token: "",
        refresh_token: "",
        password: "",
      });
      mockValidateResetPasswordRequest.mockReturnValue({
        code: "ACCESS_TOKEN_REQUIRED",
        message: "Access token is required",
      } as never);

      mockHandleApiError.mockReturnValue({
        code: "ACCESS_TOKEN_REQUIRED",
        message: "Access token is required",
        statusCode: ERROR_STATUS_MAP.ACCESS_TOKEN_REQUIRED,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.VALIDATION_ERROR);
        throw new Error("Access token is required");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });
  });

  describe("Session Management", () => {
    it("should set session with provided tokens", async () => {
      const mockSessionData = createMockSessionData();
      mockReadBody.mockResolvedValue({
        access_token: "valid-access-token",
        refresh_token: "valid-refresh-token",
        password: "newpassword123",
      });
      mockValidateResetPasswordRequest.mockReturnValue(null);
      mockSetSession.mockResolvedValue({ data: mockSessionData, error: null });
      mockUpdateUser.mockResolvedValue({ error: null });

      await handler(mockEvent);

      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: "valid-access-token",
        refresh_token: "valid-refresh-token",
      });
    });

    it("should handle session error", async () => {
      mockReadBody.mockResolvedValue({
        access_token: "invalid-token",
        refresh_token: "invalid-refresh",
        password: "newpassword123",
      });
      mockValidateResetPasswordRequest.mockReturnValue(null);
      mockSetSession.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid session", error_code: "invalid_session" },
      });

      mockHandleAuthError.mockReturnValue({
        code: "INVALID_SESSION",
        message: "Invalid or expired session",
        statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
      });

      const error = new Error("Invalid or expired session");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockHandleAuthError).toHaveBeenCalledWith({
        message: "Invalid session",
        error_code: "invalid_session",
      });
    });

    it("should use auth error statusCode when handling session errors", async () => {
      mockReadBody.mockResolvedValue({
        access_token: "expired-token",
        refresh_token: "expired-refresh",
        password: "newpassword123",
      });
      mockValidateResetPasswordRequest.mockReturnValue(null);
      mockSetSession.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Token expired" },
      });

      mockHandleAuthError.mockReturnValue({
        code: "TOKEN_EXPIRED",
        message: "Token expired",
        statusCode: 401,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(401);
        throw new Error("Token expired");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should default to AUTH_ERROR if session error has no statusCode", async () => {
      mockReadBody.mockResolvedValue({
        access_token: "token",
        refresh_token: "refresh",
        password: "newpassword123",
      });
      mockValidateResetPasswordRequest.mockReturnValue(null);
      mockSetSession.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Some error" },
      });

      mockHandleAuthError.mockReturnValue({
        code: "UNKNOWN_ERROR",
        message: "Unknown error",
      } as never);

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.AUTH_ERROR);
        throw new Error("Unknown error");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should reject when no user returned from session", async () => {
      mockReadBody.mockResolvedValue({
        access_token: "valid-access-token",
        refresh_token: "valid-refresh-token",
        password: "newpassword123",
      });
      mockValidateResetPasswordRequest.mockReturnValue(null);
      mockSetSession.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      mockHandleApiError.mockReturnValue({
        code: "SESSION_ERROR",
        message: "Auth provider returned no user for recovery session",
        statusCode: ERROR_STATUS_MAP.SESSION_ERROR,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.SESSION_ERROR);
        expect(opts.statusMessage).toBe("Auth provider returned no user for recovery session");
        expect(opts.data.error.code).toBe("SESSION_ERROR");
        throw new Error("Auth provider returned no user for recovery session");
      });

      await expect(handler(mockEvent)).rejects.toThrow(
        "Auth provider returned no user for recovery session",
      );
    });
  });

  describe("Password Update", () => {
    it("should update user password successfully", async () => {
      const mockSessionData = createMockSessionData();
      mockReadBody.mockResolvedValue({
        access_token: "valid-access-token",
        refresh_token: "valid-refresh-token",
        password: "newpassword123",
      });
      mockValidateResetPasswordRequest.mockReturnValue(null);
      mockSetSession.mockResolvedValue({ data: mockSessionData, error: null });
      mockUpdateUser.mockResolvedValue({ error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: "newpassword123",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("Password reset successful");
    });

    it("should handle password update errors", async () => {
      const mockSessionData = createMockSessionData();
      mockReadBody.mockResolvedValue({
        access_token: "valid-access-token",
        refresh_token: "valid-refresh-token",
        password: "newpassword123",
      });
      mockValidateResetPasswordRequest.mockReturnValue(null);
      mockSetSession.mockResolvedValue({ data: mockSessionData, error: null });
      mockUpdateUser.mockResolvedValue({
        error: { message: "Update failed", error_code: "update_error" },
      });

      mockHandleAuthError.mockReturnValue({
        code: "UPDATE_ERROR",
        message: "Failed to update password",
        statusCode: ERROR_STATUS_MAP.UPDATE_ERROR,
      });

      const error = new Error("Failed to update password");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockHandleAuthError).toHaveBeenCalledWith({
        message: "Update failed",
        error_code: "update_error",
      });
    });

    it("should use update error statusCode when handling update errors", async () => {
      const mockSessionData = createMockSessionData();
      mockReadBody.mockResolvedValue({
        access_token: "valid-access-token",
        refresh_token: "valid-refresh-token",
        password: "newpassword123",
      });
      mockValidateResetPasswordRequest.mockReturnValue(null);
      mockSetSession.mockResolvedValue({ data: mockSessionData, error: null });
      mockUpdateUser.mockResolvedValue({
        error: { message: "Password too weak" },
      });

      mockHandleAuthError.mockReturnValue({
        code: "PASSWORD_WEAK",
        message: "Password too weak",
        statusCode: 422,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(422);
        throw new Error("Password too weak");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should default to UPDATE_ERROR if update error has no statusCode", async () => {
      const mockSessionData = createMockSessionData();
      mockReadBody.mockResolvedValue({
        access_token: "valid-access-token",
        refresh_token: "valid-refresh-token",
        password: "newpassword123",
      });
      mockValidateResetPasswordRequest.mockReturnValue(null);
      mockSetSession.mockResolvedValue({ data: mockSessionData, error: null });
      mockUpdateUser.mockResolvedValue({
        error: { message: "Some error" },
      });

      mockHandleAuthError.mockReturnValue({
        code: "UNKNOWN_ERROR",
        message: "Unknown error",
      } as never);

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.UPDATE_ERROR);
        throw new Error("Unknown error");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });
  });

  describe("Response Structure", () => {
    it("should return success response with correct structure", async () => {
      const mockSessionData = createMockSessionData();
      mockReadBody.mockResolvedValue({
        access_token: "valid-access-token",
        refresh_token: "valid-refresh-token",
        password: "newpassword123",
      });
      mockValidateResetPasswordRequest.mockReturnValue(null);
      mockSetSession.mockResolvedValue({ data: mockSessionData, error: null });
      mockUpdateUser.mockResolvedValue({ error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("message", "Password reset successful");
      expect(result).toHaveProperty("data");
      expect(result.data).toHaveProperty("message");
    });

    it("should include correct message in response data", async () => {
      const mockSessionData = createMockSessionData();
      mockReadBody.mockResolvedValue({
        access_token: "valid-access-token",
        refresh_token: "valid-refresh-token",
        password: "newpassword123",
      });
      mockValidateResetPasswordRequest.mockReturnValue(null);
      mockSetSession.mockResolvedValue({ data: mockSessionData, error: null });
      mockUpdateUser.mockResolvedValue({ error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.message).toBe(
        "Password has been successfully reset. You can now log in with your new password.",
      );
    });

    it("should have correct message type", async () => {
      const mockSessionData = createMockSessionData();
      mockReadBody.mockResolvedValue({
        access_token: "valid-access-token",
        refresh_token: "valid-refresh-token",
        password: "newpassword123",
      });
      mockValidateResetPasswordRequest.mockReturnValue(null);
      mockSetSession.mockResolvedValue({ data: mockSessionData, error: null });
      mockUpdateUser.mockResolvedValue({ error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(typeof result.data.message).toBe("string");
      expect(result.data.message.length).toBeGreaterThan(0);
    });
  });

  describe("Error Handling", () => {
    it("should catch and handle validation errors", async () => {
      mockReadBody.mockResolvedValue({
        access_token: "",
        refresh_token: "",
        password: "",
      });
      mockValidateResetPasswordRequest.mockReturnValue({
        code: "ACCESS_TOKEN_REQUIRED",
        message: "Access token is required",
        statusCode: ERROR_STATUS_MAP.ACCESS_TOKEN_REQUIRED,
      });

      mockHandleApiError.mockReturnValue({
        code: "ACCESS_TOKEN_REQUIRED",
        message: "Access token is required",
        statusCode: ERROR_STATUS_MAP.ACCESS_TOKEN_REQUIRED,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Access token is required");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Access token is required");
    });

    it("should catch and handle session errors", async () => {
      mockReadBody.mockResolvedValue({
        access_token: "token",
        refresh_token: "refresh",
        password: "newpassword123",
      });
      mockValidateResetPasswordRequest.mockReturnValue(null);
      mockSetSession.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid token" },
      });

      mockHandleAuthError.mockReturnValue({
        code: "INVALID_TOKEN",
        message: "Invalid token",
        statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should catch and handle update errors", async () => {
      const mockSessionData = createMockSessionData();
      mockReadBody.mockResolvedValue({
        access_token: "token",
        refresh_token: "refresh",
        password: "newpassword123",
      });
      mockValidateResetPasswordRequest.mockReturnValue(null);
      mockSetSession.mockResolvedValue({ data: mockSessionData, error: null });
      mockUpdateUser.mockResolvedValue({
        error: { message: "Update failed" },
      });

      mockHandleAuthError.mockReturnValue({
        code: "UPDATE_FAILED",
        message: "Update failed",
        statusCode: ERROR_STATUS_MAP.UPDATE_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Update failed");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should use handleApiError for unexpected errors", async () => {
      mockReadBody.mockResolvedValue({
        access_token: "token",
        refresh_token: "refresh",
        password: "newpassword123",
      });
      mockValidateResetPasswordRequest.mockReturnValue(null);
      mockSetSession.mockRejectedValue(new Error("Unexpected error"));

      mockHandleApiError.mockReturnValue({
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("An unexpected error occurred");
      });

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockHandleApiError).toHaveBeenCalled();
    });

    it("should default to INTERNAL_ERROR statusCode in catch block", async () => {
      mockReadBody.mockRejectedValue(new Error("Body parse error"));

      mockHandleApiError.mockReturnValue({
        code: "PARSE_ERROR",
        message: "Body parse error",
      } as never);

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.INTERNAL_ERROR);
        throw new Error("Body parse error");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });
  });

  describe("Request Body", () => {
    it("should parse request body correctly", async () => {
      const mockSessionData = createMockSessionData();
      mockReadBody.mockResolvedValue({
        access_token: "token",
        refresh_token: "refresh",
        password: "newpassword123",
      });
      mockValidateResetPasswordRequest.mockReturnValue(null);
      mockSetSession.mockResolvedValue({ data: mockSessionData, error: null });
      mockUpdateUser.mockResolvedValue({ error: null });

      await handler(mockEvent);

      expect(mockReadBody).toHaveBeenCalledWith(mockEvent);
    });

    it("should handle body parse errors", async () => {
      mockReadBody.mockRejectedValue(new Error("Invalid JSON"));

      mockHandleApiError.mockReturnValue({
        code: "INVALID_REQUEST_BODY",
        message: "Invalid JSON",
        statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Invalid JSON");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Invalid JSON");
    });
  });

  describe("Supabase Integration", () => {
    it("should call createAuthClient", async () => {
      const mockSessionData = createMockSessionData();
      mockReadBody.mockResolvedValue({
        access_token: "token",
        refresh_token: "refresh",
        password: "newpassword123",
      });
      mockValidateResetPasswordRequest.mockReturnValue(null);
      mockSetSession.mockResolvedValue({ data: mockSessionData, error: null });
      mockUpdateUser.mockResolvedValue({ error: null });

      await handler(mockEvent);

      expect(mockCreateAuthClient).toHaveBeenCalled();
    });

    it("should call setSession before updateUser", async () => {
      const mockSessionData = createMockSessionData();
      mockReadBody.mockResolvedValue({
        access_token: "token",
        refresh_token: "refresh",
        password: "newpassword123",
      });
      mockValidateResetPasswordRequest.mockReturnValue(null);
      mockSetSession.mockResolvedValue({ data: mockSessionData, error: null });
      mockUpdateUser.mockResolvedValue({ error: null });

      await handler(mockEvent);

      const setSessionCallOrder = mockSetSession.mock.invocationCallOrder[0];
      const updateUserCallOrder = mockUpdateUser.mock.invocationCallOrder[0];

      expect(setSessionCallOrder).toBeLessThan(updateUserCallOrder);
    });

    it("should handle different Supabase error codes for setSession", async () => {
      mockReadBody.mockResolvedValue({
        access_token: "token",
        refresh_token: "refresh",
        password: "newpassword123",
      });
      mockValidateResetPasswordRequest.mockReturnValue(null);

      const supabaseErrors = [
        { error_code: "invalid_token", message: "Invalid token" },
        { error_code: "expired_token", message: "Token expired" },
        { error_code: "session_not_found", message: "Session not found" },
      ];

      for (const error of supabaseErrors) {
        mockSetSession.mockResolvedValue({
          data: { user: null, session: null },
          error,
        });

        mockHandleAuthError.mockReturnValue({
          code: "AUTH_ERROR",
          message: error.message,
          statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
        });

        mockCreateError.mockImplementation(() => {
          throw new Error(error.message);
        });

        await expect(handler(mockEvent)).rejects.toThrow(error.message);
        expect(mockHandleAuthError).toHaveBeenCalledWith(error);
      }
    });

    it("should handle different Supabase error codes for updateUser", async () => {
      const mockSessionData = createMockSessionData();
      mockReadBody.mockResolvedValue({
        access_token: "token",
        refresh_token: "refresh",
        password: "newpassword123",
      });
      mockValidateResetPasswordRequest.mockReturnValue(null);

      const supabaseErrors = [
        { error_code: "password_weak", message: "Password too weak" },
        { error_code: "same_password", message: "Same as current password" },
        { error_code: "rate_limit", message: "Too many requests" },
      ];

      for (const error of supabaseErrors) {
        mockSetSession.mockResolvedValue({ data: mockSessionData, error: null });
        mockUpdateUser.mockResolvedValue({ error });

        mockHandleAuthError.mockReturnValue({
          code: "UPDATE_ERROR",
          message: error.message,
          statusCode: ERROR_STATUS_MAP.UPDATE_ERROR,
        });

        mockCreateError.mockImplementation(() => {
          throw new Error(error.message);
        });

        await expect(handler(mockEvent)).rejects.toThrow(error.message);
        expect(mockHandleAuthError).toHaveBeenCalledWith(error);
      }
    });
  });

  describe("Different Token/Password Combinations", () => {
    it("should handle various valid token/password combinations", async () => {
      const mockSessionData = createMockSessionData();
      const testCases = [
        {
          access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          refresh_token: "refresh-token-1",
          password: "NewPassword123!",
        },
        {
          access_token: "access-token-2",
          refresh_token: "refresh-token-2",
          password: "P@ssw0rd!",
        },
        {
          access_token: "access-token-3",
          refresh_token: "refresh-token-3",
          password: "secure-password-123",
        },
      ];

      for (const testCase of testCases) {
        mockReadBody.mockResolvedValue(testCase);
        mockValidateResetPasswordRequest.mockReturnValue(null);
        mockSetSession.mockResolvedValue({ data: mockSessionData, error: null });
        mockUpdateUser.mockResolvedValue({ error: null });

        const result = (await handler(mockEvent)) as SuccessResponse;

        expect(mockSetSession).toHaveBeenCalledWith({
          access_token: testCase.access_token,
          refresh_token: testCase.refresh_token,
        });
        expect(mockUpdateUser).toHaveBeenCalledWith({
          password: testCase.password,
        });
        expect(result.success).toBe(true);
      }
    });
  });
});
