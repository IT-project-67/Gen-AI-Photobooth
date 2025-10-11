import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { Style } from "@prisma/client";
import {
  mockCreate,
  mockFindFirst,
  mockFindMany,
  mockFindUnique,
  mockUpdate,
} from "~/tests/server/mocks/mocks";

import {
  createAIPhoto,
  getAIPhotoById,
  getAIPhotosBySession,
  updateAIPhotoUrl,
} from "~/server/model/ai-photo.model";

jest.mock("~~/server/clients", () => ({
  prismaClient: {
    aIPhoto: {
      create: mockCreate,
      update: mockUpdate,
      findUnique: mockFindUnique,
      findFirst: mockFindFirst,
      findMany: mockFindMany,
    },
  },
}));

describe("AI Photo Model", () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("createAIPhoto", () => {
    it("should create AI photo with Anime style", async () => {
      const mockNewAIPhoto = {
        photoSessionId: "session1",
        style: Style.Anime,
        generatedUrl: "",
      };

      mockCreate.mockResolvedValue(mockNewAIPhoto as never);
      const result = await createAIPhoto("session1", Style.Anime);

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          photoSessionId: "session1",
          style: Style.Anime,
          generatedUrl: "",
        },
      });

      expect(result).toEqual(mockNewAIPhoto);
    });

    it("should create AI photo with Watercolor style", async () => {
      const mockNewAIPhoto = {
        photoSessionId: "session2",
        style: Style.Watercolor,
        generatedUrl: "",
      };

      mockCreate.mockResolvedValue(mockNewAIPhoto as never);
      const result = await createAIPhoto("session2", Style.Watercolor);

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          photoSessionId: "session2",
          style: Style.Watercolor,
          generatedUrl: "",
        },
      });
      expect(result.style).toBe(Style.Watercolor);
    });

    it("should create AI photo with Oil style", async () => {
      const mockNewAIPhoto = {
        photoSessionId: "session3",
        style: Style.Oil,
        generatedUrl: "",
      };

      mockCreate.mockResolvedValue(mockNewAIPhoto as never);
      const result = await createAIPhoto("session3", Style.Oil);

      expect(result.style).toBe(Style.Oil);
    });

    it("should create AI photo with Disney style", async () => {
      const mockNewAIPhoto = {
        photoSessionId: "session4",
        style: Style.Disney,
        generatedUrl: "",
      };

      mockCreate.mockResolvedValue(mockNewAIPhoto as never);
      const result = await createAIPhoto("session4", Style.Disney);

      expect(result.style).toBe(Style.Disney);
    });

    it("should always initialize with empty generatedUrl", async () => {
      const mockNewAIPhoto = {
        photoSessionId: "session1",
        style: Style.Anime,
        generatedUrl: "",
      };

      mockCreate.mockResolvedValue(mockNewAIPhoto as never);
      const result = await createAIPhoto("session1", Style.Anime);

      expect(result.generatedUrl).toBe("");
    });

    it("should handle database errors", async () => {
      mockCreate.mockRejectedValue(new Error("DB Error") as never);

      await expect(createAIPhoto("session1", Style.Anime)).rejects.toThrow("DB Error");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error creating AI photo:", expect.any(Error));
    });
  });

  describe("updateAIPhotoUrl", () => {
    it("should update AI photo URL correctly", async () => {
      const mockUpdatedAIPhoto = {
        id: "photo1",
        generatedUrl: "http://example.com/photo1.png",
      };

      mockUpdate.mockResolvedValue(mockUpdatedAIPhoto as never);
      const result = await updateAIPhotoUrl("photo1", "http://example.com/photo1.png");

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "photo1" },
        data: { generatedUrl: "http://example.com/photo1.png" },
      });

      expect(result).toEqual(mockUpdatedAIPhoto);
    });

    it("should update to empty URL string", async () => {
      const mockUpdatedAIPhoto = {
        id: "photo1",
        generatedUrl: "",
      };

      mockUpdate.mockResolvedValue(mockUpdatedAIPhoto as never);
      const result = await updateAIPhotoUrl("photo1", "");

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "photo1" },
        data: { generatedUrl: "" },
      });
      expect(result.generatedUrl).toBe("");
    });

    it("should update with different URL formats", async () => {
      const urls = [
        "https://storage.example.com/bucket/photo.jpg",
        "https://cdn.example.com/images/12345.webp",
        "/local/path/to/image.png",
      ];

      for (const url of urls) {
        const mockUpdatedAIPhoto = {
          id: "photo1",
          generatedUrl: url,
        };

        mockUpdate.mockResolvedValue(mockUpdatedAIPhoto as never);
        const result = await updateAIPhotoUrl("photo1", url);

        expect(result.generatedUrl).toBe(url);
      }
    });

    it("should handle database errors on update", async () => {
      mockUpdate.mockRejectedValue(new Error("DB Error") as never);

      await expect(updateAIPhotoUrl("photo1", "http://example.com/photo1.png")).rejects.toThrow(
        "DB Error",
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error updating AI photo URL:",
        expect.any(Error),
      );
    });
  });

  describe("getAIPhotoById", () => {
    it("should fetch AI photo by ID and user ID", async () => {
      const mockAIPhoto = {
        id: "photo1",
        photoSessionId: "session1",
        style: Style.Anime,
        generatedUrl: "http://example.com/photo1.png",
        photoSession: {
          id: "session1",
          eventId: "event1",
        },
      };

      mockFindFirst.mockResolvedValue(mockAIPhoto as never);
      const result = await getAIPhotoById("photo1", "user1");

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          id: "photo1",
          photoSession: {
            event: {
              profile: {
                userId: "user1",
                isDeleted: false,
              },
            },
          },
        },
        include: {
          photoSession: {
            select: {
              id: true,
              eventId: true,
            },
          },
        },
      });
      expect(result).toEqual(mockAIPhoto);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should return null when photo not found", async () => {
      mockFindFirst.mockResolvedValue(null as never);

      const result = await getAIPhotoById("nonexistent", "user1");

      expect(result).toBeNull();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should return null when photo belongs to different user", async () => {
      mockFindFirst.mockResolvedValue(null as never);

      const result = await getAIPhotoById("photo1", "wrongUser");

      expect(result).toBeNull();
      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "photo1",
            photoSession: expect.objectContaining({
              event: expect.objectContaining({
                profile: expect.objectContaining({
                  userId: "wrongUser",
                  isDeleted: false,
                }),
              }),
            }),
          }),
        }),
      );
    });

    it("should include photoSession data in response", async () => {
      const mockAIPhoto = {
        id: "photo1",
        photoSessionId: "session1",
        style: Style.Watercolor,
        generatedUrl: "http://example.com/photo1.png",
        photoSession: {
          id: "session1",
          eventId: "event1",
        },
      };

      mockFindFirst.mockResolvedValue(mockAIPhoto as never);
      const result = await getAIPhotoById("photo1", "user1");

      expect(result?.photoSession).toBeDefined();
      expect(result?.photoSession.id).toBe("session1");
      expect(result?.photoSession.eventId).toBe("event1");
    });

    it("should handle database errors on fetch by ID", async () => {
      mockFindFirst.mockRejectedValue(new Error("DB Error") as never);

      await expect(getAIPhotoById("photo1", "user1")).rejects.toThrow("DB Error");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching AI photos:", expect.any(Error));
    });
  });

  describe("getAIPhotosBySession", () => {
    it("should get AI photos by session ID with correct query", async () => {
      const mockAIPhotos = [
        {
          id: "photo1",
          photoSessionId: "session1",
          style: Style.Anime,
          generatedUrl: "http://example.com/photo1.png",
        },
        {
          id: "photo2",
          photoSessionId: "session1",
          style: Style.Oil,
          generatedUrl: "http://example.com/photo2.png",
        },
      ];

      mockFindMany.mockResolvedValue([...mockAIPhotos] as never);

      const result = await getAIPhotosBySession("session1", "user1");

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          photoSessionId: "session1",
          photoSession: {
            event: {
              profile: {
                userId: "user1",
                isDeleted: false,
              },
            },
          },
        },
      });
      expect(result).toHaveLength(2);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should sort photos by Style enum order (Anime, Watercolor, Oil, Disney)", async () => {
      const mockAIPhotos = [
        {
          id: "photo3",
          photoSessionId: "session1",
          style: Style.Disney,
          generatedUrl: "http://example.com/photo3.png",
        },
        {
          id: "photo1",
          photoSessionId: "session1",
          style: Style.Anime,
          generatedUrl: "http://example.com/photo1.png",
        },
        {
          id: "photo4",
          photoSessionId: "session1",
          style: Style.Oil,
          generatedUrl: "http://example.com/photo4.png",
        },
        {
          id: "photo2",
          photoSessionId: "session1",
          style: Style.Watercolor,
          generatedUrl: "http://example.com/photo2.png",
        },
      ];

      mockFindMany.mockResolvedValue([...mockAIPhotos] as never);
      const result = await getAIPhotosBySession("session1", "user1");

      expect(result).toHaveLength(4);
      expect(result[0].style).toBe(Style.Anime);
      expect(result[1].style).toBe(Style.Watercolor);
      expect(result[2].style).toBe(Style.Oil);
      expect(result[3].style).toBe(Style.Disney);
      expect(result[0].id).toBe("photo1");
      expect(result[1].id).toBe("photo2");
      expect(result[2].id).toBe("photo4");
      expect(result[3].id).toBe("photo3");
    });

    it("should return empty array when no photos found", async () => {
      mockFindMany.mockResolvedValue([] as never);

      const result = await getAIPhotosBySession("session1", "user1");

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should handle single photo correctly without sorting issues", async () => {
      const mockAIPhotos = [
        {
          id: "photo1",
          photoSessionId: "session1",
          style: Style.Watercolor,
          generatedUrl: "http://example.com/photo1.png",
        },
      ];

      mockFindMany.mockResolvedValue([...mockAIPhotos] as never);
      const result = await getAIPhotosBySession("session1", "user1");

      expect(result).toHaveLength(1);
      expect(result[0].style).toBe(Style.Watercolor);
      expect(result[0].id).toBe("photo1");
    });

    it("should sort when all styles are present", async () => {
      const mockAIPhotos = [
        {
          id: "photo4",
          photoSessionId: "session1",
          style: Style.Disney,
          generatedUrl: "http://example.com/photo4.png",
        },
        {
          id: "photo2",
          photoSessionId: "session1",
          style: Style.Watercolor,
          generatedUrl: "http://example.com/photo2.png",
        },
        {
          id: "photo1",
          photoSessionId: "session1",
          style: Style.Anime,
          generatedUrl: "http://example.com/photo1.png",
        },
        {
          id: "photo3",
          photoSessionId: "session1",
          style: Style.Oil,
          generatedUrl: "http://example.com/photo3.png",
        },
      ];

      mockFindMany.mockResolvedValue([...mockAIPhotos] as never);
      const result = await getAIPhotosBySession("session1", "user1");

      expect(result).toHaveLength(4);
      const styles = result.map((photo) => photo.style);
      expect(styles).toEqual([Style.Anime, Style.Watercolor, Style.Oil, Style.Disney]);
    });

    it("should handle duplicate styles correctly", async () => {
      const mockAIPhotos = [
        {
          id: "photo2",
          photoSessionId: "session1",
          style: Style.Anime,
          generatedUrl: "http://example.com/photo2.png",
        },
        {
          id: "photo1",
          photoSessionId: "session1",
          style: Style.Anime,
          generatedUrl: "http://example.com/photo1.png",
        },
        {
          id: "photo3",
          photoSessionId: "session1",
          style: Style.Oil,
          generatedUrl: "http://example.com/photo3.png",
        },
      ];

      mockFindMany.mockResolvedValue([...mockAIPhotos] as never);
      const result = await getAIPhotosBySession("session1", "user1");

      expect(result).toHaveLength(3);
      expect(result[0].style).toBe(Style.Anime);
      expect(result[1].style).toBe(Style.Anime);
      expect(result[2].style).toBe(Style.Oil);
    });

    it("should filter by userId correctly", async () => {
      mockFindMany.mockResolvedValue([] as never);

      await getAIPhotosBySession("session1", "specificUser");

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          photoSessionId: "session1",
          photoSession: {
            event: {
              profile: {
                userId: "specificUser",
                isDeleted: false,
              },
            },
          },
        },
      });
    });

    it("should handle database errors on fetching by session", async () => {
      mockFindMany.mockRejectedValue(new Error("DB Error") as never);

      await expect(getAIPhotosBySession("session1", "user1")).rejects.toThrow("DB Error");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching AI photos:", expect.any(Error));
    });
  });
});
