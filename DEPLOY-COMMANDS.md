# 📋 Comandi Deploy AudioScribe v2.0.0

## 🎯 Comandi Essenziali

### Aggiornamento Rapido
```bash
# Metodo automatico (RACCOMANDATO)
./update-to-v2.sh

# Metodo manuale
npm install && npm run build
cd server && npm install && cd ..
```

---

## 🚀 Deploy su Server

### Opzione 1: Script Automatico con Rsync
```bash
./deploy-server.sh
# Segui le istruzioni interattive
```

### Opzione 2: Deploy Manuale Step-by-Step

#### A. Sul Tuo Computer (Locale)
```bash
# 1. Build
npm install
npm run build

# 2. Crea archivio per upload
tar -czf audioscribe-v2.tar.gz \
    dist/ \
    server/ \
    package.json \
    CHANGELOG.md \
    QUICK-START-v2.md

# 3. Upload al server
scp audioscribe-v2.tar.gz user@your-server.com:/path/to/deploy/
```

#### B. Sul Server (Remoto)
```bash
# 1. Connetti al server
ssh user@your-server.com

# 2. Vai alla directory
cd /path/to/deploy/

# 3. Backup versione precedente (se esiste)
mv audioscribe audioscribe-backup-$(date +%Y%m%d) || true

# 4. Estrai nuova versione
mkdir -p audioscribe
tar -xzf audioscribe-v2.tar.gz -C audioscribe/
cd audioscribe/

# 5. Installa dipendenze PRODUCTION
npm install --production
cd server
npm install --production
cd ..

# 6. Configura environment
nano server/.env
# Aggiungi:
# PORT=3001
# NODE_ENV=production
# OPENAI_API_KEY=sk-your-key-here

# 7. Verifica FFmpeg
ffmpeg -version
# Se non installato: sudo apt install ffmpeg

# 8. Test server
cd server
node server.js
# Premi Ctrl+C dopo verifica

# 9. Avvia con PM2
pm2 stop audioscribe-server || true
pm2 delete audioscribe-server || true
pm2 start server.js --name audioscribe-server
pm2 save
pm2 startup  # Segui istruzioni per auto-start

# 10. Verifica
pm2 status
pm2 logs audioscribe-server --lines 50
curl http://localhost:3001/api/health
```

---

## 🔧 Configurazione Nginx (Web Server)

### File: `/etc/nginx/sites-available/audioscribe`
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (static files)
    location / {
        root /path/to/deploy/audioscribe/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Timeout per file grandi
        proxy_read_timeout 600;
        proxy_connect_timeout 600;
        proxy_send_timeout 600;

        # Upload file grandi
        client_max_body_size 500M;
    }
}
```

### Attiva configurazione
```bash
sudo ln -s /etc/nginx/sites-available/audioscribe /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 SSL con Let's Encrypt

```bash
# Installa certbot
sudo apt install certbot python3-certbot-nginx

# Ottieni certificato
sudo certbot --nginx -d your-domain.com

# Auto-rinnovo (già configurato)
sudo certbot renew --dry-run
```

---

## 📊 Monitoraggio

### Logs PM2
```bash
# Real-time logs
pm2 logs audioscribe-server

# Ultimi 100 log
pm2 logs audioscribe-server --lines 100

# Solo errori
pm2 logs audioscribe-server --err
```

### Statistiche
```bash
# Dashboard PM2
pm2 monit

# Status
pm2 status

# Info dettagliate
pm2 info audioscribe-server
```

### Logs Nginx
```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

---

## 🔄 Aggiornamenti Futuri

### Metodo Git (RACCOMANDATO)
```bash
# Sul server
cd /path/to/deploy/audioscribe
git pull origin main
npm install --production
npm run build
cd server && npm install --production && cd ..
pm2 restart audioscribe-server
```

### Metodo Manuale
```bash
# 1. Locale: build
npm run build
tar -czf update.tar.gz dist/ server/

# 2. Upload
scp update.tar.gz user@server:/path/to/audioscribe/

# 3. Server: applica
cd /path/to/audioscribe
tar -xzf update.tar.gz
cd server && npm install --production && cd ..
pm2 restart audioscribe-server
```

---

## ✅ Checklist Post-Deploy

- [ ] Server avviato: `pm2 status`
- [ ] Health check OK: `curl http://localhost:3001/api/health`
- [ ] FFmpeg disponibile: `ffmpeg -version`
- [ ] Nginx configurato correttamente
- [ ] SSL attivo (se produzione)
- [ ] Logs puliti: `pm2 logs audioscribe-server --lines 20`
- [ ] Test upload file: prova dal frontend
- [ ] Test trascrizione: carica audio/video piccolo
- [ ] Test chunk: carica file >25MB

---

## 🐛 Troubleshooting Deploy

### Server non si avvia
```bash
# Controlla logs
pm2 logs audioscribe-server --err

# Verifica porta
lsof -i :3001

# Test manuale
cd server
node server.js
```

### Errore "FFmpeg not found"
```bash
# Installa FFmpeg
sudo apt update
sudo apt install ffmpeg

# Verifica
which ffmpeg
ffmpeg -version
```

### Upload fallisce (413 Request Entity Too Large)
```bash
# Nginx: aumenta limite
sudo nano /etc/nginx/nginx.conf
# Aggiungi in http { }:
client_max_body_size 500M;

# Riavvia
sudo systemctl reload nginx
```

### CORS errors
```bash
# Verifica .env del server
cat server/.env

# Assicurati che CORS sia configurato correttamente
# In server.js dovrebbe già essere configurato
```

---

## 📞 Comandi Utili

```bash
# Restart server
pm2 restart audioscribe-server

# Stop server
pm2 stop audioscribe-server

# Rimuovi da PM2
pm2 delete audioscribe-server

# Salva configurazione PM2
pm2 save

# Lista processi
pm2 list

# Reset logs
pm2 flush

# Disk usage
du -sh /path/to/audioscribe

# Clean temp files
rm -rf /path/to/audioscribe/server/temp/*
rm -rf /path/to/audioscribe/server/uploads/*
```

---

## 🎉 Deploy Completato!

**Verifica finale:**
1. Apri `https://your-domain.com`
2. Carica un file audio o video
3. Usa "Backend Server" per trascrizione
4. Verifica che tutto funzioni senza bloccare il browser

**Monitoraggio continuo:**
- `pm2 monit` - Dashboard real-time
- `pm2 logs audioscribe-server` - Logs applicazione
- `sudo tail -f /var/log/nginx/error.log` - Logs Nginx

**Documentazione:**
- [CHANGELOG.md](CHANGELOG.md) - Novità v2.0.0
- [UPGRADE-v2.md](UPGRADE-v2.md) - Guida upgrade dettagliata
- [QUICK-START-v2.md](QUICK-START-v2.md) - Quick reference

---

Buon deploy! 🚀
