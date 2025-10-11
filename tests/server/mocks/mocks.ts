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
export const mockReadBody = jest.fn<() => Promise<unknown>>();
export const mockGetRequestURL = jest.fn<() => { origin: string }>();

// Mock auth functions
export const mockRequireAuth = jest.fn();
export const mockValidateForgotPasswordRequest = jest.fn();
export const mockValidateLoginRequest = jest.fn();
export const mockValidateRegisterRequest = jest.fn();
export const mockValidateResetPasswordRequest = jest.fn();
export const mockHandleAuthError = jest.fn();
export const mockHandleApiError = jest.fn();

// Mock model functions
export const mockGetAIPhotoById = jest.fn();
export const mockGetAllProfile = jest.fn<
  () => Promise<{ id: string; isDeleted: boolean } | null>
>();
export const mockCreateProfile = jest.fn<() => Promise<unknown>>();
export const mockRestoreProfile = jest.fn<() => Promise<unknown>>();

// Mock supabase
export const mockDownload = jest.fn();
export const mockCreateSignedUrl = jest.fn();
export const mockResetPasswordForEmail = jest.fn<
  () => Promise<{ error: { message?: string; error_code?: string } | null }>
>();
export const mockSignInWithPassword = jest.fn<
  () => Promise<{
    data: { session: unknown; user: unknown } | { session: null; user: null };
    error: { message?: string; error_code?: string } | null;
  }>
>();
export const mockSignUp = jest.fn<
  () => Promise<{
    data: { session: unknown; user: unknown } | { session: null; user: null };
    error: { message?: string; error_code?: string } | null;
  }>
>();
export const mockListUsers = jest.fn<
  () => Promise<{
    data: { users: Array<{ id: string; email: string; email_confirmed_at?: string | null; created_at?: string; updated_at?: string }> };
    error: unknown;
  }>
>();
export const mockUpdateUserById = jest.fn<
  () => Promise<{ error: { message?: string } | null }>
>();
export const mockSetSession = jest.fn<
  () => Promise<{
    data: { user: unknown; session: unknown } | { user: null; session: null };
    error: { message?: string; error_code?: string } | null;
  }>
>();
export const mockUpdateUser = jest.fn<
  () => Promise<{ error: { message?: string; error_code?: string } | null }>
>();
export const mockFrom = jest.fn(() => ({
  download: mockDownload,
  createSignedUrl: mockCreateSignedUrl,
}));

export const mockCreateAdminClient = jest.fn(() => ({
  storage: {
    from: mockFrom,
  },
  auth: {
    admin: {
      listUsers: mockListUsers,
      updateUserById: mockUpdateUserById,
    },
  },
}));

export const mockCreateAuthClient = jest.fn(() => ({
  auth: {
    resetPasswordForEmail: mockResetPasswordForEmail,
    signInWithPassword: mockSignInWithPassword,
    signUp: mockSignUp,
    setSession: mockSetSession,
    updateUser: mockUpdateUser,
  },
}));

// Mock storage utils
export const mockGetStorageBucket = jest.fn(() => "test-bucket");

// Mock response utils
export const mockCreateSuccessResponse = jest.fn((data, message) => ({
  success: true,
  data,
  message,
}));

export const mockCreateErrorResponse = jest.fn((error) => ({
  success: false,
  error,
}));
