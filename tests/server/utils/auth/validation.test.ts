import { describe, expect, it } from "@jest/globals";
import {
  validateEmail,
  validatePassword,
  validateLoginRequest,
  validateRegisterRequest,
  validateForgotPasswordRequest,
  validateResetPasswordRequest,
} from "~/server/utils/auth/validation.utils";
import { type Errors, ERROR_STATUS_MAP } from "~~/server/types/core";

describe("Auth Validation Utils", () => {
  describe("validateEmail", () => {
    it("should return error if email is empty", () => {
      const error = validateEmail("");
      expect(error).toEqual({
        code: "EMAIL_REQUIRED",
        message: "Email is required",
        statusCode: ERROR_STATUS_MAP.EMAIL_REQUIRED,
      });
    });
    
    type InvalidCase<U extends string, V extends string> = {
      name: U,
      email: V,
      expected: Errors | null
    }

    const makeEmailError = (msg = "Please provide a valid email address"): Errors => ({
      code: "EMAIL_INVALID",
      message: msg,
      statusCode: ERROR_STATUS_MAP.EMAIL_INVALID,
    });

    const invalidEmailMap = {
      "missing @": "plainaddress",
      "missing local": "@example.com",
      "missing domain": "user@",
      "domain starts with dot": "user@.com",
      "no TLD dot": "user@com",
      "multiple @": "user@@example.com",
      "space inside": "user name@example.com",
      "newline in email": "user@\nexample.com",
      "space in email": "user@ example.com",
    } as const satisfies Record<string, string>;

    const invalidCases: Array<InvalidCase<keyof typeof invalidEmailMap, string>> =
      (Object.entries(invalidEmailMap) as Array<[keyof typeof invalidEmailMap, string]>)
        .map(([name, email]) => ({
          name,
          email,
          expected: makeEmailError(),
      }));
    
    describe("invalid emails", () => {
      invalidCases.forEach((item) => {
        it(`should return error: ${item.name}`, () => {
          const result = validateEmail(item.email);
          expect(result).toEqual(item.expected);
        });
      });
    });

    type ValidCase<U extends string, V extends string> = {
      name: U,
      email: V
    }

    const validEmailMap = {
      "basic": "user@example.com",
      "dot in local": "user.name@example.co",
      "underscore": "user_name@example.org",
      "hyphen + subdomain": "user-name@sub.example.com",
      "numbers": "u123@domain.io",
      "uppercase": "USER@EXAMPLE.COM",
      "plus alias": "user+alias@service.info",
      "edu": "first.last@university.edu",
      "multi-domain": "customer-care@my-company.net",
    } as const satisfies Record<string, string>;

    const validCases: Array<ValidCase<keyof typeof validEmailMap, string>> =
      (Object.entries(validEmailMap) as Array<[keyof typeof validEmailMap, string]>)
        .map(([name, email]) => ({
          name,
          email,
          expected: null,
        }));
    
    describe("valid emails", () => {
      validCases.forEach((item) => {
        it(`should return null: ${item.name}`, () => {
          const result = validateEmail(item.email);
          expect(result).toBeNull();
        });
      });
    });
  });

  describe("validatePassword", () => {
    it("should return error if password is empty", () => {
      const error = validatePassword("");
      expect(error).toEqual({
        code: "PASSWORD_REQUIRED",
        message: "Password is required",
        statusCode: ERROR_STATUS_MAP.PASSWORD_REQUIRED,
      });
    });

    type InvalidCase<U extends string, V extends string> = {
      name: U,
      password: V,
      expected: Errors | null
    }

    const invalidPasswordMap = {
      "one number password":"1", 
      "two number password":"12", 
      "three number password":"123", 
      "four number password":"1234", 
      "five number password":"12345", 
      "short letter password":"abc", 
      "short combination password":"a s_1",
      "short letter and number password":"abc31",
      "short password with speical character":"@#$!."
    }

    const invalidCases: Array<InvalidCase<keyof typeof invalidPasswordMap, string>> =
      (Object.entries(invalidPasswordMap) as Array<[keyof typeof invalidPasswordMap, string]>)
        .map(([name, password]) => ({
          name,
          password,
          expected: {
            code: "PASSWORD_TOO_SHORT",
            message: "Password must be at least 6 characters long",
            statusCode: ERROR_STATUS_MAP.PASSWORD_TOO_SHORT,
          },
        }));
    
    describe("invalid passwords", () => {
      invalidCases.forEach((item) => {
        it(`should return error: ${item.name}`, () => {
          const result = validatePassword(item.password);
          expect(result).toEqual(item.expected);
        });
      });
    });
    
    describe("valid passwords", () => { 
      const validPasswords = ["123456", "abcdef", "ABCDEF", "abc123", "Abc_123!", "a b c 1 2 3"];
      validPasswords.forEach((password) => {
        it(`should return null for valid password: "${password}"`, () => {
          const result = validatePassword(password);
          expect(result).toBeNull();
        });
      });
    });
  });

  describe("validateLoginRequest", () => {
    describe("invalid cases", () => {
      type Case<U extends string, V extends string> = {
        name: string,
        email: U,
        password: V,
        expected: Errors | null
      }

      const cases: Array<Case<string, string>> = [
        {
          name: "both email and password empty",
          email: "",
          password: "",
          expected: {
            code: "EMAIL_REQUIRED",
            message: "Email is required",
            statusCode: ERROR_STATUS_MAP.EMAIL_REQUIRED,
          },
        },
        {
          name: "invalid email and empty password",
          email: "invalid-email",
          password: "",
          expected: {
            code: "EMAIL_INVALID",
            message: "Please provide a valid email address",
            statusCode: ERROR_STATUS_MAP.EMAIL_INVALID,
          },
        },
        {
          name: "valid email and empty password",
          email: "test123@outlook.com",
          password: "",
          expected: {
            code: "PASSWORD_REQUIRED",
            message: "Password is required",
            statusCode: ERROR_STATUS_MAP.PASSWORD_REQUIRED,
          },
        },
        {
          name: "valid email and short password",
          email: "test123@outlook.com",
          password: "123",
          expected: {
            code: "PASSWORD_TOO_SHORT",
            message: "Password must be at least 6 characters long",
            statusCode: ERROR_STATUS_MAP.PASSWORD_TOO_SHORT,
          },
        },
      ]

      cases.forEach((item) => {
        it(`should return error: ${item.name}`, () => {
          const result = validateLoginRequest(item.email, item.password);
          expect(result).toEqual(item.expected);
        });
      });
    });

    describe("valid cases", () => {
      const data = { 
        email: "test123@outlook.com",
        password: "123456",
      }
      it("should return null for valid email and password", () => {
        const result = validateRegisterRequest(data.email, data.password);
        expect(result).toBeNull();
      });
    });
  });

  describe("validateRegisterRequest", () => {
    describe("invalid cases", () => {
      type Case<U extends string, V extends string> = {
        name: string,
        email: U,
        password: V,
        expected: Errors | null
      }

      const cases: Array<Case<string, string>> = [
        {
          name: "both email and password empty",
          email: "",
          password: "",
          expected: {
            code: "EMAIL_REQUIRED",
            message: "Email is required",
            statusCode: ERROR_STATUS_MAP.EMAIL_REQUIRED,
          },
        },
        {
          name: "invalid email and empty password",
          email: "invalid-email",
          password: "",
          expected: {
            code: "EMAIL_INVALID",
            message: "Please provide a valid email address",
            statusCode: ERROR_STATUS_MAP.EMAIL_INVALID,
          },
        },
        {
          name: "valid email and empty password",
          email: "test123@outlook.com",
          password: "",
          expected: {
            code: "PASSWORD_REQUIRED",
            message: "Password is required",
            statusCode: ERROR_STATUS_MAP.PASSWORD_REQUIRED,
          },
        },
        {
          name: "valid email and short password",
          email: "test123@outlook.com",
          password: "123",
          expected: {
            code: "PASSWORD_TOO_SHORT",
            message: "Password must be at least 6 characters long",
            statusCode: ERROR_STATUS_MAP.PASSWORD_TOO_SHORT,
          },
        },
      ]
      
      cases.forEach((item) => {
        it(`should return error: ${item.name}`, () => {
          const result = validateRegisterRequest(item.email, item.password);
          expect(result).toEqual(item.expected);
        });
      });
    });

    describe("valid cases", () => {
      const data = { 
        email: "test123@outlook.com",
        password: "123456",
      }
      it("should return null for valid email and password", () => {
        const result = validateRegisterRequest(data.email, data.password);
        expect(result).toBeNull();
      });
    });
  });

  describe("validateForgotPasswordRequest", () => {
    describe("invalid cases", () => {
      type Case<U extends string> = {
        name: string,
        email: U,
        expected: Errors | null
      }

      describe("invalid emails", () => {
        const cases: Array<Case<string>> = [
          {
            name: "empty email",
            email: "",
            expected: {
              code: "EMAIL_REQUIRED",
              message: "Email is required",
              statusCode: ERROR_STATUS_MAP.EMAIL_REQUIRED,
            },
          },
          {
            name: "invalid email format",
            email: "invalid-email",
            expected: {
              code: "EMAIL_INVALID",
              message: "Please provide a valid email address",
              statusCode: ERROR_STATUS_MAP.EMAIL_INVALID,
            },
          },
        ]

        cases.forEach((item) => {
          it(`should return error: ${item.name}`, () => {
            const result = validateForgotPasswordRequest(item.email);
            expect(result).toEqual(item.expected);
          });
        });
      });

      describe("valid emails", () => {
        const validEmails = [
          "test123@outlook.com",
        ]
        validEmails.forEach((email) => {
          it(`should return null for valid email: "${email}"`, () => {
            const result = validateForgotPasswordRequest(email);
            expect(result).toBeNull();
          });
        });
      });
    });
  });

  describe("validateResetPasswordRequest", () => {
    type Case<U extends string, V extends string, T extends string> = {
      name: string,
      access_token: U,
      refresh_token: V,
      password: T,
      expected: Errors | null
    }

    describe("invalid cases", () => {
      const cases: Array<Case<string, string, string>> = [
        {
          name: "all fields empty",
          access_token: "",
          refresh_token: "",
          password: "",
          expected: {
            code: "TOKENS_REQUIRED",
            message: "Reset tokens are required",
            statusCode: ERROR_STATUS_MAP.TOKENS_REQUIRED,
          },
        },
        {
          name: "missing tokens",
          access_token: "",
          refresh_token: "",
          password: "validPass123",
          expected: {
            code: "TOKENS_REQUIRED",
            message: "Reset tokens are required",
            statusCode: ERROR_STATUS_MAP.TOKENS_REQUIRED,
          },
        },
        {
          name: "missing access token",
          access_token: "",
          refresh_token: "validRefreshToken",
          password: "validPass123",
          expected: {
            code: "ACCESS_TOKEN_REQUIRED",
            message: "Reset access token is required",
            statusCode: ERROR_STATUS_MAP.ACCESS_TOKEN_REQUIRED,
          },
        },
        {
          name: "missing refresh token",
          access_token: "validAccessToken",
          refresh_token: "",
          password: "validPass123",
          expected: {
            code: "REFRESH_TOKEN_REQUIRED",
            message: "Reset refresh token is required",
            statusCode: ERROR_STATUS_MAP.REFRESH_TOKEN_REQUIRED,
          },
        },
        {
          name: "short password",
          access_token: "validAccessToken",
          refresh_token: "validRefreshToken",
          password: "123",
          expected: {
            code: "PASSWORD_TOO_SHORT",
            message: "Password must be at least 6 characters long",
            statusCode: ERROR_STATUS_MAP.PASSWORD_TOO_SHORT,
          },
        },
        {
          name: "empty password",
          access_token: "validAccessToken",
          refresh_token: "validRefreshToken",
          password: "",
          expected: {
            code: "PASSWORD_REQUIRED",
            message: "Password is required",
            statusCode: ERROR_STATUS_MAP.PASSWORD_REQUIRED,
          },
        },
      ]

      cases.forEach((item) => {
        it(`should return error: ${item.name}`, () => {
          const result = validateResetPasswordRequest(item.access_token, item.refresh_token, item.password);
          expect(result).toEqual(item.expected);
        });
      });
    });

    describe("valid cases", () => {
      const cases: Array<Case<string, string, string>> = [
        {
          name: "all valid inputs correct",
          access_token: "validAccessToken",
          refresh_token: "validRefreshToken",
          password: "validPass123",
          expected: null,
        },
        {
          name: "only correct access tocken",
          access_token: "validAccessToken",
          refresh_token: "wrongRefreshToken",
          password: "123456",
          expected: null,
        },
        {
          name: "only correct refresh token",
          access_token: "wrongAccessToken",
          refresh_token: "validRefreshToken",
          password: "123456",
          expected: null,
        }
      ]

      cases.forEach((item) => {
        it(`should return null: ${item.name}`, () => {
          const result = validateResetPasswordRequest(item.access_token, item.refresh_token, item.password);
          expect(result).toBeNull();
        });
      });
    });
  });
});
