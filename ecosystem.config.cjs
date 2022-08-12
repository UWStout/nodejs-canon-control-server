module.exports = {
  apps: [{
    name: 'PARSEC-Server',
    script: 'server/server.js',
    env_production: {
      NODE_ENV: 'production',
      restart_delay: 2000
    },
    env_development: {
      NODE_ENV: 'development',
      args: 'dev',
      watch: ['server'],
      watch_delay: 2000,
      ignore_watch: ['node_modules']
    }
  }]
}
