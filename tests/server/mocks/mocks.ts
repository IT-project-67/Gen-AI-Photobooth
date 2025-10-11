import { jest } from "@jest/globals";

export const mockCreate = jest.fn();
export const mockUpdate = jest.fn();
export const mockFindUnique = jest.fn();
export const mockFindFirst = jest.fn();
export const mockFindMany = jest.fn();

export const mockGetQuery = jest.fn<() => Record<string, unknown>>();
export const mockCreateError = jest.fn();
export const mockSetHeader = jest.fn();
export const mockGetHeader = jest.fn();
export const mockSend = jest.fn();
export const mockReadMultipartFormData = jest.fn<(event: unknown) => Promise<unknown>>();
export const mockDefineEventHandler = jest.fn((handler) => handler);
export const mockReadBody = jest.fn<() => Promise<unknown>>();
export const mockGetRequestURL = jest.fn<() => { origin: string }>();

export const mockRequireAuth = jest.fn();
export const mockValidateForgotPasswordRequest = jest.fn();
export const mockValidateLoginRequest = jest.fn();
export const mockValidateRegisterRequest = jest.fn();
export const mockValidateResetPasswordRequest = jest.fn();
export const mockHandleAuthError = jest.fn();
export const mockHandleApiError = jest.fn();

export const mockGetAIPhotoById = jest.fn();
export const mockGetAllProfile =
  jest.fn<() => Promise<{ id: string; isDeleted: boolean; userId?: string } | null>>();
export const mockGetValidProfile = jest.fn<() => Promise<unknown>>();
export const mockCreateProfile = jest.fn<() => Promise<unknown>>();
export const mockRestoreProfile = jest.fn<() => Promise<unknown>>();
export const mockSoftDeleteProfile = jest.fn<() => Promise<unknown>>();
export const mockCreateEvent = jest.fn<() => Promise<unknown>>();
export const mockGetEventById = jest.fn<() => Promise<unknown>>();
export const mockGetEventsByProfile = jest.fn<() => Promise<unknown[]>>();
export const mockUpdateEventLogoUrl = jest.fn<() => Promise<unknown>>();
export const mockCreateAIPhoto = jest.fn<() => Promise<unknown>>();
export const mockUpdateAIPhotoUrl = jest.fn<() => Promise<unknown>>();
export const mockGetPhotoSessionById = jest.fn<() => Promise<unknown>>();
export const mockCreatePhotoSession = jest.fn<() => Promise<unknown>>();
export const mockUpdatePhotoSessionPhotoUrl = jest.fn<() => Promise<unknown>>();

export const mockDownload =
  jest.fn<() => Promise<{ data: Blob | null; error: { message?: string } | null }>>();
export const mockCreateSignedUrl =
  jest.fn<
    () => Promise<{ data: { signedUrl: string } | null; error: { message?: string } | null }>
  >();
export const mockResetPasswordForEmail =
  jest.fn<() => Promise<{ error: { message?: string; error_code?: string } | null }>>();
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
    data: {
      users: Array<{
        id: string;
        email: string;
        email_confirmed_at?: string | null;
        created_at?: string;
        updated_at?: string;
      }>;
    };
    error: unknown;
  }>
>();
export const mockUpdateUserById = jest.fn<() => Promise<{ error: { message?: string } | null }>>();
export const mockSetSession = jest.fn<
  () => Promise<{
    data: { user: unknown; session: unknown } | { user: null; session: null };
    error: { message?: string; error_code?: string } | null;
  }>
>();
export const mockUpdateUser =
  jest.fn<() => Promise<{ error: { message?: string; error_code?: string } | null }>>();
export const mockGetUser = jest.fn<
  () => Promise<{
    data: { user: unknown } | { user: null };
    error: { message?: string; error_code?: string } | null;
  }>
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
    getUser: mockGetUser,
  },
}));

export const mockGetStorageBucket = jest.fn(() => "test-bucket");
export const mockNormalizeFilePart = jest.fn();
export const mockValidateFileOrThrow = jest.fn();
export const mockUploadLogo = jest.fn<() => Promise<{ path: string }>>();
export const mockUploadPhoto = jest.fn<() => Promise<{ path: string; url?: string }>>();
export const mockUpload =
  jest.fn<() => Promise<{ data: { path: string } | null; error: { message?: string } | null }>>();
export const mockUploadAIPhoto = jest.fn<() => Promise<{ path: string; url: string }>>();

export const mockHasEventLogo = jest.fn();
export const mockDownloadEventLogo = jest.fn<() => Promise<unknown>>();
export const mockMergeImages =
  jest.fn<
    () => Promise<{ data: Buffer; mimeType: string; dimensions: { width: number; height: number } }>
  >();
export const mockAddWhiteBorder =
  jest.fn<
    () => Promise<{ data: Buffer; mimeType: string; dimensions: { width: number; height: number } }>
  >();

export const mockLeonardoUploadImage = jest.fn<() => Promise<string>>();
export const mockLeonardoGenerateFromImageId = jest.fn<() => Promise<unknown>>();
export const mockLeonardoGetGeneration = jest.fn<() => Promise<unknown>>();
export const mockLeonardoClient = jest.fn(() => ({
  uploadImage: mockLeonardoUploadImage,
  generateFromImageId: mockLeonardoGenerateFromImageId,
  getGeneration: mockLeonardoGetGeneration,
}));

export const mockConfig = jest.fn(() => ({
  STORAGE_BUCKET: "test-bucket",
  LEONARDO_API_KEY: "test-key",
  LEONARDO_MODEL_ID: "test-model",
  LEONARDO_STYLE_ID: "test-style",
  LEONARDO_DEFAULT_PROMPTS: ["", "", "", ""] as [string, string, string, string],
}));

export const mockUseRuntimeConfig = jest.fn(() => ({
  public: {
    supabaseUrl: "https://test.supabase.co",
  },
}));

export const mockCreateSuccessResponse = jest.fn((data, message) => ({
  success: true,
  data,
  message,
}));

export const mockCreateErrorResponse = jest.fn((error) => ({
  success: false,
  error,
}));
