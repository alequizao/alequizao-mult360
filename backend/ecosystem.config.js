module.exports = [{
  script: 'dist/server.js',
  name: 'whaticket-backend',
  cwd: '/www/wwwroot/alequizao.com/whaticket/backend',
  exec_mode: 'fork',
  max_memory_restart: '1500M',
  node_args: '--max-old-space-size=1500',
  watch: false,
  autorestart: true
}]
