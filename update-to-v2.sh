#!/bin/bash

# Script di aggiornamento AudioScribe v2.0.0
# Esegui questo script per aggiornare da v1.x a v2.0.0

set -e  # Exit on error

echo "🚀 AudioScribe - Aggiornamento a v2.0.0"
echo "======================================"
echo ""

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzione per stampare messaggi colorati
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 1. Verifica FFmpeg
echo "Controllo prerequisiti..."
if ! command -v ffmpeg &> /dev/null; then
    print_error "FFmpeg non trovato!"
    echo ""
    echo "FFmpeg è OBBLIGATORIO per la nuova versione 2.0.0"
    echo ""
    echo "Installazione:"
    echo "  macOS:   brew install ffmpeg"
    echo "  Linux:   sudo apt install ffmpeg"
    echo "  Windows: Scarica da https://ffmpeg.org e aggiungi al PATH"
    echo ""
    exit 1
fi
print_success "FFmpeg installato: $(ffmpeg -version | head -n 1)"

# 2. Backup (opzionale)
read -p "Vuoi creare un backup prima dell'aggiornamento? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
    echo "Creazione backup in $BACKUP_DIR..."
    mkdir -p "$BACKUP_DIR"
    cp -r dist server/server.js server/routes server/services "$BACKUP_DIR/" 2>/dev/null || true
    print_success "Backup creato in $BACKUP_DIR"
fi

# 3. Pull modifiche (se usando git)
if [ -d ".git" ]; then
    print_info "Repository Git rilevato"
    read -p "Vuoi fare git pull? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Eseguendo git pull..."
        git pull origin main || git pull origin master
        print_success "Git pull completato"
    fi
fi

# 4. Installa dipendenze frontend
echo ""
print_info "Installazione dipendenze frontend..."
npm install
print_success "Dipendenze frontend installate"

# 5. Build frontend
echo ""
print_info "Build frontend..."
npm run build
print_success "Build frontend completata"

# 6. Installa dipendenze server
echo ""
print_info "Installazione dipendenze server..."
cd server
npm install
cd ..
print_success "Dipendenze server installate"

# 7. Verifica .env
echo ""
if [ ! -f "server/.env" ]; then
    print_warning "File server/.env non trovato!"
    echo ""
    echo "Crea il file server/.env con:"
    echo "  OPENAI_API_KEY=your_key_here"
    echo "  PORT=3001"
    echo "  NODE_ENV=production"
    echo ""
    read -p "Vuoi che lo crei ora? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "PORT=3001" > server/.env
        echo "NODE_ENV=production" >> server/.env
        echo "OPENAI_API_KEY=" >> server/.env
        echo "UPLOAD_DIR=./uploads" >> server/.env
        print_success "File .env creato. RICORDA DI AGGIUNGERE LA TUA OPENAI_API_KEY!"
    fi
fi

# 8. Verifica configurazione
echo ""
print_info "Verifica configurazione..."
if grep -q "OPENAI_API_KEY=$" server/.env 2>/dev/null || ! grep -q "OPENAI_API_KEY" server/.env 2>/dev/null; then
    print_warning "OPENAI_API_KEY non configurata in server/.env"
    echo "Modifica server/.env e aggiungi la tua API key"
fi

# 9. Test rapido
echo ""
print_info "Test rapido server..."
cd server
timeout 3 node server.js &> /dev/null && print_success "Server funzionante" || print_warning "Verifica manualmente il server"
cd ..

# 10. Istruzioni finali
echo ""
echo "======================================"
print_success "Aggiornamento completato!"
echo "======================================"
echo ""
echo "📋 Prossimi passi:"
echo ""
echo "1️⃣  Verifica configurazione:"
echo "   - Controlla server/.env per OPENAI_API_KEY"
echo ""
echo "2️⃣  Avvia il server:"
echo "   cd server"
echo "   npm run dev      # Sviluppo"
echo "   npm start        # Produzione"
echo ""
echo "3️⃣  (Opzionale) Configura PM2 per produzione:"
echo "   pm2 start server/server.js --name audioscribe-server"
echo "   pm2 save"
echo ""
echo "4️⃣  Testa la nuova funzionalità:"
echo "   - Apri l'app nel browser"
echo "   - Vai alla tab 'Backend Server'"
echo "   - Carica un file audio/video"
echo "   - Clicca 'Avvia Trascrizione Smart Server'"
echo ""
echo "📖 Novità v2.0.0:"
echo "   ✨ Trascrizione smart server (zero carico browser)"
echo "   ✨ Supporto video automatico"
echo "   ✨ Chunking automatico lato server"
echo "   ✨ 10-100x più veloce per file grandi"
echo ""
echo "📚 Leggi CHANGELOG.md per tutti i dettagli"
echo ""
print_success "Buon lavoro con AudioScribe v2.0.0! 🎉"
