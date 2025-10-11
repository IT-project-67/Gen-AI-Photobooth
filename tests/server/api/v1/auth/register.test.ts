import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import {
  mockCreateError,
  mockDefineEventHandler,
  mockSetHeader,
  mockReadBody,
  mockValidateRegisterRequest,
  mockHandleAuthError,
  mockHandleApiError,
  mockSignUp,
  mockListUsers,
  mockUpdateUserById,
  mockCreateAuthClient,
  mockCreateAdminClient,
  mockCreateSuccessResponse,
  mockCreateErrorResponse,
  mockGetAllProfile,
  mockRestoreProfile,
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
  createAdminClient: mockCreateAdminClient,
}));

jest.mock("~~/server/utils/auth", () => ({
  validateRegisterRequest: mockValidateRegisterRequest,
  handleAuthError: mockHandleAuthError,
  handleApiError: mockHandleApiError,
}));

jest.mock("~~/server/utils/core", () => ({
  createSuccessResponse: mockCreateSuccessResponse,
  createErrorResponse: mockCreateErrorResponse,
}));

jest.mock("~~/server/model", () => ({
  getAllProfile: mockGetAllProfile,
  restoreProfile: mockRestoreProfile,
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
    emailSent?: boolean;
    isRecovered?: boolean;
  };
};

type ErrorOptions = {
  statusCode: number;
  statusMessage: string;
  data: {
    error: {
      type?: string;
      code: string;
      message: string;
    };
  };
};

const createMockAuthData = (includeSession = true) => ({
  session: includeSession
    ? {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        expires_at: 1234567890,
        expires_in: 3600,
        token_type: "bearer",
      }
    : null,
  user: {
    id: "user-123",
    email: "test@example.com",
    email_confirmed_at: includeSession ? "2024-01-01T00:00:00Z" : null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
});

describe("API: POST /api/v1/auth/register", () => {
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

    const module = await import("~/server/api/v1/auth/register.post");
    handler = module.default as (event: unknown) => Promise<unknown>;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Validation", () => {
    it("should validate email and password from request body", async () => {
      const mockAuthData = createMockAuthData();
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData, error: null });

      await handler(mockEvent);

      expect(mockReadBody).toHaveBeenCalledWith(mockEvent);
      expect(mockValidateRegisterRequest).toHaveBeenCalledWith("test@example.com", "password123");
    });

    it("should reject when email is missing", async () => {
      mockReadBody.mockResolvedValue({ email: "", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue({
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
    });

    it("should reject when password is missing", async () => {
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "" });
      mockValidateRegisterRequest.mockReturnValue({
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
      mockValidateRegisterRequest.mockReturnValue({
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

    it("should reject weak password", async () => {
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "123" });
      mockValidateRegisterRequest.mockReturnValue({
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
      mockReadBody.mockResolvedValue({ email: "", password: "" });
      mockValidateRegisterRequest.mockReturnValue({
        code: "EMAIL_REQUIRED",
        message: "Email is required",
      } as never);

      mockHandleApiError.mockReturnValue({
        code: "EMAIL_REQUIRED",
        message: "Email is required",
        statusCode: ERROR_STATUS_MAP.EMAIL_REQUIRED,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.VALIDATION_ERROR);
        throw new Error("Email is required");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Email is required");
    });
  });

  describe("New User Registration", () => {
    it("should register new user with session (auto-confirmed)", async () => {
      const mockAuthData = createMockAuthData(true);
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(mockSignUp).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("Registration successful");
      expect(result.data.session).not.toBeNull();
      expect(result.data.emailSent).toBe(false);
    });

    it("should register new user without session (email confirmation required)", async () => {
      const mockAuthData = createMockAuthData(false);
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        "Registration successful. Please check your email to confirm your account.",
      );
      expect(result.data.session).toBeNull();
      expect(result.data.emailSent).toBe(true);
    });

    it("should include user data in response", async () => {
      const mockAuthData = createMockAuthData(true);
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.user).toMatchObject({
        id: "user-123",
        email: "test@example.com",
        email_confirmed_at: "2024-01-01T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      });
    });

    it("should handle Supabase registration errors", async () => {
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: "Registration failed", error_code: "registration_error" },
      });

      mockHandleAuthError.mockReturnValue({
        code: "REGISTRATION_ERROR",
        message: "Registration failed",
        statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
      });

      const error = new Error("Registration failed");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });
  });

  describe("Existing User Handling", () => {
    it("should reject if user already exists (not deleted)", async () => {
      mockReadBody.mockResolvedValue({ email: "existing@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({
        data: {
          users: [
            {
              id: "existing-user-123",
              email: "existing@example.com",
              email_confirmed_at: "2024-01-01T00:00:00Z",
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z",
            },
          ],
        },
        error: null,
      });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: false });

      mockHandleApiError.mockReturnValue({
        type: "AUTH_ERROR",
        code: "USER_ALREADY_EXISTS",
        message: "This email is already registered. Please try logging in instead.",
        statusCode: ERROR_STATUS_MAP.USER_ALREADY_EXISTS,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("This email is already registered. Please try logging in instead.");
      });

      await expect(handler(mockEvent)).rejects.toThrow(
        "This email is already registered. Please try logging in instead.",
      );
    });

    it("should check user profile when user exists", async () => {
      mockReadBody.mockResolvedValue({ email: "existing@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({
        data: {
          users: [
            {
              id: "existing-user-123",
              email: "existing@example.com",
            },
          ],
        },
        error: null,
      });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: false });

      mockHandleApiError.mockReturnValue({
        type: "AUTH_ERROR",
        code: "USER_ALREADY_EXISTS",
        message: "This email is already registered. Please try logging in instead.",
        statusCode: ERROR_STATUS_MAP.USER_ALREADY_EXISTS,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("This email is already registered. Please try logging in instead.");
      });

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockGetAllProfile).toHaveBeenCalledWith("existing-user-123");
    });
  });

  describe("Account Recovery (Deleted User)", () => {
    it("should recover deleted account successfully", async () => {
      mockReadBody.mockResolvedValue({ email: "deleted@example.com", password: "newpassword123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({
        data: {
          users: [
            {
              id: "deleted-user-123",
              email: "deleted@example.com",
              email_confirmed_at: "2024-01-01T00:00:00Z",
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z",
            },
          ],
        },
        error: null,
      });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: true });
      mockUpdateUserById.mockResolvedValue({ error: null });
      mockRestoreProfile.mockResolvedValue(undefined);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.success).toBe(true);
      expect(result.message).toBe("Account recovered successfully! Please login to continue.");
      expect(result.data.isRecovered).toBe(true);
      expect(result.data.emailSent).toBe(false);
      expect(result.data.session).toBeNull();
    });

    it("should update password when recovering deleted account", async () => {
      mockReadBody.mockResolvedValue({ email: "deleted@example.com", password: "newpassword123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({
        data: {
          users: [
            {
              id: "deleted-user-123",
              email: "deleted@example.com",
            },
          ],
        },
        error: null,
      });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: true });
      mockUpdateUserById.mockResolvedValue({ error: null });
      mockRestoreProfile.mockResolvedValue(undefined);

      await handler(mockEvent);

      expect(mockUpdateUserById).toHaveBeenCalledWith("deleted-user-123", {
        password: "newpassword123",
      });
    });

    it("should restore profile when recovering deleted account", async () => {
      mockReadBody.mockResolvedValue({ email: "deleted@example.com", password: "newpassword123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({
        data: {
          users: [
            {
              id: "deleted-user-123",
              email: "deleted@example.com",
            },
          ],
        },
        error: null,
      });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: true });
      mockUpdateUserById.mockResolvedValue({ error: null });
      mockRestoreProfile.mockResolvedValue(undefined);

      await handler(mockEvent);

      expect(mockRestoreProfile).toHaveBeenCalledWith("deleted-user-123");
    });

    it("should handle password update failure during recovery", async () => {
      mockReadBody.mockResolvedValue({ email: "deleted@example.com", password: "newpassword123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({
        data: {
          users: [
            {
              id: "deleted-user-123",
              email: "deleted@example.com",
            },
          ],
        },
        error: null,
      });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: true });
      mockUpdateUserById.mockResolvedValue({ error: { message: "Update failed" } });

      mockHandleApiError.mockReturnValue({
        code: "UPDATE_PASSWORD_FAILED",
        message: "Failed to update password for account recovery. Please try again.",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        if (opts.statusCode === ERROR_STATUS_MAP.INTERNAL_ERROR && opts.statusMessage.includes("update password")) {
          expect(opts.statusMessage).toBe(
            "Failed to update password for account recovery. Please try again.",
          );
        }
        throw new Error(opts.statusMessage);
      });

      await expect(handler(mockEvent)).rejects.toThrow(
        "Failed to update password for account recovery. Please try again.",
      );
    });

    it("should handle restore profile failure", async () => {
      mockReadBody.mockResolvedValue({ email: "deleted@example.com", password: "newpassword123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({
        data: {
          users: [
            {
              id: "deleted-user-123",
              email: "deleted@example.com",
            },
          ],
        },
        error: null,
      });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: true });
      mockUpdateUserById.mockResolvedValue({ error: null });
      
      const restoreError = new Error("Restore failed");
      mockRestoreProfile.mockRejectedValue(restoreError);

      mockHandleApiError.mockReturnValue({
        code: "RESTORE_FAILED",
        message: "Failed to restore account. Please try again.",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        if (opts.statusCode === ERROR_STATUS_MAP.INTERNAL_ERROR && opts.statusMessage.includes("restore")) {
          expect(opts.statusMessage).toBe("Failed to restore account. Please try again.");
        }
        throw new Error(opts.statusMessage);
      });

      await expect(handler(mockEvent)).rejects.toThrow(
        "Failed to restore account. Please try again.",
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to restore profile:",
        restoreError,
      );
    });

    it("should include user data in recovery response", async () => {
      mockReadBody.mockResolvedValue({ email: "deleted@example.com", password: "newpassword123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({
        data: {
          users: [
            {
              id: "deleted-user-123",
              email: "deleted@example.com",
              email_confirmed_at: "2024-01-01T00:00:00Z",
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z",
            },
          ],
        },
        error: null,
      });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: true });
      mockUpdateUserById.mockResolvedValue({ error: null });
      mockRestoreProfile.mockResolvedValue(undefined);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.user).toMatchObject({
        id: "deleted-user-123",
        email: "deleted@example.com",
        email_confirmed_at: "2024-01-01T00:00:00Z",
      });
    });

    it("should use default timestamps when missing during recovery", async () => {
      mockReadBody.mockResolvedValue({ email: "deleted@example.com", password: "newpassword123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({
        data: {
          users: [
            {
              id: "deleted-user-123",
              email: "deleted@example.com",
            },
          ],
        },
        error: null,
      });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: true });
      mockUpdateUserById.mockResolvedValue({ error: null });
      mockRestoreProfile.mockResolvedValue(undefined);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.user?.created_at).toBeDefined();
      expect(result.data.user?.updated_at).toBeDefined();
    });

    it("should handle empty email in existing user during recovery", async () => {
      mockReadBody.mockResolvedValue({ email: "", password: "newpassword123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({
        data: {
          users: [
            {
              id: "deleted-user-123",
              email: "",
            },
          ],
        },
        error: null,
      });
      mockGetAllProfile.mockResolvedValue({ id: "profile-123", isDeleted: true });
      mockUpdateUserById.mockResolvedValue({ error: null });
      mockRestoreProfile.mockResolvedValue(undefined);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.user?.email).toBe("");
    });
  });

  describe("Response Structure", () => {
    it("should return correct structure for new registration with session", async () => {
      const mockAuthData = createMockAuthData(true);
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("message");
      expect(result).toHaveProperty("data");
      expect(result.data).toHaveProperty("session");
      expect(result.data).toHaveProperty("user");
      expect(result.data).toHaveProperty("emailSent");
    });

    it("should include session data when auto-confirmed", async () => {
      const mockAuthData = createMockAuthData(true);
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.session).toMatchObject({
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        expires_at: 1234567890,
        expires_in: 3600,
        token_type: "bearer",
      });
    });

    it("should use default values for missing session fields", async () => {
      const mockAuthData = {
        session: {
          access_token: "token",
          refresh_token: "refresh",
        },
        user: createMockAuthData(true).user,
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData as never, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.session?.expires_at).toBe(0);
      expect(result.data.session?.expires_in).toBe(0);
      expect(result.data.session?.token_type).toBe("bearer");
    });

    it("should use default values for missing user timestamps", async () => {
      const mockAuthData = {
        session: createMockAuthData(true).session,
        user: {
          id: "user-123",
          email: "test@example.com",
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData as never, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.user?.created_at).toBeDefined();
      expect(result.data.user?.updated_at).toBeDefined();
    });

    it("should handle missing email with empty string", async () => {
      const mockAuthData = {
        session: createMockAuthData(true).session,
        user: {
          id: "user-123",
          email: undefined,
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData as never, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.user?.email).toBe("");
    });

    it("should handle missing user id in session with empty string", async () => {
      const mockAuthData = {
        session: {
          access_token: "token",
          refresh_token: "refresh",
          expires_at: 123,
          expires_in: 3600,
          token_type: "bearer",
        },
        user: {
          id: undefined,
          email: "test@example.com",
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData as never, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.session?.user.id).toBe("");
    });

    it("should handle missing user email in session with empty string", async () => {
      const mockAuthData = {
        session: {
          access_token: "token",
          refresh_token: "refresh",
          expires_at: 123,
          expires_in: 3600,
          token_type: "bearer",
        },
        user: {
          id: "user-123",
          email: undefined,
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData as never, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.session?.user.email).toBe("");
    });

    it("should use default timestamps in session when missing", async () => {
      const mockAuthData = {
        session: {
          access_token: "token",
          refresh_token: "refresh",
          expires_at: 123,
          expires_in: 3600,
          token_type: "bearer",
        },
        user: {
          id: "user-123",
          email: "test@example.com",
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData as never, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.session?.user.created_at).toBeDefined();
      expect(result.data.session?.user.updated_at).toBeDefined();
    });

    it("should handle null email_confirmed_at in session user", async () => {
      const mockAuthData = {
        session: {
          access_token: "token",
          refresh_token: "refresh",
          expires_at: 123,
          expires_in: 3600,
          token_type: "bearer",
        },
        user: {
          id: "user-123",
          email: "test@example.com",
          email_confirmed_at: undefined,
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData as never, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.session?.user.email_confirmed_at).toBeNull();
    });

    it("should handle all missing fields in session user", async () => {
      const mockAuthData = {
        session: {
          access_token: "token",
          refresh_token: "refresh",
          expires_at: undefined,
          expires_in: undefined,
          token_type: undefined,
        },
        user: {
          id: undefined,
          email: undefined,
          email_confirmed_at: undefined,
          created_at: undefined,
          updated_at: undefined,
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData as never, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      // Verify all default values are used
      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          session: expect.objectContaining({
            user: expect.objectContaining({
              id: "",
              email: "",
              email_confirmed_at: null,
            }),
            expires_at: 0,
            expires_in: 0,
            token_type: "bearer",
          }),
        }),
        "Registration successful",
      );

      expect(result.data.session?.user.id).toBe("");
      expect(result.data.session?.user.email).toBe("");
      expect(result.data.session?.user.email_confirmed_at).toBeNull();
      expect(result.data.session?.user.created_at).toBeDefined();
      expect(result.data.session?.user.updated_at).toBeDefined();
      expect(result.data.session?.expires_at).toBe(0);
      expect(result.data.session?.expires_in).toBe(0);
      expect(result.data.session?.token_type).toBe("bearer");
    });

    it("should handle missing created_at in session user", async () => {
      const mockAuthData = {
        session: {
          access_token: "token",
          refresh_token: "refresh",
        },
        user: {
          id: "user-123",
          email: "test@example.com",
          created_at: null,
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData as never, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.session?.user.created_at).toBeDefined();
      expect(typeof result.data.session?.user.created_at).toBe("string");
    });

    it("should handle missing updated_at in session user", async () => {
      const mockAuthData = {
        session: {
          access_token: "token",
          refresh_token: "refresh",
        },
        user: {
          id: "user-123",
          email: "test@example.com",
          updated_at: null,
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData as never, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.session?.user.updated_at).toBeDefined();
      expect(typeof result.data.session?.user.updated_at).toBe("string");
    });

    it("should handle empty string id in session user", async () => {
      const mockAuthData = {
        session: {
          access_token: "token",
          refresh_token: "refresh",
        },
        user: {
          id: "",
          email: "test@example.com",
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData as never, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.session?.user.id).toBe("");
    });

    it("should handle empty string email in session user", async () => {
      const mockAuthData = {
        session: {
          access_token: "token",
          refresh_token: "refresh",
        },
        user: {
          id: "user-123",
          email: "",
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData as never, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.session?.user.email).toBe("");
    });

    it("should handle empty string created_at with fallback", async () => {
      const mockAuthData = {
        session: {
          access_token: "token",
          refresh_token: "refresh",
        },
        user: {
          id: "user-123",
          email: "test@example.com",
          created_at: "",
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData as never, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.session?.user.created_at).toBeDefined();
      expect(result.data.session?.user.created_at).not.toBe("");
    });

    it("should handle empty string updated_at with fallback", async () => {
      const mockAuthData = {
        session: {
          access_token: "token",
          refresh_token: "refresh",
        },
        user: {
          id: "user-123",
          email: "test@example.com",
          updated_at: "",
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData as never, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.session?.user.updated_at).toBeDefined();
      expect(result.data.session?.user.updated_at).not.toBe("");
    });

    it("should handle falsy user id in new registration", async () => {
      const mockAuthData = {
        session: {
          access_token: "token",
          refresh_token: "refresh",
        },
        user: {
          id: "",
          email: "test@example.com",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData as never, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.session?.user.id).toBe("");
      expect(result.data.user?.id).toBe("");
    });

    it("should handle falsy user email in new registration", async () => {
      const mockAuthData = {
        session: {
          access_token: "token",
          refresh_token: "refresh",
        },
        user: {
          id: "user-123",
          email: "",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData as never, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.session?.user.email).toBe("");
      expect(result.data.user?.email).toBe("");
    });

    it("should handle falsy timestamps in new registration", async () => {
      const mockAuthData = {
        session: {
          access_token: "token",
          refresh_token: "refresh",
        },
        user: {
          id: "user-123",
          email: "test@example.com",
          created_at: "",
          updated_at: "",
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData as never, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.session?.user.created_at).toBeDefined();
      expect(result.data.session?.user.created_at).not.toBe("");
      expect(result.data.session?.user.updated_at).toBeDefined();
      expect(result.data.session?.user.updated_at).not.toBe("");
      expect(result.data.user?.created_at).toBeDefined();
      expect(result.data.user?.updated_at).toBeDefined();
    });

    it("should handle falsy email_confirmed_at in new registration", async () => {
      const mockAuthData = {
        session: {
          access_token: "token",
          refresh_token: "refresh",
        },
        user: {
          id: "user-123",
          email: "test@example.com",
          email_confirmed_at: "",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData as never, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.session?.user.email_confirmed_at).toBeNull();
      expect(result.data.user?.email_confirmed_at).toBeNull();
    });

    it("should handle completely missing user object fields in session", async () => {
      const mockAuthData = {
        session: {
          access_token: "token",
          refresh_token: "refresh",
        },
        user: {} as never,
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData as never, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.session?.user.id).toBe("");
      expect(result.data.session?.user.email).toBe("");
      expect(result.data.session?.user.email_confirmed_at).toBeNull();
      expect(result.data.session?.user.created_at).toBeDefined();
      expect(result.data.session?.user.updated_at).toBeDefined();
    });

    it("should handle all falsy values in session user fields", async () => {
      const mockAuthData = {
        session: {
          access_token: "token",
          refresh_token: "refresh",
          expires_at: 0,
          expires_in: 0,
          token_type: "",
        },
        user: {
          id: null,
          email: null,
          email_confirmed_at: null,
          created_at: null,
          updated_at: null,
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData as never, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      // All fields in session.user should have defaults
      expect(result.data.session?.user.id).toBe("");
      expect(result.data.session?.user.email).toBe("");
      expect(result.data.session?.user.email_confirmed_at).toBeNull();
      expect(result.data.session?.user.created_at).toBeDefined();
      expect(result.data.session?.user.created_at).not.toBeNull();
      expect(result.data.session?.user.updated_at).toBeDefined();
      expect(result.data.session?.user.updated_at).not.toBeNull();
    });

    it("should handle zero values in session user fields", async () => {
      const mockAuthData = {
        session: {
          access_token: "token",
          refresh_token: "refresh",
        },
        user: {
          id: 0 as never,
          email: 0 as never,
          email_confirmed_at: 0 as never,
          created_at: 0 as never,
          updated_at: 0 as never,
        },
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData as never, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      // Zero values should trigger defaults
      expect(result.data.session?.user.id).toBe("");
      expect(result.data.session?.user.email).toBe("");
      expect(result.data.session?.user.email_confirmed_at).toBeNull();
      expect(result.data.session?.user.created_at).toBeDefined();
      expect(result.data.session?.user.updated_at).toBeDefined();
    });

    it("should handle undefined data.user in session construction", async () => {
      const mockAuthData = {
        session: {
          access_token: "token",
          refresh_token: "refresh",
        },
        user: undefined,
      };
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData as never, error: null });

      const result = (await handler(mockEvent)) as SuccessResponse;

      // When user is undefined, session.user fields should use defaults
      expect(result.data.session?.user.id).toBe("");
      expect(result.data.session?.user.email).toBe("");
      expect(result.data.session?.user.email_confirmed_at).toBeNull();
      expect(result.data.session?.user.created_at).toBeDefined();
      expect(result.data.session?.user.updated_at).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should catch and handle validation errors", async () => {
      mockReadBody.mockResolvedValue({ email: "", password: "" });
      mockValidateRegisterRequest.mockReturnValue({
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

    it("should handle profile retrieval errors", async () => {
      mockReadBody.mockResolvedValue({ email: "existing@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({
        data: {
          users: [{ id: "existing-user-123", email: "existing@example.com" }],
        },
        error: null,
      });
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

    it("should use default INTERNAL_ERROR statusCode for profile errors without statusCode", async () => {
      mockReadBody.mockResolvedValue({ email: "existing@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({
        data: {
          users: [{ id: "existing-user-123", email: "existing@example.com" }],
        },
        error: null,
      });
      mockGetAllProfile.mockRejectedValue(new Error("Database error"));

      mockHandleApiError.mockReturnValue({
        code: "DATABASE_ERROR",
        message: "Database error",
      } as never);

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.INTERNAL_ERROR);
        throw new Error("Database error");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
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

    it("should use auth error statusCode when handling Supabase errors", async () => {
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({
        data: { session: null, user: null },
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
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({
        data: { session: null, user: null },
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

  describe("Supabase Integration", () => {
    it("should call both createAuthClient and createAdminClient", async () => {
      const mockAuthData = createMockAuthData();
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData, error: null });

      await handler(mockEvent);

      expect(mockCreateAuthClient).toHaveBeenCalled();
      expect(mockCreateAdminClient).toHaveBeenCalled();
    });

    it("should call listUsers to check for existing users", async () => {
      const mockAuthData = createMockAuthData();
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData, error: null });

      await handler(mockEvent);

      expect(mockListUsers).toHaveBeenCalled();
    });

    it("should call signUp with correct parameters", async () => {
      const mockAuthData = createMockAuthData();
      mockReadBody.mockResolvedValue({ email: "user@example.com", password: "mypassword" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData, error: null });

      await handler(mockEvent);

      expect(mockSignUp).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "mypassword",
      });
    });
  });

  describe("Request Body", () => {
    it("should parse request body correctly", async () => {
      const mockAuthData = createMockAuthData();
      mockReadBody.mockResolvedValue({ email: "test@example.com", password: "password123" });
      mockValidateRegisterRequest.mockReturnValue(null);
      mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSignUp.mockResolvedValue({ data: mockAuthData, error: null });

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
});

