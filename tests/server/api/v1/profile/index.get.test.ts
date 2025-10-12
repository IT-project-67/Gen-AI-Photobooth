import { describe, it, expect, beforeAll, beforeEach, jest } from "@jest/globals";
import {
  mockCreateError,
  mockDefineEventHandler,
  mockGetHeader,
  mockHandleApiError,
  mockCreateAuthClient,
  mockCreateSuccessResponse,
  mockCreateErrorResponse,
  mockGetValidProfile,
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
  getValidProfile: mockGetValidProfile,
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

describe("API: GET /api/v1/profile", () => {
  let handler: (event: unknown) => Promise<unknown>;
  let mockEvent: MockEvent;

  beforeAll(async () => {
    const module = await import("~/server/api/v1/profile/index.get");
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
      mockGetHeader.mockReturnValue("InvalidHeader");

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should reject request without token", async () => {
      mockGetHeader.mockReturnValue("Bearer ");

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should call getHeader with correct parameters", async () => {
      mockGetHeader.mockReturnValue(undefined);

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockGetHeader).toHaveBeenCalledWith(mockEvent, "authorization");
    });

    it("should extract token correctly", async () => {
      mockGetHeader.mockReturnValue("Bearer my-token-123");

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockGetHeader).toHaveBeenCalledWith(mockEvent, "authorization");
    });
  });

  describe("Error Response Structure", () => {
    it("should include error type in response", async () => {
      mockGetHeader.mockReturnValue(undefined);

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockCreateError).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            error: expect.objectContaining({
              type: "AUTH_ERROR",
              code: "AUTH_ERROR",
            }),
          }),
        }),
      );
    });

    it("should use correct status code for auth errors", async () => {
      mockGetHeader.mockReturnValue(undefined);

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockCreateError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
        }),
      );
    });
  });

  describe("Profile Retrieval", () => {
    const createMockProfile = () => ({
      id: "profile-123",
      userId: "user-123",
      displayName: "Test User",
      organization: "Test Org",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
      isDeleted: false,
    });

    const createMockUser = () => ({
      id: "user-123",
      email: "test@example.com",
      email_confirmed_at: "2024-01-01T00:00:00Z",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    });

    it("should fetch existing profile successfully", async () => {
      const mockProfile = createMockProfile();
      const mockUser = createMockUser();

      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);
      mockGetValidProfile.mockResolvedValue(mockProfile);

      const result = await handler(mockEvent);

      expect(mockGetValidProfile).toHaveBeenCalledWith("user-123");
      expect(result).toBeDefined();
    });

    it("should reject when profile not found", async () => {
      const mockUser = createMockUser();

      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);
      mockGetValidProfile.mockResolvedValue(null);

      await expect(handler(mockEvent)).rejects.toThrow("User profile not found");

      expect(mockGetValidProfile).toHaveBeenCalledWith("user-123");
    });

    it("should handle profile with null organization", async () => {
      const mockProfile = {
        ...createMockProfile(),
        organization: null,
      };
      const mockUser = createMockUser();

      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);
      mockGetValidProfile.mockResolvedValue(mockProfile);

      await handler(mockEvent);

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          organization: null,
        }),
        expect.any(String),
      );
    });

    it("should convert dates to ISO strings", async () => {
      const mockProfile = createMockProfile();
      const mockUser = createMockUser();

      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);
      mockGetValidProfile.mockResolvedValue(mockProfile);

      await handler(mockEvent);

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
        expect.any(String),
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle getUser errors", async () => {
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

    it("should handle null user", async () => {
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
      mockGetValidProfile.mockRejectedValue(new Error("Database error"));

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

      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);
      mockGetValidProfile.mockRejectedValue(new Error("Test error"));

      mockHandleApiError.mockReturnValue({
        type: "ERROR",
        code: "ERROR",
        message: "Test error",
      } as never);

      try {
        await handler(mockEvent);
      } catch (error) {
        expect((error as ErrorOptions).statusCode).toBe(ERROR_STATUS_MAP.INTERNAL_ERROR);
      }
    });
  });
});
