// server/utils/leonardo.ts
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
      throw new Error(`Leonardo API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  getUserInfo() {
    return this.request("/me");
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
}
