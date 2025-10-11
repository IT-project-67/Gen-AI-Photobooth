import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from "@jest/globals";
import {
  mockCreateError,
  mockDefineEventHandler,
  mockGetHeader,
  mockHandleApiError,
  mockCreateAuthClient,
  mockCreateSuccessResponse,
  mockCreateErrorResponse,
  mockSoftDeleteProfile,
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
  softDeleteProfile: mockSoftDeleteProfile,
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

describe("API: DELETE /api/v1/profile", () => {
  let handler: (event: unknown) => Promise<unknown>;
  let mockEvent: MockEvent;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeAll(async () => {
    const module = await import("~/server/api/v1/profile/index.delete");
    handler = module.default as (event: unknown) => Promise<unknown>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

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

  afterEach(() => {
    consoleErrorSpy.mockRestore();
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

      await expect(handler(mockEvent)).rejects.toThrow("Missing authorization header");
    });

    it("should reject request without token", async () => {
      mockGetHeader.mockReturnValue("Bearer ");

      await expect(handler(mockEvent)).rejects.toThrow("Missing authorization header");
    });

    it("should reject request with only Bearer keyword", async () => {
      mockGetHeader.mockReturnValue("Bearer");

      await expect(handler(mockEvent)).rejects.toThrow("Missing authorization header");
    });

    it("should call getHeader with correct parameters", async () => {
      mockGetHeader.mockReturnValue(undefined);

      try {
        await handler(mockEvent);
      } catch {
        // error throwed
      }

      expect(mockGetHeader).toHaveBeenCalledWith(mockEvent, "authorization");
    });

    it("should extract token from Bearer header correctly", async () => {
      mockGetHeader.mockReturnValue("Bearer abc123");

      try {
        await handler(mockEvent);
      } catch {
        // error throwed
      }

      expect(mockGetHeader).toHaveBeenCalledWith(mockEvent, "authorization");
    });

    it("should handle authorization header case sensitively", async () => {
      mockGetHeader.mockReturnValue("bearer token");

      await expect(handler(mockEvent)).rejects.toThrow();
    });
  });

  describe("Error Response Structure", () => {
    it("should include error type in response", async () => {
      mockGetHeader.mockReturnValue(undefined);

      try {
        await handler(mockEvent);
      } catch {
        // error throwed
      }

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
      mockGetHeader.mockReturnValue("Bearer ");

      try {
        await handler(mockEvent);
      } catch {
        // error throwed
      }

      expect(mockCreateError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
        }),
      );
    });
  });

  describe("Error Handling", () => {
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
      mockSoftDeleteProfile.mockRejectedValue(new Error("Test error"));

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

    it("should handle null user with no error", async () => {
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
});
