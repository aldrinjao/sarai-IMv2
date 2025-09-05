module.exports = {
  apps: [{
    name: 'sarai-imv2',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      GOOGLE_SERVICE_KEY: process.env.GOOGLE_SERVICE_KEY
    }
  }]
}