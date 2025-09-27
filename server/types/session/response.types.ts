export interface SessionResponse {
  sessionId: string;
  eventId: string;
  createdAt: string;
}

export interface SessionGetResponse {
  id: string;
  eventId: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoUploadResponse {
  sessionId: string;
  photoUrl: string;
  fileInfo: {
    name: string;
    type: string;
    size: number;
  };
}
