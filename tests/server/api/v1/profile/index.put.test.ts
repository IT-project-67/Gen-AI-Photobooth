import { describe, it, expect, beforeAll, beforeEach, jest } from "@jest/globals";
import {
  mockCreateError,
  mockDefineEventHandler,
  mockGetHeader,
  mockReadBody,
  mockHandleApiError,
  mockCreateAuthClient,
  mockCreateSuccessResponse,
  mockCreateErrorResponse,
  mockGetUser,
} from "~/tests/server/mocks/mocks";
import { ERROR_STATUS_MAP } from "~/server/types/core";

const mockUpdateProfile = jest.fn<() => Promise<unknown>>();

jest.mock("h3", () => ({
  defineEventHandler: mockDefineEventHandler,
  createError: mockCreateError,
  getHeader: mockGetHeader,
  readBody: mockReadBody,
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

jest.mock("~~/server/utils/core", () => ({
  createSuccessResponse: mockCreateSuccessResponse,
  createErrorResponse: mockCreateErrorResponse,
}));

jest.mock("~~/server/model", () => ({
  updateProfile: mockUpdateProfile,
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
  data: {
    error: {
      type?: string;
      code: string;
      message: string;
    };
  };
};

describe("API: PUT /api/v1/profile", () => {
  let handler: (event: unknown) => Promise<unknown>;
  let mockEvent: MockEvent;

  beforeAll(async () => {
    const module = await import("~/server/api/v1/profile/index.put");
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

    mockCreateSuccessResponse.mockImplementation((data, message) => ({
      success: true,
      data,
      message,
    }));

    mockCreateErrorResponse.mockImplementation((error) => ({
      success: false,
      error,
    }));

    mockCreateError.mockImplementation((options: ErrorOptions) => {
      const error = new Error(options.statusMessage) as Error & ErrorOptions;
      error.statusCode = options.statusCode;
      error.statusMessage = options.statusMessage;
      error.data = options.data;
      return error;
    });
  });

  describe("Authentication", () => {
    it("should reject request without authorization header", async () => {
      mockReadBody.mockResolvedValue({
        displayName: "Test User",
      });
      mockGetHeader.mockReturnValue(undefined);

      await expect(handler(mockEvent)).rejects.toThrow("Missing authorization header");

      expect(mockCreateError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
          statusMessage: "Missing authorization header",
        }),
      );
    });

    it("should reject request with malformed authorization header", async () => {
      mockReadBody.mockResolvedValue({
        displayName: "Test User",
      });
      mockGetHeader.mockReturnValue("InvalidHeader");

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should reject request without token", async () => {
      mockReadBody.mockResolvedValue({
        displayName: "Test User",
      });
      mockGetHeader.mockReturnValue("Bearer ");

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should call getHeader with correct parameters", async () => {
      mockReadBody.mockResolvedValue({
        displayName: "Test User",
      });
      mockGetHeader.mockReturnValue(undefined);

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockGetHeader).toHaveBeenCalledWith(mockEvent, "authorization");
    });

    it("should extract token correctly", async () => {
      mockReadBody.mockResolvedValue({
        displayName: "Test User",
      });
      mockGetHeader.mockReturnValue("Bearer my-token-123");

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockGetHeader).toHaveBeenCalledWith(mockEvent, "authorization");
    });

    it("should reject when getUser returns error", async () => {
      mockReadBody.mockResolvedValue({
        displayName: "Test User",
      });
      mockGetHeader.mockReturnValue("Bearer invalid-token");
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid token" },
      } as never);

      mockHandleApiError.mockReturnValue({
        type: "AUTH_ERROR",
        code: "AUTH_ERROR",
        message: "Invalid token",
        statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
      });

      await expect(handler(mockEvent)).rejects.toThrow("Invalid token");
    });

    it("should reject when user is null", async () => {
      mockReadBody.mockResolvedValue({
        displayName: "Test User",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);

      mockHandleApiError.mockReturnValue({
        type: "AUTH_ERROR",
        code: "AUTH_ERROR",
        message: "User not found",
        statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });
  });

  describe("Request Body Validation", () => {
    it("should reject when no fields provided", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      mockReadBody.mockResolvedValue({});
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      await expect(handler(mockEvent)).rejects.toThrow(
        "At least one field (displayName or organization) must be provided",
      );
    });

    it("should reject when displayName exceeds 100 characters", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      mockReadBody.mockResolvedValue({
        displayName: "a".repeat(101),
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      await expect(handler(mockEvent)).rejects.toThrow(
        "Display name must be less than 100 characters",
      );
    });

    it("should reject when organization exceeds 100 characters", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      mockReadBody.mockResolvedValue({
        organization: "o".repeat(101),
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      await expect(handler(mockEvent)).rejects.toThrow(
        "Organization must be less than 100 characters",
      );
    });

    it("should accept displayName with exactly 100 characters", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      const longName = "a".repeat(100);
      mockReadBody.mockResolvedValue({
        displayName: longName,
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      const mockProfile = {
        userId: "user-123",
        displayName: longName,
        organization: "Test Org",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        isDeleted: false,
      };
      mockUpdateProfile.mockResolvedValue(mockProfile);

      await handler(mockEvent);

      expect(mockUpdateProfile).toHaveBeenCalledWith("user-123", {
        displayName: longName,
      });
    });

    it("should accept organization with exactly 100 characters", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      const longOrg = "o".repeat(100);
      mockReadBody.mockResolvedValue({
        organization: longOrg,
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      const mockProfile = {
        userId: "user-123",
        displayName: "Test User",
        organization: longOrg,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        isDeleted: false,
      };
      mockUpdateProfile.mockResolvedValue(mockProfile);

      await handler(mockEvent);

      expect(mockUpdateProfile).toHaveBeenCalledWith("user-123", {
        organization: longOrg,
      });
    });

    it("should read request body", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      mockReadBody.mockResolvedValue({
        displayName: "Test User",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      const mockProfile = {
        userId: "user-123",
        displayName: "Test User",
        organization: "Test Org",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        isDeleted: false,
      };
      mockUpdateProfile.mockResolvedValue(mockProfile);

      await handler(mockEvent);

      expect(mockReadBody).toHaveBeenCalledWith(mockEvent);
    });

    it("should accept displayName field", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      mockReadBody.mockResolvedValue({
        displayName: "Updated Name",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      const mockProfile = {
        userId: "user-123",
        displayName: "Updated Name",
        organization: "Test Org",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        isDeleted: false,
      };
      mockUpdateProfile.mockResolvedValue(mockProfile);

      await handler(mockEvent);

      expect(mockUpdateProfile).toHaveBeenCalledWith("user-123", {
        displayName: "Updated Name",
      });
    });

    it("should accept organization field", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      mockReadBody.mockResolvedValue({
        organization: "New Org",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      const mockProfile = {
        userId: "user-123",
        displayName: "Test User",
        organization: "New Org",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        isDeleted: false,
      };
      mockUpdateProfile.mockResolvedValue(mockProfile);

      await handler(mockEvent);

      expect(mockUpdateProfile).toHaveBeenCalledWith("user-123", {
        organization: "New Org",
      });
    });

    it("should accept both displayName and organization", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      mockReadBody.mockResolvedValue({
        displayName: "Updated Name",
        organization: "New Org",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      const mockProfile = {
        userId: "user-123",
        displayName: "Updated Name",
        organization: "New Org",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        isDeleted: false,
      };
      mockUpdateProfile.mockResolvedValue(mockProfile);

      await handler(mockEvent);

      expect(mockUpdateProfile).toHaveBeenCalledWith("user-123", {
        displayName: "Updated Name",
        organization: "New Org",
      });
    });
  });

  describe("Profile Update", () => {
    it("should call updateProfile with user id and data", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      mockReadBody.mockResolvedValue({
        displayName: "Updated Name",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      const mockProfile = {
        userId: "user-123",
        displayName: "Updated Name",
        organization: "Test Org",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        isDeleted: false,
      };
      mockUpdateProfile.mockResolvedValue(mockProfile);

      await handler(mockEvent);

      expect(mockUpdateProfile).toHaveBeenCalledWith("user-123", {
        displayName: "Updated Name",
      });
    });

    it("should convert dates to ISO strings in response", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      mockReadBody.mockResolvedValue({
        displayName: "Test User",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      const mockProfile = {
        userId: "user-123",
        displayName: "Test User",
        organization: "Test Org",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        isDeleted: false,
      };
      mockUpdateProfile.mockResolvedValue(mockProfile);

      await handler(mockEvent);

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        }),
        expect.any(String),
      );
    });

    it("should return correct response structure", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      mockReadBody.mockResolvedValue({
        displayName: "Test User",
        organization: "Test Org",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      const mockProfile = {
        userId: "user-123",
        displayName: "Test User",
        organization: "Test Org",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        isDeleted: false,
      };
      mockUpdateProfile.mockResolvedValue(mockProfile);

      const result = await handler(mockEvent);

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        {
          userId: "user-123",
          displayName: "Test User",
          organization: "Test Org",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          isDeleted: false,
        },
        "Profile updated successfully",
      );
      expect(result).toEqual({
        success: true,
        data: {
          userId: "user-123",
          displayName: "Test User",
          organization: "Test Org",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          isDeleted: false,
        },
        message: "Profile updated successfully",
      });
    });

    it("should handle undefined organization", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      mockReadBody.mockResolvedValue({
        displayName: "Test User",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      const mockProfile = {
        userId: "user-123",
        displayName: "Test User",
        organization: "Test Org",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        isDeleted: false,
      };
      mockUpdateProfile.mockResolvedValue(mockProfile);

      await handler(mockEvent);

      expect(mockUpdateProfile).toHaveBeenCalledWith("user-123", {
        displayName: "Test User",
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle updateProfile errors", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      mockReadBody.mockResolvedValue({
        displayName: "Test User",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);
      mockUpdateProfile.mockRejectedValue(new Error("Database error"));

      mockHandleApiError.mockReturnValue({
        type: "INTERNAL_ERROR",
        code: "INTERNAL_ERROR",
        message: "Database error",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      await expect(handler(mockEvent)).rejects.toThrow("Database error");
    });

    it("should use INTERNAL_ERROR as default statusCode", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      mockReadBody.mockResolvedValue({
        displayName: "Test User",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);
      mockUpdateProfile.mockRejectedValue(new Error("Test error"));

      mockHandleApiError.mockReturnValue({
        type: "ERROR",
        code: "ERROR",
        message: "Test error",
      } as never);

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });
    });

    it("should call createErrorResponse for errors", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      mockReadBody.mockResolvedValue({
        displayName: "Test User",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);
      mockUpdateProfile.mockRejectedValue(new Error("Test error"));

      mockHandleApiError.mockReturnValue({
        type: "ERROR",
        code: "ERROR",
        message: "Test error",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      await expect(handler(mockEvent)).rejects.toThrow();
      expect(mockCreateErrorResponse).toHaveBeenCalled();
    });

    it("should handle getUser errors", async () => {
      mockReadBody.mockResolvedValue({
        displayName: "Test User",
      });
      mockGetHeader.mockReturnValue("Bearer invalid-token");
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid token" },
      } as never);

      mockHandleApiError.mockReturnValue({
        type: "AUTH_ERROR",
        code: "AUTH_ERROR",
        message: "Invalid token",
        statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
      });

      await expect(handler(mockEvent)).rejects.toThrow("Invalid token");
    });

    it("should use provided statusCode when available", async () => {
      mockReadBody.mockResolvedValue({
        displayName: "Test User",
      });
      mockGetHeader.mockReturnValue("Bearer invalid-token");
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Unauthorized" },
      } as never);

      mockHandleApiError.mockReturnValue({
        type: "AUTH_ERROR",
        code: "AUTH_ERROR",
        message: "Unauthorized",
        statusCode: 403,
      });

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it("should default to INTERNAL_ERROR statusCode when not provided in catch block", async () => {
      mockReadBody.mockResolvedValue({
        displayName: "Test User",
      });
      mockGetHeader.mockReturnValue("Bearer token");
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Error" },
      } as never);

      mockHandleApiError.mockReturnValue({
        type: "AUTH_ERROR",
        code: "AUTH_ERROR",
        message: "Error",
      } as never);

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });
    });
  });
});
