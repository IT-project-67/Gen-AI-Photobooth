export type UploadFile = {
  name: string;
  type: string;
  data: Buffer;
  size: number;
};

export type UploadOptions = {
  bucket: string;
  path: string;
  upsert?: boolean;
  cacheControl?: string;
};

export type ValidationOptions = {
  allowTypes?: string[];
  allowExts?: string[];
  maxSize?: number;
};

export type FilePart = {
  filename?: string | null;
  type?: string | null;
  data?: Buffer | string | Uint8Array | null;
};

export type UploadResult = {
  path: string;
  url?: string;
};

export type ValidationError = {
  code: string;
  message: string;
  field?: string;
};
