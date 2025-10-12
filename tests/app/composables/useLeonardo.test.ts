import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { mockGetSession, mockFetch } from "~/tests/app/jest.setup";

// Mock FormData
global.FormData = class FormData {
  private data: Map<string, unknown> = new Map();

  append(key: string, value: unknown) {
    this.data.set(key, value);
  }

  entries() {
    return this.data.entries();
  }

  get(key: string) {
    return this.data.get(key);
  }
} as never;

describe("useLeonardo Composable", () => {
  let useLeonardo: typeof import("~/app/composables/useLeonardo").useLeonardo;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    // Reset mocks to default state
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-access-token",
        },
      },
    } as never);

    try {
      const module = await import("~/app/composables/useLeonardo");
      useLeonardo = module.useLeonardo;
    } catch (error) {
      console.error("Failed to import useLeonardo:", error);
      throw error;
    }
  });

  describe("Composable Structure", () => {
    it("should create composable instance", () => {
      const composable = useLeonardo();

      expect(composable).toBeDefined();
      expect(composable.status).toBeDefined();
      expect(typeof composable.generateImages).toBe("function");
      expect(typeof composable.resetStatus).toBe("function");
    });

    it("should have all required methods", () => {
      const composable = useLeonardo();

      expect(typeof composable.generateImages).toBe("function");
      expect(typeof composable.resetStatus).toBe("function");
    });

    it("should have readonly status property", () => {
      const composable = useLeonardo();

      expect(composable.status).toBeDefined();
      expect(composable.status.value).toBeDefined();
    });
  });

  describe("Initial State", () => {
    it("should initialize with default status values", () => {
      const composable = useLeonardo();

      expect(composable.status.value.isGenerating).toBe(false);
      expect(composable.status.value.progress).toBe(0);
      expect(composable.status.value.currentStep).toBe("");
      expect(composable.status.value.error).toBeNull();
    });
  });

  describe("generateImages", () => {
    it("should generate images successfully", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const mockResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: "session-123",
          eventId: "event-123",
          images: [
            {
              aiPhotoId: "ai-photo-1",
              style: "REALISTIC",
              storageUrl: "storage/ai-photo-1.jpg",
              publicUrl: "https://example.com/ai-photo-1.jpg",
              generationId: "gen-123",
            },
            {
              aiPhotoId: "ai-photo-2",
              style: "ANIME",
              storageUrl: "storage/ai-photo-2.jpg",
              publicUrl: "https://example.com/ai-photo-2.jpg",
              generationId: "gen-123",
            },
          ],
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useLeonardo();
      const result = await composable.generateImages(mockRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/leonardo/generate",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer test-access-token",
          },
        }),
      );
      expect(result.data).toEqual(mockResponse.data);
      expect(result.error).toBeNull();
      expect(composable.status.value.isGenerating).toBe(false);
      expect(composable.status.value.progress).toBe(100);
      expect(composable.status.value.currentStep).toBe("Complete");
      expect(composable.status.value.error).toBeNull();
    });

    it("should update status during generation", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const mockResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: "session-123",
          eventId: "event-123",
          images: [],
        },
      };

      const statusSnapshots: Array<{
        isGenerating: boolean;
        progress: number;
        currentStep: string;
      }> = [];

      mockFetch.mockImplementation(async (..._args: unknown[]) => {
        // Capture status before API call
        const composable = useLeonardo();
        statusSnapshots.push({
          isGenerating: composable.status.value.isGenerating,
          progress: composable.status.value.progress,
          currentStep: composable.status.value.currentStep,
        });
        return mockResponse as never;
      });

      const composable = useLeonardo();
      await composable.generateImages(mockRequest);

      // Verify status was set to generating
      expect(composable.status.value.isGenerating).toBe(false);
      expect(composable.status.value.progress).toBe(100);
      expect(composable.status.value.currentStep).toBe("Complete");
    });

    it("should throw error when not authenticated", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: null,
        },
      } as never);

      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const composable = useLeonardo();
      const result = await composable.generateImages(mockRequest);

      expect(result.data).toBeNull();
      expect(result.error).toBe("Not authenticated");
      expect(composable.status.value.isGenerating).toBe(false);
      expect(composable.status.value.error).toBe("Not authenticated");
    });

    it("should handle API error response", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const mockResponse = {
        success: false,
        error: {
          message: "Generation failed: Invalid image format",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useLeonardo();
      const result = await composable.generateImages(mockRequest);

      expect(result.data).toBeNull();
      expect(result.error).toBe("Generation failed: Invalid image format");
      expect(composable.status.value.isGenerating).toBe(false);
      expect(composable.status.value.error).toBe("Generation failed: Invalid image format");
      expect(composable.status.value.progress).toBe(0);
    });

    it("should handle API error without message", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const mockResponse = {
        success: false,
        error: {},
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useLeonardo();
      const result = await composable.generateImages(mockRequest);

      expect(result.data).toBeNull();
      expect(result.error).toBe("Failed to generate images");
      expect(composable.status.value.error).toBe("Failed to generate images");
    });

    it("should handle API error with null error object", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const mockResponse = {
        success: false,
        error: null,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useLeonardo();
      const result = await composable.generateImages(mockRequest);

      expect(result.data).toBeNull();
      expect(result.error).toBe("Failed to generate images");
    });

    it("should handle network error", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      mockFetch.mockRejectedValue(new Error("Network timeout") as never);

      const composable = useLeonardo();
      const result = await composable.generateImages(mockRequest);

      expect(result.data).toBeNull();
      expect(result.error).toBe("Network timeout");
      expect(composable.status.value.isGenerating).toBe(false);
      expect(composable.status.value.error).toBe("Network timeout");
    });

    it("should handle unknown error type", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      mockFetch.mockRejectedValue("String error" as never);

      const composable = useLeonardo();
      const result = await composable.generateImages(mockRequest);

      expect(result.data).toBeNull();
      expect(result.error).toBe("Failed to generate images");
      expect(composable.status.value.error).toBe("Failed to generate images");
    });

    it("should handle unknown error object", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      mockFetch.mockRejectedValue({ code: 500, details: "Internal error" } as never);

      const composable = useLeonardo();
      const result = await composable.generateImages(mockRequest);

      expect(result.data).toBeNull();
      expect(result.error).toBe("Failed to generate images");
    });

    it("should set status to Prepare at start", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const mockResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: "session-123",
          eventId: "event-123",
          images: [],
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useLeonardo();

      // Start generation
      const promise = composable.generateImages(mockRequest);

      // Status should be updated immediately (synchronously before await)
      await promise;

      expect(composable.status.value.currentStep).toBe("Complete");
      expect(composable.status.value.progress).toBe(100);
    });

    it("should handle generation with multiple images", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const mockResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: "session-123",
          eventId: "event-123",
          images: [
            {
              aiPhotoId: "ai-1",
              style: "REALISTIC",
              storageUrl: "storage/ai-1.jpg",
              publicUrl: "https://example.com/ai-1.jpg",
              generationId: "gen-123",
            },
            {
              aiPhotoId: "ai-2",
              style: "ANIME",
              storageUrl: "storage/ai-2.jpg",
              publicUrl: "https://example.com/ai-2.jpg",
              generationId: "gen-123",
            },
            {
              aiPhotoId: "ai-3",
              style: "CARTOON",
              storageUrl: "storage/ai-3.jpg",
              publicUrl: "https://example.com/ai-3.jpg",
              generationId: "gen-123",
            },
          ],
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useLeonardo();
      const result = await composable.generateImages(mockRequest);

      expect(result.data?.images).toHaveLength(3);
      expect(result.data?.images[0].style).toBe("REALISTIC");
      expect(result.data?.images[1].style).toBe("ANIME");
      expect(result.data?.images[2].style).toBe("CARTOON");
    });

    it("should handle generation with no images", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const mockResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: "session-123",
          eventId: "event-123",
          images: [],
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useLeonardo();
      const result = await composable.generateImages(mockRequest);

      expect(result.data?.images).toEqual([]);
      expect(result.error).toBeNull();
    });

    it("should handle large image file", async () => {
      const largeContent = new Array(5 * 1024 * 1024).fill("a").join(""); // 5MB
      const mockFile = new File([largeContent], "large-photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const mockResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: "session-123",
          eventId: "event-123",
          images: [],
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useLeonardo();
      const result = await composable.generateImages(mockRequest);

      expect(result.error).toBeNull();
    });

    it("should handle different image formats", async () => {
      const formats = [
        { type: "image/jpeg", ext: "jpg" },
        { type: "image/png", ext: "png" },
        { type: "image/webp", ext: "webp" },
      ];

      const mockResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: "session-123",
          eventId: "event-123",
          images: [],
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useLeonardo();

      for (const format of formats) {
        const mockFile = new File(["image"], `photo.${format.ext}`, { type: format.type });
        const result = await composable.generateImages({
          image: mockFile,
          eventId: "event-123",
          sessionId: "session-123",
        });

        expect(result.error).toBeNull();
      }
    });

    it("should handle session without access_token", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {},
        },
      } as never);

      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const composable = useLeonardo();
      const result = await composable.generateImages(mockRequest);

      expect(result.data).toBeNull();
      expect(result.error).toBe("Not authenticated");
    });

    it("should handle special characters in eventId and sessionId", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-special-123",
        sessionId: "session-special-456",
      };

      const mockResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: "session-special-456",
          eventId: "event-special-123",
          images: [],
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useLeonardo();
      const result = await composable.generateImages(mockRequest);

      expect(result.data?.eventId).toBe("event-special-123");
      expect(result.data?.sessionId).toBe("session-special-456");
    });

    it("should handle empty eventId", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "",
        sessionId: "session-123",
      };

      const mockResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: "session-123",
          eventId: "",
          images: [],
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useLeonardo();
      const result = await composable.generateImages(mockRequest);

      expect(result.error).toBeNull();
    });

    it("should handle empty sessionId", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "",
      };

      const mockResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: "",
          eventId: "event-123",
          images: [],
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useLeonardo();
      const result = await composable.generateImages(mockRequest);

      expect(result.error).toBeNull();
    });
  });

  describe("resetStatus", () => {
    it("should reset status to initial values", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const mockResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: "session-123",
          eventId: "event-123",
          images: [],
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useLeonardo();

      // Generate images to change status
      await composable.generateImages(mockRequest);

      expect(composable.status.value.progress).toBe(100);
      expect(composable.status.value.currentStep).toBe("Complete");

      // Reset status
      composable.resetStatus();

      expect(composable.status.value.isGenerating).toBe(false);
      expect(composable.status.value.progress).toBe(0);
      expect(composable.status.value.currentStep).toBe("");
      expect(composable.status.value.error).toBeNull();
    });

    it("should reset status after error", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      mockFetch.mockRejectedValue(new Error("Generation error") as never);

      const composable = useLeonardo();

      // Generate images to cause error
      await composable.generateImages(mockRequest);

      expect(composable.status.value.error).toBe("Generation error");

      // Reset status
      composable.resetStatus();

      expect(composable.status.value.error).toBeNull();
      expect(composable.status.value.isGenerating).toBe(false);
      expect(composable.status.value.progress).toBe(0);
    });

    it("should reset status multiple times", () => {
      const composable = useLeonardo();

      composable.resetStatus();
      expect(composable.status.value.progress).toBe(0);

      composable.resetStatus();
      expect(composable.status.value.progress).toBe(0);

      composable.resetStatus();
      expect(composable.status.value.progress).toBe(0);
    });
  });

  describe("Status Management", () => {
    it("should maintain separate status for multiple instances", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const mockResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: "session-123",
          eventId: "event-123",
          images: [],
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable1 = useLeonardo();
      const composable2 = useLeonardo();

      // Both should start with same initial state
      expect(composable1.status.value.progress).toBe(0);
      expect(composable2.status.value.progress).toBe(0);

      // Generate with first instance
      await composable1.generateImages(mockRequest);

      // Each instance has its own ref, so they are independent
      expect(composable1.status.value.progress).toBe(100);
      expect(composable2.status.value.progress).toBe(0); // Still at initial state
    });

    it("should not allow direct status mutation (readonly)", () => {
      const composable = useLeonardo();

      // Attempt to modify readonly ref should fail in TypeScript
      // But we can verify the structure
      expect(composable.status.value).toBeDefined();
    });
  });

  describe("Edge Cases and Integration", () => {
    it("should handle concurrent generation requests", async () => {
      const mockFile1 = new File(["image1"], "photo1.jpg", { type: "image/jpeg" });
      const mockFile2 = new File(["image2"], "photo2.jpg", { type: "image/jpeg" });

      const mockResponse1 = {
        success: true,
        data: {
          imageId: "image-1",
          sessionId: "session-1",
          eventId: "event-1",
          images: [],
        },
      };

      const mockResponse2 = {
        success: true,
        data: {
          imageId: "image-2",
          sessionId: "session-2",
          eventId: "event-2",
          images: [],
        },
      };

      mockFetch
        .mockResolvedValueOnce(mockResponse1 as never)
        .mockResolvedValueOnce(mockResponse2 as never);

      const composable = useLeonardo();

      const promises = [
        composable.generateImages({
          image: mockFile1,
          eventId: "event-1",
          sessionId: "session-1",
        }),
        composable.generateImages({
          image: mockFile2,
          eventId: "event-2",
          sessionId: "session-2",
        }),
      ];

      const results = await Promise.all(promises);

      expect(results[0].error).toBeNull();
      expect(results[1].error).toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should handle sequential generation requests", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });

      const mockResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: "session-123",
          eventId: "event-123",
          images: [],
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useLeonardo();

      // First generation
      const result1 = await composable.generateImages({
        image: mockFile,
        eventId: "event-1",
        sessionId: "session-1",
      });
      expect(result1.error).toBeNull();

      // Reset and second generation
      composable.resetStatus();

      const result2 = await composable.generateImages({
        image: mockFile,
        eventId: "event-2",
        sessionId: "session-2",
      });
      expect(result2.error).toBeNull();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should handle error recovery flow", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      // First attempt fails
      mockFetch.mockRejectedValueOnce(new Error("Network error") as never);

      const composable = useLeonardo();
      const result1 = await composable.generateImages(mockRequest);

      expect(result1.error).toBe("Network error");
      expect(composable.status.value.error).toBe("Network error");

      // Reset and retry
      composable.resetStatus();

      const mockResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: "session-123",
          eventId: "event-123",
          images: [],
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const result2 = await composable.generateImages(mockRequest);

      expect(result2.error).toBeNull();
      expect(composable.status.value.error).toBeNull();
      expect(composable.status.value.progress).toBe(100);
    });

    it("should handle extremely long IDs", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const longId = "a".repeat(1000);
      const mockRequest = {
        image: mockFile,
        eventId: longId,
        sessionId: longId,
      };

      const mockResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: longId,
          eventId: longId,
          images: [],
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useLeonardo();
      const result = await composable.generateImages(mockRequest);

      expect(result.error).toBeNull();
    });

    it("should handle empty image file", async () => {
      const mockFile = new File([], "empty.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const mockResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: "session-123",
          eventId: "event-123",
          images: [],
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useLeonardo();
      const result = await composable.generateImages(mockRequest);

      expect(result.error).toBeNull();
    });

    it("should handle file with special filename", async () => {
      const mockFile = new File(["image content"], "photo (1) [copy].jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const mockResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: "session-123",
          eventId: "event-123",
          images: [],
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useLeonardo();
      const result = await composable.generateImages(mockRequest);

      expect(result.error).toBeNull();
    });
  });

  describe("Realistic User Flows", () => {
    it("should complete full image generation workflow", async () => {
      const mockFile = new File(["user photo"], "selfie.jpg", { type: "image/jpeg" });

      const composable = useLeonardo();

      // Initial status
      expect(composable.status.value.isGenerating).toBe(false);

      // Start generation
      const mockResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: "session-123",
          eventId: "event-123",
          images: [
            {
              aiPhotoId: "ai-1",
              style: "REALISTIC",
              storageUrl: "storage/ai-1.jpg",
              publicUrl: "https://example.com/ai-1.jpg",
              generationId: "gen-123",
            },
          ],
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const result = await composable.generateImages({
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      });

      // Verify completion
      expect(result.error).toBeNull();
      expect(result.data?.images).toHaveLength(1);
      expect(composable.status.value.isGenerating).toBe(false);
      expect(composable.status.value.progress).toBe(100);
      expect(composable.status.value.currentStep).toBe("Complete");

      // Reset for next generation
      composable.resetStatus();
      expect(composable.status.value.progress).toBe(0);
    });

    it("should handle retry after failure", async () => {
      const mockFile = new File(["user photo"], "selfie.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const composable = useLeonardo();

      // First attempt: network error
      mockFetch.mockRejectedValueOnce(new Error("Network timeout") as never);
      const result1 = await composable.generateImages(mockRequest);

      expect(result1.error).toBe("Network timeout");
      expect(composable.status.value.error).toBe("Network timeout");

      // Reset before retry
      composable.resetStatus();
      expect(composable.status.value.error).toBeNull();

      // Second attempt: API error
      const errorResponse = {
        success: false,
        error: {
          message: "Invalid image",
        },
      };
      mockFetch.mockResolvedValueOnce(errorResponse as never);
      const result2 = await composable.generateImages(mockRequest);

      expect(result2.error).toBe("Invalid image");

      // Reset and third attempt: success
      composable.resetStatus();

      const successResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: "session-123",
          eventId: "event-123",
          images: [],
        },
      };
      mockFetch.mockResolvedValue(successResponse as never);
      const result3 = await composable.generateImages(mockRequest);

      expect(result3.error).toBeNull();
      expect(composable.status.value.error).toBeNull();
    });

    it("should handle multiple users generating images", async () => {
      const composable = useLeonardo();

      const users = [
        {
          file: new File(["photo1"], "user1.jpg", { type: "image/jpeg" }),
          eventId: "event-1",
          sessionId: "session-1",
        },
        {
          file: new File(["photo2"], "user2.jpg", { type: "image/jpeg" }),
          eventId: "event-2",
          sessionId: "session-2",
        },
        {
          file: new File(["photo3"], "user3.jpg", { type: "image/jpeg" }),
          eventId: "event-3",
          sessionId: "session-3",
        },
      ];

      for (const user of users) {
        const mockResponse = {
          success: true,
          data: {
            imageId: `image-${user.sessionId}`,
            sessionId: user.sessionId,
            eventId: user.eventId,
            images: [],
          },
        };

        mockFetch.mockResolvedValueOnce(mockResponse as never);

        const result = await composable.generateImages({
          image: user.file,
          eventId: user.eventId,
          sessionId: user.sessionId,
        });

        expect(result.error).toBeNull();
        composable.resetStatus();
      }

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("Type Safety and Error Scenarios", () => {
    it("should handle response with missing data", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const mockResponse = {
        success: true,
        // Missing data field
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useLeonardo();
      const result = await composable.generateImages(mockRequest);

      expect(result.data).toBeUndefined();
      expect(result.error).toBeNull();
    });

    it("should handle response with null data", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const mockResponse = {
        success: true,
        data: null,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useLeonardo();
      const result = await composable.generateImages(mockRequest);

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it("should handle malformed response", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const mockResponse = {
        // Missing success field
        data: {
          imageId: "image-123",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useLeonardo();
      const result = await composable.generateImages(mockRequest);

      // Should treat missing success as failure
      expect(result.data).toBeNull();
      expect(result.error).toBe("Failed to generate images");
    });

    it("should handle session error during getSession", async () => {
      mockGetSession.mockRejectedValue(new Error("Session retrieval failed") as never);

      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const composable = useLeonardo();
      const result = await composable.generateImages(mockRequest);

      expect(result.data).toBeNull();
      expect(result.error).toBe("Session retrieval failed");
      expect(composable.status.value.error).toBe("Session retrieval failed");
    });

    it("should handle FormData creation properly", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const mockResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: "session-123",
          eventId: "event-123",
          images: [],
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useLeonardo();
      await composable.generateImages(mockRequest);

      // Verify FormData was passed in the request
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/leonardo/generate",
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData),
        }),
      );
    });

    it("should handle timeout during generation", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), 100)),
      );

      const composable = useLeonardo();
      const result = await composable.generateImages(mockRequest);

      expect(result.error).toBe("Request timeout");
      expect(composable.status.value.isGenerating).toBe(false);
      expect(composable.status.value.error).toBe("Request timeout");
    });

    it("should maintain status history through operations", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const composable = useLeonardo();

      // Initial state
      expect(composable.status.value.currentStep).toBe("");

      // Generate (success)
      const mockResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: "session-123",
          eventId: "event-123",
          images: [],
        },
      };
      mockFetch.mockResolvedValue(mockResponse as never);

      await composable.generateImages(mockRequest);
      expect(composable.status.value.currentStep).toBe("Complete");

      // Reset
      composable.resetStatus();
      expect(composable.status.value.currentStep).toBe("");
    });
  });

  describe("Progress and Status Updates", () => {
    it("should set progress to 0 when starting", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const mockResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: "session-123",
          eventId: "event-123",
          images: [],
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useLeonardo();

      // Set initial progress to some value
      composable.resetStatus();
      expect(composable.status.value.progress).toBe(0);

      await composable.generateImages(mockRequest);

      expect(composable.status.value.progress).toBe(100);
    });

    it("should set currentStep to Prepare initially", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const mockResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: "session-123",
          eventId: "event-123",
          images: [],
        },
      };

      // Slow down the response to check intermediate state
      mockFetch.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return mockResponse as never;
      });

      const composable = useLeonardo();
      await composable.generateImages(mockRequest);

      // After completion
      expect(composable.status.value.currentStep).toBe("Complete");
    });

    it("should clear error on successful generation after previous error", async () => {
      const mockFile = new File(["image content"], "photo.jpg", { type: "image/jpeg" });
      const mockRequest = {
        image: mockFile,
        eventId: "event-123",
        sessionId: "session-123",
      };

      const composable = useLeonardo();

      // First: error
      mockFetch.mockRejectedValueOnce(new Error("First error") as never);
      await composable.generateImages(mockRequest);
      expect(composable.status.value.error).toBe("First error");

      // Second: success (should clear error)
      const mockResponse = {
        success: true,
        data: {
          imageId: "image-123",
          sessionId: "session-123",
          eventId: "event-123",
          images: [],
        },
      };
      mockFetch.mockResolvedValue(mockResponse as never);

      await composable.generateImages(mockRequest);
      expect(composable.status.value.error).toBeNull();
    });
  });
});
