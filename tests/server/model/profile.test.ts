import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

import {
  mockCreate,
  mockFindFirst,
  mockUpdate,
} from "~/tests/server/mocks/mocks";

import {
  createProfile,
  getValidProfile,
  getAllProfile,
  updateProfile,
  softDeleteProfile,
  restoreProfile,
} from "~/server/model/profile.model";

jest.mock("~~/server/clients", () => ({
  prismaClient: {
    profile: {
      create: mockCreate,
      update: mockUpdate,
      findFirst: mockFindFirst,
    },
  },
}));

describe("Profile Model", () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("createProfile", () => {
    it("should create profile with userId and displayName", async () => {
      const mockProfile = {
        userId: "user1",
        displayName: "John Doe",
        organization: null,
        isDeleted: false,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      };

      mockCreate.mockResolvedValue(mockProfile as never);
      const result = await createProfile("user1", "John Doe");

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: "user1",
          displayName: "John Doe",
        },
      });

      expect(result).toEqual(mockProfile);
    });

    it("should create profile with default displayName when not provided", async () => {
      const mockProfile = {
        userId: "user2",
        displayName: "user",
        organization: null,
        isDeleted: false,
      };

      mockCreate.mockResolvedValue(mockProfile as never);
      const result = await createProfile("user2");

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: "user2",
          displayName: "user",
        },
      });

      expect(result.displayName).toBe("user");
    });

    it("should create profile with empty displayName using default", async () => {
      const mockProfile = {
        userId: "user3",
        displayName: "user",
      };

      mockCreate.mockResolvedValue(mockProfile as never);
      const result = await createProfile("user3", "");

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: "user3",
          displayName: "user",
        },
      });

      expect(result.displayName).toBe("user");
    });

    it("should create profile with different userIds", async () => {
      const userIds = ["user-abc", "user-123", "uuid-xyz-789"];

      for (const userId of userIds) {
        const mockProfile = {
          userId,
          displayName: "Test User",
        };

        mockCreate.mockResolvedValue(mockProfile as never);
        const result = await createProfile(userId, "Test User");

        expect(result.userId).toBe(userId);
      }
    });

    it("should handle database errors", async () => {
      mockCreate.mockRejectedValue(new Error("DB Error") as never);

      await expect(createProfile("user1", "Test")).rejects.toThrow("DB Error");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error creating profile:", expect.any(Error));
    });
  });

  describe("getValidProfile", () => {
    it("should fetch valid profile by userId", async () => {
      const mockProfile = {
        userId: "user1",
        displayName: "John Doe",
        organization: "Acme Corp",
        isDeleted: false,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      };

      mockFindFirst.mockResolvedValue(mockProfile as never);
      const result = await getValidProfile("user1");

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          userId: "user1",
          isDeleted: false,
        },
      });
      expect(result).toEqual(mockProfile);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should return null when profile not found", async () => {
      mockFindFirst.mockResolvedValue(null as never);

      const result = await getValidProfile("nonexistent");

      expect(result).toBeNull();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should return null when profile is deleted", async () => {
      mockFindFirst.mockResolvedValue(null as never);

      const result = await getValidProfile("deletedUser");

      expect(result).toBeNull();
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          userId: "deletedUser",
          isDeleted: false,
        },
      });
    });

    it("should filter by isDeleted false", async () => {
      mockFindFirst.mockResolvedValue(null as never);

      await getValidProfile("user1");

      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDeleted: false,
          }),
        }),
      );
    });

    it("should handle database errors", async () => {
      mockFindFirst.mockRejectedValue(new Error("DB Error") as never);

      await expect(getValidProfile("user1")).rejects.toThrow("DB Error");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching profile:", expect.any(Error));
    });
  });

  describe("getAllProfile", () => {
    it("should fetch profile including deleted ones", async () => {
      const mockProfile = {
        userId: "user1",
        displayName: "John Doe",
        isDeleted: true,
      };

      mockFindFirst.mockResolvedValue(mockProfile as never);
      const result = await getAllProfile("user1");

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { userId: "user1" },
      });
      expect(result).toEqual(mockProfile);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should fetch profile with isDeleted false", async () => {
      const mockProfile = {
        userId: "user2",
        displayName: "Jane Doe",
        isDeleted: false,
      };

      mockFindFirst.mockResolvedValue(mockProfile as never);
      const result = await getAllProfile("user2");

      expect(result?.isDeleted).toBe(false);
    });

    it("should return null when profile not found", async () => {
      mockFindFirst.mockResolvedValue(null as never);

      const result = await getAllProfile("nonexistent");

      expect(result).toBeNull();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should not filter by isDeleted", async () => {
      mockFindFirst.mockResolvedValue(null as never);

      await getAllProfile("user1");

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { userId: "user1" },
      });
      expect(mockFindFirst).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDeleted: expect.anything(),
          }),
        }),
      );
    });

    it("should handle database errors", async () => {
      mockFindFirst.mockRejectedValue(new Error("DB Error") as never);

      await expect(getAllProfile("user1")).rejects.toThrow("DB Error");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error fetching profile (including deleted):",
        expect.any(Error),
      );
    });
  });

  describe("updateProfile", () => {
    it("should update displayName only", async () => {
      const mockUpdatedProfile = {
        userId: "user1",
        displayName: "New Name",
        organization: "Old Org",
        isDeleted: false,
      };

      mockUpdate.mockResolvedValue(mockUpdatedProfile as never);
      const result = await updateProfile("user1", { displayName: "New Name" });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: {
          userId: "user1",
          isDeleted: false,
        },
        data: {
          displayName: "New Name",
        },
      });

      expect(result.displayName).toBe("New Name");
    });

    it("should update organization only", async () => {
      const mockUpdatedProfile = {
        userId: "user1",
        displayName: "John Doe",
        organization: "New Corp",
        isDeleted: false,
      };

      mockUpdate.mockResolvedValue(mockUpdatedProfile as never);
      const result = await updateProfile("user1", { organization: "New Corp" });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: {
          userId: "user1",
          isDeleted: false,
        },
        data: {
          organization: "New Corp",
        },
      });

      expect(result.organization).toBe("New Corp");
    });

    it("should update both displayName and organization", async () => {
      const mockUpdatedProfile = {
        userId: "user1",
        displayName: "New Name",
        organization: "New Corp",
        isDeleted: false,
      };

      mockUpdate.mockResolvedValue(mockUpdatedProfile as never);
      const result = await updateProfile("user1", {
        displayName: "New Name",
        organization: "New Corp",
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: {
          userId: "user1",
          isDeleted: false,
        },
        data: {
          displayName: "New Name",
          organization: "New Corp",
        },
      });

      expect(result.displayName).toBe("New Name");
      expect(result.organization).toBe("New Corp");
    });

    it("should not include undefined fields in updateData", async () => {
      const mockUpdatedProfile = {
        userId: "user1",
        displayName: "John Doe",
        organization: "Acme Corp",
      };

      mockUpdate.mockResolvedValue(mockUpdatedProfile as never);
      await updateProfile("user1", {});

      expect(mockUpdate).toHaveBeenCalledWith({
        where: {
          userId: "user1",
          isDeleted: false,
        },
        data: {},
      });
    });

    it("should filter by isDeleted false", async () => {
      const mockUpdatedProfile = {
        userId: "user1",
        displayName: "Test",
      };

      mockUpdate.mockResolvedValue(mockUpdatedProfile as never);
      await updateProfile("user1", { displayName: "Test" });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDeleted: false,
          }),
        }),
      );
    });

    it("should handle database errors", async () => {
      mockUpdate.mockRejectedValue(new Error("DB Error") as never);

      await expect(updateProfile("user1", { displayName: "Test" })).rejects.toThrow("DB Error");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error updating profile:", expect.any(Error));
    });
  });

  describe("softDeleteProfile", () => {
    it("should soft delete profile by setting isDeleted to true", async () => {
      const mockDeletedProfile = {
        userId: "user1",
        displayName: "John Doe",
        isDeleted: true,
        updatedAt: new Date(),
      };

      mockUpdate.mockResolvedValue(mockDeletedProfile as never);
      const result = await softDeleteProfile("user1");

      expect(mockUpdate).toHaveBeenCalledWith({
        where: {
          userId: "user1",
          isDeleted: false,
        },
        data: {
          isDeleted: true,
        },
      });

      expect(result.isDeleted).toBe(true);
    });

    it("should only delete non-deleted profiles", async () => {
      const mockDeletedProfile = {
        userId: "user1",
        isDeleted: true,
      };

      mockUpdate.mockResolvedValue(mockDeletedProfile as never);
      await softDeleteProfile("user1");

      expect(mockUpdate).toHaveBeenCalledWith({
        where: {
          userId: "user1",
          isDeleted: false,
        },
        data: {
          isDeleted: true,
        },
      });
    });

    it("should handle deleting different users", async () => {
      const userIds = ["user1", "user2", "user3"];

      for (const userId of userIds) {
        const mockDeletedProfile = {
          userId,
          isDeleted: true,
        };

        mockUpdate.mockResolvedValue(mockDeletedProfile as never);
        await softDeleteProfile(userId);

        expect(mockUpdate).toHaveBeenCalledWith({
          where: {
            userId,
            isDeleted: false,
          },
          data: {
            isDeleted: true,
          },
        });
      }
    });

    it("should handle database errors", async () => {
      mockUpdate.mockRejectedValue(new Error("DB Error") as never);

      await expect(softDeleteProfile("user1")).rejects.toThrow("DB Error");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error soft deleting profile:",
        expect.any(Error),
      );
    });
  });

  describe("restoreProfile", () => {
    it("should restore profile by setting isDeleted to false", async () => {
      const mockRestoredProfile = {
        userId: "user1",
        displayName: "John Doe",
        isDeleted: false,
        updatedAt: new Date(),
      };

      mockUpdate.mockResolvedValue(mockRestoredProfile as never);
      const result = await restoreProfile("user1");

      expect(mockUpdate).toHaveBeenCalledWith({
        where: {
          userId: "user1",
          isDeleted: true,
        },
        data: {
          isDeleted: false,
        },
      });

      expect(result.isDeleted).toBe(false);
    });

    it("should only restore deleted profiles", async () => {
      const mockRestoredProfile = {
        userId: "user1",
        isDeleted: false,
      };

      mockUpdate.mockResolvedValue(mockRestoredProfile as never);
      await restoreProfile("user1");

      expect(mockUpdate).toHaveBeenCalledWith({
        where: {
          userId: "user1",
          isDeleted: true,
        },
        data: {
          isDeleted: false,
        },
      });
    });

    it("should handle restoring different users", async () => {
      const userIds = ["user1", "user2", "user3"];

      for (const userId of userIds) {
        const mockRestoredProfile = {
          userId,
          isDeleted: false,
        };

        mockUpdate.mockResolvedValue(mockRestoredProfile as never);
        await restoreProfile(userId);

        expect(mockUpdate).toHaveBeenCalledWith({
          where: {
            userId,
            isDeleted: true,
          },
          data: {
            isDeleted: false,
          },
        });
      }
    });

    it("should handle database errors", async () => {
      mockUpdate.mockRejectedValue(new Error("DB Error") as never);

      await expect(restoreProfile("user1")).rejects.toThrow("DB Error");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error restoring profile:", expect.any(Error));
    });
  });
});

