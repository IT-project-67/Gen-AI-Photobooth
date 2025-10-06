export interface CreateShareRequest {
  eventId: string;
  aiphotoId: string;
  expiresInSeconds?: number;
}

export interface GetShareByIdRequest {
  shareId: string;
}

export interface GetShareByEventRequest {
  eventId: string;
}
