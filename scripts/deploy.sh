#!/bin/bash

# Deploy script for Vultr
set -e

VULTR_HOST="199.247.2.248"
VULTR_USER="deploy"
REPO_URL="git@github.com:xaved88/aramio.git"
BRANCH="main"

echo "🚀 Starting deployment to Vultr..."

# Create SSH config
mkdir -p ~/.ssh
echo "Host vultr
    HostName $VULTR_HOST
    User $VULTR_USER
    IdentityFile ~/.ssh/id_rsa
    StrictHostKeyChecking no" > ~/.ssh/config

# Setup SSH key
echo "$VULTR_SSH_KEY" > ~/.ssh/id_rsa
chmod 600 ~/.ssh/id_rsa

# Deploy to Vultr
echo "📦 Deploying to Vultr server..."
ssh vultr << 'EOF'
    cd /home/deploy
    git fetch origin
    git reset --hard origin/main
    npm install
    npm run build
    pm2 reload ecosystem.config.js --env production
    echo "✅ Deployment completed successfully!"
EOF

echo "🎉 Deployment finished!" 