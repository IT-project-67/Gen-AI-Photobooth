import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import {
  mockCreateError,
  mockDefineEventHandler,
  mockSetHeader,
  mockReadBody,
  mockGetRequestURL,
  mockValidateForgotPasswordRequest,
  mockHandleAuthError,
  mockHandleApiError,
  mockResetPasswordForEmail,
  mockCreateAuthClient,
  mockCreateSuccessResponse,
  mockCreateErrorResponse,
} from "~/tests/server/mocks/mocks";
import { ERROR_STATUS_MAP } from "~/server/types/core";

// Set up global functions for Nuxt auto-imports
(global as unknown as Record<string, unknown>).defineEventHandler = mockDefineEventHandler;
(global as unknown as Record<string, unknown>).readBody = mockReadBody;
(global as unknown as Record<string, unknown>).createError = mockCreateError;
(global as unknown as Record<string, unknown>).getRequestURL = mockGetRequestURL;

jest.mock("h3", () => ({
  defineEventHandler: mockDefineEventHandler,
  createError: mockCreateError,
  setHeader: mockSetHeader,
  readBody: mockReadBody,
  getRequestURL: mockGetRequestURL,
}));

jest.mock("~~/server/clients", () => ({
  createAuthClient: mockCreateAuthClient,
}));

