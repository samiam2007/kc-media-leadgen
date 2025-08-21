module.exports = {
  apps: [
    {
      name: 'kcmedia-backend',
      script: './backend/dist/server.js',
      cwd: '/var/www/kcmedia-leadgen',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      max_memory_restart: '500M',
      autorestart: true,
      max_restarts: 10
    },
    {
      name: 'kcmedia-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/kcmedia-leadgen/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      max_memory_restart: '500M',
      autorestart: true,
      max_restarts: 10
    }
  ]
}