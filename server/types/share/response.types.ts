export interface CreateShareResponse {
  shareId: string;
  qrCodeUrl: string;
  expiresAt: string;
  shareUrl: string;
}

export interface GetShareResponse {
  id: string;
  eventId: string;
  aiphotoId: string;
  selectedUrl: string;
  qrCodeUrl: string;
  qrExpiresAt: string;
  createdAt: string;
  event: {
    id: string;
    name: string;
  };
  aiPhoto: {
    id: string;
    style: string;
    generatedUrl: string;
  };
}

export interface GetSharesByEventResponse {
  shares: GetShareResponse[];
}
