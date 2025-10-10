import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { ERROR_STATUS_MAP } from "~~/server/types/core";
import type { UserData } from "~~/server/types/domain";

type SupabaseUserResponse = {
  data: {
    user: {
      id: string;
      email: string | null | undefined;
      email_confirmed_at: string | null | undefined;
      created_at: string | null | undefined;
      updated_at: string | null | undefined;
    } | null;
  };
  error:
    | {
        error_code?: string;
        message?: string;
      }
    | null
    | undefined;
};

type MockEvent = {
  headers?: Record<string, string>;
  context: Record<string, unknown>;
};

type ErrorResponse = {
  statusCode: number;
  statusMessage: string;
};

type AuthErrorResult = {
  code: string;
  message: string;
  statusCode: number;
};

const mockGetUser = jest.fn<() => Promise<SupabaseUserResponse>>();
const mockGetHeader = jest.fn<(event: MockEvent, name: string) => string | undefined>();
const mockCreateError =
  jest.fn<(opts: { statusCode: number; statusMessage: string }) => ErrorResponse>();
const mockHandleAuthError = jest.fn<(error: unknown) => AuthErrorResult>();

jest.mock("~~/server/clients/supabase.client", () => ({
  createAuthClient: jest.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

jest.mock("~/server/utils/auth/error-handler.utils", () => ({
  handleAuthError: mockHandleAuthError,
}));

jest.mock("h3", () => ({
  getHeader: mockGetHeader,
  createError: mockCreateError,
}));

let requireAuth: (event: unknown) => Promise<UserData>;
let optionalAuth: (event: unknown) => Promise<UserData | null>;

beforeAll(async () => {
  const module = await import("~/server/utils/auth/auth-guard.utils");
  requireAuth = module.requireAuth as (event: unknown) => Promise<UserData>;
  optionalAuth = module.optionalAuth as (event: unknown) => Promise<UserData | null>;
});

const makeEvent = (authHeader?: string): MockEvent => ({
  headers: authHeader ? { authorization: authHeader } : {},
  context: {},
});

describe("Auth Guard Utils", () => {
  describe("requireAuth", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe("authorization header validation", () => {
      it("should throw 401 when authorization header is missing", async () => {
        mockGetHeader.mockImplementation((event: MockEvent, name: string) => event.headers?.[name]);
        mockCreateError.mockImplementation(
          (opts: { statusCode: number; statusMessage: string }) => opts,
        );

        const ev = makeEvent();
        await expect(requireAuth(ev)).rejects.toMatchObject({
          statusCode: 401,
          statusMessage: "Missing or invalid authorization header",
        });

        expect(mockCreateError).toHaveBeenCalledWith({
          statusCode: 401,
          statusMessage: "Missing or invalid authorization header",
        });
        expect(mockGetUser).not.toHaveBeenCalled();
      });

      it("should throw 401 when authorization header does not start with Bearer", async () => {
        mockGetHeader.mockImplementation((event: MockEvent, name: string) => event.headers?.[name]);
        mockCreateError.mockImplementation(
          (opts: { statusCode: number; statusMessage: string }) => opts,
        );

        const ev = makeEvent("Token abc");
        await expect(requireAuth(ev)).rejects.toMatchObject({
          statusCode: 401,
          statusMessage: "Missing or invalid authorization header",
        });
      });
    });

    describe("successful authentication", () => {
      it("should return user data and set it in event context", async () => {
        mockGetHeader.mockImplementation((event: MockEvent, name: string) => event.headers?.[name]);

        const now = new Date().toISOString();
        mockGetUser.mockResolvedValue({
          data: {
            user: {
              id: "uid_1",
              email: "a@b.com",
              email_confirmed_at: now,
              created_at: now,
              updated_at: now,
            },
          },
          error: null,
        });

        const ev = makeEvent("Bearer token123");
        const user = await requireAuth(ev);

        expect(mockGetUser).toHaveBeenCalledWith("token123");
        expect(user).toEqual({
          id: "uid_1",
          email: "a@b.com",
          email_confirmed_at: now,
          created_at: now,
          updated_at: now,
        });
        expect(ev.context.user).toEqual(user);
      });
    });

    describe("supabase error handling", () => {
      it("should throw error using handleAuthError when Supabase returns error", async () => {
        mockGetHeader.mockImplementation((event: MockEvent, name: string) => event.headers?.[name]);
        mockCreateError.mockImplementation(
          (opts: { statusCode: number; statusMessage: string }) => opts,
        );

        const supaErr = { error_code: "invalid_credentials", message: "bad" };
        mockGetUser.mockResolvedValue({
          data: { user: null },
          error: supaErr,
        });

        mockHandleAuthError.mockReturnValue({
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
          statusCode: ERROR_STATUS_MAP.INVALID_CREDENTIALS,
        });

        const ev = makeEvent("Bearer tok");
        await expect(requireAuth(ev)).rejects.toMatchObject({
          statusCode: ERROR_STATUS_MAP.INVALID_CREDENTIALS,
          statusMessage: "Invalid email or password",
        });

        expect(mockHandleAuthError).toHaveBeenCalledWith(supaErr);
      });

      it("should handle null user with undefined error using default mapping", async () => {
        mockGetHeader.mockImplementation((event: MockEvent, name: string) => event.headers?.[name]);
        mockCreateError.mockImplementation(
          (opts: { statusCode: number; statusMessage: string }) => opts,
        );

        mockGetUser.mockResolvedValue({
          data: { user: null },
          error: undefined,
        });

        mockHandleAuthError.mockReturnValue({
          code: "UNKNOWN_ERROR",
          message: "An authentication error occurred",
          statusCode: 400,
        });

        const ev = makeEvent("Bearer t");
        await expect(requireAuth(ev)).rejects.toMatchObject({
          statusCode: 400,
          statusMessage: "An authentication error occurred",
        });
      });

      it("should use default 401 status code when authError statusCode is falsy", async () => {
        mockGetHeader.mockImplementation((event: MockEvent, name: string) => event.headers?.[name]);
        mockCreateError.mockImplementation(
          (opts: { statusCode: number; statusMessage: string }) => opts,
        );

        mockGetUser.mockResolvedValue({
          data: { user: null },
          error: { error_code: "some_error" },
        });

        mockHandleAuthError.mockReturnValue({
          code: "SOME_ERROR",
          message: "Some error occurred",
          statusCode: 0,
        });

        const ev = makeEvent("Bearer tok");
        await expect(requireAuth(ev)).rejects.toMatchObject({
          statusCode: 401,
          statusMessage: "Some error occurred",
        });
      });
    });

    describe("exception handling", () => {
      it("should re-throw H3Error when thrown internally", async () => {
        mockGetHeader.mockImplementation((event: MockEvent, name: string) => event.headers?.[name]);

        const h3err = { statusCode: 403, statusMessage: "Forbidden" };
        mockGetUser.mockImplementation(() => {
          throw h3err;
        });

        const ev = makeEvent("Bearer x");
        await expect(requireAuth(ev)).rejects.toBe(h3err);
      });

      it("should throw generic auth error for non-H3Error exceptions", async () => {
        mockGetHeader.mockImplementation((event: MockEvent, name: string) => event.headers?.[name]);
        mockCreateError.mockImplementation(
          (opts: { statusCode: number; statusMessage: string }) => opts,
        );

        mockGetUser.mockImplementation(() => {
          throw new Error("network down");
        });

        const ev = makeEvent("Bearer x");
        await expect(requireAuth(ev)).rejects.toMatchObject({
          statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
          statusMessage: "Invalid or expired token",
        });

        expect(mockCreateError).toHaveBeenCalledWith({
          statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
          statusMessage: "Invalid or expired token",
        });
      });
    });

    describe("user data field handling", () => {
      it("should use empty string when user email is null", async () => {
        mockGetHeader.mockImplementation((event: MockEvent, name: string) => event.headers?.[name]);

        const now = new Date().toISOString();
        mockGetUser.mockResolvedValue({
          data: {
            user: {
              id: "uid_2",
              email: null,
              email_confirmed_at: now,
              created_at: now,
              updated_at: now,
            },
          },
          error: null,
        });

        const ev = makeEvent("Bearer token456");
        const user = await requireAuth(ev);

        expect(user.email).toBe("");
        expect(user.id).toBe("uid_2");
      });

      it("should use current time when created_at and updated_at are null", async () => {
        mockGetHeader.mockImplementation((event: MockEvent, name: string) => event.headers?.[name]);

        const confirmedAt = new Date().toISOString();
        mockGetUser.mockResolvedValue({
          data: {
            user: {
              id: "uid_3",
              email: "test@example.com",
              email_confirmed_at: confirmedAt,
              created_at: null,
              updated_at: null,
            },
          },
          error: null,
        });

        const ev = makeEvent("Bearer token789");
        const user = await requireAuth(ev);

        expect(user.id).toBe("uid_3");
        expect(user.email).toBe("test@example.com");
        expect(user.created_at).toBeTruthy();
        expect(user.updated_at).toBeTruthy();
        expect(new Date(user.created_at).toISOString()).toBe(user.created_at);
        expect(new Date(user.updated_at).toISOString()).toBe(user.updated_at);
      });

      it("should handle all optional fields as null or undefined", async () => {
        mockGetHeader.mockImplementation((event: MockEvent, name: string) => event.headers?.[name]);

        mockGetUser.mockResolvedValue({
          data: {
            user: {
              id: "uid_4",
              email: undefined,
              email_confirmed_at: undefined,
              created_at: undefined,
              updated_at: undefined,
            },
          },
          error: null,
        });

        const ev = makeEvent("Bearer token999");
        const user = await requireAuth(ev);

        expect(user.id).toBe("uid_4");
        expect(user.email).toBe("");
        expect(user.email_confirmed_at).toBeNull();
        expect(user.created_at).toBeTruthy();
        expect(user.updated_at).toBeTruthy();
      });
    });
  });

  describe("optionalAuth", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockGetHeader.mockImplementation((event: MockEvent, name: string) => event.headers?.[name]);
    });

    it("should return user when authentication succeeds", async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "u",
            email: "u@a.com",
            email_confirmed_at: null,
            created_at: "2024-01-01T00:00:00.000Z",
            updated_at: "2024-01-01T00:00:00.000Z",
          },
        },
        error: null,
      });

      const ev = makeEvent("Bearer ok");
      const res = await optionalAuth(ev);
      expect(res?.id).toBe("u");
      expect(ev.context.user).toBeTruthy();
    });

    it("should return null when authentication fails", async () => {
      mockGetHeader.mockImplementation((event: MockEvent, name: string) => event.headers?.[name]);
      mockCreateError.mockImplementation(
        (opts: { statusCode: number; statusMessage: string }) => opts,
      );

      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { error_code: "invalid_credentials" },
      });

      mockHandleAuthError.mockReturnValue({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
        statusCode: ERROR_STATUS_MAP.INVALID_CREDENTIALS,
      });

      const ev = makeEvent("Bearer bad");
      const res = await optionalAuth(ev);
      expect(res).toBeNull();
    });
  });
});
