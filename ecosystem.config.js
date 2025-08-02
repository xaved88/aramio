const os = require('os');

module.exports = {
  apps: [{
    name: "aramio-moba",
    script: 'dist/server/index.js',
    time: true,
    watch: false,
    instances: os.cpus().length,
    exec_mode: 'fork',
    wait_ready: true,
    env_production: {
      NODE_ENV: 'production',
      PORT: 2567
    }
  }],
  deploy: {
    production: {
      "user": "deploy",
      "host": ["199.247.2.248"],
      "ref": "origin/main",
      "repo": "git@github.com:xaved88/aramio.git",  
      "path": "/home/deploy",
      "post-deploy": "npm install && npm run build && pm2 reload ecosystem.config.js --env production"
    }
  }
}; 