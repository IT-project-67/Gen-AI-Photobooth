export class LeonardoClient {
  private baseURL = "https://cloud.leonardo.ai/api/rest/v1";
  private apiKey: string;

  constructor(apiKey: string, baseURL?: string) {
    this.apiKey = apiKey;
    if (baseURL) this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const res = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Leonardo API Error Details:", {
        status: res.status,
        statusText: res.statusText,
        endpoint,
        body: options.body,
        response: errorText,
      });
      throw new Error(
        `Leonardo API error: ${res.status} ${res.statusText} - ${errorText}`,
      );
    }

    return res.json();
  }

  getUserInfo() {
    return this.request("/me");
  }

  async initImageUpload(extension: string = "jpg") {
    const response = await this.request<{
      uploadInitImage: {
        url: string;
        fields: string;
        id: string;
      };
    }>("/init-image", {
      method: "POST",
      body: JSON.stringify({ extension }),
    });

    return response.uploadInitImage;
  }

  async uploadToPresignedUrl(
    presignedUrl: string,
    fields: Record<string, string>,
    imageBuffer: Buffer,
  ) {
    const formData = new FormData();

    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const blob = new Blob([imageBuffer as never]);
    formData.append("file", blob);

    const res = await fetch(presignedUrl, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status}`);
    }
  }

  generateImage(prompt: string, options: Record<string, unknown> = {}) {
    return this.request("/generations", {
      method: "POST",
      body: JSON.stringify({ prompt, ...options }),
    });
  }

  getGeneration(id: string) {
    return this.request(`/generations/${id}`);
  }

  async uploadImage(imageBuffer: Buffer, extension: string = "jpg") {
    const { url, fields, id } = await this.initImageUpload(extension);
    await this.uploadToPresignedUrl(url, JSON.parse(fields), imageBuffer);
    return id;
  }

  async imageToImage(options: {
    prompt: string;
    initImageId: string;
    strength?: number;
    num_images?: number;
    width?: number;
    height?: number;
  }) {
    return this.request("/generations", {
      method: "POST",
      body: JSON.stringify({
        prompt: options.prompt,
        init_image_id: options.initImageId,
        init_strength: options.strength || 0.5,
        num_images: options.num_images || 1,
        width: options.width || 1024,
        height: options.height || 1024,
      }),
    });
  }

  async generateFromImageId(options: {
    prompt: string;
    modelId: string;
    styleId: string;
    initImageId: string;
    strength?: number;
    num_images?: number;
    width?: number;
    height?: number;
    isLandscape: boolean;
  }) {
    return this.request("/generations", {
      method: "POST",
      body: JSON.stringify({
        modelId: options.modelId,
        prompt: options.prompt,
        enhancePrompt: true,
        height: options.height || (options.isLandscape ? 832 : 1248),
        num_images: options.num_images || 1,
        styleUUID: options.styleId,
        width: options.width || (options.isLandscape ? 1248 : 832),
        contrastRatio: options.strength || 0.5,
        contextImages: [
          {
            type: "UPLOADED",
            id: options.initImageId,
          },
        ],
      }),
    });
  }
}
