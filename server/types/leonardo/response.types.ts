export interface GenerationResponse {
  sdGenerationJob: {
    generationId: string;
  };
}

export interface GenerationStatusResponse {
  generations_by_pk: {
    status: "PENDING" | "COMPLETE" | "FAILED";
    generated_images: Array<{
      url: string;
      id: string;
    }>;
  };
}
