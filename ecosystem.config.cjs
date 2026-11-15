/* eslint-disable @typescript-eslint/no-require-imports -- pm2 loads this file as CommonJS */
// pm2 definition for the Mac mini. One build (BASE_PATH=/portofolio pnpm build) runs as two processes:
//   portofolio-web    public role, 127.0.0.1:3006, exposed through Tailscale Funnel at /portofolio
//   portofolio-admin  ROLE=admin,  127.0.0.1:3007, exposed through `tailscale serve` only (tailnet), never Funnel
// Start with ADMIN_TAILSCALE_LOGIN set to the owner's Tailscale login: ADMIN_TAILSCALE_LOGIN=you@github pm2 start ecosystem.config.cjs
const path = require("node:path");

const cwd = __dirname;
const shared = {
  cwd,
  script: path.join(cwd, "node_modules/next/dist/bin/next"),
  autorestart: true,
  max_restarts: 10,
  env: {
    NODE_ENV: "production",
    BASE_PATH: "/portofolio", // must equal the value used at build time
    DATA_DIR: path.join(cwd, ".data"),
  },
};

module.exports = {
  apps: [
    { ...shared, name: "portofolio-web", args: "start -H 127.0.0.1 -p 3006" },
    {
      ...shared,
      name: "portofolio-admin",
      args: "start -H 127.0.0.1 -p 3007",
      env: { ...shared.env, ROLE: "admin", ADMIN_TAILSCALE_LOGIN: process.env.ADMIN_TAILSCALE_LOGIN },
    },
  ],
};
