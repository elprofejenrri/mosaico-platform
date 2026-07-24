const path = require("path");
require("dotenv").config();

const enableHealthCheck = process.env.ENABLE_HEALTH_CHECK === "true";

let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (enableHealthCheck) {
  WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
  setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
  healthPluginInstance = new WebpackHealthPlugin();
}

const webpackConfig = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    configure: (config) => {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/build/**",
          "**/dist/**",
          "**/coverage/**",
          "**/public/**",
        ],
      };

      if (enableHealthCheck && healthPluginInstance) {
        config.plugins.push(healthPluginInstance);
      }
      return config;
    },
  },
  jest: {
    configure: {
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "^react-router-dom$": "<rootDir>/node_modules/react-router-dom/dist/index.js",
        "^react-router/dom$": "<rootDir>/node_modules/react-router/dist/development/dom-export.js",
        "^react-router$": "<rootDir>/node_modules/react-router/dist/development/index.js",
      },
    },
  },
};

webpackConfig.devServer = (devServerConfig) => {
  devServerConfig.historyApiFallback = true;

  if (enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
    const originalSetupMiddlewares = devServerConfig.setupMiddlewares;
    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      if (originalSetupMiddlewares) {
        middlewares = originalSetupMiddlewares(middlewares, devServer);
      }
      setupHealthEndpoints(devServer, healthPluginInstance);
      return middlewares;
    };
  }

  return devServerConfig;
};

module.exports = webpackConfig;
