import type { ErrorType } from "~~/server/types/core";

test("server: runs in node environment", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect(typeof (globalThis as any).window).toBe("undefined");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect(typeof (globalThis as any).document).toBe("undefined");
});

test("server: type-only import compiles", () => {
  const _t: ErrorType | null = null;
  expect(true).toBe(true);
});
