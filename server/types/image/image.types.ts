export type MergeOptions = {
  logoSize?: {
    width: number;
    height: number;
  };
  borderWidth?: number;
  borderColor?: string;
  quality?: number;
  outputFormat?: "jpeg" | "png" | "webp";
};

export type ImageMergeResult = {
  data: Buffer;
  mimeType: string;
  dimensions: {
    width: number;
    height: number;
  };
};

export type ImagePosition = {
  x: number;
  y: number;
};
