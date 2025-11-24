const buildConfig = require("../../jest.base.config")

module.exports = buildConfig(
    __dirname,
    {
        rootDir: __dirname,
        displayName: "mobx-vue-lite"
    },
    "tsconfig.json"
)
