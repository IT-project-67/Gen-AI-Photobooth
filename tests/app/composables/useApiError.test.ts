import { describe, it, expect, beforeEach, jest } from "@jest/globals";

describe("useApiError Composable", () => {
  let useApiError: typeof import("~/app/composables/useApiError").useApiError;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    try {
      const module = await import("~/app/composables/useApiError");
      useApiError = module.useApiError;
    } catch (error) {
      console.error("Failed to import useApiError:", error);
      throw error;
    }
  });

  describe("Composable Structure", () => {
    it("should return all utility functions", () => {
      const composable = useApiError();

      expect(typeof composable.formatError).toBe("function");
      expect(typeof composable.isValidationError).toBe("function");
      expect(typeof composable.isAuthError).toBe("function");
      expect(typeof composable.getUserFriendlyMessage).toBe("function");
    });
  });

  describe("formatError", () => {
    it("should format string error", () => {
      const composable = useApiError();

      const result = composable.formatError("Test error message");

      expect(result).toBe("Test error message");
    });

    it("should format Errors object with message", () => {
      const composable = useApiError();

      const error = {
        code: "TEST_ERROR",
        message: "Custom error message",
        type: "SERVER_ERROR",
        statusCode: 500,
      } as never;

      const result = composable.formatError(error);

      expect(result).toBe("Custom error message");
    });

    it("should use default message when Errors object has no message", () => {
      const composable = useApiError();

      const error = {
        code: "TEST_ERROR",
        message: "",
        type: "SERVER_ERROR",
        statusCode: 500,
      } as never;

      const result = composable.formatError(error);

      expect(result).toBe("An unexpected error occurred");
    });

    it("should use default message for Errors object without message property", () => {
      const composable = useApiError();

      const error = {
        code: "TEST_ERROR",
        type: "ERROR",
        statusCode: 500,
      } as never;

      const result = composable.formatError(error);

      expect(result).toBe("An unexpected error occurred");
    });
  });

  describe("isValidationError", () => {
    it("should return true for VALIDATION code", () => {
      const composable = useApiError();

      const error = {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        type: "VALIDATION_ERROR" as const,
        statusCode: 400,
      };

      expect(composable.isValidationError(error)).toBe(true);
    });

    it("should return true for INVALID code", () => {
      const composable = useApiError();

      const error = {
        code: "INVALID_INPUT",
        message: "Invalid input",
        type: "AUTH_ERROR" as const,
        statusCode: 400,
      };

      expect(composable.isValidationError(error)).toBe(true);
    });

    it("should return false for non-validation error", () => {
      const composable = useApiError();

      const error = {
        code: "AUTH_ERROR",
        message: "Unauthorized",
        type: "AUTH_ERROR" as const,
        statusCode: 401,
      };

      expect(composable.isValidationError(error)).toBe(false);
    });

    it("should return false when code is undefined", () => {
      const composable = useApiError();

      const error = {
        message: "Error",
        type: "ERROR",
        statusCode: 500,
      } as never;

      expect(composable.isValidationError(error)).toBe(false);
    });
  });

  describe("isAuthError", () => {
    it("should return true for AUTH code", () => {
      const composable = useApiError();

      const error = {
        code: "AUTH_ERROR",
        message: "Unauthorized",
        type: "AUTH_ERROR" as const,
        statusCode: 401,
      };

      expect(composable.isAuthError(error)).toBe(true);
    });

    it("should return true for CREDENTIALS code", () => {
      const composable = useApiError();

      const error = {
        code: "INVALID_CREDENTIALS",
        message: "Invalid credentials",
        type: "AUTH_ERROR" as const,
        statusCode: 401,
      };

      expect(composable.isAuthError(error)).toBe(true);
    });

    it("should return false for non-auth error", () => {
      const composable = useApiError();

      const error = {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        type: "VALIDATION_ERROR" as const,
        statusCode: 400,
      };

      expect(composable.isAuthError(error)).toBe(false);
    });

    it("should return false when code is undefined", () => {
      const composable = useApiError();

      const error = {
        message: "Error",
        type: "ERROR",
        statusCode: 500,
      } as never;

      expect(composable.isAuthError(error)).toBe(false);
    });
  });

  describe("getUserFriendlyMessage", () => {
    it("should return message for EMAIL_REQUIRED", () => {
      const composable = useApiError();

      const error = {
        code: "EMAIL_REQUIRED",
        message: "Email is required",
        type: "VALIDATION_ERROR" as const,
        statusCode: 400,
      };

      expect(composable.getUserFriendlyMessage(error)).toBe("Please enter your email address");
    });

    it("should return message for EMAIL_INVALID", () => {
      const composable = useApiError();

      const error = {
        code: "EMAIL_INVALID",
        message: "Email is invalid",
        type: "VALIDATION_ERROR" as const,
        statusCode: 400,
      };

      expect(composable.getUserFriendlyMessage(error)).toBe("Please enter a valid email address");
    });

    it("should return message for PASSWORD_REQUIRED", () => {
      const composable = useApiError();

      const error = {
        code: "PASSWORD_REQUIRED",
        message: "Password is required",
        type: "VALIDATION_ERROR" as const,
        statusCode: 400,
      };

      expect(composable.getUserFriendlyMessage(error)).toBe("Please enter your password");
    });

    it("should return message for PASSWORD_TOO_SHORT", () => {
      const composable = useApiError();

      const error = {
        code: "PASSWORD_TOO_SHORT",
        message: "Password too short",
        type: "VALIDATION_ERROR" as const,
        statusCode: 400,
      };

      expect(composable.getUserFriendlyMessage(error)).toBe(
        "Password must be at least 6 characters long",
      );
    });

    it("should return message for INVALID_CREDENTIALS", () => {
      const composable = useApiError();

      const error = {
        code: "INVALID_CREDENTIALS",
        message: "Invalid credentials",
        type: "AUTH_ERROR" as const,
        statusCode: 401,
      };

      expect(composable.getUserFriendlyMessage(error)).toBe("Invalid email or password");
    });

    it("should return message for EMAIL_NOT_CONFIRMED", () => {
      const composable = useApiError();

      const error = {
        code: "EMAIL_NOT_CONFIRMED",
        message: "Email not confirmed",
        type: "AUTH_ERROR" as const,
        statusCode: 401,
      };

      expect(composable.getUserFriendlyMessage(error)).toBe(
        "Please check your email and confirm your account",
      );
    });

    it("should return message for SIGNUP_DISABLED", () => {
      const composable = useApiError();

      const error = {
        code: "SIGNUP_DISABLED",
        message: "Signup disabled",
        type: "SERVER_ERROR" as const,
        statusCode: 403,
      };

      expect(composable.getUserFriendlyMessage(error)).toBe("Registration is currently disabled");
    });

    it("should return message for USER_ALREADY_EXISTS", () => {
      const composable = useApiError();

      const error = {
        code: "USER_ALREADY_EXISTS",
        message: "User exists",
        type: "BUSINESS_ERROR" as const,
        statusCode: 409,
      };

      expect(composable.getUserFriendlyMessage(error)).toBe(
        "This email is already registered. Please try logging in instead.",
      );
    });

    it("should return original message for unknown code", () => {
      const composable = useApiError();

      const error = {
        code: "UNKNOWN_ERROR",
        message: "Something went wrong",
        type: "SERVER_ERROR" as const,
        statusCode: 500,
      };

      expect(composable.getUserFriendlyMessage(error)).toBe("Something went wrong");
    });

    it("should return default message when no message provided", () => {
      const composable = useApiError();

      const error = {
        code: "UNKNOWN_ERROR",
        message: "",
        type: "SERVER_ERROR" as const,
        statusCode: 500,
      };

      expect(composable.getUserFriendlyMessage(error)).toBe("An unexpected error occurred");
    });

    it("should return default message when message is undefined", () => {
      const composable = useApiError();

      const error = {
        code: "UNKNOWN_ERROR",
        type: "ERROR",
        statusCode: 500,
      } as never;

      expect(composable.getUserFriendlyMessage(error)).toBe("An unexpected error occurred");
    });
  });

  describe("Edge Cases and Combined Scenarios", () => {
    it("should handle error with code containing both VALIDATION and INVALID", () => {
      const composable = useApiError();

      const error = {
        code: "VALIDATION_INVALID_INPUT",
        message: "Invalid input",
        type: "VALIDATION_ERROR" as const,
        statusCode: 400,
      };

      expect(composable.isValidationError(error)).toBe(true);
      expect(composable.isAuthError(error)).toBe(false);
    });

    it("should handle error with code containing both AUTH and INVALID", () => {
      const composable = useApiError();

      const error = {
        code: "AUTH_INVALID_TOKEN",
        message: "Invalid token",
        type: "AUTH_ERROR" as const,
        statusCode: 401,
      };

      expect(composable.isAuthError(error)).toBe(true);
      expect(composable.isValidationError(error)).toBe(true); // Contains INVALID
    });

    it("should handle empty string error", () => {
      const composable = useApiError();

      const result = composable.formatError("");

      expect(result).toBe("");
    });

    it("should handle error with null message", () => {
      const composable = useApiError();

      const error = {
        code: "TEST_ERROR",
        message: null,
        type: "ERROR",
        statusCode: 500,
      } as never;

      const result = composable.formatError(error);

      expect(result).toBe("An unexpected error occurred");
    });

    it("should handle error with only whitespace message", () => {
      const composable = useApiError();

      const error = {
        code: "TEST_ERROR",
        message: "   ",
        type: "SERVER_ERROR" as const,
        statusCode: 500,
      };

      const result = composable.formatError(error);

      expect(result).toBe("   ");
    });

    it("should handle error with code null", () => {
      const composable = useApiError();

      const error = {
        code: null,
        message: "Error",
        type: "SERVER_ERROR" as const,
        statusCode: 500,
      } as never;

      expect(composable.isValidationError(error)).toBe(false);
      expect(composable.isAuthError(error)).toBe(false);
    });

    it("should handle error with details property", () => {
      const composable = useApiError();

      const error = {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        type: "VALIDATION_ERROR" as const,
        statusCode: 400,
        details: { field: "email", reason: "invalid format" },
      };

      expect(composable.formatError(error)).toBe("Validation failed");
      expect(composable.isValidationError(error)).toBe(true);
    });

    it("should handle multiple error codes in sequence", () => {
      const composable = useApiError();

      const errors = [
        {
          code: "EMAIL_REQUIRED",
          message: "Email required",
          type: "VALIDATION_ERROR" as const,
          statusCode: 400,
        },
        {
          code: "PASSWORD_REQUIRED",
          message: "Password required",
          type: "VALIDATION_ERROR" as const,
          statusCode: 400,
        },
        {
          code: "INVALID_CREDENTIALS",
          message: "Invalid creds",
          type: "AUTH_ERROR" as const,
          statusCode: 401,
        },
      ];

      const messages = errors.map((e) => composable.getUserFriendlyMessage(e));

      expect(messages).toEqual([
        "Please enter your email address",
        "Please enter your password",
        "Invalid email or password",
      ]);
    });

    it("should handle case-sensitive code matching", () => {
      const composable = useApiError();

      const error = {
        code: "validation_error", // lowercase
        message: "Validation failed",
        type: "VALIDATION_ERROR" as const,
        statusCode: 400,
      };

      // Should not match because code includes checks are case-sensitive
      expect(composable.isValidationError(error)).toBe(false);
    });

    it("should handle error code with special characters", () => {
      const composable = useApiError();

      const error = {
        code: "VALIDATION-ERROR",
        message: "Error",
        type: "VALIDATION_ERROR" as const,
        statusCode: 400,
      };

      // Should return true because code contains "VALIDATION" substring
      expect(composable.isValidationError(error)).toBe(true);
    });

    it("should handle long error messages", () => {
      const composable = useApiError();

      const longMessage = "A".repeat(1000);
      const error = {
        code: "TEST_ERROR",
        message: longMessage,
        type: "SERVER_ERROR" as const,
        statusCode: 500,
      };

      expect(composable.formatError(error)).toBe(longMessage);
    });

    it("should handle error with statusCode 0", () => {
      const composable = useApiError();

      const error = {
        code: "NETWORK_ERROR",
        message: "Network error",
        type: "SERVER_ERROR" as const,
        statusCode: 0,
      };

      expect(composable.formatError(error)).toBe("Network error");
    });

    it("should handle getUserFriendlyMessage with all known codes", () => {
      const composable = useApiError();

      const knownCodes = [
        "EMAIL_REQUIRED",
        "EMAIL_INVALID",
        "PASSWORD_REQUIRED",
        "PASSWORD_TOO_SHORT",
        "INVALID_CREDENTIALS",
        "EMAIL_NOT_CONFIRMED",
        "SIGNUP_DISABLED",
        "USER_ALREADY_EXISTS",
      ];

      knownCodes.forEach((code) => {
        const error = {
          code,
          message: "Test message",
          type: "SERVER_ERROR" as const,
          statusCode: 400,
        };

        const result = composable.getUserFriendlyMessage(error);

        // Should return a user-friendly message, not the default
        expect(result).not.toBe("Test message");
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it("should maintain function independence", () => {
      const composable1 = useApiError();
      const composable2 = useApiError();

      const error1 = {
        code: "TEST1",
        message: "Test 1",
        type: "SERVER_ERROR" as const,
        statusCode: 500,
      };
      const error2 = {
        code: "TEST2",
        message: "Test 2",
        type: "SERVER_ERROR" as const,
        statusCode: 500,
      };

      const result1 = composable1.formatError(error1);
      const result2 = composable2.formatError(error2);

      expect(result1).toBe("Test 1");
      expect(result2).toBe("Test 2");
    });

    it("should handle formatError with very short string", () => {
      const composable = useApiError();

      expect(composable.formatError("E")).toBe("E");
    });

    it("should handle isValidationError with partial VALIDATION match", () => {
      const composable = useApiError();

      const error = {
        code: "PREVALIDATION",
        message: "Error",
        type: "VALIDATION_ERROR" as const,
        statusCode: 400,
      };

      expect(composable.isValidationError(error)).toBe(true);
    });

    it("should handle isAuthError with partial AUTH match", () => {
      const composable = useApiError();

      const error = {
        code: "OAUTH_ERROR",
        message: "Error",
        type: "AUTH_ERROR" as const,
        statusCode: 401,
      };

      expect(composable.isAuthError(error)).toBe(true);
    });

    it("should handle getUserFriendlyMessage with empty string code", () => {
      const composable = useApiError();

      const error = {
        code: "",
        message: "Test message",
        type: "SERVER_ERROR" as const,
        statusCode: 500,
      };

      expect(composable.getUserFriendlyMessage(error)).toBe("Test message");
    });

    it("should return composable with correct structure on multiple calls", () => {
      const composable1 = useApiError();
      const composable2 = useApiError();

      expect(composable1).toHaveProperty("formatError");
      expect(composable1).toHaveProperty("isValidationError");
      expect(composable1).toHaveProperty("isAuthError");
      expect(composable1).toHaveProperty("getUserFriendlyMessage");

      expect(composable2).toHaveProperty("formatError");
      expect(composable2).toHaveProperty("isValidationError");
      expect(composable2).toHaveProperty("isAuthError");
      expect(composable2).toHaveProperty("getUserFriendlyMessage");
    });
  });

  describe("Type Safety and TypeScript Edge Cases", () => {
    it("should handle error object with extra properties", () => {
      const composable = useApiError();

      const error = {
        code: "TEST_ERROR",
        message: "Test",
        type: "SERVER_ERROR" as const,
        statusCode: 500,
        extraProperty: "extra",
        anotherProperty: 123,
      } as never;

      expect(composable.formatError(error)).toBe("Test");
    });

    it("should handle error with numeric code (coerced to string)", () => {
      const composable = useApiError();

      const error = {
        code: 404,
        message: "Not found",
        type: "NOT_FOUND" as const,
        statusCode: 404,
      } as never;

      // Numeric codes would cause runtime error, so we only test formatError
      expect(composable.formatError(error)).toBe("Not found");
      // Note: isValidationError and isAuthError would throw if code is not a string
    });

    it("should handle error with boolean message", () => {
      const composable = useApiError();

      const error = {
        code: "TEST",
        message: true,
        type: "SERVER_ERROR" as const,
        statusCode: 500,
      } as never;

      // Function doesn't check type, so truthy non-string values are returned as-is
      expect(composable.formatError(error)).toBe(true);
    });

    it("should handle unicode characters in error messages", () => {
      const composable = useApiError();

      const unicodeMessage = "Error: User not found 🚫";
      const error = {
        code: "USER_NOT_FOUND",
        message: unicodeMessage,
        type: "NOT_FOUND" as const,
        statusCode: 404,
      };

      expect(composable.formatError(error)).toBe(unicodeMessage);
    });

    it("should handle error with HTML in message", () => {
      const composable = useApiError();

      const htmlMessage = "<script>alert('xss')</script>";
      const error = {
        code: "XSS_TEST",
        message: htmlMessage,
        type: "SERVER_ERROR" as const,
        statusCode: 500,
      };

      expect(composable.formatError(error)).toBe(htmlMessage);
    });

    it("should handle error with newlines in message", () => {
      const composable = useApiError();

      const multilineMessage = "Line 1\nLine 2\nLine 3";
      const error = {
        code: "MULTILINE",
        message: multilineMessage,
        type: "SERVER_ERROR" as const,
        statusCode: 500,
      };

      expect(composable.formatError(error)).toBe(multilineMessage);
    });
  });

  describe("Realistic Error Scenarios", () => {
    it("should handle typical login validation flow", () => {
      const composable = useApiError();

      // Missing email - doesn't contain VALIDATION or INVALID
      const error1 = {
        code: "EMAIL_REQUIRED",
        message: "Email is required",
        type: "VALIDATION_ERROR" as const,
        statusCode: 400,
      };

      // EMAIL_REQUIRED doesn't contain "VALIDATION" or "INVALID", so returns false
      expect(composable.isValidationError(error1)).toBe(false);
      expect(composable.getUserFriendlyMessage(error1)).toBe("Please enter your email address");

      // Invalid email format - contains INVALID
      const error2 = {
        code: "EMAIL_INVALID",
        message: "Email is invalid",
        type: "VALIDATION_ERROR" as const,
        statusCode: 400,
      };

      expect(composable.isValidationError(error2)).toBe(true); // Contains INVALID
      expect(composable.getUserFriendlyMessage(error2)).toBe("Please enter a valid email address");

      // Wrong credentials - contains both INVALID and CREDENTIALS
      const error3 = {
        code: "INVALID_CREDENTIALS",
        message: "Invalid credentials",
        type: "AUTH_ERROR" as const,
        statusCode: 401,
      };

      expect(composable.isAuthError(error3)).toBe(true); // Contains CREDENTIALS
      expect(composable.isValidationError(error3)).toBe(true); // Also contains INVALID
      expect(composable.getUserFriendlyMessage(error3)).toBe("Invalid email or password");
    });

    it("should handle typical signup validation flow", () => {
      const composable = useApiError();

      // User already exists
      const error1 = {
        code: "USER_ALREADY_EXISTS",
        message: "User already exists",
        type: "BUSINESS_ERROR" as const,
        statusCode: 409,
      };

      expect(composable.getUserFriendlyMessage(error1)).toBe(
        "This email is already registered. Please try logging in instead.",
      );

      // Password too short - doesn't contain VALIDATION or INVALID
      const error2 = {
        code: "PASSWORD_TOO_SHORT",
        message: "Password is too short",
        type: "VALIDATION_ERROR" as const,
        statusCode: 400,
      };

      // PASSWORD_TOO_SHORT doesn't contain "VALIDATION" or "INVALID", so returns false
      expect(composable.isValidationError(error2)).toBe(false);
      expect(composable.getUserFriendlyMessage(error2)).toBe(
        "Password must be at least 6 characters long",
      );

      // Signup disabled
      const error3 = {
        code: "SIGNUP_DISABLED",
        message: "Signups are disabled",
        type: "FORBIDDEN" as const,
        statusCode: 403,
      };

      expect(composable.getUserFriendlyMessage(error3)).toBe("Registration is currently disabled");
    });

    it("should handle server error gracefully", () => {
      const composable = useApiError();

      const error = {
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong on our end",
        type: "SERVER_ERROR" as const,
        statusCode: 500,
      };

      expect(composable.formatError(error)).toBe("Something went wrong on our end");
    });

    it("should handle network timeout error", () => {
      const composable = useApiError();

      const error = {
        code: "NETWORK_TIMEOUT",
        message: "Request timed out",
        type: "SERVER_ERROR" as const,
        statusCode: 408,
      };

      expect(composable.formatError(error)).toBe("Request timed out");
    });
  });
});
