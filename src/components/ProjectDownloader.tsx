import React, { useState } from 'react';
import { Download, FileArchive, Folder, Code, Server, Settings } from 'lucide-react';

export const ProjectDownloader: React.FC = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadType, setDownloadType] = useState<'complete' | 'frontend' | 'backend'>('complete');

  const downloadFile = (content: string, filename: string, mimeType: string = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadProjectStructure = () => {
    const structure = `# 📁 AudioScribe - Struttura Progetto

## 🎯 Progetto Completo
audioscribe/
├── 📁 src/                     # Frontend React + TypeScript
│   ├── 📁 components/          # Componenti UI
│   │   ├── ApiKeySetup.tsx
│   │   ├── AudioPlayer.tsx
│   │   ├── BackendTranscription.tsx
│   │   ├── DeploymentGuide.tsx
│   │   ├── FileUpload.tsx
│   │   ├── ServiceSelector.tsx
│   │   ├── TextFormattingPanel.tsx
│   │   ├── TranscriptionEditor.tsx
│   │   ├── TranscriptionService.tsx
│   │   └── WhisperTranscription.tsx
│   ├── 📁 services/            # Servizi e logica business
│   │   ├── alternativeTranscriptionServices.ts
│   │   ├── audioChunker.ts
│   │   ├── backendService.ts
│   │   ├── textFormatter.ts
│   │   ├── videoProcessor.ts
│   │   └── whisperService.ts
│   ├── 📁 types/              # Tipi TypeScript
│   │   └── speech.d.ts
│   ├── App.tsx                # Componente principale
│   ├── main.tsx              # Entry point
│   └── index.css             # Stili globali
├── 📁 server/                 # Backend Node.js + Express
│   ├── 📁 routes/            # API endpoints
│   │   ├── chunkedTranscription.js
│   │   └── transcription.js
│   ├── 📁 services/          # Servizi backend
│   │   ├── audioProcessor.js
│   │   ├── chunkManager.js
│   │   ├── videoProcessor.js
│   │   └── whisperService.js
│   ├── server.js             # Server principale
│   ├── package.json          # Dipendenze backend
│   └── .env.example          # Template configurazione
├── 📁 public/                # File statici
├── 📄 deploy-ionos.sh        # Script deploy IONOS
├── 📄 README.md              # Documentazione
├── 📄 README-IONOS.md        # Guida deploy IONOS
├── 📄 CONTRIBUTING.md        # Guida contributori
├── 📄 LICENSE                # Licenza MIT
├── 📄 package.json           # Dipendenze frontend
├── 📄 vite.config.ts         # Configurazione Vite
├── 📄 tailwind.config.js     # Configurazione Tailwind
├── 📄 tsconfig.json          # Configurazione TypeScript
└── 📄 .env.example           # Template configurazione

## 🚀 Tecnologie Utilizzate
- **Frontend**: React 18, TypeScript, Tailwind CSS, FFmpeg.js
- **Backend**: Node.js, Express, FFmpeg, Multer
- **AI**: OpenAI Whisper, ChatGPT
- **Deploy**: PM2, Nginx, Let's Encrypt

## 📦 Dipendenze Principali
### Frontend:
- react, react-dom
- typescript
- tailwindcss
- @ffmpeg/ffmpeg, @ffmpeg/util
- openai
- lucide-react

### Backend:
- express
- cors
- multer
- fluent-ffmpeg
- openai
- uuid
- dotenv

## 🔧 Setup Rapido
1. npm install (frontend)
2. cd server && npm install (backend)
3. Configura .env con API Key OpenAI
4. npm run dev (frontend)
5. cd server && npm run dev (backend)

## 🌐 Deploy
- **Locale**: Funziona subito
- **IONOS**: Script automatico deploy-ionos.sh
- **Altri VPS**: Adatta script per il tuo provider
`;

    downloadFile(structure, 'AudioScribe-Struttura-Progetto.md');
  };

  const downloadSetupGuide = () => {
    const guide = `# 🚀 AudioScribe - Guida Setup Completa

## 📋 Prerequisiti
- Node.js 18+ (https://nodejs.org)
- NPM o Yarn
- API Key OpenAI (https://platform.openai.com/api-keys)
- FFmpeg (per backend) - https://ffmpeg.org

## 🔧 Setup Locale

### 1. Frontend Setup
\`\`\`bash
# Installa dipendenze
npm install

# Crea file configurazione
cp .env.example .env

# Modifica .env con la tua API Key OpenAI
# VITE_OPENAI_API_KEY=sk-proj-your-real-key-here

# Avvia sviluppo
npm run dev
\`\`\`

### 2. Backend Setup (Opzionale)
\`\`\`bash
cd server
npm install

# Crea configurazione
cp .env.example .env

# Modifica server/.env
# OPENAI_API_KEY=your_openai_api_key_here
# PORT=3001

# Avvia backend
npm run dev
\`\`\`

### 3. Installa FFmpeg (Per Backend)
\`\`\`bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows
# Scarica da https://ffmpeg.org/download.html
# Aggiungi al PATH di sistema
\`\`\`

## 🌐 Deploy Produzione

### IONOS VPS (Raccomandato)
\`\`\`bash
# Sul tuo VPS IONOS
wget https://raw.githubusercontent.com/your-username/audioscribe/main/deploy-ionos.sh
chmod +x deploy-ionos.sh
./deploy-ionos.sh
\`\`\`

### Altri Provider
- Adatta lo script deploy-ionos.sh
- Configura Nginx come reverse proxy
- Usa PM2 per gestione processi
- Configura SSL con Let's Encrypt

## 🔑 Configurazione API Key

### Metodo 1: File .env (Raccomandato)
\`\`\`env
VITE_OPENAI_API_KEY=sk-proj-your-real-key-here
\`\`\`

### Metodo 2: Interfaccia Web
- Clicca "Configura API Key" nell'app
- Inserisci la chiave (salvata in localStorage)

## 🎯 Come Usare
1. Carica file audio/video
2. Seleziona lingua
3. Scegli tipo contenuto
4. Avvia trascrizione
5. Modifica risultato
6. Esporta in vari formati

## 💰 Costi
- OpenAI Whisper: $0.006/minuto
- Esempio: 1 ora = ~$0.36
- File grandi: chunking automatico

## 🔒 Privacy
- API Key solo locale o .env
- File processati temporaneamente
- Nessun salvataggio permanente
- Pulizia automatica

## 🆘 Troubleshooting
- FFmpeg non trovato: Installa e verifica PATH
- CORS errors: Configura backend origin
- Memory issues: Usa chunking per file grandi
- API errors: Verifica chiave OpenAI

## 📞 Supporto
- Documentazione: README.md
- Issues: GitHub Issues
- Email: audioscribe@example.com
`;

    downloadFile(guide, 'AudioScribe-Setup-Guide.md');
  };

  const downloadEnvTemplate = () => {
    const envContent = `# 🔑 AudioScribe - Configurazione Environment

# ===========================================
# FRONTEND CONFIGURATION (.env)
# ===========================================

# OpenAI API Key (OBBLIGATORIA)
# Ottieni da: https://platform.openai.com/api-keys
VITE_OPENAI_API_KEY=sk-proj-your-real-openai-api-key-here

# Backend URL (se usi backend locale)
VITE_BACKEND_URL=http://localhost:3001/api

# ===========================================
# BACKEND CONFIGURATION (server/.env)
# ===========================================

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=3001
NODE_ENV=development

# File Storage
UPLOAD_DIR=./uploads
TEMP_DIR=./temp
MAX_FILE_SIZE=100000000

# Chunk Management
CHUNK_CLEANUP_INTERVAL=30
CHUNK_MAX_AGE_HOURS=1

# ===========================================
# ISTRUZIONI
# ===========================================

# 1. Copia questo file come .env nella root del progetto
# 2. Copia questo file come .env nella cartella server/
# 3. Sostituisci "your_openai_api_key_here" con la tua vera API key
# 4. La API key deve iniziare con "sk-proj-" o "sk-"
# 5. Non condividere mai la tua API key!

# ===========================================
# COME OTTENERE API KEY OPENAI
# ===========================================

# 1. Vai su https://platform.openai.com/api-keys
# 2. Accedi o crea account OpenAI
# 3. Clicca "Create new secret key"
# 4. Copia la chiave (inizia con sk-proj- o sk-)
# 5. Incollala sopra sostituendo "your_openai_api_key_here"

# ===========================================
# COSTI OPENAI WHISPER
# ===========================================

# - Prezzo: $0.006 per minuto di audio
# - Esempio: 1 ora di audio = ~$0.36
# - File grandi: chunking automatico
# - Limite: 25MB per file (gestito automaticamente)
`;

    downloadFile(envContent, 'AudioScribe-ENV-Template.txt');
  };

  const downloadDeployScript = () => {
    const deployScript = `#!/bin/bash

# 🚀 AudioScribe - Script Deploy IONOS VPS
# Versione con gestione chunk locali ottimizzata

echo "🚀 === DEPLOY AUDIOSCRIBE SU IONOS VPS ==="
echo "📅 $(date)"
echo ""

# Colori per output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

# Funzione per log colorati
log_info() {
    echo -e "\${BLUE}ℹ️  $1\${NC}"
}

log_success() {
    echo -e "\${GREEN}✅ $1\${NC}"
}

log_warning() {
    echo -e "\${YELLOW}⚠️  $1\${NC}"
}

log_error() {
    echo -e "\${RED}❌ $1\${NC}"
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

# IMPORTANTE: Qui devi caricare i tuoi file
log_warning "⚠️  IMPORTANTE: Carica i file del progetto in $PROJECT_DIR"
log_warning "    Puoi usare scp, rsync, o caricare manualmente"
log_warning "    Esempio: scp -r ./audioscribe/* user@your-server:$PROJECT_DIR/"

# Setup Backend
log_info "Setup Backend..."
cd $PROJECT_DIR/server

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
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
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
`;

    downloadFile(deployScript, 'deploy-ionos.sh', 'text/x-shellscript');
  };

  const downloadPackageJson = () => {
    const packageJson = `{
  "name": "audioscribe",
  "private": true,
  "version": "1.0.0",
  "description": "Trascrizione professionale di file audio e video con OpenAI Whisper",
  "author": "AudioScribe Team",
  "license": "MIT",
  "keywords": [
    "audio",
    "video",
    "transcription",
    "whisper",
    "openai",
    "speech-to-text",
    "ffmpeg",
    "react",
    "typescript"
  ],
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "echo \\"No tests yet\\" && exit 0"
  },
  "dependencies": {
    "@ffmpeg/ffmpeg": "^0.12.15",
    "@ffmpeg/util": "^0.12.2",
    "cors": "^2.8.5",
    "dotenv": "^17.2.2",
    "express": "^5.1.0",
    "fluent-ffmpeg": "^2.1.3",
    "lucide-react": "^0.344.0",
    "multer": "^2.0.2",
    "openai": "^5.20.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "uuid": "^13.0.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.9.1",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.18",
    "eslint": "^9.9.1",
    "eslint-plugin-react-hooks": "^5.1.0-rc.0",
    "eslint-plugin-react-refresh": "^0.4.11",
    "globals": "^15.9.0",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.5.3",
    "typescript-eslint": "^8.3.0",
    "vite": "^5.4.2"
  }
}`;

    downloadFile(packageJson, 'package.json', 'application/json');
  };

  const downloadServerPackageJson = () => {
    const serverPackageJson = `{
  "name": "audioscribe-backend",
  "version": "1.0.0",
  "description": "Backend Node.js per AudioScribe - elaborazione audio/video e trascrizione",
  "author": "AudioScribe Team",
  "license": "MIT",
  "keywords": [
    "audio",
    "video",
    "transcription",
    "whisper",
    "ffmpeg",
    "nodejs",
    "express"
  ],
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "test": "echo \\"No tests yet\\" && exit 0"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "fluent-ffmpeg": "^2.1.2",
    "multer": "^1.4.5-lts.1",
    "openai": "^5.20.2",
    "uuid": "^9.0.1"
  }
}`;

    downloadFile(serverPackageJson, 'server-package.json', 'application/json');
  };

  const downloadAllFiles = async () => {
    setIsDownloading(true);
    
    // Download tutti i file principali
    downloadProjectStructure();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    downloadSetupGuide();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    downloadEnvTemplate();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    downloadDeployScript();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    downloadPackageJson();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    downloadServerPackageJson();
    
    setIsDownloading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-green-600 p-2 rounded-lg">
          <Download className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">📦 Download Progetto AudioScribe</h2>
          <p className="text-sm text-gray-600">Scarica tutto il codice sorgente e i file di configurazione</p>
        </div>
      </div>

      {/* Tipo Download */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Cosa vuoi scaricare?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
            downloadType === 'complete' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
          }`}>
            <input
              type="radio"
              value="complete"
              checked={downloadType === 'complete'}
              onChange={(e) => setDownloadType(e.target.value as any)}
              className="sr-only"
            />
            <FileArchive className="w-6 h-6 text-green-600 mr-3" />
            <div>
              <div className="font-medium text-gray-800">Progetto Completo</div>
              <div className="text-sm text-gray-600">Frontend + Backend + Deploy</div>
            </div>
          </label>

          <label className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
            downloadType === 'frontend' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
          }`}>
            <input
              type="radio"
              value="frontend"
              checked={downloadType === 'frontend'}
              onChange={(e) => setDownloadType(e.target.value as any)}
              className="sr-only"
            />
            <Code className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <div className="font-medium text-gray-800">Solo Frontend</div>
              <div className="text-sm text-gray-600">React + TypeScript</div>
            </div>
          </label>

          <label className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
            downloadType === 'backend' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
          }`}>
            <input
              type="radio"
              value="backend"
              checked={downloadType === 'backend'}
              onChange={(e) => setDownloadType(e.target.value as any)}
              className="sr-only"
            />
            <Server className="w-6 h-6 text-purple-600 mr-3" />
            <div>
              <div className="font-medium text-gray-800">Solo Backend</div>
              <div className="text-sm text-gray-600">Node.js + Express</div>
            </div>
          </label>
        </div>
      </div>

      {/* Download Singoli */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Download Singoli</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <button
            onClick={downloadProjectStructure}
            className="flex items-center justify-center p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Folder className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-800">Struttura Progetto</span>
          </button>

          <button
            onClick={downloadSetupGuide}
            className="flex items-center justify-center p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Settings className="w-4 h-4 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-800">Guida Setup</span>
          </button>

          <button
            onClick={downloadEnvTemplate}
            className="flex items-center justify-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
          >
            <Code className="w-4 h-4 text-yellow-600 mr-2" />
            <span className="text-sm font-medium text-yellow-800">Template .env</span>
          </button>

          <button
            onClick={downloadDeployScript}
            className="flex items-center justify-center p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <Server className="w-4 h-4 text-purple-600 mr-2" />
            <span className="text-sm font-medium text-purple-800">Script Deploy</span>
          </button>

          <button
            onClick={downloadPackageJson}
            className="flex items-center justify-center p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <FileArchive className="w-4 h-4 text-orange-600 mr-2" />
            <span className="text-sm font-medium text-orange-800">package.json</span>
          </button>

          <button
            onClick={downloadServerPackageJson}
            className="flex items-center justify-center p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Server className="w-4 h-4 text-red-600 mr-2" />
            <span className="text-sm font-medium text-red-800">server package.json</span>
          </button>
        </div>
      </div>

      {/* Download Principale */}
      <div className="space-y-4">
        <button
          onClick={downloadAllFiles}
          disabled={isDownloading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-4 px-6 rounded-lg transition-colors flex items-center justify-center space-x-3 text-lg font-semibold"
        >
          {isDownloading ? (
            <>
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Scaricando...</span>
            </>
          ) : (
            <>
              <Download className="w-6 h-6" />
              <span>📦 Scarica Tutto (6 File)</span>
            </>
          )}
        </button>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">📋 Cosa Scaricherai:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Struttura-Progetto.md</strong> - Mappa completa dei file</li>
            <li>• <strong>Setup-Guide.md</strong> - Istruzioni dettagliate</li>
            <li>• <strong>ENV-Template.txt</strong> - Configurazione environment</li>
            <li>• <strong>deploy-ionos.sh</strong> - Script deploy automatico</li>
            <li>• <strong>package.json</strong> - Dipendenze frontend</li>
            <li>• <strong>server-package.json</strong> - Dipendenze backend</li>
          </ul>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 mb-2">⚠️ Importante:</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• I file scaricati contengono solo la <strong>configurazione e documentazione</strong></li>
            <li>• Per il <strong>codice sorgente completo</strong>, dovrai copiare manualmente i file da Bolt</li>
            <li>• Oppure pubblicare su GitHub per un backup completo</li>
            <li>• I file .env sono template - <strong>inserisci la tua API Key OpenAI</strong></li>
          </ul>
        </div>
      </div>
    </div>
  );
};