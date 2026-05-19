module.exports = {
  apps: [
    {
      name: 'blockvote-5173',
      cwd: './frontend',
      script: 'node_modules/vite/bin/vite.js',
      args: '--port 5173',
      env: { NODE_ENV: 'development' }
    }
  ]
}
