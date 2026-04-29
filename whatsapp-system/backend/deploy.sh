#!/bin/bash

set -e

echo "🚀 Starting fast deployment..."

SERVER_USER="u914595671"
SERVER_IP="145.79.210.77"
SERVER_PORT="65002"
REMOTE_DIR="domains/darkviolet-loris-131111.hostingersite.com/nodejs"

echo "📦 Creating compressed build..."

tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='logs' \
    --exclude='wa_sessions' \
    --exclude='database' \
    --exclude='deploy.sh' \
    -czf deploy.tar.gz .

echo "📂 Uploading (fast)..."

scp -P $SERVER_PORT deploy.tar.gz \
$SERVER_USER@$SERVER_IP:$REMOTE_DIR

echo "📤 Extracting on server..."

ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "
cd $REMOTE_DIR &&
tar -xzf deploy.tar.gz &&
rm deploy.tar.gz
"

echo "📦 Installing dependencies..."

ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "
cd $REMOTE_DIR &&
export PATH=/opt/alt/alt-nodejs20/root/usr/bin:\$PATH &&
npm install --omit=dev
"

echo "🔄 Restarting app..."

ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP \
"mkdir -p $REMOTE_DIR/tmp && touch $REMOTE_DIR/tmp/restart.txt"

echo "🧹 Cleaning local file..."
rm deploy.tar.gz

echo "✅ FAST Deployment complete 🚀"