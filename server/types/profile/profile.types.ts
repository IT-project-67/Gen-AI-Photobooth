export interface UpdateProfileRequest {
  displayName?: string;
  organization?: string;
}

export interface ProfileResponse {
  userId: string;
  displayName?: string | null;
  organization?: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}
