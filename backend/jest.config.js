module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  testTimeout: 30000, // 30 seconds timeout to accommodate bcrypt/db operations
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json", useESM: true }]
  },
  moduleNameMapper: {
    // Map .js extensions in local imports back to .ts files for ts-jest resolution
    "^(\\..*)\\.js$": "$1"
  }
};
