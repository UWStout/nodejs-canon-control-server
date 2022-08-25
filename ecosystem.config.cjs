module.exports = {
  apps: [{
    name: 'PARSEC-Server',
    script: 'server/server.js',
    env_production: {
      NODE_ENV: 'production',
      node_args: '--max_old_space_size=9216', // 9GB, based on observed OS and LIT overhead
      restart_delay: 2000
    },
    env_development: {
      NODE_ENV: 'development',
      node_args: '--max_old_space_size=9216', // 9GB, based on observed OS and LIT overhead
      watch: ['server'],
      watch_delay: 2000,
      ignore_watch: ['node_modules']
    }
  }]
}
