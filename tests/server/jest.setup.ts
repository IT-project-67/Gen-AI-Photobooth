import { jest } from "@jest/globals";

const mockDefineEventHandler = jest.fn((handler) => handler);
const mockCreateError = jest.fn();
const mockReadMultipartFormData = jest.fn<() => Promise<unknown>>();
const mockUseRuntimeConfig = jest.fn(() => ({
  public: {
    supabaseUrl: "https://test.supabase.co",
    supabaseAnonKey: "test-anon-key",
  },
  supabaseServiceRoleKey: "test-service-role-key",
  storageBucket: "test-bucket",
  leonardoApiKey: "test-leonardo-api-key",
  leonardoModelId: "test-model-id",
  leonardoStyleId: "test-style-id",
}));

declare global {
  var defineEventHandler: typeof mockDefineEventHandler;
  var createError: typeof mockCreateError;
  var readMultipartFormData: typeof mockReadMultipartFormData;
  var useRuntimeConfig: typeof mockUseRuntimeConfig;
}

globalThis.defineEventHandler = mockDefineEventHandler;
globalThis.createError = mockCreateError;
globalThis.readMultipartFormData = mockReadMultipartFormData;
globalThis.useRuntimeConfig = mockUseRuntimeConfig;
