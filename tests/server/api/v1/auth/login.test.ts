import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import {
  mockCreateError,
  mockDefineEventHandler,
  mockSetHeader,
  mockReadBody,
  mockValidateLoginRequest,
  mockHandleAuthError,
  mockHandleApiError,
  mockSignInWithPassword,
  mockCreateAuthClient,
  mockCreateSuccessResponse,
  mockCreateErrorResponse,
  mockGetAllProfile,
  mockCreateProfile,
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
  validateLoginRequest: mockValidateLoginRequest,
  handleAuthError: mockHandleAuthError,
  handleApiError: mockHandleApiError,
}));

jest.mock("~~/server/utils/core", () => ({
  createSuccessResponse: mockCreateSuccessResponse,
  createErrorResponse: mockCreateErrorResponse,
}));

jest.mock("~~/server/model", () => ({
  getAllProfile: mockGetAllProfile,
  createProfile: mockCreateProfile,
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
    session: {
      access_token: string;
      refresh_token: string;
      expires_at: number;
      expires_in: number;
      token_type: string;
      user: {
        id: string;
        email: string;
        email_confirmed_at: string | null;
        created_at: string;
        updated_at: string;
      };
    } | null;
    user: {
      id: string;
      email: string;
      email_confirmed_at: string | null;
      created_at: string;
      updated_at: string;
    } | null;
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

const createMockAuthData = () => ({
  session: {
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    expires_at: 1234567890,
    expires_in: 3600,
    token_type: "bearer",
  },
  user: {
    id: "user-123",
    email: "test@example.com",
    email_confirmed_at: "2024-01-01T00:00:00Z",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    user_metadata: {
      displayName: "Test User",
    },
  },
});

describe("API: POST /api/v1/auth/login", () => {
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

    mockCreateAuthClient.mockReturnValue({
      auth: {
        signInWithPassword: mockSignInWithPassword,
      },
    } as never);

    const module = await import("~/server/api/v1/auth/login.post");
    handler = module.default as (event: unknown) => Promise<unknown>;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Validation", () => {
    it("should validate email and password from request body", async () => {
      const mockAuthData = createMockAuthData();
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({ data: mockAuthData, error: null });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: false });

      await handler(mockEvent);

      expect(mockReadBody).toHaveBeenCalledWith(mockEvent);
      expect(mockValidateLoginRequest).toHaveBeenCalledWith("test@example.com", "password123");
    });

    it("should reject when email is missing", async () => {
      mockReadBody.mockResolvedValue({ email: "", password: "password123" });
      mockValidateLoginRequest.mockReturnValue({
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

    it("should reject when password is missing", async () => {
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "" });
      mockValidateLoginRequest.mockReturnValue({
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

    it("should reject invalid email format", async () => {
      mockReadBody.mockResolvedValue({ email: "invalid-email", password: "password123" });
      mockValidateLoginRequest.mockReturnValue({
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
    });

    it("should include error data for validation errors", async () => {
      mockReadBody.mockResolvedValue({ email: "", password: "" });
      mockValidateLoginRequest.mockReturnValue({
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
      mockReadBody.mockResolvedValue({ email: "invalid", password: "123" });
      mockValidateLoginRequest.mockReturnValue({
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
      mockReadBody.mockResolvedValue({ email: "invalid", password: "123" });
      mockValidateLoginRequest.mockReturnValue({
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

  describe("Authentication", () => {
    it("should sign in user with valid credentials", async () => {
      const mockAuthData = createMockAuthData();
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({ data: mockAuthData, error: null });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: false });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("Login successful");
    });

    it("should handle Supabase auth errors", async () => {
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "wrongpassword" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: "Invalid credentials", error_code: "invalid_credentials" },
      });

      mockHandleAuthError.mockReturnValue({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
        statusCode: ERROR_STATUS_MAP.INVALID_CREDENTIALS,
      });

      const error = new Error("Invalid email or password");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockHandleAuthError).toHaveBeenCalledWith({
        message: "Invalid credentials",
        error_code: "invalid_credentials",
      });
    });

    it("should use auth error statusCode when handling Supabase errors", async () => {
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: "User not found" },
      });

      mockHandleAuthError.mockReturnValue({
        code: "USER_NOT_FOUND",
        message: "User not found",
        statusCode: 404,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(404);
        throw new Error("User not found");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should default to INVALID_CREDENTIALS if auth error has no statusCode", async () => {
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: "Some error" },
      });

      mockHandleAuthError.mockReturnValue({
        code: "UNKNOWN_ERROR",
        message: "Unknown error",
      } as never);

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.INVALID_CREDENTIALS);
        throw new Error("Unknown error");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should handle missing session data", async () => {
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: null,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.LOGIN_FAILED);
        expect(opts.statusMessage).toBe("Login failed. Please try again.");
        expect(opts.data.error.code).toBe("LOGIN_FAILED");
        throw new Error("Login failed. Please try again.");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Login failed. Please try again.");
    });

    it("should handle missing user data", async () => {
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: "token",
            refresh_token: "refresh",
            expires_at: 123,
            expires_in: 3600,
            token_type: "bearer",
          },
          user: null,
        } as never,
        error: null,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Login failed. Please try again.");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Login failed. Please try again.");
    });
  });

  describe("Profile Management", () => {
    it("should check for existing profile", async () => {
      const mockAuthData = createMockAuthData();
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({ data: mockAuthData, error: null });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: false });

      await handler(mockEvent);

      expect(mockGetAllProfile).toHaveBeenCalledWith("user-123");
    });

    it("should create profile if not exists", async () => {
      const mockAuthData = createMockAuthData();
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({ data: mockAuthData, error: null });
      mockGetAllProfile.mockResolvedValue(null);

      await handler(mockEvent);

      expect(mockCreateProfile).toHaveBeenCalledWith("user-123", "Test User");
    });

    it("should use full_name from user_metadata if displayName not available", async () => {
      const mockAuthData = {
        ...createMockAuthData(),
        user: {
          ...createMockAuthData().user,
          user_metadata: {
            full_name: "Full Name User",
          },
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({ data: mockAuthData, error: null });
      mockGetAllProfile.mockResolvedValue(null);

      await handler(mockEvent);

      expect(mockCreateProfile).toHaveBeenCalledWith("user-123", "Full Name User");
    });

    it("should use default 'user' if no display name available", async () => {
      const mockAuthData = {
        ...createMockAuthData(),
        user: {
          ...createMockAuthData().user,
          user_metadata: {},
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({ data: mockAuthData, error: null });
      mockGetAllProfile.mockResolvedValue(null);

      await handler(mockEvent);

      expect(mockCreateProfile).toHaveBeenCalledWith("user-123", "user");
    });

    it("should use default 'user' if user_metadata is undefined", async () => {
      const mockAuthData = {
        ...createMockAuthData(),
        user: {
          ...createMockAuthData().user,
          user_metadata: undefined,
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({ data: mockAuthData as never, error: null });
      mockGetAllProfile.mockResolvedValue(null);

      await handler(mockEvent);

      expect(mockCreateProfile).toHaveBeenCalledWith("user-123", "user");
    });

    it("should reject deleted users", async () => {
      const mockAuthData = createMockAuthData();
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({ data: mockAuthData, error: null });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: true });

      mockHandleApiError.mockReturnValue({
        code: "FORBIDDEN",
        message: "The user has been deleted, please re-register to retrieve the account.",
        statusCode: ERROR_STATUS_MAP.DELETED_USER,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        if (opts.statusCode === ERROR_STATUS_MAP.DELETED_USER) {
          expect(opts.statusMessage).toBe(
            "The user has been deleted, please re-register to retrieve the account.",
          );
          expect(opts.data.error.code).toBe("FORBIDDEN");
        }
        throw new Error(opts.statusMessage);
      });

      await expect(handler(mockEvent)).rejects.toThrow(
        "The user has been deleted, please re-register to retrieve the account.",
      );
    });

    it("should not create profile if existing profile found", async () => {
      const mockAuthData = createMockAuthData();
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({ data: mockAuthData, error: null });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: false });

      await handler(mockEvent);

      expect(mockCreateProfile).not.toHaveBeenCalled();
    });
  });

  describe("Response Structure", () => {
    it("should return success response with correct structure", async () => {
      const mockAuthData = createMockAuthData();
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({ data: mockAuthData, error: null });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: false });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("message", "Login successful");
      expect(result).toHaveProperty("data");
      expect(result.data).toHaveProperty("session");
      expect(result.data).toHaveProperty("user");
    });

    it("should include session data in response", async () => {
      const mockAuthData = createMockAuthData();
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({ data: mockAuthData, error: null });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: false });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.session).toMatchObject({
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        expires_at: 1234567890,
        expires_in: 3600,
        token_type: "bearer",
      });
    });

    it("should include user data in session", async () => {
      const mockAuthData = createMockAuthData();
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({ data: mockAuthData, error: null });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: false });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.session?.user).toMatchObject({
        id: "user-123",
        email: "test@example.com",
        email_confirmed_at: "2024-01-01T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      });
    });

    it("should include separate user data in response", async () => {
      const mockAuthData = createMockAuthData();
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({ data: mockAuthData, error: null });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: false });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.user).toMatchObject({
        id: "user-123",
        email: "test@example.com",
        email_confirmed_at: "2024-01-01T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      });
    });

    it("should handle null email_confirmed_at", async () => {
      const mockAuthData = {
        ...createMockAuthData(),
        user: {
          ...createMockAuthData().user,
          email_confirmed_at: null,
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({ data: mockAuthData, error: null });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: false });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.user?.email_confirmed_at).toBeNull();
    });

    it("should handle missing email with empty string", async () => {
      const mockAuthData = {
        ...createMockAuthData(),
        user: {
          ...createMockAuthData().user,
          email: undefined,
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({ data: mockAuthData as never, error: null });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: false });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.user?.email).toBe("");
    });

    it("should use default values for missing session fields", async () => {
      const mockAuthData = {
        session: {
          access_token: "token",
          refresh_token: "refresh",
        },
        user: createMockAuthData().user,
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({ data: mockAuthData as never, error: null });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: false });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.session?.expires_at).toBe(0);
      expect(result.data.session?.expires_in).toBe(0);
      expect(result.data.session?.token_type).toBe("bearer");
    });

    it("should use current date for missing timestamps", async () => {
      const mockAuthData = {
        session: createMockAuthData().session,
        user: {
          id: "user-123",
          email: "test@example.com",
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({ data: mockAuthData as never, error: null });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: false });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.user?.created_at).toBeDefined();
      expect(result.data.user?.updated_at).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should catch and handle validation errors", async () => {
      mockReadBody.mockResolvedValue({ email: "", password: "" });
      mockValidateLoginRequest.mockReturnValue({
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
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
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
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockRejectedValue(new Error("Unexpected error"));

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

    it("should handle profile creation errors", async () => {
      const mockAuthData = createMockAuthData();
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({ data: mockAuthData, error: null });
      mockGetAllProfile.mockResolvedValue(null);
      mockCreateProfile.mockRejectedValue(new Error("Profile creation failed"));

      mockHandleApiError.mockReturnValue({
        code: "PROFILE_CREATION_ERROR",
        message: "Profile creation failed",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Profile creation failed");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should handle profile retrieval errors", async () => {
      const mockAuthData = createMockAuthData();
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({ data: mockAuthData, error: null });
      mockGetAllProfile.mockRejectedValue(new Error("Database error"));

      mockHandleApiError.mockReturnValue({
        code: "DATABASE_ERROR",
        message: "Database error",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Database error");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });
  });

  describe("Request Body", () => {
    it("should parse request body correctly", async () => {
      const mockAuthData = createMockAuthData();
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({ data: mockAuthData, error: null });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: false });

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
      const mockAuthData = createMockAuthData();
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({ data: mockAuthData, error: null });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: false });

      await handler(mockEvent);

      expect(mockCreateAuthClient).toHaveBeenCalled();
    });

    it("should call signInWithPassword with correct parameters", async () => {
      const mockAuthData = createMockAuthData();
      mockReadBody.mockResolvedValue({ email: "user@example.com", password: "mypassword" });
      mockValidateLoginRequest.mockReturnValue(null);
      mockSignInWithPassword.mockResolvedValue({ data: mockAuthData, error: null });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: false });

      await handler(mockEvent);

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "mypassword",
      });
    });

    it("should handle different Supabase error codes", async () => {
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateLoginRequest.mockReturnValue(null);

      const supabaseErrors = [
        { error_code: "invalid_credentials", message: "Invalid credentials" },
        { error_code: "user_not_found", message: "User not found" },
        { error_code: "email_not_confirmed", message: "Email not confirmed" },
      ];

      for (const error of supabaseErrors) {
        mockSignInWithPassword.mockResolvedValue({
          data: { session: null, user: null },
          error,
        });

        mockHandleAuthError.mockReturnValue({
          code: "AUTH_ERROR",
          message: error.message,
          statusCode: ERROR_STATUS_MAP.INVALID_CREDENTIALS,
        });

        mockCreateError.mockImplementation(() => {
          throw new Error(error.message);
        });

        await expect(handler(mockEvent)).rejects.toThrow(error.message);
        expect(mockHandleAuthError).toHaveBeenCalledWith(error);
      }
    });
  });

  describe("Different Email/Password Combinations", () => {
    it("should handle valid email/password combinations", async () => {
      const mockAuthData = createMockAuthData();
      const testCases = [
        { email: "user@example.com", password: "password123" },
        { email: "test.user@domain.co", password: "P@ssw0rd!" },
        { email: "user+tag@example.org", password: "secure-pass" },
      ];

      for (const testCase of testCases) {
        mockReadBody.mockResolvedValue(testCase);
        mockValidateLoginRequest.mockReturnValue(null);
        mockSignInWithPassword.mockResolvedValue({ data: mockAuthData, error: null });
        mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: false });

        const result = (await handler(mockEvent)) as SuccessResponse;

        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: testCase.email,
          password: testCase.password,
        });
        expect(result.success).toBe(true);
      }
    });
  });
});
