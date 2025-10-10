import { describe, expect, it } from "@jest/globals";
import { createErrorResponse, createSuccessResponse } from "~/server/utils/core/response.utils";
import type { ApiResponse, Errors } from "~/server/types/core";

describe("Response Utils", () => {
  describe("createSuccessResponse", () => {
    const data = { id: 1, name: "Test" };
    type Case<T> = {
      name: string;
      data?: T;
      message?: string;
      expected: ApiResponse<T>;
    };
    const cases: Array<Case<typeof data>> = [
      {
        name: "data and message",
        data: data,
        message: "Operation successful",
        expected: {
          success: true,
          data: data,
          message: "Operation successful",
        } satisfies ApiResponse<typeof data>,
      },
      {
        name: "only data",
        data: data,
        expected: {
          success: true,
          data: data,
          message: undefined,
        } satisfies ApiResponse<typeof data>,
      },
      {
        name: "no data or message",
        expected: {
          success: true,
          data: undefined,
          message: undefined,
        } satisfies ApiResponse<typeof data>,
      },
    ];

    cases.forEach((caseItem) => {
      it(`should create success response: ${caseItem.name}`, () => {
        const res = createSuccessResponse(caseItem.data, caseItem.message);
        expect(res).toEqual(caseItem.expected);
      });
    });
  });

  describe("createErrorResponse", () => {
    const testError: Errors = {
      type: "SERVER_ERROR",
      code: "500",
      message: "Internal Server Error",
      statusCode: 500,
    };
    type Case<T> = {
      name: string;
      error: Errors | null;
      expected: ApiResponse<T>;
    };

    const cases: Case<never>[] = [
      {
        name: "error object",
        error: testError,
        expected: {
          success: false,
          error: testError,
        } satisfies ApiResponse<never>,
      },
      {
        name: "null error object",
        error: null as unknown as Errors,
        expected: {
          success: false,
          error: null as unknown as Errors,
        } satisfies ApiResponse<never>,
      },
    ];

    cases.forEach((caseItem) => {
      it(`should create error response: ${caseItem.name}`, () => {
        const res = createErrorResponse(caseItem.error as Errors);
        expect(res).toEqual(caseItem.expected);
      });
    });
  });
});
