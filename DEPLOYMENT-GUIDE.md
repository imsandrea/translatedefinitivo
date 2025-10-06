# Deployment Guide for AudioScribe to 212.227.250.56

## Prerequisites
- SSH access to server 212.227.250.56
- OpenAI API key

## Step-by-Step Deployment

### 1. Connect to Your Server
```bash
ssh root@212.227.250.56
```

### 2. Install Git (if not already installed)
```bash
apt update && apt install -y git
```

### 3. Clone the Repository
```bash
cd /var/www
git clone https://github.com/imsandrea/translatedefinitivo.git audioscribe
cd audioscribe
```

### 4. Run the Deployment Script
```bash
chmod +x deploy-ionos.sh
./deploy-ionos.sh
```

The script will automatically:
- Update the system
- Install Node.js 18, FFmpeg, Nginx, PM2
- Install frontend and backend dependencies
- Build the frontend for production
- Configure Nginx as reverse proxy
- Start the backend with PM2
- Set up automatic cleanup jobs

### 5. Configure OpenAI API Key
After the script completes, edit the backend .env file:
```bash
nano /var/www/audioscribe/server/.env
```

Replace this line:
```
OPENAI_API_KEY=your_openai_api_key_here
```

With your actual API key:
```
OPENAI_API_KEY=sk-proj-YOUR-ACTUAL-KEY-HERE
```

Save and exit (Ctrl+X, then Y, then Enter)

### 6. Restart Services
```bash
cd /var/www/audioscribe/server
pm2 restart audioscribe-backend
sudo systemctl reload nginx
```

### 7. Verify Installation
Check if everything is working:
```bash
# Check backend status
pm2 status

# Check backend health
curl http://localhost:3001/api/health

# Check if frontend is accessible
curl http://localhost
```

## Access Your Application

- **Frontend**: http://212.227.250.56
- **API Health**: http://212.227.250.56/api/health

## Useful Commands

### Monitor Services
```bash
# Backend logs
pm2 logs audioscribe-backend

# Nginx logs
sudo tail -f /var/log/nginx/audioscribe.error.log

# Backend status
pm2 status
```

### Restart Services
```bash
# Restart backend
pm2 restart audioscribe-backend

# Restart Nginx
sudo systemctl reload nginx

# Restart both
pm2 restart audioscribe-backend && sudo systemctl reload nginx
```

### Cleanup
```bash
# Clean old temporary files
find /var/www/audioscribe/server/temp -type f -mtime +1 -delete

# Clean PM2 logs
pm2 flush
```

## Troubleshooting

### Backend Not Responding
```bash
pm2 logs audioscribe-backend --lines 50
pm2 restart audioscribe-backend
```

### Nginx Errors
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/audioscribe.error.log
```

### Check Disk Space
```bash
df -h
du -sh /var/www/audioscribe/server/temp/*
```

## Optional: Add Domain and HTTPS

If you want to use a domain name instead of the IP:

1. Point your domain DNS to 212.227.250.56
2. Edit Nginx config:
   ```bash
   sudo nano /etc/nginx/sites-available/audioscribe
   ```
3. Replace `server_name _;` with `server_name yourdomain.com;`
4. Install SSL certificate:
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

## Support

For issues, check:
- Backend logs: `pm2 logs audioscribe-backend`
- Nginx logs: `sudo tail -f /var/log/nginx/audioscribe.error.log`
- System resources: `htop` or `free -h`

Repository: https://github.com/imsandrea/translatedefinitivo
