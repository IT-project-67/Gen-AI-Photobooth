import { jest } from "@jest/globals";
import type { prismaClient } from "~~/server/clients";

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockFindUnique = jest.fn();
const mockFindFirst = jest.fn();
const mockFindMany = jest.fn();

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
