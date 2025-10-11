import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

import {
  mockCreate,
  mockFindFirst,
  mockFindMany,
} from "~/tests/server/mocks/mocks";

import {
  createSharedPhoto,
  getSharedPhotoById,
  getSharedPhotosByEvent,
  getSharedPhotoByAIPhoto,
} from "~/server/model/share-photo.model";

jest.mock("~~/server/clients", () => ({
  prismaClient: {
    sharedPhoto: {
      create: mockCreate,
      findFirst: mockFindFirst,
      findMany: mockFindMany,
    },
  },
}));

describe("Share Photo Model", () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("createSharedPhoto", () => {
    it("should create shared photo with all required fields", async () => {
      const qrExpiresAt = new Date("2023-12-31");
      const createdAt = new Date("2023-01-01");

      const mockSharedPhoto = {
        id: "share1",
        aiPhotoId: "photo1",
        eventId: "event1",
        selectedUrl: "http://example.com/selected.jpg",
        qrCodeUrl: "http://example.com/qr.png",
        qrExpiresAt,
        createdAt,
      };

      mockCreate.mockResolvedValue(mockSharedPhoto as never);
      const result = await createSharedPhoto(
        "photo1",
        "event1",
        "http://example.com/selected.jpg",
        "http://example.com/qr.png",
        qrExpiresAt,
      );

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          aiPhotoId: "photo1",
          eventId: "event1",
          selectedUrl: "http://example.com/selected.jpg",
          qrCodeUrl: "http://example.com/qr.png",
          qrExpiresAt,
        },
      });

      expect(result).toEqual({
        id: "share1",
        aiPhotoId: "photo1",
        eventId: "event1",
        selectedUrl: "http://example.com/selected.jpg",
        qrCodeUrl: "http://example.com/qr.png",
        qrExpiresAt,
        createdAt,
      });
    });

    it("should return SharedPhotoData with correct structure", async () => {
      const qrExpiresAt = new Date("2023-12-31");
      const createdAt = new Date("2023-01-01");

      const mockSharedPhoto = {
        id: "share1",
        aiPhotoId: "photo1",
        eventId: "event1",
        selectedUrl: "http://example.com/selected.jpg",
        qrCodeUrl: "http://example.com/qr.png",
        qrExpiresAt,
        createdAt,
      };

      mockCreate.mockResolvedValue(mockSharedPhoto as never);
      const result = await createSharedPhoto(
        "photo1",
        "event1",
        "http://example.com/selected.jpg",
        "http://example.com/qr.png",
        qrExpiresAt,
      );

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("aiPhotoId");
      expect(result).toHaveProperty("eventId");
      expect(result).toHaveProperty("selectedUrl");
      expect(result).toHaveProperty("qrCodeUrl");
      expect(result).toHaveProperty("qrExpiresAt");
      expect(result).toHaveProperty("createdAt");
    });

    it("should create shared photo with different URLs", async () => {
      const urls = [
        {
          selected: "https://storage.example.com/photo1.jpg",
          qr: "https://storage.example.com/qr1.png",
        },
        {
          selected: "https://cdn.example.com/images/photo2.webp",
          qr: "https://cdn.example.com/qr2.png",
        },
        {
          selected: "/local/path/photo3.png",
          qr: "/local/path/qr3.png",
        },
      ];

      for (const urlPair of urls) {
        const mockSharedPhoto = {
          id: "share1",
          aiPhotoId: "photo1",
          eventId: "event1",
          selectedUrl: urlPair.selected,
          qrCodeUrl: urlPair.qr,
          qrExpiresAt: new Date(),
          createdAt: new Date(),
        };

        mockCreate.mockResolvedValue(mockSharedPhoto as never);
        const result = await createSharedPhoto(
          "photo1",
          "event1",
          urlPair.selected,
          urlPair.qr,
          new Date(),
        );

        expect(result.selectedUrl).toBe(urlPair.selected);
        expect(result.qrCodeUrl).toBe(urlPair.qr);
      }
    });

    it("should create shared photo with future expiration date", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const mockSharedPhoto = {
        id: "share1",
        aiPhotoId: "photo1",
        eventId: "event1",
        selectedUrl: "http://example.com/photo.jpg",
        qrCodeUrl: "http://example.com/qr.png",
        qrExpiresAt: futureDate,
        createdAt: new Date(),
      };

      mockCreate.mockResolvedValue(mockSharedPhoto as never);
      const result = await createSharedPhoto(
        "photo1",
        "event1",
        "http://example.com/photo.jpg",
        "http://example.com/qr.png",
        futureDate,
      );

      expect(result.qrExpiresAt).toEqual(futureDate);
    });

    it("should handle database errors", async () => {
      mockCreate.mockRejectedValue(new Error("DB Error") as never);

      await expect(
        createSharedPhoto(
          "photo1",
          "event1",
          "http://example.com/photo.jpg",
          "http://example.com/qr.png",
          new Date(),
        ),
      ).rejects.toThrow("DB Error");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error creating shared photo:",
        expect.any(Error),
      );
    });
  });

  describe("getSharedPhotoById", () => {
    it("should fetch shared photo with related data", async () => {
      const mockSharedPhoto = {
        id: "share1",
        aiPhotoId: "photo1",
        eventId: "event1",
        selectedUrl: "http://example.com/selected.jpg",
        qrCodeUrl: "http://example.com/qr.png",
        qrExpiresAt: new Date("2023-12-31"),
        createdAt: new Date("2023-01-01"),
        event: {
          id: "event1",
          name: "Test Event",
        },
        aiPhoto: {
          id: "photo1",
          style: "Anime",
          generatedUrl: "http://example.com/generated.jpg",
        },
      };

      mockFindFirst.mockResolvedValue(mockSharedPhoto as never);
      const result = await getSharedPhotoById("share1");

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          id: "share1",
        },
        include: {
          event: {
            select: {
              id: true,
              name: true,
            },
          },
          aiPhoto: {
            select: {
              id: true,
              style: true,
              generatedUrl: true,
            },
          },
        },
      });

      expect(result).toEqual(mockSharedPhoto);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should return null when shared photo not found", async () => {
      mockFindFirst.mockResolvedValue(null as never);

      const result = await getSharedPhotoById("nonexistent");

      expect(result).toBeNull();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should include event data in response", async () => {
      const mockSharedPhoto = {
        id: "share1",
        aiPhotoId: "photo1",
        eventId: "event1",
        selectedUrl: "http://example.com/photo.jpg",
        qrCodeUrl: "http://example.com/qr.png",
        qrExpiresAt: new Date(),
        createdAt: new Date(),
        event: {
          id: "event1",
          name: "Annual Conference",
        },
        aiPhoto: {
          id: "photo1",
          style: "Watercolor",
          generatedUrl: "http://example.com/gen.jpg",
        },
      };

      mockFindFirst.mockResolvedValue(mockSharedPhoto as never);
      const result = await getSharedPhotoById("share1");

      expect(result?.event).toBeDefined();
      expect(result?.event.id).toBe("event1");
      expect(result?.event.name).toBe("Annual Conference");
    });

    it("should include aiPhoto data in response", async () => {
      const mockSharedPhoto = {
        id: "share1",
        aiPhotoId: "photo1",
        eventId: "event1",
        selectedUrl: "http://example.com/photo.jpg",
        qrCodeUrl: "http://example.com/qr.png",
        qrExpiresAt: new Date(),
        createdAt: new Date(),
        event: {
          id: "event1",
          name: "Test Event",
        },
        aiPhoto: {
          id: "photo1",
          style: "Disney",
          generatedUrl: "http://example.com/disney.jpg",
        },
      };

      mockFindFirst.mockResolvedValue(mockSharedPhoto as never);
      const result = await getSharedPhotoById("share1");

      expect(result?.aiPhoto).toBeDefined();
      expect(result?.aiPhoto.id).toBe("photo1");
      expect(result?.aiPhoto.style).toBe("Disney");
      expect(result?.aiPhoto.generatedUrl).toBe("http://example.com/disney.jpg");
    });

    it("should handle database errors", async () => {
      mockFindFirst.mockRejectedValue(new Error("DB Error") as never);

      await expect(getSharedPhotoById("share1")).rejects.toThrow("DB Error");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error fetching shared photo by ID:",
        expect.any(Error),
      );
    });
  });

  describe("getSharedPhotosByEvent", () => {
    it("should fetch shared photos by eventId with desc order", async () => {
      const mockSharedPhotos = [
        {
          id: "share2",
          aiPhotoId: "photo2",
          eventId: "event1",
          selectedUrl: "http://example.com/photo2.jpg",
          qrCodeUrl: "http://example.com/qr2.png",
          qrExpiresAt: new Date("2023-12-31"),
          createdAt: new Date("2023-06-01"),
          event: {
            id: "event1",
            name: "Test Event",
          },
          aiPhoto: {
            id: "photo2",
            style: "Oil",
            generatedUrl: "http://example.com/gen2.jpg",
          },
        },
        {
          id: "share1",
          aiPhotoId: "photo1",
          eventId: "event1",
          selectedUrl: "http://example.com/photo1.jpg",
          qrCodeUrl: "http://example.com/qr1.png",
          qrExpiresAt: new Date("2023-12-31"),
          createdAt: new Date("2023-01-01"),
          event: {
            id: "event1",
            name: "Test Event",
          },
          aiPhoto: {
            id: "photo1",
            style: "Anime",
            generatedUrl: "http://example.com/gen1.jpg",
          },
        },
      ];

      mockFindMany.mockResolvedValue(mockSharedPhotos as never);
      const result = await getSharedPhotosByEvent("event1");

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { eventId: "event1" },
        include: {
          event: {
            select: {
              id: true,
              name: true,
            },
          },
          aiPhoto: {
            select: {
              id: true,
              style: true,
              generatedUrl: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      expect(result).toEqual(mockSharedPhotos);
      expect(result).toHaveLength(2);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should return empty array when no shared photos found", async () => {
      mockFindMany.mockResolvedValue([] as never);

      const result = await getSharedPhotosByEvent("event1");

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should handle single shared photo", async () => {
      const mockSharedPhotos = [
        {
          id: "share1",
          aiPhotoId: "photo1",
          eventId: "event1",
          selectedUrl: "http://example.com/photo.jpg",
          qrCodeUrl: "http://example.com/qr.png",
          qrExpiresAt: new Date(),
          createdAt: new Date(),
          event: {
            id: "event1",
            name: "Test Event",
          },
          aiPhoto: {
            id: "photo1",
            style: "Anime",
            generatedUrl: "http://example.com/gen.jpg",
          },
        },
      ];

      mockFindMany.mockResolvedValue(mockSharedPhotos as never);
      const result = await getSharedPhotosByEvent("event1");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("share1");
    });

    it("should order by createdAt desc", async () => {
      mockFindMany.mockResolvedValue([] as never);

      await getSharedPhotosByEvent("event1");

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        }),
      );
    });

    it("should include event and aiPhoto relations", async () => {
      mockFindMany.mockResolvedValue([] as never);

      await getSharedPhotosByEvent("event1");

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            event: {
              select: {
                id: true,
                name: true,
              },
            },
            aiPhoto: {
              select: {
                id: true,
                style: true,
                generatedUrl: true,
              },
            },
          },
        }),
      );
    });

    it("should filter by eventId correctly", async () => {
      mockFindMany.mockResolvedValue([] as never);

      await getSharedPhotosByEvent("specific-event");

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: "specific-event" },
        }),
      );
    });

    it("should handle database errors", async () => {
      mockFindMany.mockRejectedValue(new Error("DB Error") as never);

      await expect(getSharedPhotosByEvent("event1")).rejects.toThrow("DB Error");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error fetching shared photos by event:",
        expect.any(Error),
      );
    });
  });

  describe("getSharedPhotoByAIPhoto", () => {
    it("should fetch shared photo by AI photo ID", async () => {
      const mockSharedPhoto = {
        id: "share1",
        aiPhotoId: "photo1",
        eventId: "event1",
        selectedUrl: "http://example.com/selected.jpg",
        qrCodeUrl: "http://example.com/qr.png",
        qrExpiresAt: new Date("2023-12-31"),
        createdAt: new Date("2023-01-01"),
        event: {
          id: "event1",
          name: "Test Event",
        },
        aiPhoto: {
          id: "photo1",
          style: "Anime",
          generatedUrl: "http://example.com/generated.jpg",
        },
      };

      mockFindFirst.mockResolvedValue(mockSharedPhoto as never);
      const result = await getSharedPhotoByAIPhoto("photo1");

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { aiPhotoId: "photo1" },
        include: {
          event: {
            select: {
              id: true,
              name: true,
            },
          },
          aiPhoto: {
            select: {
              id: true,
              style: true,
              generatedUrl: true,
            },
          },
        },
      });

      expect(result).toEqual(mockSharedPhoto);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should return null when shared photo not found", async () => {
      mockFindFirst.mockResolvedValue(null as never);

      const result = await getSharedPhotoByAIPhoto("nonexistent");

      expect(result).toBeNull();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should return null when AI photo has no shared photo", async () => {
      mockFindFirst.mockResolvedValue(null as never);

      const result = await getSharedPhotoByAIPhoto("unshared-photo");

      expect(result).toBeNull();
    });

    it("should include event data in response", async () => {
      const mockSharedPhoto = {
        id: "share1",
        aiPhotoId: "photo1",
        eventId: "event1",
        selectedUrl: "http://example.com/photo.jpg",
        qrCodeUrl: "http://example.com/qr.png",
        qrExpiresAt: new Date(),
        createdAt: new Date(),
        event: {
          id: "event1",
          name: "Birthday Party",
        },
        aiPhoto: {
          id: "photo1",
          style: "Watercolor",
          generatedUrl: "http://example.com/gen.jpg",
        },
      };

      mockFindFirst.mockResolvedValue(mockSharedPhoto as never);
      const result = await getSharedPhotoByAIPhoto("photo1");

      expect(result?.event).toBeDefined();
      expect(result?.event.id).toBe("event1");
      expect(result?.event.name).toBe("Birthday Party");
    });

    it("should include aiPhoto data in response", async () => {
      const mockSharedPhoto = {
        id: "share1",
        aiPhotoId: "photo1",
        eventId: "event1",
        selectedUrl: "http://example.com/photo.jpg",
        qrCodeUrl: "http://example.com/qr.png",
        qrExpiresAt: new Date(),
        createdAt: new Date(),
        event: {
          id: "event1",
          name: "Test Event",
        },
        aiPhoto: {
          id: "photo1",
          style: "Oil",
          generatedUrl: "http://example.com/oil.jpg",
        },
      };

      mockFindFirst.mockResolvedValue(mockSharedPhoto as never);
      const result = await getSharedPhotoByAIPhoto("photo1");

      expect(result?.aiPhoto).toBeDefined();
      expect(result?.aiPhoto.id).toBe("photo1");
      expect(result?.aiPhoto.style).toBe("Oil");
      expect(result?.aiPhoto.generatedUrl).toBe("http://example.com/oil.jpg");
    });

    it("should filter by aiPhotoId correctly", async () => {
      mockFindFirst.mockResolvedValue(null as never);

      await getSharedPhotoByAIPhoto("specific-photo");

      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { aiPhotoId: "specific-photo" },
        }),
      );
    });

    it("should handle database errors", async () => {
      mockFindFirst.mockRejectedValue(new Error("DB Error") as never);

      await expect(getSharedPhotoByAIPhoto("photo1")).rejects.toThrow("DB Error");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error fetching shared photo by AI photo ID:",
        expect.any(Error),
      );
    });
  });
});