jest.mock("~~/server/utils/auth", () => ({
  validateForgotPasswordRequest: mockValidateForgotPasswordRequest,
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

describe("API: POST /api/v1/auth/forgot-password", () => {
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

    mockGetRequestURL.mockReturnValue({
      origin: "http://localhost:3000",
    });

    mockCreateAuthClient.mockReturnValue({
      auth: {
        resetPasswordForEmail: mockResetPasswordForEmail,
      },
    } as never);

    const module = await import("~/server/api/v1/auth/forgot-password.post");
    handler = module.default as (event: unknown) => Promise<unknown>;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Validation", () => {
    it("should validate email from request body", async () => {
      mockReadBody.mockResolvedValue({ email: "test@example.com" });
      mockValidateForgotPasswordRequest.mockReturnValue(null);
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      await handler(mockEvent);

      expect(mockReadBody).toHaveBeenCalledWith(mockEvent);
      expect(mockValidateForgotPasswordRequest).toHaveBeenCalledWith("test@example.com");
    });

    it("should reject when email is missing", async () => {
      mockReadBody.mockResolvedValue({ email: "" });
      mockValidateForgotPasswordRequest.mockReturnValue({
        code: "EMAIL_REQUIRED",
        message: "Email is required",
        statusCode: ERROR_STATUS_MAP.EMAIL_REQUIRED,
      });

      mockHandleApiError.mockReturnValue({
        code: "EMAIL_REQUIRED",
        message: "Email is required",
        statusCode: ERROR_STATUS_MAP.EMAIL_REQUIRED,
      });

      const error = new Error("Email is required");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow("Email is required");

      expect(mockCreateError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.EMAIL_REQUIRED,
          statusMessage: "Email is required",
        }),
      );
    });

    it("should reject invalid email format", async () => {
      mockReadBody.mockResolvedValue({ email: "invalid-email" });
      mockValidateForgotPasswordRequest.mockReturnValue({
        code: "EMAIL_INVALID",
        message: "Please provide a valid email address",
        statusCode: ERROR_STATUS_MAP.EMAIL_INVALID,
      });

      mockHandleApiError.mockReturnValue({
        code: "EMAIL_INVALID",
        message: "Please provide a valid email address",
        statusCode: ERROR_STATUS_MAP.EMAIL_INVALID,
      });

      const error = new Error("Please provide a valid email address");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow("Please provide a valid email address");

      expect(mockCreateError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.EMAIL_INVALID,
        }),
      );
    });

    it("should include error data for validation errors", async () => {
      mockReadBody.mockResolvedValue({ email: "" });
      mockValidateForgotPasswordRequest.mockReturnValue({
        code: "EMAIL_REQUIRED",
        message: "Email is required",
        statusCode: ERROR_STATUS_MAP.EMAIL_REQUIRED,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.data).toBeDefined();
        expect(opts.data.error).toBeDefined();
        expect(opts.data.error.code).toBe("EMAIL_REQUIRED");
        expect(opts.data.error.message).toBe("Email is required");
        throw new Error("Email is required");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should use validation error statusCode if provided", async () => {
      mockReadBody.mockResolvedValue({ email: "invalid" });
      mockValidateForgotPasswordRequest.mockReturnValue({
        code: "EMAIL_INVALID",
        message: "Invalid email",
        statusCode: 422,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(422);
        throw new Error("Invalid email");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should default to VALIDATION_ERROR statusCode if not provided", async () => {
      mockReadBody.mockResolvedValue({ email: "invalid" });
      mockValidateForgotPasswordRequest.mockReturnValue({
        code: "EMAIL_INVALID",
        message: "Invalid email",
      } as never);

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.VALIDATION_ERROR);
        throw new Error("Invalid email");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });
  });

  describe("Password Reset Email", () => {
    it("should send password reset email successfully", async () => {
      mockReadBody.mockResolvedValue({ email: "test@example.com" });
      mockValidateForgotPasswordRequest.mockReturnValue(null);
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(mockResetPasswordForEmail).toHaveBeenCalledWith("test@example.com", {
        redirectTo: "http://localhost:3000/resetPassword",
      });

      expect(result).toEqual({
        success: true,
        message: "Password reset email sent",
        data: {
          message:
            "If an account with this email exists, you will receive a password reset link.",
        },
      });
    });

    it("should use correct redirect URL from request origin", async () => {
      mockReadBody.mockResolvedValue({ email: "test@example.com" });
      mockValidateForgotPasswordRequest.mockReturnValue(null);
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      mockGetRequestURL.mockReturnValue({
        origin: "https://example.com",
      });

      await handler(mockEvent);

      expect(mockResetPasswordForEmail).toHaveBeenCalledWith("test@example.com", {
        redirectTo: "https://example.com/resetPassword",
      });
    });

    it("should always return success message for security", async () => {
      mockReadBody.mockResolvedValue({ email: "nonexistent@example.com" });
      mockValidateForgotPasswordRequest.mockReturnValue(null);
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.message).toBe(
        "If an account with this email exists, you will receive a password reset link.",
      );
    });

    it("should handle Supabase auth errors", async () => {
      mockReadBody.mockResolvedValue({ email: "test@example.com" });
      mockValidateForgotPasswordRequest.mockReturnValue(null);
      mockResetPasswordForEmail.mockResolvedValue({
        error: { message: "Email not found", error_code: "email_not_found" },
      });

      mockHandleAuthError.mockReturnValue({
        code: "EMAIL_NOT_FOUND",
        message: "No account found with this email address",
        statusCode: ERROR_STATUS_MAP.EMAIL_NOT_FOUND,
      });

      const error = new Error("No account found with this email address");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockHandleAuthError).toHaveBeenCalledWith({
        message: "Email not found",
        error_code: "email_not_found",
      });
    });

    it("should use auth error statusCode when handling Supabase errors", async () => {
      mockReadBody.mockResolvedValue({ email: "test@example.com" });
      mockValidateForgotPasswordRequest.mockReturnValue(null);
      mockResetPasswordForEmail.mockResolvedValue({
        error: { message: "Rate limit exceeded" },
      });

      mockHandleAuthError.mockReturnValue({
        code: "RATE_LIMIT",
        message: "Too many requests",
        statusCode: 429,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(429);
        throw new Error("Too many requests");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should default to BAD_REQUEST if auth error has no statusCode", async () => {
      mockReadBody.mockResolvedValue({ email: "test@example.com" });
      mockValidateForgotPasswordRequest.mockReturnValue(null);
      mockResetPasswordForEmail.mockResolvedValue({
        error: { message: "Some error" },
      });

      mockHandleAuthError.mockReturnValue({
        code: "UNKNOWN_ERROR",
        message: "Unknown error",
      } as never);

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.BAD_REQUEST);
        throw new Error("Unknown error");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });
  });

  describe("Response Structure", () => {
    it("should return success response with correct structure", async () => {
      mockReadBody.mockResolvedValue({ email: "test@example.com" });
      mockValidateForgotPasswordRequest.mockReturnValue(null);
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("message", "Password reset email sent");
      expect(result).toHaveProperty("data");
      expect(result.data).toHaveProperty("message");
    });

    it("should have correct message structure", async () => {
      mockReadBody.mockResolvedValue({ email: "user@example.com" });
      mockValidateForgotPasswordRequest.mockReturnValue(null);
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(typeof result.data.message).toBe("string");
      expect(result.data.message).toContain("password reset link");
    });
  });

  describe("Error Handling", () => {
    it("should catch and handle validation errors", async () => {
      mockReadBody.mockResolvedValue({ email: "" });
      mockValidateForgotPasswordRequest.mockReturnValue({
        code: "EMAIL_REQUIRED",
        message: "Email is required",
        statusCode: ERROR_STATUS_MAP.EMAIL_REQUIRED,
      });

      mockHandleApiError.mockReturnValue({
        code: "EMAIL_REQUIRED",
        message: "Email is required",
        statusCode: ERROR_STATUS_MAP.EMAIL_REQUIRED,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Email is required");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Email is required");
    });

    it("should catch and handle Supabase errors", async () => {
      mockReadBody.mockResolvedValue({ email: "test@example.com" });
      mockValidateForgotPasswordRequest.mockReturnValue(null);
      mockResetPasswordForEmail.mockResolvedValue({
        error: { message: "Service unavailable" },
      });

      mockHandleAuthError.mockReturnValue({
        code: "SERVICE_UNAVAILABLE",
        message: "Service unavailable",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Service unavailable");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should use handleApiError for unexpected errors", async () => {
      mockReadBody.mockResolvedValue({ email: "test@example.com" });
      mockValidateForgotPasswordRequest.mockReturnValue(null);
      mockResetPasswordForEmail.mockRejectedValue(new Error("Unexpected error"));

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

  describe("Different Email Formats", () => {
    it("should handle valid email addresses", async () => {
      const validEmails = [
        "user@example.com",
        "test.user@domain.co",
        "user+tag@example.org",
        "first.last@company.io",
      ];

      for (const email of validEmails) {
        mockReadBody.mockResolvedValue({ email });
        mockValidateForgotPasswordRequest.mockReturnValue(null);
        mockResetPasswordForEmail.mockResolvedValue({ error: null });

        const result = (await handler(mockEvent)) as SuccessResponse;

        expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
          email,
          expect.objectContaining({
            redirectTo: expect.any(String),
          }),
        );
        expect(result.success).toBe(true);
      }
    });

    it("should handle different origins in redirect URL", async () => {
      const origins = [
        "http://localhost:3000",
        "https://example.com",
        "https://app.example.com",
        "https://subdomain.domain.co.uk",
      ];

      for (const origin of origins) {
        mockReadBody.mockResolvedValue({ email: "test@example.com" });
        mockValidateForgotPasswordRequest.mockReturnValue(null);
        mockResetPasswordForEmail.mockResolvedValue({ error: null });

        mockGetRequestURL.mockReturnValue({ origin });

        await handler(mockEvent);

        expect(mockResetPasswordForEmail).toHaveBeenCalledWith("test@example.com", {
          redirectTo: `${origin}/resetPassword`,
        });
      }
    });
  });

  describe("Security Behavior", () => {
    it("should not reveal if email exists (always success)", async () => {
      mockReadBody.mockResolvedValue({ email: "nonexistent@example.com" });
      mockValidateForgotPasswordRequest.mockReturnValue(null);
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.message).toContain("If an account with this email");
      expect(result.data.message).toContain("password reset link");
      expect(result.data.message).not.toContain("sent to");
      expect(result.data.message).not.toContain("has been sent");
    });

    it("should return same response for existing and non-existing emails", async () => {
      mockValidateForgotPasswordRequest.mockReturnValue(null);
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      mockReadBody.mockResolvedValue({ email: "existing@example.com" });
      const result1 = (await handler(mockEvent)) as SuccessResponse;

      mockReadBody.mockResolvedValue({ email: "nonexistent@example.com" });
      const result2 = (await handler(mockEvent)) as SuccessResponse;

      expect(result1.data.message).toBe(result2.data.message);
      expect(result1.success).toBe(result2.success);
    });
  });

  describe("Request Body", () => {
    it("should parse request body correctly", async () => {
      mockReadBody.mockResolvedValue({ email: "test@example.com" });
      mockValidateForgotPasswordRequest.mockReturnValue(null);
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

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
      mockReadBody.mockResolvedValue({ email: "test@example.com" });
      mockValidateForgotPasswordRequest.mockReturnValue(null);
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      await handler(mockEvent);

      expect(mockCreateAuthClient).toHaveBeenCalled();
    });

    it("should call resetPasswordForEmail with correct parameters", async () => {
      mockReadBody.mockResolvedValue({ email: "user@example.com" });
      mockValidateForgotPasswordRequest.mockReturnValue(null);
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      await handler(mockEvent);

      expect(mockResetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
        redirectTo: "http://localhost:3000/resetPassword",
      });
    });

    it("should handle different Supabase error codes", async () => {
      mockReadBody.mockResolvedValue({ email: "test@example.com" });
      mockValidateForgotPasswordRequest.mockReturnValue(null);

      const supabaseErrors = [
        { error_code: "email_not_found", message: "Email not found" },
        { error_code: "rate_limit_exceeded", message: "Too many requests" },
        { error_code: "service_unavailable", message: "Service down" },
      ];

      for (const error of supabaseErrors) {
        mockResetPasswordForEmail.mockResolvedValue({ error });

        mockHandleAuthError.mockReturnValue({
          code: "AUTH_ERROR",
          message: error.message,
          statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
        });

        mockCreateError.mockImplementation(() => {
          throw new Error(error.message);
        });

        await expect(handler(mockEvent)).rejects.toThrow(error.message);
        expect(mockHandleAuthError).toHaveBeenCalledWith(error);
      }
    });
  });
});

