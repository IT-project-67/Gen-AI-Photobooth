import { describe, it, expect, beforeAll, beforeEach, jest } from "@jest/globals";
import {
  mockCreateError,
  mockDefineEventHandler,
  mockGetHeader,
  mockHandleApiError,
  mockCreateAuthClient,
  mockGetAllProfile,
  mockCreateProfile,
  mockRestoreProfile,
  mockGetUser,
} from "~/tests/server/mocks/mocks";
import { ERROR_STATUS_MAP } from "~/server/types/core";

jest.mock("h3", () => ({
  defineEventHandler: mockDefineEventHandler,
  createError: mockCreateError,
  getHeader: mockGetHeader,
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

jest.mock("~~/server/clients/prisma.client", () => ({
  prisma: {
    profile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("~~/server/clients", () => ({
  createAuthClient: mockCreateAuthClient,
}));

jest.mock("~~/server/utils/auth", () => ({
  handleApiError: mockHandleApiError,
}));

jest.mock("~~/server/model", () => ({
  getAllProfile: mockGetAllProfile,
  createProfile: mockCreateProfile,
  restoreProfile: mockRestoreProfile,
}));

type MockEvent = {
  node: {
    req: Record<string, unknown>;
    res: Record<string, unknown>;
  };
};

type ErrorOptions = {
  statusCode: number;
  statusMessage: string;
};

describe("API: POST /api/v1/profile/oauth", () => {
  let handler: (event: unknown) => Promise<unknown>;
  let mockEvent: MockEvent;

  beforeAll(async () => {
    const module = await import("~/server/api/v1/profile/oauth.post");
    handler = module.default as (event: unknown) => Promise<unknown>;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockEvent = {
      node: {
        req: {},
        res: {},
      },
    };

    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    } as never);

    mockCreateAuthClient.mockReturnValue({
      auth: {
        getUser: mockGetUser,
      },
    } as never);

    mockHandleApiError.mockImplementation((error: unknown) => {
      if (error instanceof Error) {
        return {
          type: "ERROR",
          code: "ERROR",
          message: error.message,
          statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
        };
      }
      return {
        type: "ERROR",
        code: "ERROR",
        message: "Unknown error",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      };
    });

    mockCreateError.mockImplementation((options: ErrorOptions) => {
      const error = new Error(options.statusMessage) as Error & ErrorOptions;
      error.statusCode = options.statusCode;
      error.statusMessage = options.statusMessage;
      return error;
    });
  });

  describe("Authentication", () => {
    it("should reject request without token", async () => {
      mockGetHeader.mockReturnValue(undefined);

      await expect(handler(mockEvent)).rejects.toThrow("Missing authorization token");

      expect(mockCreateError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
          statusMessage: "Missing authorization token",
        }),
      );
    });

    it("should reject request with malformed authorization header", async () => {
      mockGetHeader.mockReturnValue("InvalidHeader");

      await expect(handler(mockEvent)).rejects.toThrow("Missing authorization token");
    });

    it("should reject request without token after Bearer", async () => {
      mockGetHeader.mockReturnValue("Bearer ");

      await expect(handler(mockEvent)).rejects.toThrow("Missing authorization token");
    });

    it("should extract token correctly", async () => {
      mockGetHeader.mockReturnValue("Bearer my-token-123");
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid" },
      } as never);

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockGetHeader).toHaveBeenCalledWith(mockEvent, "authorization");
    });

    it("should reject when getUser returns error", async () => {
      mockGetHeader.mockReturnValue("Bearer invalid-token");
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid token" },
      } as never);

      await expect(handler(mockEvent)).rejects.toThrow("Invalid token");
    });

    it("should reject when user is null", async () => {
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);

      await expect(handler(mockEvent)).rejects.toThrow("Invalid token");
    });
  });

  describe("Profile Creation", () => {
    it("should create profile when not exists", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        user_metadata: {
          displayName: "OAuth User",
        },
      };

      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);
      mockGetAllProfile.mockResolvedValue(null);

      const mockProfile = {
        userId: "user-123",
        displayName: "OAuth User",
        organization: null,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        isDeleted: false,
      };
      mockCreateProfile.mockResolvedValue(mockProfile);

      const result = await handler(mockEvent);

      expect(mockGetAllProfile).toHaveBeenCalledWith("user-123");
      expect(mockCreateProfile).toHaveBeenCalledWith("user-123", "OAuth User");
      expect(result).toEqual({
        success: true,
        profile: mockProfile,
        message: "Profile created successfully",
      });
    });

    it("should use full_name when displayName not available", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        user_metadata: {
          full_name: "Full Name",
        },
      };

      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);
      mockGetAllProfile.mockResolvedValue(null);

      const mockProfile = {
        userId: "user-123",
        displayName: "Full Name",
        organization: null,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        isDeleted: false,
      };
      mockCreateProfile.mockResolvedValue(mockProfile);

      await handler(mockEvent);

      expect(mockCreateProfile).toHaveBeenCalledWith("user-123", "Full Name");
    });

    it("should use default 'user' when no displayName or full_name", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        user_metadata: {},
      };

      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);
      mockGetAllProfile.mockResolvedValue(null);

      const mockProfile = {
        userId: "user-123",
        displayName: "user",
        organization: null,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        isDeleted: false,
      };
      mockCreateProfile.mockResolvedValue(mockProfile);

      await handler(mockEvent);

      expect(mockCreateProfile).toHaveBeenCalledWith("user-123", "user");
    });

    it("should use default 'user' when user_metadata is undefined", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);
      mockGetAllProfile.mockResolvedValue(null);

      const mockProfile = {
        userId: "user-123",
        displayName: "user",
        organization: null,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        isDeleted: false,
      };
      mockCreateProfile.mockResolvedValue(mockProfile);

      await handler(mockEvent);

      expect(mockCreateProfile).toHaveBeenCalledWith("user-123", "user");
    });
  });

  describe("Profile Restoration", () => {
    it("should restore deleted profile", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      const mockProfile = {
        id: "profile-123",
        userId: "user-123",
        displayName: "Test User",
        organization: null,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        isDeleted: true,
      };
      mockGetAllProfile.mockResolvedValue(mockProfile);

      const result = await handler(mockEvent);

      expect(mockRestoreProfile).toHaveBeenCalledWith("user-123");
      expect(result).toEqual({
        success: false,
        profile: mockProfile,
        message: "Profile recovered successfully",
      });
    });

    it("should not call createProfile when restoring", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      const mockProfile = {
        id: "profile-123",
        userId: "user-123",
        displayName: "Test User",
        organization: null,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        isDeleted: true,
      };
      mockGetAllProfile.mockResolvedValue(mockProfile);

      await handler(mockEvent);

      expect(mockCreateProfile).not.toHaveBeenCalled();
    });
  });

  describe("Existing Profile", () => {
    it("should return undefined when profile exists and not deleted", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      const mockProfile = {
        id: "profile-123",
        userId: "user-123",
        displayName: "Test User",
        organization: "Test Org",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        isDeleted: false,
      };
      mockGetAllProfile.mockResolvedValue(mockProfile);

      const result = await handler(mockEvent);

      expect(result).toBeUndefined();
      expect(mockCreateProfile).not.toHaveBeenCalled();
      expect(mockRestoreProfile).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle getAllProfile errors", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);
      mockGetAllProfile.mockRejectedValue(new Error("Database error"));

      await expect(handler(mockEvent)).rejects.toThrow("Database error");
    });

    it("should use INTERNAL_ERROR as default statusCode", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);
      mockGetAllProfile.mockRejectedValue(new Error("Test error"));

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });
    });

    it("should use provided statusCode when available", async () => {
      mockGetHeader.mockReturnValue("Bearer valid-token");

      const errorWithStatusCode = new Error("Custom error") as Error & { statusCode: number };
      errorWithStatusCode.statusCode = 403;

      mockGetUser.mockRejectedValue(errorWithStatusCode);

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it("should handle createProfile errors", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        user_metadata: {
          displayName: "Test User",
        },
      };

      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);
      mockGetAllProfile.mockResolvedValue(null);
      mockCreateProfile.mockRejectedValue(new Error("Create failed"));

      await expect(handler(mockEvent)).rejects.toThrow("Create failed");
    });

    it("should use custom error message when not an Error instance", async () => {
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockRejectedValue("String error");

      await expect(handler(mockEvent)).rejects.toThrow("OAuth profile creation failed");
    });

    it("should handle error with message property but not Error instance", async () => {
      mockGetHeader.mockReturnValue("Bearer valid-token");

      const customError = {
        message: "Custom error message",
        statusCode: 500,
      };
      mockGetUser.mockRejectedValue(customError);

      await expect(handler(mockEvent)).rejects.toThrow("OAuth profile creation failed");
    });

    it("should use error statusCode when available from OAuthError", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      const errorWithStatus = new Error("Test error") as Error & { statusCode: number };
      errorWithStatus.statusCode = 422;
      mockGetAllProfile.mockRejectedValue(errorWithStatus);

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 422,
      });
    });

    it("should use INTERNAL_ERROR when error statusCode is 0", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      const errorWithZeroStatus = new Error("Test error") as Error & { statusCode: number };
      errorWithZeroStatus.statusCode = 0;
      mockGetAllProfile.mockRejectedValue(errorWithZeroStatus);

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });
    });
  });
});
