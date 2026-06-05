#!/bin/bash

# ==========================================
# Deployment Script for Laravel (SFTP/SSH)
# ==========================================

USER="u914595671"
PASS="DasnaDas@1723"
HOST="145.79.210.77"
PORT="65002"

# IMPORTANT: Set your remote directory path!
# If your FTP account opens directly into your public_html, keep it as "./"
# If your FTP account opens at the root of your hosting, it might be "domains/semcomattendent.com/public_html/"
REMOTE_DIR="./domains/lightgoldenrodyellow-stingray-297524.hostingersite.com/public_html/"

# Folders to sync
FOLDERS=("api")

echo "Starting deployment to $HOST on port $PORT..."
echo "Target remote directory: $REMOTE_DIR"
echo "------------------------------------------------"

export SSHPASS="$PASS"

for DIR in "${FOLDERS[@]}"; do
    if [ -d "./$DIR" ]; then
        echo "Syncing local ./$DIR/ to remote $REMOTE_DIR$DIR/"
        sshpass -e rsync -avz -e "ssh -p $PORT -o StrictHostKeyChecking=no" "./$DIR/" "$USER@$HOST:$REMOTE_DIR$DIR/"
        
        if [ $? -eq 0 ]; then
            echo "[SUCCESS] $DIR synced successfully!"
        else
            echo "[ERROR] Failed to sync $DIR. Please check your credentials or remote path."
        fi
    else
        echo "[WARNING] Local folder ./$DIR/ does not exist. Skipping..."
    fi
    echo "------------------------------------------------"
done

# Sync .htaccess rewrite rules
if [ -f "./.htaccess" ]; then
    echo "Syncing local .htaccess to remote $REMOTE_DIR.htaccess"
    sshpass -e rsync -avz -e "ssh -p $PORT -o StrictHostKeyChecking=no" "./.htaccess" "$USER@$HOST:$REMOTE_DIR.htaccess"
    if [ $? -eq 0 ]; then
        echo "[SUCCESS] .htaccess synced successfully!"
    else
        echo "[ERROR] Failed to sync .htaccess."
    fi
    echo "------------------------------------------------"
fi

# Sync .env configuration file
if [ -f "./.env" ]; then
    echo "Syncing local .env to remote $REMOTE_DIR.env"
    sshpass -e rsync -avz -e "ssh -p $PORT -o StrictHostKeyChecking=no" "./.env" "$USER@$HOST:$REMOTE_DIR.env"
    if [ $? -eq 0 ]; then
        echo "[SUCCESS] .env synced successfully!"
    else
        echo "[ERROR] Failed to sync .env."
    fi
    echo "------------------------------------------------"
fi

# Sync index.php status page
if [ -f "./index.php" ]; then
    echo "Syncing local index.php to remote ${REMOTE_DIR}index.php"
    sshpass -e rsync -avz -e "ssh -p $PORT -o StrictHostKeyChecking=no" "./index.php" "$USER@$HOST:${REMOTE_DIR}index.php"
    if [ $? -eq 0 ]; then
        echo "[SUCCESS] index.php synced successfully!"
    else
        echo "[ERROR] Failed to sync index.php."
    fi
    echo "------------------------------------------------"
fi

echo "Cleaning up default Hostinger placeholder files..."
# Remove default.php, default.html, or other hosting-start welcome pages Hostinger creates
sshpass -e ssh -p $PORT -o StrictHostKeyChecking=no "$USER@$HOST" "rm -f ${REMOTE_DIR}default.php ${REMOTE_DIR}default.html ${REMOTE_DIR}hosting-start.html"
if [ $? -eq 0 ]; then
    echo "[SUCCESS] Hostinger default pages removed successfully!"
else
    echo "[WARNING] Could not remove default pages. They might not exist."
fi
echo "------------------------------------------------"

echo "Deployment finished!"
