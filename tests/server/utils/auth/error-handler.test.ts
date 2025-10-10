import { describe, expect, it } from "@jest/globals";
import { handleAuthError, handleApiError } from "~/server/utils/auth/error-handler.utils";
import type { Errors, SupabaseAuthError } from "~~/server/types/core";
import { ERROR_STATUS_MAP, STATUS_CODES } from "~~/server/types/core";

describe("Error Handler Utils", () => {
  describe("handleAuthError", () => {
    describe("specific Supabase error codes", () => {
      type Case = {
        name: string;
        input: SupabaseAuthError;
        expected: Errors;
      };

      const cases: Case[] = [
        {
          name: "invalid_credentials",
          input: {
            error_code: "invalid_credentials",
            message: "Invalid login credentials",
          },
          expected: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
            statusCode: ERROR_STATUS_MAP.INVALID_CREDENTIALS,
          },
        },
        {
          name: "email_not_confirmed",
          input: {
            error_code: "email_not_confirmed",
            message: "Email not confirmed",
          },
          expected: {
            code: "EMAIL_NOT_CONFIRMED",
            message: "Please confirm your email address",
            statusCode: ERROR_STATUS_MAP.EMAIL_NOT_CONFIRMED,
          },
        },
        {
          name: "signup_disabled",
          input: {
            error_code: "signup_disabled",
            message: "Signup is disabled",
          },
          expected: {
            code: "SIGNUP_DISABLED",
            message: "Sign up is currently disabled",
            statusCode: ERROR_STATUS_MAP.SIGNUP_DISABLED,
          },
        },
        {
          name: "email_address_invalid",
          input: {
            error_code: "email_address_invalid",
            message: "Invalid email",
          },
          expected: {
            code: "EMAIL_INVALID",
            message: "Please provide a valid email address",
            statusCode: ERROR_STATUS_MAP.EMAIL_INVALID,
          },
        },
        {
          name: "password_too_short",
          input: {
            error_code: "password_too_short",
            message: "Password is too short",
          },
          expected: {
            code: "PASSWORD_TOO_SHORT",
            message: "Password must be at least 6 characters long",
            statusCode: ERROR_STATUS_MAP.PASSWORD_TOO_SHORT,
          },
        },
        {
          name: "user_already_registered",
          input: {
            error_code: "user_already_registered",
            message: "User already exists",
          },
          expected: {
            code: "USER_ALREADY_EXISTS",
            message: "This email is already registered. Please try logging in instead.",
            statusCode: ERROR_STATUS_MAP.USER_ALREADY_EXISTS,
          },
        },
        {
          name: "email_address_already_registered",
          input: {
            error_code: "email_address_already_registered",
            message: "Email already registered",
          },
          expected: {
            code: "USER_ALREADY_EXISTS",
            message: "This email is already registered. Please try logging in instead.",
            statusCode: ERROR_STATUS_MAP.USER_ALREADY_EXISTS,
          },
        },
        {
          name: "invalid_token",
          input: {
            error_code: "invalid_token",
            message: "Invalid token",
          },
          expected: {
            code: "INVALID_RESET_TOKEN",
            message: "Invalid or expired reset token. Please request a new password reset.",
            statusCode: ERROR_STATUS_MAP.INVALID_RESET_TOKEN,
          },
        },
        {
          name: "token_expired",
          input: {
            error_code: "token_expired",
            message: "Token has expired",
          },
          expected: {
            code: "INVALID_RESET_TOKEN",
            message: "Invalid or expired reset token. Please request a new password reset.",
            statusCode: ERROR_STATUS_MAP.INVALID_RESET_TOKEN,
          },
        },
        {
          name: "email_not_found",
          input: {
            error_code: "email_not_found",
            message: "Email not found",
          },
          expected: {
            code: "EMAIL_NOT_FOUND",
            message: "No account found with this email address.",
            statusCode: ERROR_STATUS_MAP.EMAIL_NOT_FOUND,
          },
        },
      ];

      cases.forEach((testCase) => {
        it(`should handle ${testCase.name} error`, () => {
          const result = handleAuthError(testCase.input);
          expect(result).toEqual(testCase.expected);
        });
      });
    });

    describe("error code priority", () => {
      it("should prioritize error_code over code when both exist", () => {
        const input: SupabaseAuthError = {
          error_code: "invalid_credentials",
          code: "email_not_found",
          message: "Test message",
        };
        const result = handleAuthError(input);
        expect(result.code).toBe("INVALID_CREDENTIALS");
        expect(result.message).toBe("Invalid email or password");
      });

      it("should use code when error_code is not present", () => {
        const input: SupabaseAuthError = {
          code: "invalid_credentials",
          message: "Test message",
        };
        const result = handleAuthError(input);
        expect(result.code).toBe("INVALID_CREDENTIALS");
      });
    });

    describe("default/unknown error codes", () => {
      type Case = {
        name: string;
        input: SupabaseAuthError | unknown;
        expectedCode: string;
        expectedMessage: string;
      };

      const cases: Case[] = [
        {
          name: "unknown error code",
          input: {
            error_code: "some_unknown_error",
            message: "Something went wrong",
          },
          expectedCode: "some_unknown_error",
          expectedMessage: "Something went wrong",
        },
        {
          name: "empty object",
          input: {},
          expectedCode: "UNKNOWN_ERROR",
          expectedMessage: "An authentication error occurred",
        },
        {
          name: "only message provided",
          input: {
            message: "Custom error message",
          },
          expectedCode: "UNKNOWN_ERROR",
          expectedMessage: "Custom error message",
        },
        {
          name: "only code provided",
          input: {
            code: "CUSTOM_CODE",
          },
          expectedCode: "CUSTOM_CODE",
          expectedMessage: "An authentication error occurred",
        },
      ];

      cases.forEach((testCase) => {
        it(`should handle ${testCase.name}`, () => {
          const result = handleAuthError(testCase.input);
          expect(result.code).toBe(testCase.expectedCode);
          expect(result.message).toBe(testCase.expectedMessage);
          expect(result.statusCode).toBe(STATUS_CODES.BAD_REQUEST);
        });
      });
    });

    describe("edge cases", () => {
      it("should handle null input", () => {
        const result = handleAuthError(null);
        expect(result.code).toBe("UNKNOWN_ERROR");
        expect(result.message).toBe("An authentication error occurred");
        expect(result.statusCode).toBe(STATUS_CODES.BAD_REQUEST);
      });

      it("should handle undefined input", () => {
        const result = handleAuthError(undefined);
        expect(result.code).toBe("UNKNOWN_ERROR");
        expect(result.message).toBe("An authentication error occurred");
        expect(result.statusCode).toBe(STATUS_CODES.BAD_REQUEST);
      });

      it("should handle string input", () => {
        const result = handleAuthError("error string");
        expect(result.code).toBe("UNKNOWN_ERROR");
        expect(result.message).toBe("An authentication error occurred");
        expect(result.statusCode).toBe(STATUS_CODES.BAD_REQUEST);
      });

      it("should handle number input", () => {
        const result = handleAuthError(123);
        expect(result.code).toBe("UNKNOWN_ERROR");
        expect(result.message).toBe("An authentication error occurred");
        expect(result.statusCode).toBe(STATUS_CODES.BAD_REQUEST);
      });

      it("should handle boolean input", () => {
        const result = handleAuthError(true);
        expect(result.code).toBe("UNKNOWN_ERROR");
        expect(result.message).toBe("An authentication error occurred");
        expect(result.statusCode).toBe(STATUS_CODES.BAD_REQUEST);
      });
    });

    describe("message preservation", () => {
      it("should preserve original message for unknown error codes", () => {
        const customMessage = "This is a very specific error message";
        const input: SupabaseAuthError = {
          error_code: "unknown_custom_error",
          message: customMessage,
        };
        const result = handleAuthError(input);
        expect(result.message).toBe(customMessage);
      });

      it("should override message for known error codes", () => {
        const input: SupabaseAuthError = {
          error_code: "invalid_credentials",
          message: "Original supabase message",
        };
        const result = handleAuthError(input);
        expect(result.message).toBe("Invalid email or password");
        expect(result.message).not.toBe("Original supabase message");
      });
    });
  });

  describe("handleApiError", () => {
    describe("createError objects", () => {
      type Case = {
        name: string;
        input: unknown;
        expected: Errors;
      };

      const cases: Case[] = [
        {
          name: "complete createError object",
          input: {
            data: {
              error: {
                code: "VALIDATION_ERROR",
                message: "Validation failed",
                statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
              },
            },
          },
          expected: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          },
        },
        {
          name: "createError with missing code",
          input: {
            data: {
              error: {
                message: "Error occurred",
                statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
              },
            },
          },
          expected: {
            code: "INTERNAL_ERROR",
            message: "Error occurred",
            statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
          },
        },
        {
          name: "createError with missing message",
          input: {
            data: {
              error: {
                code: "AUTH_ERROR",
                statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
              },
            },
          },
          expected: {
            code: "AUTH_ERROR",
            message: "An unexpected error occurred",
            statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
          },
        },
        {
          name: "createError with missing statusCode",
          input: {
            data: {
              error: {
                code: "CUSTOM_ERROR",
                message: "Custom message",
              },
            },
          },
          expected: {
            code: "CUSTOM_ERROR",
            message: "Custom message",
            statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
          },
        },
        {
          name: "createError with all fields missing",
          input: {
            data: {
              error: {},
            },
          },
          expected: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred",
            statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
          },
        },
      ];

      cases.forEach((testCase) => {
        it(`should handle ${testCase.name}`, () => {
          const result = handleApiError(testCase.input);
          expect(result).toEqual(testCase.expected);
        });
      });
    });

    describe("createError object structure variations", () => {
      it("should handle createError with null error", () => {
        const input = {
          data: {
            error: null,
          },
        };
        const result = handleApiError(input);
        expect(result.code).toBe("INTERNAL_ERROR");
        expect(result.message).toBe("An unexpected error occurred");
      });

      it("should handle createError with undefined error", () => {
        const input = {
          data: {
            error: undefined,
          },
        };
        const result = handleApiError(input);
        expect(result.code).toBe("INTERNAL_ERROR");
        expect(result.message).toBe("An unexpected error occurred");
      });

      it("should handle createError without error field", () => {
        const input = {
          data: {
            someOtherField: "value",
          },
        };
        const result = handleApiError(input);
        expect(result.code).toBe("INTERNAL_ERROR");
        expect(result.message).toBe("An unexpected error occurred");
      });

      it("should handle object with data but data is null", () => {
        const input = {
          data: null,
        };
        const result = handleApiError(input);
        expect(result.code).toBe("INTERNAL_ERROR");
        expect(result.message).toBe("An unexpected error occurred");
      });

      it("should handle object with data but data is not an object", () => {
        const input = {
          data: "string value",
        };
        const result = handleApiError(input);
        expect(result.code).toBe("INTERNAL_ERROR");
        expect(result.message).toBe("An unexpected error occurred");
      });
    });

    describe("generic error objects", () => {
      type Case = {
        name: string;
        input: unknown;
        expected: Errors;
      };

      const cases: Case[] = [
        {
          name: "complete generic error",
          input: {
            code: "NOT_FOUND",
            message: "Resource not found",
            statusCode: ERROR_STATUS_MAP.NOT_FOUND,
          },
          expected: {
            code: "NOT_FOUND",
            message: "Resource not found",
            statusCode: ERROR_STATUS_MAP.NOT_FOUND,
          },
        },
        {
          name: "generic error with only code",
          input: {
            code: "CUSTOM_CODE",
          },
          expected: {
            code: "CUSTOM_CODE",
            message: "An unexpected error occurred",
            statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
          },
        },
        {
          name: "generic error with code and message",
          input: {
            code: "FORBIDDEN",
            message: "Access denied",
          },
          expected: {
            code: "FORBIDDEN",
            message: "Access denied",
            statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
          },
        },
        {
          name: "generic error with code and statusCode",
          input: {
            code: "BAD_REQUEST",
            statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
          },
          expected: {
            code: "BAD_REQUEST",
            message: "An unexpected error occurred",
            statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
          },
        },
        {
          name: "object without code field",
          input: {
            message: "Error message",
            statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
          },
          expected: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred",
            statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
          },
        },
      ];

      cases.forEach((testCase) => {
        it(`should handle ${testCase.name}`, () => {
          const result = handleApiError(testCase.input);
          expect(result).toEqual(testCase.expected);
        });
      });
    });

    describe("edge cases", () => {
      type Case = {
        name: string;
        input: unknown;
      };

      const cases: Case[] = [
        { name: "null", input: null },
        { name: "undefined", input: undefined },
        { name: "empty string", input: "" },
        { name: "non-empty string", input: "error string" },
        { name: "number", input: ERROR_STATUS_MAP.INTERNAL_ERROR },
        { name: "boolean true", input: true },
        { name: "boolean false", input: false },
        { name: "empty array", input: [] },
        { name: "array with values", input: ["error1", "error2"] },
        { name: "empty object", input: {} },
      ];

      cases.forEach((testCase) => {
        it(`should handle ${testCase.name} input`, () => {
          const result = handleApiError(testCase.input);
          expect(result.code).toBe("INTERNAL_ERROR");
          expect(result.message).toBe("An unexpected error occurred");
          expect(result.statusCode).toBe(ERROR_STATUS_MAP.INTERNAL_ERROR);
        });
      });
    });

    describe("type guard behavior", () => {
      it("should correctly identify createError object with nested structure", () => {
        const input = {
          data: {
            error: {
              code: "TEST_ERROR",
              message: "Test message",
              statusCode: 418,
            },
          },
        };
        const result = handleApiError(input);
        expect(result.code).toBe("TEST_ERROR");
        expect(result.message).toBe("Test message");
        expect(result.statusCode).toBe(418);
      });

      it("should fallback to generic error when data exists but error is missing", () => {
        const input = {
          data: {
            someField: "value",
          },
          code: "FALLBACK_CODE",
          message: "Fallback message",
        };
        const result = handleApiError(input);
        expect(result.code).toBe("FALLBACK_CODE");
        expect(result.message).toBe("Fallback message");
      });

      it("should not treat objects with data property but wrong structure as createError", () => {
        const input = {
          data: "not an object",
          code: "GENERIC_CODE",
        };
        const result = handleApiError(input);
        expect(result.code).toBe("GENERIC_CODE");
      });
    });

    describe("real-world error scenarios", () => {
      it("should handle H3 error-like object", () => {
        const input = {
          statusCode: ERROR_STATUS_MAP.NOT_FOUND,
          statusMessage: "Not Found",
          data: {
            error: {
              code: "RESOURCE_NOT_FOUND",
              message: "The requested resource was not found",
              statusCode: ERROR_STATUS_MAP.NOT_FOUND,
            },
          },
        };
        const result = handleApiError(input);
        expect(result.code).toBe("RESOURCE_NOT_FOUND");
        expect(result.message).toBe("The requested resource was not found");
        expect(result.statusCode).toBe(ERROR_STATUS_MAP.NOT_FOUND);
      });

      it("should handle Error instance", () => {
        const error = new Error("Something went wrong");
        const input = {
          code: "ERROR_INSTANCE",
          message: error.message,
          statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
        };
        const result = handleApiError(input);
        expect(result.code).toBe("ERROR_INSTANCE");
        expect(result.message).toBe("Something went wrong");
      });

      it("should handle mixed error types with extra fields", () => {
        const input = {
          code: "MIXED_ERROR",
          message: "Mixed error type",
          statusCode: ERROR_STATUS_MAP.UNPROCESSABLE_ENTITY,
          stack: "Error stack trace...",
          details: { field: "email", reason: "invalid" },
        };
        const result = handleApiError(input);
        expect(result.code).toBe("MIXED_ERROR");
        expect(result.message).toBe("Mixed error type");
        expect(result.statusCode).toBe(ERROR_STATUS_MAP.UNPROCESSABLE_ENTITY);
        expect("stack" in result).toBe(false);
        expect("details" in result).toBe(false);
      });
    });

    describe("statusCode handling", () => {
      it("should use provided statusCode from createError", () => {
        const input = {
          data: {
            error: {
              code: "CUSTOM",
              message: "Custom error",
              statusCode: 418,
            },
          },
        };
        const result = handleApiError(input);
        expect(result.statusCode).toBe(418);
      });

      it("should use provided statusCode from generic error", () => {
        const input = {
          code: "RATE_LIMIT",
          message: "Too many requests",
          statusCode: 429,
        };
        const result = handleApiError(input);
        expect(result.statusCode).toBe(429);
      });

      it("should default to INTERNAL_ERROR when statusCode is missing", () => {
        const input = {
          code: "NO_STATUS",
          message: "No status code provided",
        };
        const result = handleApiError(input);
        expect(result.statusCode).toBe(ERROR_STATUS_MAP.INTERNAL_ERROR);
      });

      it("should default to INTERNAL_ERROR for invalid statusCode types", () => {
        const input = {
          code: "INVALID_STATUS",
          message: "Invalid status",
          statusCode: "not a number" as unknown as number,
        };
        const result = handleApiError(input);
        expect(result.statusCode).toBe("not a number");
      });
    });
  });

  describe("integration scenarios", () => {
    it("should handle authentication flow errors consistently", () => {
      const supabaseError: SupabaseAuthError = {
        error_code: "invalid_credentials",
        message: "Invalid credentials",
      };

      const authError = handleAuthError(supabaseError);
      expect(authError.code).toBe("INVALID_CREDENTIALS");

      const apiError = handleApiError(authError);
      expect(apiError.code).toBe("INVALID_CREDENTIALS");
      expect(apiError.message).toBe("Invalid email or password");
    });

    it("should handle nested error transformations", () => {
      const unknownError = { random: "data" };
      const result1 = handleApiError(unknownError);
      expect(result1.code).toBe("INTERNAL_ERROR");

      const result2 = handleApiError(result1);
      expect(result2.code).toBe("INTERNAL_ERROR");
      expect(result2.statusCode).toBe(ERROR_STATUS_MAP.INTERNAL_ERROR);
    });
  });
});
