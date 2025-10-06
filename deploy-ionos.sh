#!/bin/bash

# 🚀 Script Deploy AudioScribe su IONOS VPS
# Versione con gestione chunk locali ottimizzata

echo "🚀 === DEPLOY AUDIOSCRIBE SU IONOS VPS ==="
echo "📅 $(date)"
echo ""

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzione per log colorati
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verifica se siamo su Ubuntu/Debian
if ! command -v apt &> /dev/null; then
    log_error "Questo script è per Ubuntu/Debian. Adatta per il tuo OS."
    exit 1
fi

log_info "Aggiornamento sistema..."
sudo apt update && sudo apt upgrade -y

log_info "Installazione dipendenze base..."
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx

# Installa Node.js 18+
log_info "Installazione Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verifica versioni
log_success "Node.js versione: $(node --version)"
log_success "NPM versione: $(npm --version)"

# Installa FFmpeg (CRITICO per AudioScribe)
log_info "Installazione FFmpeg..."
sudo apt install -y ffmpeg

# Verifica FFmpeg
if command -v ffmpeg &> /dev/null; then
    log_success "FFmpeg installato: $(ffmpeg -version | head -n1)"
else
    log_error "FFmpeg non installato correttamente!"
    exit 1
fi

# Installa PM2 per gestione processi
log_info "Installazione PM2..."
sudo npm install -g pm2

# Crea directory progetto
PROJECT_DIR="/var/www/audioscribe"
log_info "Creazione directory progetto: $PROJECT_DIR"
sudo mkdir -p $PROJECT_DIR
sudo chown -R $USER:$USER $PROJECT_DIR

# Clone progetto (sostituisci con il tuo repository)
log_info "Clone progetto..."
cd /var/www
if [ -d "audioscribe" ]; then
    log_warning "Directory audioscribe esiste già, aggiornando..."
    cd audioscribe
    git pull
else
    # SOSTITUISCI CON IL TUO REPOSITORY GITHUB
    git clone https://github.com/your-username/audioscribe.git
    cd audioscribe
fi

# Setup Backend
log_info "Setup Backend..."
cd server

# Installa dipendenze backend
npm install

# Crea file .env se non esiste
if [ ! -f .env ]; then
    log_info "Creazione file .env backend..."
    cat > .env << EOF
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=3001
NODE_ENV=production

# File Storage
UPLOAD_DIR=./uploads
TEMP_DIR=./temp
MAX_FILE_SIZE=100000000

# Chunk Management
CHUNK_CLEANUP_INTERVAL=30
CHUNK_MAX_AGE_HOURS=1
EOF
    log_warning "⚠️  IMPORTANTE: Modifica .env con la tua API Key OpenAI!"
    log_warning "    nano .env"
else
    log_success "File .env backend già esistente"
fi

# Crea directory per chunk e upload
mkdir -p uploads temp temp/chunks
log_success "Directory storage create"

# Setup Frontend
log_info "Setup Frontend..."
cd ..

# Installa dipendenze frontend
npm install

# Build frontend per produzione
log_info "Build frontend..."
npm run build

if [ ! -d "dist" ]; then
    log_error "Build frontend fallito!"
    exit 1
fi

log_success "Frontend buildato con successo"

# Configurazione Nginx
log_info "Configurazione Nginx..."

