import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { mockGetSession, mockFetch } from "~/tests/app/jest.setup";

// Mock URL.createObjectURL
const mockCreateObjectURL = jest.fn(() => "blob:http://localhost/test-blob");
global.URL.createObjectURL = mockCreateObjectURL as never;

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

describe("useEvent Composable", () => {
  let useEvent: typeof import("~/app/composables/useEvent").useEvent;

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

    mockCreateObjectURL.mockReturnValue("blob:http://localhost/test-blob");

    try {
      const module = await import("~/app/composables/useEvent");
      useEvent = module.useEvent;
    } catch (error) {
      console.error("Failed to import useEvent:", error);
      throw error;
    }
  });

  describe("Composable Structure", () => {
    it("should create composable instance", () => {
      const composable = useEvent();

      expect(composable).toBeDefined();
      expect(typeof composable.getAccessToken).toBe("function");
      expect(typeof composable.createEvent).toBe("function");
      expect(typeof composable.uploadEventLogo).toBe("function");
      expect(typeof composable.getEventLogoBlob).toBe("function");
      expect(typeof composable.getEventLogoSignedUrl).toBe("function");
      expect(typeof composable.getUserEvents).toBe("function");
      expect(typeof composable.getEventById).toBe("function");
      expect(typeof composable.blobToUrl).toBe("function");
    });

    it("should have all required methods", () => {
      const composable = useEvent();

      expect(typeof composable.getAccessToken).toBe("function");
      expect(typeof composable.createEvent).toBe("function");
      expect(typeof composable.uploadEventLogo).toBe("function");
      expect(typeof composable.getEventLogoBlob).toBe("function");
      expect(typeof composable.getEventLogoSignedUrl).toBe("function");
      expect(typeof composable.getUserEvents).toBe("function");
      expect(typeof composable.getEventById).toBe("function");
      expect(typeof composable.blobToUrl).toBe("function");
    });
  });

  describe("getAccessToken", () => {
    it("should return access token when session exists", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "test-token-123",
          },
        },
      } as never);

      const composable = useEvent();
      const token = await composable.getAccessToken();

      expect(token).toBe("test-token-123");
      expect(mockGetSession).toHaveBeenCalled();
    });

    it("should return null when session does not exist", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: null,
        },
      } as never);

      const composable = useEvent();
      const token = await composable.getAccessToken();

      expect(token).toBeNull();
    });

    it("should return null when access_token is undefined", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {},
        },
      } as never);

      const composable = useEvent();
      const token = await composable.getAccessToken();

      expect(token).toBeNull();
    });
  });

  describe("uploadEventLogo", () => {
    it("should upload logo successfully", async () => {
      const mockFile = new File(["logo content"], "logo.png", { type: "image/png" });
      const mockResponse = {
        data: {
          logoUrl: "https://storage.example.com/logos/event-123.png",
          eventId: "event-123",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.uploadEventLogo("event-123", mockFile);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/event/logo",
        expect.objectContaining({
          method: "POST",
          headers: { Authorization: "Bearer test-access-token" },
        }),
      );
      expect(result).toEqual(mockResponse.data);
    });

    it("should throw error when no access token", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      } as never);

      const mockFile = new File(["logo content"], "logo.png", { type: "image/png" });
      const composable = useEvent();

      await expect(composable.uploadEventLogo("event-123", mockFile)).rejects.toThrow(
        "No access token",
      );
    });

    it("should throw error when eventId is empty", async () => {
      const mockFile = new File(["logo content"], "logo.png", { type: "image/png" });
      const composable = useEvent();

      await expect(composable.uploadEventLogo("", mockFile)).rejects.toThrow("Missing eventId");
    });

    it("should handle API response without data field", async () => {
      const mockFile = new File(["logo content"], "logo.png", { type: "image/png" });
      const mockResponse = {
        logoUrl: "https://storage.example.com/logos/event-123.png",
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.uploadEventLogo("event-123", mockFile);

      expect(result).toEqual(mockResponse);
    });

    it("should handle upload with large file", async () => {
      const largeContent = new Array(1024 * 1024).fill("a").join("");
      const mockFile = new File([largeContent], "large-logo.png", { type: "image/png" });
      const mockResponse = {
        data: {
          logoUrl: "https://storage.example.com/logos/event-123.png",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.uploadEventLogo("event-123", mockFile);

      expect(result).toEqual(mockResponse.data);
    });

    it("should handle different file types", async () => {
      const mockFile = new File(["svg content"], "logo.svg", { type: "image/svg+xml" });
      const mockResponse = {
        data: {
          logoUrl: "https://storage.example.com/logos/event-123.svg",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.uploadEventLogo("event-123", mockFile);

      expect(result).toEqual(mockResponse.data);
    });

    it("should handle null response", async () => {
      const mockFile = new File(["logo"], "logo.png", { type: "image/png" });
      mockFetch.mockResolvedValue(null as never);

      const composable = useEvent();
      const result = await composable.uploadEventLogo("event-123", mockFile);

      expect(result).toBeNull();
    });

    it("should handle undefined response", async () => {
      const mockFile = new File(["logo"], "logo.png", { type: "image/png" });
      mockFetch.mockResolvedValue(undefined as never);

      const composable = useEvent();
      const result = await composable.uploadEventLogo("event-123", mockFile);

      expect(result).toBeUndefined();
    });
  });

  describe("getEventLogoBlob", () => {
    it("should fetch logo blob successfully", async () => {
      const mockBlob = new Blob(["logo data"], { type: "image/png" });
      const mockBlobFn = jest.fn(() => Promise.resolve(mockBlob));
      const mockResponse = {
        ok: true,
        blob: mockBlobFn,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.getEventLogoBlob("event-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/event/logo?eventId=event-123&mode=blob",
        expect.objectContaining({
          headers: { Authorization: "Bearer test-access-token" },
        }),
      );
      expect(result).toBe(mockBlob);
    });

    it("should throw error when no access token", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      } as never);

      const composable = useEvent();

      await expect(composable.getEventLogoBlob("event-123")).rejects.toThrow("No access token");
    });

    it("should throw error when eventId is empty", async () => {
      const composable = useEvent();

      await expect(composable.getEventLogoBlob("")).rejects.toThrow("Missing eventId");
    });

    it("should throw error when response is not ok", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: "Not Found",
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();

      await expect(composable.getEventLogoBlob("event-123")).rejects.toThrow(
        "Failed to fetch logo: 404 Not Found",
      );
    });

    it("should handle special characters in eventId", async () => {
      const mockBlob = new Blob(["logo data"], { type: "image/png" });
      const mockBlobFn = jest.fn(() => Promise.resolve(mockBlob));
      const mockResponse = {
        ok: true,
        blob: mockBlobFn,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      await composable.getEventLogoBlob("event-123-special-chars");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent("event-123-special-chars")),
        expect.any(Object),
      );
    });

    it("should handle 500 server error", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();

      await expect(composable.getEventLogoBlob("event-123")).rejects.toThrow(
        "Failed to fetch logo: 500 Internal Server Error",
      );
    });
  });

  describe("getEventLogoSignedUrl", () => {
    it("should get signed URL successfully with default expiration", async () => {
      const mockResponse = {
        data: {
          url: "https://signed-url.example.com/logo.png",
          expiresIn: 600,
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.getEventLogoSignedUrl("event-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/event/logo?eventId=event-123&mode=signed&expires=600",
        expect.objectContaining({
          headers: { Authorization: "Bearer test-access-token" },
        }),
      );
      expect(result).toEqual(mockResponse.data);
    });

    it("should get signed URL with custom expiration", async () => {
      const mockResponse = {
        data: {
          url: "https://signed-url.example.com/logo.png",
          expiresIn: 3600,
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.getEventLogoSignedUrl("event-123", 3600);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/event/logo?eventId=event-123&mode=signed&expires=3600",
        expect.any(Object),
      );
      expect(result).toEqual(mockResponse.data);
    });

    it("should throw error when no access token", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      } as never);

      const composable = useEvent();

      await expect(composable.getEventLogoSignedUrl("event-123")).rejects.toThrow(
        "No access token",
      );
    });

    it("should throw error when eventId is empty", async () => {
      const composable = useEvent();

      await expect(composable.getEventLogoSignedUrl("")).rejects.toThrow("Missing eventId");
    });

    it("should handle API response without data field", async () => {
      const mockResponse = {
        url: "https://signed-url.example.com/logo.png",
        expiresIn: 600,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.getEventLogoSignedUrl("event-123");

      expect(result).toEqual(mockResponse);
    });

    it("should handle very short expiration time", async () => {
      const mockResponse = {
        data: {
          url: "https://signed-url.example.com/logo.png",
          expiresIn: 60,
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.getEventLogoSignedUrl("event-123", 60);

      expect(result).toEqual(mockResponse.data);
    });

    it("should handle very long expiration time", async () => {
      const mockResponse = {
        data: {
          url: "https://signed-url.example.com/logo.png",
          expiresIn: 86400,
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.getEventLogoSignedUrl("event-123", 86400);

      expect(result).toEqual(mockResponse.data);
    });

    it("should handle null response", async () => {
      mockFetch.mockResolvedValue(null as never);

      const composable = useEvent();
      const result = await composable.getEventLogoSignedUrl("event-123");

      expect(result).toBeNull();
    });

    it("should handle undefined response", async () => {
      mockFetch.mockResolvedValue(undefined as never);

      const composable = useEvent();
      const result = await composable.getEventLogoSignedUrl("event-123");

      expect(result).toBeUndefined();
    });
  });

  describe("blobToUrl", () => {
    it("should convert blob to URL", () => {
      const mockBlob = new Blob(["test data"], { type: "image/png" });
      mockCreateObjectURL.mockReturnValue("blob:http://localhost/test-123");

      const composable = useEvent();
      const url = composable.blobToUrl(mockBlob);

      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(url).toBe("blob:http://localhost/test-123");
    });

    it("should handle different blob types", () => {
      const mockBlob = new Blob(["svg data"], { type: "image/svg+xml" });
      mockCreateObjectURL.mockReturnValue("blob:http://localhost/test-svg");

      const composable = useEvent();
      const url = composable.blobToUrl(mockBlob);

      expect(url).toBe("blob:http://localhost/test-svg");
    });

    it("should handle empty blob", () => {
      const mockBlob = new Blob([], { type: "image/png" });
      mockCreateObjectURL.mockReturnValue("blob:http://localhost/empty");

      const composable = useEvent();
      const url = composable.blobToUrl(mockBlob);

      expect(url).toBe("blob:http://localhost/empty");
    });
  });

  describe("createEvent", () => {
    it("should create event successfully with all fields", async () => {
      const eventData = {
        name: "Test Event",
        startDate: "2024-01-01",
        endDate: "2024-01-02",
        description: "Test Description",
        location: "Test Location",
      };

      const mockResponse = {
        data: {
          id: "event-123",
          ...eventData,
          createdAt: "2024-01-01T00:00:00Z",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.createEvent(eventData);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/event/create",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer test-access-token",
            "Content-Type": "application/json",
          },
          body: eventData,
        }),
      );
      expect(result).toEqual(mockResponse.data);
    });

    it("should create event with only required fields", async () => {
      const eventData = {
        name: "Minimal Event",
      };

      const mockResponse = {
        data: {
          id: "event-456",
          name: "Minimal Event",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.createEvent(eventData);

      expect(result).toEqual(mockResponse.data);
    });

    it("should throw error when no access token", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      } as never);

      const composable = useEvent();

      await expect(composable.createEvent({ name: "Test Event" })).rejects.toThrow(
        "No access token",
      );
    });

    it("should handle API response without data field", async () => {
      const eventData = {
        name: "Test Event",
      };

      const mockResponse = {
        id: "event-789",
        name: "Test Event",
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.createEvent(eventData);

      expect(result).toEqual(mockResponse);
    });

    it("should handle event with special characters", async () => {
      const eventData = {
        name: "Test Event 🎉",
        description: "Special characters description",
        location: "Beijing, China",
      };

      const mockResponse = {
        data: {
          id: "event-special",
          ...eventData,
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.createEvent(eventData);

      expect(result).toEqual(mockResponse.data);
    });

    it("should handle event with very long description", async () => {
      const longDescription = "a".repeat(10000);
      const eventData = {
        name: "Event with long description",
        description: longDescription,
      };

      const mockResponse = {
        data: {
          id: "event-long",
          ...eventData,
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.createEvent(eventData);

      expect(result).toEqual(mockResponse.data);
    });

    it("should handle event with empty optional fields", async () => {
      const eventData = {
        name: "Event",
        startDate: "",
        endDate: "",
        description: "",
        location: "",
      };

      const mockResponse = {
        data: {
          id: "event-empty",
          ...eventData,
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.createEvent(eventData);

      expect(result).toEqual(mockResponse.data);
    });

    it("should handle null response", async () => {
      mockFetch.mockResolvedValue(null as never);

      const composable = useEvent();
      const result = await composable.createEvent({ name: "Test" });

      expect(result).toBeNull();
    });

    it("should handle undefined response", async () => {
      mockFetch.mockResolvedValue(undefined as never);

      const composable = useEvent();
      const result = await composable.createEvent({ name: "Test" });

      expect(result).toBeUndefined();
    });
  });

  describe("getUserEvents", () => {
    it("should get user events successfully", async () => {
      const mockResponse = {
        data: [
          {
            id: "event-1",
            name: "Event 1",
            startDate: "2024-01-01",
          },
          {
            id: "event-2",
            name: "Event 2",
            startDate: "2024-02-01",
          },
        ],
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.getUserEvents();

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/event/get-events-by-user",
        expect.objectContaining({
          headers: { Authorization: "Bearer test-access-token" },
        }),
      );
      expect(result).toEqual(mockResponse.data);
    });

    it("should throw error when no access token", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      } as never);

      const composable = useEvent();

      await expect(composable.getUserEvents()).rejects.toThrow("No access token");
    });

    it("should handle empty event list", async () => {
      const mockResponse = {
        data: [],
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.getUserEvents();

      expect(result).toEqual([]);
    });

    it("should handle API response without data field", async () => {
      const mockResponse = [
        {
          id: "event-1",
          name: "Event 1",
        },
      ];

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.getUserEvents();

      expect(result).toEqual(mockResponse);
    });

    it("should handle large number of events", async () => {
      const events = Array.from({ length: 100 }, (_, i) => ({
        id: `event-${i}`,
        name: `Event ${i}`,
      }));

      const mockResponse = {
        data: events,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.getUserEvents();

      expect(result).toEqual(events);
      expect(result).toHaveLength(100);
    });

    it("should handle null response", async () => {
      mockFetch.mockResolvedValue(null as never);

      const composable = useEvent();
      const result = await composable.getUserEvents();

      expect(result).toBeNull();
    });

    it("should handle undefined response", async () => {
      mockFetch.mockResolvedValue(undefined as never);

      const composable = useEvent();
      const result = await composable.getUserEvents();

      expect(result).toBeUndefined();
    });
  });

  describe("getEventById", () => {
    it("should get event by id successfully", async () => {
      const mockResponse = {
        data: {
          id: "event-123",
          name: "Test Event",
          startDate: "2024-01-01",
          endDate: "2024-01-02",
          description: "Test Description",
          location: "Test Location",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.getEventById("event-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/event/get-event-by-id?id=event-123",
        expect.objectContaining({
          headers: { Authorization: "Bearer test-access-token" },
        }),
      );
      expect(result).toEqual(mockResponse.data);
    });

    it("should throw error when no access token", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      } as never);

      const composable = useEvent();

      await expect(composable.getEventById("event-123")).rejects.toThrow("No access token");
    });

    it("should handle API response without data field", async () => {
      const mockResponse = {
        id: "event-123",
        name: "Test Event",
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.getEventById("event-123");

      expect(result).toEqual(mockResponse);
    });

    it("should handle special characters in eventId", async () => {
      const mockResponse = {
        data: {
          id: "event-special-123",
          name: "Special Event",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      await composable.getEventById("event-special-123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent("event-special-123")),
        expect.any(Object),
      );
    });

    it("should handle event with all optional fields null", async () => {
      const mockResponse = {
        data: {
          id: "event-123",
          name: "Minimal Event",
          startDate: null,
          endDate: null,
          description: null,
          location: null,
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.getEventById("event-123");

      expect(result).toEqual(mockResponse.data);
    });

    it("should handle null response", async () => {
      mockFetch.mockResolvedValue(null as never);

      const composable = useEvent();
      const result = await composable.getEventById("event-123");

      expect(result).toBeNull();
    });

    it("should handle undefined response", async () => {
      mockFetch.mockResolvedValue(undefined as never);

      const composable = useEvent();
      const result = await composable.getEventById("event-123");

      expect(result).toBeUndefined();
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle network errors in createEvent", async () => {
      mockFetch.mockRejectedValue(new Error("Network error") as never);

      const composable = useEvent();

      await expect(composable.createEvent({ name: "Test" })).rejects.toThrow("Network error");
    });

    it("should handle network errors in getUserEvents", async () => {
      mockFetch.mockRejectedValue(new Error("Network timeout") as never);

      const composable = useEvent();

      await expect(composable.getUserEvents()).rejects.toThrow("Network timeout");
    });

    it("should handle network errors in uploadEventLogo", async () => {
      const mockFile = new File(["logo"], "logo.png", { type: "image/png" });
      mockFetch.mockRejectedValue(new Error("Upload failed") as never);

      const composable = useEvent();

      await expect(composable.uploadEventLogo("event-123", mockFile)).rejects.toThrow(
        "Upload failed",
      );
    });

    it("should handle session errors in getAccessToken", async () => {
      mockGetSession.mockRejectedValue(new Error("Session error") as never);

      const composable = useEvent();

      await expect(composable.getAccessToken()).rejects.toThrow("Session error");
    });

    it("should handle concurrent requests", async () => {
      const mockResponse = {
        data: {
          id: "event-123",
          name: "Test Event",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();

      const promises = [
        composable.getEventById("event-1"),
        composable.getEventById("event-2"),
        composable.getEventById("event-3"),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should handle API returning null data", async () => {
      const mockResponse = {
        data: null,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.getUserEvents();

      expect(result).toEqual(mockResponse);
    });

    it("should handle API returning undefined data", async () => {
      const mockResponse = {
        data: undefined,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.createEvent({ name: "Test" });

      expect(result).toEqual(mockResponse);
    });
  });

  describe("Realistic User Flows", () => {
    it("should complete full event creation and logo upload flow", async () => {
      // Step 1: Create event
      const eventData = {
        name: "New Conference",
        startDate: "2024-06-01",
        endDate: "2024-06-03",
        description: "Annual Tech Conference",
        location: "Convention Center",
      };

      const createResponse = {
        data: {
          id: "event-new",
          ...eventData,
        },
      };

      mockFetch.mockResolvedValueOnce(createResponse as never);

      const composable = useEvent();
      const event = await composable.createEvent(eventData);

      expect((event as { id: string }).id).toBe("event-new");

      // Step 2: Upload logo
      const mockFile = new File(["logo"], "logo.png", { type: "image/png" });
      const uploadResponse = {
        data: {
          logoUrl: "https://storage.example.com/logos/event-new.png",
          eventId: "event-new",
        },
      };

      mockFetch.mockResolvedValueOnce(uploadResponse as never);

      const uploadResult = await composable.uploadEventLogo("event-new", mockFile);

      expect((uploadResult as { eventId: string }).eventId).toBe("event-new");
    });

    it("should complete event list, detail, and logo retrieval flow", async () => {
      // Step 1: Get user events
      const eventsResponse = {
        data: [
          { id: "event-1", name: "Event 1" },
          { id: "event-2", name: "Event 2" },
        ],
      };

      mockFetch.mockResolvedValueOnce(eventsResponse as never);

      const composable = useEvent();
      const events = await composable.getUserEvents();

      expect(events).toHaveLength(2);

      // Step 2: Get event details
      const eventDetailResponse = {
        data: {
          id: "event-1",
          name: "Event 1",
          description: "Detailed description",
        },
      };

      mockFetch.mockResolvedValueOnce(eventDetailResponse as never);

      const eventDetail = await composable.getEventById("event-1");

      expect((eventDetail as { id: string }).id).toBe("event-1");

      // Step 3: Get logo blob
      const mockBlob = new Blob(["logo data"], { type: "image/png" });
      const mockBlobFn = jest.fn(() => Promise.resolve(mockBlob));
      const blobResponse = {
        ok: true,
        blob: mockBlobFn,
      };

      mockFetch.mockResolvedValueOnce(blobResponse as never);

      const logoBlob = await composable.getEventLogoBlob("event-1");
      const logoUrl = composable.blobToUrl(logoBlob);

      expect(logoUrl).toContain("blob:");
    });

    it("should handle event creation with logo URL flow", async () => {
      // Create event
      const eventData = { name: "Quick Event" };
      const createResponse = {
        data: { id: "event-quick", name: "Quick Event" },
      };

      mockFetch.mockResolvedValueOnce(createResponse as never);

      const composable = useEvent();
      await composable.createEvent(eventData);

      // Get signed URL for logo
      const signedUrlResponse = {
        data: {
          url: "https://signed-url.example.com/logo.png",
          expiresIn: 600,
        },
      };

      mockFetch.mockResolvedValueOnce(signedUrlResponse as never);

      const signedUrl = await composable.getEventLogoSignedUrl("event-quick");

      expect((signedUrl as { url: string; expiresIn: number }).url).toBeDefined();
      expect((signedUrl as { url: string; expiresIn: number }).expiresIn).toBe(600);
    });

    it("should handle multiple event operations in sequence", async () => {
      const composable = useEvent();

      // Create multiple events
      for (let i = 1; i <= 3; i++) {
        const mockResponse = {
          data: {
            id: `event-${i}`,
            name: `Event ${i}`,
          },
        };
        mockFetch.mockResolvedValueOnce(mockResponse as never);
        await composable.createEvent({ name: `Event ${i}` });
      }

      // Get all events
      const eventsResponse = {
        data: [
          { id: "event-1", name: "Event 1" },
          { id: "event-2", name: "Event 2" },
          { id: "event-3", name: "Event 3" },
        ],
      };

      mockFetch.mockResolvedValueOnce(eventsResponse as never);

      const events = await composable.getUserEvents();

      expect(events).toHaveLength(3);
      expect(mockFetch).toHaveBeenCalledTimes(4); // 3 creates + 1 get
    });
  });

  describe("Type Safety and Input Validation", () => {
    it("should handle undefined optional fields in createEvent", async () => {
      const eventData = {
        name: "Test Event",
        startDate: undefined,
        endDate: undefined,
        description: undefined,
        location: undefined,
      };

      const mockResponse = {
        data: {
          id: "event-123",
          name: "Test Event",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      const result = await composable.createEvent(eventData);

      expect(result).toBeDefined();
    });

    it("should encode special URL characters in eventId", async () => {
      const specialId = "event-123/with/slashes?and&params";
      const mockResponse = {
        data: {
          id: specialId,
          name: "Special Event",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      await composable.getEventById(specialId);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent(specialId)),
        expect.any(Object),
      );
    });

    it("should handle zero as expiresIn value", async () => {
      const mockResponse = {
        data: {
          url: "https://signed-url.example.com/logo.png",
          expiresIn: 0,
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      await composable.getEventLogoSignedUrl("event-123", 0);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("expires=0"),
        expect.any(Object),
      );
    });

    it("should handle negative expiresIn value", async () => {
      const mockResponse = {
        data: {
          url: "https://signed-url.example.com/logo.png",
          expiresIn: -1,
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useEvent();
      await composable.getEventLogoSignedUrl("event-123", -1);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("expires=-1"),
        expect.any(Object),
      );
    });
  });
});
