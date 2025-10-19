// import { PrismaClient } from "@prisma/client";

// const globalForPrisma = global as unknown as {
//   prisma: PrismaClient | undefined;
// };

// const prisma = new PrismaClient({
//   datasources: {
//     db: {
//       url: process.env.DATABASE_URL,
//     },
//   },
//   log: ["error"],
// });

// if (process.env.NODE_ENV !== "production") {
//   globalForPrisma.prisma = prisma;
// }

// export const prismaClient = prisma;

import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

const createPrismaClient = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: ["error"],
  });
};

const getPrismaClient = () => {
  if (process.env.NODE_ENV !== "production") {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    return globalForPrisma.prisma;
  }
  return createPrismaClient();
};

export const prismaClient = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getPrismaClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (client as any)[prop];
  },
});
