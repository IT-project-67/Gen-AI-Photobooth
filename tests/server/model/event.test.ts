import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

import {
  mockCreate,
  mockFindFirst,
  mockFindMany,
  mockFindUnique,
  mockUpdate,
} from "~/tests/server/mocks/mocks";

import {
  createEvent,
  getEventById,
  getEventsByProfile,
  updateEventLogoUrl,
} from "~/server/model/event.model";
import type { EventStruct } from "~/server/types/event/model.types";

jest.mock("~~/server/clients", () => ({
  prismaClient: {
    event: {
      create: mockCreate,
      update: mockUpdate,
      findUnique: mockFindUnique,
      findFirst: mockFindFirst,
      findMany: mockFindMany,
    },
  },
}));

describe("Event Model", () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("createEvent", () => {
    it("should create event with correct data", async () => {
      const mockNewEvent = {
        id: "event1",
        name: "Test Event",
        userId: "user1",
        logoUrl: null,
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-01-02"),
      };

      const eventData: EventStruct = {
        name: "Test Event",
        userId: "user1",
        logoUrl: undefined,
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-01-02"),
      };

      mockCreate.mockResolvedValue(mockNewEvent as never);
      const result = await createEvent(eventData);

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          name: "Test Event",
          userId: "user1",
          logoUrl: null,
          startDate: new Date("2023-01-01"),
          endDate: new Date("2023-01-02"),
        },
      });

      expect(result).toEqual(mockNewEvent);
    });

    it("should create event with logoUrl", async () => {
      const mockNewEvent = {
        id: "event2",
        name: "Event With Logo",
        userId: "user2",
        logoUrl: "http://example.com/logo.png",
        startDate: new Date("2023-06-01"),
        endDate: new Date("2023-06-30"),
      };

      const eventData: EventStruct = {
        name: "Event With Logo",
        userId: "user2",
        logoUrl: "http://example.com/logo.png",
        startDate: new Date("2023-06-01"),
        endDate: new Date("2023-06-30"),
      };

      mockCreate.mockResolvedValue(mockNewEvent as never);
      const result = await createEvent(eventData);

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          name: "Event With Logo",
          userId: "user2",
          logoUrl: "http://example.com/logo.png",
          startDate: new Date("2023-06-01"),
          endDate: new Date("2023-06-30"),
        },
      });

      expect(result.logoUrl).toBe("http://example.com/logo.png");
    });

    it("should convert undefined logoUrl to null", async () => {
      const mockNewEvent = {
        id: "event3",
        name: "Event No Logo",
        userId: "user3",
        logoUrl: null,
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
      };

      const eventData: EventStruct = {
        name: "Event No Logo",
        userId: "user3",
        logoUrl: undefined,
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
      };

      mockCreate.mockResolvedValue(mockNewEvent as never);
      await createEvent(eventData);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          logoUrl: null,
        }),
      });
    });

    it("should handle database errors", async () => {
      const eventData: EventStruct = {
        name: "Test Event",
        userId: "user1",
        logoUrl: undefined,
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-01-02"),
      };

      mockCreate.mockRejectedValue(new Error("DB Error") as never);

      await expect(createEvent(eventData)).rejects.toThrow("DB Error");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error creating event:", expect.any(Error));
    });
  });

  describe("getEventById", () => {
    it("should fetch event by ID and user ID", async () => {
      const mockEvent = {
        id: "event1",
        name: "Test Event",
        userId: "user1",
        logoUrl: "http://example.com/logo.png",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
      };

      mockFindFirst.mockResolvedValue(mockEvent as never);
      const result = await getEventById("event1", "user1");

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          id: "event1",
          userId: "user1",
          profile: {
            isDeleted: false,
          },
        },
      });
      expect(result).toEqual(mockEvent);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should return null when event not found", async () => {
      mockFindFirst.mockResolvedValue(null as never);

      const result = await getEventById("nonexistent", "user1");

      expect(result).toBeNull();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should return null when event belongs to different user", async () => {
      mockFindFirst.mockResolvedValue(null as never);

      const result = await getEventById("event1", "wrongUser");

      expect(result).toBeNull();
      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "event1",
            userId: "wrongUser",
          }),
        }),
      );
    });

    it("should filter by isDeleted false", async () => {
      mockFindFirst.mockResolvedValue(null as never);

      await getEventById("event1", "user1");

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          id: "event1",
          userId: "user1",
          profile: {
            isDeleted: false,
          },
        },
      });
    });

    it("should handle database errors", async () => {
      mockFindFirst.mockRejectedValue(new Error("DB Error") as never);

      await expect(getEventById("event1", "user1")).rejects.toThrow("DB Error");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching event:", expect.any(Error));
    });
  });

  describe("getEventsByProfile", () => {
    it("should fetch events with default desc order", async () => {
      const mockEvents = [
        {
          id: "event2",
          name: "Recent Event",
          userId: "user1",
          createdAt: new Date("2023-06-01"),
        },
        {
          id: "event1",
          name: "Older Event",
          userId: "user1",
          createdAt: new Date("2023-01-01"),
        },
      ];

      mockFindMany.mockResolvedValue(mockEvents as never);
      const result = await getEventsByProfile("user1");

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          userId: "user1",
          profile: {
            isDeleted: false,
          },
        },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual(mockEvents);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should fetch events with asc order", async () => {
      const mockEvents = [
        {
          id: "event1",
          name: "Older Event",
          userId: "user1",
          createdAt: new Date("2023-01-01"),
        },
        {
          id: "event2",
          name: "Recent Event",
          userId: "user1",
          createdAt: new Date("2023-06-01"),
        },
      ];

      mockFindMany.mockResolvedValue(mockEvents as never);
      const result = await getEventsByProfile("user1", "asc");

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          userId: "user1",
          profile: {
            isDeleted: false,
          },
        },
        orderBy: { createdAt: "asc" },
      });
      expect(result).toEqual(mockEvents);
    });

    it("should return empty array when no events found", async () => {
      mockFindMany.mockResolvedValue([] as never);

      const result = await getEventsByProfile("user1");

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should handle single event", async () => {
      const mockEvents = [
        {
          id: "event1",
          name: "Single Event",
          userId: "user1",
        },
      ];

      mockFindMany.mockResolvedValue(mockEvents as never);
      const result = await getEventsByProfile("user1");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("event1");
    });

    it("should filter by userId correctly", async () => {
      mockFindMany.mockResolvedValue([] as never);

      await getEventsByProfile("specificUser");

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          userId: "specificUser",
          profile: {
            isDeleted: false,
          },
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should filter by isDeleted false", async () => {
      mockFindMany.mockResolvedValue([] as never);

      await getEventsByProfile("user1");

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            profile: {
              isDeleted: false,
            },
          }),
        }),
      );
    });

    it("should handle database errors", async () => {
      mockFindMany.mockRejectedValue(new Error("DB Error") as never);

      await expect(getEventsByProfile("user1")).rejects.toThrow("DB Error");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching events:", expect.any(Error));
    });
  });

  describe("updateEventLogoUrl", () => {
    it("should update logo URL correctly", async () => {
      const mockUpdatedEvent = {
        id: "event1",
        logoUrl: "http://example.com/new-logo.png",
      };

      mockUpdate.mockResolvedValue(mockUpdatedEvent as never);
      const result = await updateEventLogoUrl("event1", "http://example.com/new-logo.png");

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "event1" },
        data: { logoUrl: "http://example.com/new-logo.png" },
      });

      expect(result).toEqual(mockUpdatedEvent);
    });

    it("should update to empty URL string", async () => {
      const mockUpdatedEvent = {
        id: "event1",
        logoUrl: "",
      };

      mockUpdate.mockResolvedValue(mockUpdatedEvent as never);
      const result = await updateEventLogoUrl("event1", "");

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "event1" },
        data: { logoUrl: "" },
      });
      expect(result.logoUrl).toBe("");
    });

    it("should update with different URL formats", async () => {
      const urls = [
        "https://storage.example.com/bucket/logo.png",
        "https://cdn.example.com/images/logo.jpg",
        "/local/path/to/logo.webp",
      ];

      for (const url of urls) {
        const mockUpdatedEvent = {
          id: "event1",
          logoUrl: url,
        };

        mockUpdate.mockResolvedValue(mockUpdatedEvent as never);
        const result = await updateEventLogoUrl("event1", url);

        expect(result.logoUrl).toBe(url);
      }
    });

    it("should handle database errors", async () => {
      mockUpdate.mockRejectedValue(new Error("DB Error") as never);

      await expect(updateEventLogoUrl("event1", "http://example.com/logo.png")).rejects.toThrow(
        "DB Error",
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error updating event logo URL:",
        expect.any(Error),
      );
    });
  });
});
