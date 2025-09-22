export interface EventResponse {
  id: string;
  name: string;
  logoUrl?: string | null;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LogoUploadResponse {
  eventId: string;
  logoUrl: string;
  fileInfo: {
    name: string;
    type: string;
    size: number;
  };
}

export interface SignedUrlResponse {
  ok: boolean;
  url: string;
  expiresIn: number;
}

export interface EventListItem {
  id: string;
  name: string;
  logoUrl: string | null;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
