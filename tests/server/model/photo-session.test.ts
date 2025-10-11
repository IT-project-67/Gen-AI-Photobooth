import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

import {
  mockCreate,
  mockFindFirst,
  mockUpdate,
} from "~/tests/server/mocks/mocks";

import {
  createPhotoSession,
  getPhotoSessionById,
  updatePhotoSessionPhotoUrl,
} from "~/server/model/photo-session.model";

jest.mock("~~/server/clients", () => ({
  prismaClient: {
    photoSession: {
      create: mockCreate,
      update: mockUpdate,
      findFirst: mockFindFirst,
    },
  },
}));

describe("Photo Session Model", () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("createPhotoSession", () => {
    it("should create photo session with eventId", async () => {
      const mockPhotoSession = {
        id: "session1",
        eventId: "event1",
        photoUrl: null,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      };

      mockCreate.mockResolvedValue(mockPhotoSession as never);
      const result = await createPhotoSession("event1");

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          eventId: "event1",
        },
      });

      expect(result).toEqual(mockPhotoSession);
    });

    it("should create photo session with different eventIds", async () => {
      const eventIds = ["event-abc", "event-123", "event-xyz"];

      for (const eventId of eventIds) {
        const mockPhotoSession = {
          id: `session-${eventId}`,
          eventId,
          photoUrl: null,
        };

        mockCreate.mockResolvedValue(mockPhotoSession as never);
        const result = await createPhotoSession(eventId);

        expect(mockCreate).toHaveBeenCalledWith({
          data: { eventId },
        });
        expect(result.eventId).toBe(eventId);
      }
    });

    it("should initialize without photoUrl", async () => {
      const mockPhotoSession = {
        id: "session1",
        eventId: "event1",
      };

      mockCreate.mockResolvedValue(mockPhotoSession as never);
      await createPhotoSession("event1");

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          eventId: "event1",
        },
      });
    });

    it("should handle database errors", async () => {
      mockCreate.mockRejectedValue(new Error("DB Error") as never);

      await expect(createPhotoSession("event1")).rejects.toThrow("DB Error");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error creating photo session:",
        expect.any(Error),
      );
    });
  });

  describe("getPhotoSessionById", () => {
    it("should fetch photo session by ID and user ID", async () => {
      const mockPhotoSession = {
        id: "session1",
        eventId: "event1",
        photoUrl: "http://example.com/photo.jpg",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      };

      mockFindFirst.mockResolvedValue(mockPhotoSession as never);
      const result = await getPhotoSessionById("session1", "user1");

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          id: "session1",
          event: {
            userId: "user1",
            profile: {
              isDeleted: false,
            },
          },
        },
      });
      expect(result).toEqual(mockPhotoSession);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should return null when session not found", async () => {
      mockFindFirst.mockResolvedValue(null as never);

      const result = await getPhotoSessionById("nonexistent", "user1");

      expect(result).toBeNull();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should return null when session belongs to different user", async () => {
      mockFindFirst.mockResolvedValue(null as never);

      const result = await getPhotoSessionById("session1", "wrongUser");

      expect(result).toBeNull();
      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "session1",
            event: expect.objectContaining({
              userId: "wrongUser",
            }),
          }),
        }),
      );
    });

    it("should filter by profile isDeleted false", async () => {
      mockFindFirst.mockResolvedValue(null as never);

      await getPhotoSessionById("session1", "user1");

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          id: "session1",
          event: {
            userId: "user1",
            profile: {
              isDeleted: false,
            },
          },
        },
      });
    });

    it("should handle session without photoUrl", async () => {
      const mockPhotoSession = {
        id: "session1",
        eventId: "event1",
        photoUrl: null,
      };

      mockFindFirst.mockResolvedValue(mockPhotoSession as never);
      const result = await getPhotoSessionById("session1", "user1");

      expect(result?.photoUrl).toBeNull();
    });

    it("should handle session with photoUrl", async () => {
      const mockPhotoSession = {
        id: "session1",
        eventId: "event1",
        photoUrl: "http://example.com/photo.jpg",
      };

      mockFindFirst.mockResolvedValue(mockPhotoSession as never);
      const result = await getPhotoSessionById("session1", "user1");

      expect(result?.photoUrl).toBe("http://example.com/photo.jpg");
    });

    it("should handle database errors", async () => {
      mockFindFirst.mockRejectedValue(new Error("DB Error") as never);

      await expect(getPhotoSessionById("session1", "user1")).rejects.toThrow("DB Error");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error fetching photo session:",
        expect.any(Error),
      );
    });
  });

  describe("updatePhotoSessionPhotoUrl", () => {
    it("should update photo URL correctly", async () => {
      const mockUpdatedSession = {
        id: "session1",
        eventId: "event1",
        photoUrl: "http://example.com/new-photo.jpg",
      };

      mockUpdate.mockResolvedValue(mockUpdatedSession as never);
      const result = await updatePhotoSessionPhotoUrl(
        "session1",
        "http://example.com/new-photo.jpg",
      );

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "session1" },
        data: { photoUrl: "http://example.com/new-photo.jpg" },
      });

      expect(result).toEqual(mockUpdatedSession);
    });

    it("should update to empty URL string", async () => {
      const mockUpdatedSession = {
        id: "session1",
        eventId: "event1",
        photoUrl: "",
      };

      mockUpdate.mockResolvedValue(mockUpdatedSession as never);
      const result = await updatePhotoSessionPhotoUrl("session1", "");

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "session1" },
        data: { photoUrl: "" },
      });
      expect(result.photoUrl).toBe("");
    });

    it("should update with different URL formats", async () => {
      const urls = [
        "https://storage.example.com/bucket/photo.jpg",
        "https://cdn.example.com/images/photo.png",
        "/local/path/to/photo.webp",
        "user123/event456/Photos/session789/photo.jpg",
      ];

      for (const url of urls) {
        const mockUpdatedSession = {
          id: "session1",
          eventId: "event1",
          photoUrl: url,
        };

        mockUpdate.mockResolvedValue(mockUpdatedSession as never);
        const result = await updatePhotoSessionPhotoUrl("session1", url);

        expect(result.photoUrl).toBe(url);
      }
    });

    it("should handle updating different sessions", async () => {
      const sessions = [
        { id: "session1", url: "http://example.com/photo1.jpg" },
        { id: "session2", url: "http://example.com/photo2.jpg" },
        { id: "session3", url: "http://example.com/photo3.jpg" },
      ];

      for (const session of sessions) {
        const mockUpdatedSession = {
          id: session.id,
          eventId: "event1",
          photoUrl: session.url,
        };

        mockUpdate.mockResolvedValue(mockUpdatedSession as never);
        await updatePhotoSessionPhotoUrl(session.id, session.url);

        expect(mockUpdate).toHaveBeenCalledWith({
          where: { id: session.id },
          data: { photoUrl: session.url },
        });
      }
    });

    it("should handle database errors", async () => {
      mockUpdate.mockRejectedValue(new Error("DB Error") as never);

      await expect(
        updatePhotoSessionPhotoUrl("session1", "http://example.com/photo.jpg"),
      ).rejects.toThrow("DB Error");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error updating photo session photo URL:",
        expect.any(Error),
      );
    });
  });
});

