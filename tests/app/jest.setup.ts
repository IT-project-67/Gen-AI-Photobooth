import { jest } from "@jest/globals";
import { ref as vueRef, readonly as vueReadonly } from "vue";

const mockGetSession = jest.fn(() =>
  Promise.resolve({
    data: {
      session: {
        access_token: "default-test-token",
      },
    },
  })
);

const mockSetSession = jest.fn((..._args: unknown[]) => Promise.resolve({ error: null }));
const mockSignOut = jest.fn((..._args: unknown[]) => Promise.resolve({ error: null }));
const mockUpdateUser = jest.fn((..._args: unknown[]) => Promise.resolve({ error: null }));
const mockSignInWithOAuth = jest.fn((..._args: unknown[]) => Promise.resolve({ error: null }));

const mockUser = vueRef(null);

const mockUseSupabaseClient = jest.fn(() => ({
  auth: {
    getSession: mockGetSession,
    setSession: mockSetSession,
    signOut: mockSignOut,
    updateUser: mockUpdateUser,
    signInWithOAuth: mockSignInWithOAuth,
  },
}));

const mockUseSupabaseUser = jest.fn(() => mockUser);

const mockFetch = jest.fn<(url?: string, options?: unknown) => Promise<unknown>>();

const mockNavigateTo = jest.fn(() => Promise.resolve());

declare global {
  var ref: typeof vueRef;
  var readonly: typeof vueReadonly;
  function useSupabaseClient(): ReturnType<typeof mockUseSupabaseClient>;
  function useSupabaseUser(): typeof mockUser;
  function $fetch<T = unknown>(url: string, options?: unknown): Promise<T>;
  function navigateTo(path: string): Promise<void>;
}

globalThis.ref = vueRef;
globalThis.readonly = vueReadonly;
globalThis.useSupabaseClient = mockUseSupabaseClient as never;
globalThis.useSupabaseUser = mockUseSupabaseUser as never;
globalThis.$fetch = mockFetch as never;
globalThis.fetch = mockFetch as never;
globalThis.navigateTo = mockNavigateTo as never;

export { 
  mockGetSession, 
  mockSetSession, 
  mockSignOut, 
  mockUpdateUser,
  mockSignInWithOAuth,
  mockUser,
  mockUseSupabaseClient,
  mockUseSupabaseUser, 
  mockFetch,
  mockNavigateTo
};