# Rimuovi eventuali configurazioni brotli non supportate
sudo rm -f /etc/nginx/conf.d/brotli.conf /etc/nginx/modules-enabled/*brotli* 2>/dev/null || true

# Backup configurazione esistente
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup 2>/dev/null || true

# Crea configurazione AudioScribe
sudo tee /etc/nginx/sites-available/audioscribe > /dev/null << 'EOF'
server {
    listen 80;
    server_name _; # Sostituisci con il tuo dominio

    # Aumenta limiti per upload file grandi
    client_max_body_size 100M;
    client_body_timeout 300s;
    client_header_timeout 300s;

    # Frontend statico
    location / {
        root /var/www/audioscribe/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache per asset statici
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API Backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout per trascrizioni lunghe
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Logs
    access_log /var/log/nginx/audioscribe.access.log;
    error_log /var/log/nginx/audioscribe.error.log;
}
EOF

# Attiva configurazione
sudo ln -sf /etc/nginx/sites-available/audioscribe /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test configurazione Nginx
if sudo nginx -t; then
    log_success "Configurazione Nginx valida"
    sudo systemctl reload nginx
else
    log_error "Configurazione Nginx non valida!"
    exit 1
fi

# Avvia backend con PM2
log_info "Avvio backend con PM2..."
cd $PROJECT_DIR/server

# Crea file ecosystem PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'audioscribe-backend',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Crea directory logs
mkdir -p logs

# Avvia con PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

log_success "Backend avviato con PM2"

# Configurazione firewall (se ufw è installato)
if command -v ufw &> /dev/null; then
    log_info "Configurazione firewall..."
    sudo ufw allow 22/tcp   # SSH
    sudo ufw allow 80/tcp   # HTTP
    sudo ufw allow 443/tcp  # HTTPS
    # Non aprire 3001 - solo interno
    log_success "Firewall configurato"
fi

# Cron job per pulizia automatica
log_info "Setup pulizia automatica..."
(crontab -l 2>/dev/null; echo "0 */6 * * * find $PROJECT_DIR/server/temp -type f -mtime +1 -delete") | crontab -
(crontab -l 2>/dev/null; echo "0 2 * * * pm2 restart audioscribe-backend") | crontab -

log_success "Cron job configurati"

# Verifica finale
log_info "Verifica installazione..."

# Test backend
if curl -s http://localhost:3001/api/health > /dev/null; then
    log_success "✅ Backend risponde correttamente"
else
    log_error "❌ Backend non risponde"
fi

# Test Nginx
if curl -s http://localhost > /dev/null; then
    log_success "✅ Nginx serve il frontend"
else
    log_error "❌ Nginx non risponde"
fi

# Test FFmpeg
if ffmpeg -version > /dev/null 2>&1; then
    log_success "✅ FFmpeg funzionante"
else
    log_error "❌ FFmpeg non funziona"
fi

echo ""
echo "🎉 === DEPLOY COMPLETATO ==="
echo ""
log_success "✅ AudioScribe installato con successo!"
echo ""
echo "📋 PROSSIMI PASSI:"
echo "1. 🔑 Configura API Key OpenAI:"
echo "   nano $PROJECT_DIR/server/.env"
echo ""
echo "2. 🌐 Configura il tuo dominio:"
echo "   sudo nano /etc/nginx/sites-available/audioscribe"
echo "   (sostituisci 'server_name _;' con 'server_name tuodominio.com;')"
echo ""
echo "3. 🔒 Attiva HTTPS (dopo aver configurato il dominio):"
echo "   sudo certbot --nginx -d tuodominio.com"
echo ""
echo "4. 🔄 Riavvia servizi:"
echo "   pm2 restart audioscribe-backend"
echo "   sudo systemctl reload nginx"
echo ""
echo "📊 COMANDI UTILI:"
echo "• Stato backend: pm2 status"
echo "• Log backend: pm2 logs audioscribe-backend"
echo "• Riavvia backend: pm2 restart audioscribe-backend"
echo "• Test Nginx: sudo nginx -t"
echo "• Log Nginx: sudo tail -f /var/log/nginx/audioscribe.error.log"
echo ""
echo "🌐 ACCESSO:"
echo "• Frontend: http://$(curl -s ifconfig.me || echo 'YOUR-SERVER-IP')"
echo "• API Health: http://$(curl -s ifconfig.me || echo 'YOUR-SERVER-IP')/api/health"
echo ""
log_success "Deploy completato! 🚀"