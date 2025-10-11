export default {
  projects: [
    {
      displayName: "server",
      preset: "ts-jest/presets/default-esm",
      testEnvironment: "node",
      extensionsToTreatAsEsm: [".ts"],
      roots: ["<rootDir>/tests/server"],
      testMatch: ["**/*.test.ts", "**/*.spec.ts"],
      moduleFileExtensions: ["ts", "js", "json", "node"],
      moduleNameMapper: {
        "^~~/(.*)$": "<rootDir>/$1",
        "^~/(.*)$": "<rootDir>/$1",
        "^@/(.*)$": "<rootDir>/$1",
        "^~~/server/clients$": "<rootDir>/tests/mocks/clients/index.ts",
      },
      collectCoverageFrom: [
        "<rootDir>/server/**/*.ts",
        "!<rootDir>/server/**/*.d.ts",
        "!<rootDir>/server/test/**",
        "!<rootDir>/server/types/**",
      ],
      coveragePathIgnorePatterns: [
        "<rootDir>/server/types/",
        "<rootDir>/server/clients/",
        "/node_modules/",
        "<rootDir>/tests/server/mocks/",
      ],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { useESM: true, tsconfig: "./tests/tsconfig.json" }],
      },
    },
    {
      displayName: "app",
      preset: "ts-jest/presets/default-esm",
      testEnvironment: "jest-environment-jsdom",
      extensionsToTreatAsEsm: [".ts", ".vue"],
      roots: ["<rootDir>/tests/app"],
      testMatch: ["**/*.test.ts", "**/*.spec.ts"],
      moduleFileExtensions: ["ts", "js", "json", "vue", "node"],
      moduleNameMapper: {
        "^~~/(.*)\\.css$": "identity-obj-proxy",
        "^~/(.*)\\.css$": "identity-obj-proxy",
        "^@/(.*)\\.css$": "identity-obj-proxy",
        "^~~/(.*)$": "<rootDir>/$1",
        "^~/(.*)$": "<rootDir>/$1",
        "^@/(.*)$": "<rootDir>/$1",
      },
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { useESM: true, tsconfig: "./tests/tsconfig.json" }],
        ".*\\.(vue)$": "@vue/vue3-jest",
      },
    },
    {
      displayName: "setup",
      preset: "ts-jest/presets/default-esm",
      testEnvironment: "node",
      roots: ["<rootDir>/tests/setup"],
      testMatch: ["**/*.test.ts"],
      moduleFileExtensions: ["ts", "js", "json", "node"],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { useESM: true, tsconfig: "./tests/tsconfig.json" }],
      },
    },
  ],
};
