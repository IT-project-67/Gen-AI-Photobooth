export interface UserData {
  id: string;
  email: string;
  email_confirmed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
  user: UserData;
}
