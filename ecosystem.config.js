// PM2 Ecosystem Configuration for eOffice Production
module.exports = {
  apps: [
    {
      name: 'eoffice-api',
      script: 'packages/server/src/index.ts',
      interpreter: 'node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/cli.mjs',
      interpreter_args: '',
      instances: 1,              // Single instance for SQLite (WAL mode)
      exec_mode: 'fork',         // Fork mode (cluster requires shared-nothing DB)
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      cwd: '/home/spatchava/embeddedos-org/eOffice',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        PATH: '/home/spatchava/.nvm/versions/node/v20.20.2/bin:/usr/bin:/bin',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        PATH: '/home/spatchava/.nvm/versions/node/v20.20.2/bin:/usr/bin:/bin',
      },
      kill_timeout: 10000,
      listen_timeout: 8000,
      max_restarts: 10,
      restart_delay: 1000,
      min_uptime: 5000,
    },
  ],
};
