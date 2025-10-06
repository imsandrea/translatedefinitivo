# 🚀 Deploy AudioScribe su IONOS VPS

Guida completa per deployare AudioScribe su un VPS IONOS con gestione ottimizzata dei chunk audio.

## 🎯 Caratteristiche Ottimizzate per IONOS

### ✅ **Gestione Chunk Locali:**
- 💾 **Salvataggio temporaneo** dei chunk audio sul server
- 🧹 **Pulizia automatica** dopo ogni trascrizione
- ⏰ **Cleanup schedulato** ogni 30 minuti per sessioni vecchie
- 📊 **Monitoraggio memoria** e statistiche uso

### ✅ **Ottimizzazioni Server:**
- 🔄 **PM2** per auto-restart e gestione processi
- 🌐 **Nginx** come reverse proxy ottimizzato
- 📁 **Directory temporanee** organizzate per sessione
- 🗑️ **Pulizia automatica** file temporanei

## 📋 Requisiti VPS IONOS

### **💰 Piano Consigliato:**
- **VPS S** (€4/mese) - 2GB RAM, 40GB SSD
- **VPS M** (€8/mese) - 4GB RAM, 80GB SSD ⭐ **Raccomandato**
- **VPS L** (€16/mese) - 8GB RAM, 160GB SSD

### **🖥️ Sistema Operativo:**
- **Ubuntu 20.04 LTS** ⭐ **Raccomandato**
- Ubuntu 22.04 LTS
- Debian 11

## 🚀 Deploy Automatico

### **1. 📥 Scarica Script Deploy:**
```bash
wget https://raw.githubusercontent.com/your-repo/audioscribe/main/deploy-ionos.sh
chmod +x deploy-ionos.sh
```

### **2. 🔧 Esegui Deploy:**
```bash
./deploy-ionos.sh
```

Lo script farà tutto automaticamente:
- ✅ Aggiorna sistema
- ✅ Installa Node.js 18, FFmpeg, Nginx
- ✅ Clona progetto e installa dipendenze
- ✅ Configura backend con gestione chunk
- ✅ Build frontend per produzione
- ✅ Configura Nginx con reverse proxy
- ✅ Avvia backend con PM2
- ✅ Configura pulizia automatica

## ⚙️ Configurazione Post-Deploy

### **1. 🔑 Configura API Key OpenAI:**
```bash
cd /var/www/audioscribe/server
nano .env
```

Modifica:
```env
OPENAI_API_KEY=sk-proj-your-real-api-key-here
```

### **2. 🌐 Configura Dominio (Opzionale):**
```bash
sudo nano /etc/nginx/sites-available/audioscribe
```

Sostituisci:
```nginx
server_name _; # con il tuo dominio
server_name tuodominio.com;
```

### **3. 🔒 Attiva HTTPS:**
```bash
sudo certbot --nginx -d tuodominio.com
```

### **4. 🔄 Riavvia Servizi:**
```bash
pm2 restart audioscribe-backend
sudo systemctl reload nginx
```

## 📊 Gestione Chunk Ottimizzata

### **🔄 Flusso Chunk:**
1. **Upload** → File caricato in memoria
2. **Chunking** → Diviso e salvato in `/temp/chunks/sessionId/`
3. **Trascrizione** → Ogni chunk processato da Whisper
4. **Pulizia** → Chunk eliminati automaticamente dopo trascrizione

### **🧹 Pulizia Automatica:**
- **Immediata**: Dopo ogni trascrizione completata
- **Schedulata**: Ogni 30 minuti per sessioni abbandonate
- **Cron**: Pulizia file orfani ogni 6 ore

### **📈 Monitoraggio:**
```bash
# Statistiche chunk attivi
curl http://localhost:3001/api/chunked/stats

# Log backend
pm2 logs audioscribe-backend

# Spazio disco
df -h /var/www/audioscribe/server/temp
```

## 🛠️ Comandi Utili

### **📊 Stato Servizi:**
```bash
# Backend
pm2 status
pm2 logs audioscribe-backend

# Nginx
sudo systemctl status nginx
sudo nginx -t

# Spazio disco
du -sh /var/www/audioscribe/server/temp/*
```

### **🔄 Riavvio Servizi:**
```bash
# Backend
pm2 restart audioscribe-backend

# Nginx
sudo systemctl reload nginx

# Tutto
pm2 restart all && sudo systemctl reload nginx
```

### **🧹 Pulizia Manuale:**
```bash
# Pulisci chunk vecchi
find /var/www/audioscribe/server/temp -type f -mtime +1 -delete

# Pulisci log PM2
pm2 flush

# Pulisci cache Nginx
sudo rm -rf /var/cache/nginx/*
```

## 🔧 Troubleshooting

### **❌ Backend Non Risponde:**
```bash
# Verifica processo
pm2 status

# Verifica log
pm2 logs audioscribe-backend --lines 50

# Riavvia
pm2 restart audioscribe-backend
```

### **❌ FFmpeg Non Funziona:**
```bash
# Test FFmpeg
ffmpeg -version

# Reinstalla se necessario
sudo apt install --reinstall ffmpeg
```

### **❌ Spazio Disco Pieno:**
```bash
# Verifica spazio
df -h

# Pulisci chunk
sudo find /var/www/audioscribe/server/temp -type f -mtime +0 -delete

# Pulisci log
sudo journalctl --vacuum-time=7d
```

### **❌ Nginx Errore 502:**
```bash
# Verifica backend
curl http://localhost:3001/api/health

# Verifica configurazione
sudo nginx -t

# Log Nginx
sudo tail -f /var/log/nginx/audioscribe.error.log
```

## 📈 Ottimizzazioni Prestazioni

### **🚀 Per File Grandi (>50MB):**
```bash
# Aumenta timeout Nginx
sudo nano /etc/nginx/sites-available/audioscribe
```

Aggiungi:
```nginx
client_body_timeout 600s;
proxy_read_timeout 600s;
```

### **💾 Per Molti Utenti Simultanei:**
```bash
# Aumenta istanze PM2
pm2 scale audioscribe-backend 2
```

### **🗄️ Per Storage Ottimizzato:**
```bash
# Monta storage separato per temp
sudo mkdir /mnt/audioscribe-temp
sudo mount /dev/sdb1 /mnt/audioscribe-temp
```

## 🔒 Sicurezza

### **🛡️ Firewall:**
```bash
# UFW (se installato)
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### **🔐 SSL/TLS:**
```bash
# Rinnovo automatico certificati
sudo crontab -e
# Aggiungi: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **👤 Utente Dedicato:**
```bash
# Crea utente per AudioScribe
sudo useradd -r -s /bin/false audioscribe
sudo chown -R audioscribe:audioscribe /var/www/audioscribe/server/temp
```

## 📞 Supporto

### **🆘 In Caso di Problemi:**
1. **Verifica log**: `pm2 logs audioscribe-backend`
2. **Test API**: `curl http://localhost:3001/api/health`
3. **Verifica FFmpeg**: `ffmpeg -version`
4. **Spazio disco**: `df -h`

### **📧 Contatti:**
- **GitHub Issues**: Per bug e feature request
- **Email**: Per supporto deploy IONOS

---

## 🎉 Deploy Completato!

Dopo il deploy avrai:
- ✅ **Frontend**: `http://tuo-ip-ionos`
- ✅ **API**: `http://tuo-ip-ionos/api/health`
- ✅ **Gestione chunk** ottimizzata
- ✅ **Pulizia automatica** configurata
- ✅ **Monitoraggio** attivo

**AudioScribe è pronto per la produzione su IONOS! 🚀**