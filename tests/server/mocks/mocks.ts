import { jest } from "@jest/globals";

// Mock Prisma client functions
export const mockCreate = jest.fn();
export const mockUpdate = jest.fn();
export const mockFindUnique = jest.fn();
export const mockFindFirst = jest.fn();
export const mockFindMany = jest.fn();

// Mock h3 functions
export const mockGetQuery = jest.fn();
export const mockCreateError = jest.fn();
export const mockSetHeader = jest.fn();
export const mockDefineEventHandler = jest.fn((handler) => handler);

// Mock auth function
export const mockRequireAuth = jest.fn();

// Mock model functions
export const mockGetAIPhotoById = jest.fn();

// Mock supabase
export const mockDownload = jest.fn();
export const mockCreateSignedUrl = jest.fn();
export const mockFrom = jest.fn(() => ({
  download: mockDownload,
  createSignedUrl: mockCreateSignedUrl,
}));

export const mockCreateAdminClient = jest.fn(() => ({
  storage: {
    from: mockFrom,
  },
}));

// Mock storage utils
export const mockGetStorageBucket = jest.fn(() => "test-bucket");
