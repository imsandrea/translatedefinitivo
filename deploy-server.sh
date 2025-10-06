#!/bin/bash

# Script di deploy AudioScribe v2.0.0 su server
# Usa questo script per fare deploy su server di produzione

set -e

echo "🚀 AudioScribe v2.0.0 - Deploy Server"
echo "====================================="
echo ""

# Colori
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# 1. Verifica che siamo nella directory corretta
if [ ! -f "package.json" ]; then
    echo "❌ Errore: esegui questo script dalla root del progetto AudioScribe"
    exit 1
fi

# 2. Verifica Git (opzionale)
if [ -d ".git" ]; then
    print_info "Git repository rilevato"

    # Verifica se ci sono modifiche non committate
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "Ci sono modifiche non committate"
        git status --short
        echo ""
        read -p "Vuoi committare le modifiche prima del deploy? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git add .
            read -p "Messaggio commit: " commit_msg
            git commit -m "$commit_msg"
            print_success "Commit creato"
        fi
    fi

    # Push su remote
    read -p "Vuoi fare git push? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push
        print_success "Push completato"
    fi
fi

# 3. Build frontend
print_info "Build frontend..."
npm install
npm run build
print_success "Build completato: dist/ pronto"

# 4. Deploy su server remoto (se configurato)
read -p "Vuoi fare deploy su server remoto? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Configurazione server remoto:"
    read -p "Host server (es: user@server.com): " SERVER_HOST
    read -p "Directory remota (es: /var/www/audioscribe): " REMOTE_DIR

    print_info "Upload file al server..."

    # Crea directory remota se non esiste
    ssh "$SERVER_HOST" "mkdir -p $REMOTE_DIR"

    # Upload file
    rsync -avz --progress \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'temp' \
        --exclude 'uploads' \
        --exclude 'backup_*' \
        . "$SERVER_HOST:$REMOTE_DIR/"

    print_success "File caricati sul server"

    # Installa dipendenze e riavvia
    print_info "Installazione dipendenze remote..."
    ssh "$SERVER_HOST" << EOF
        cd $REMOTE_DIR
        npm install --production
        cd server
        npm install --production

        # Verifica .env
        if [ ! -f .env ]; then
            echo "⚠️  File .env non trovato, crealo manualmente"
        fi

        # Riavvia con PM2 (se installato)
        if command -v pm2 &> /dev/null; then
            pm2 stop audioscribe-server || true
            pm2 start server.js --name audioscribe-server
            pm2 save
            echo "✅ Server riavviato con PM2"
        else
            echo "⚠️  PM2 non installato. Avvia manualmente con: npm start"
        fi
EOF

    print_success "Deploy completato!"
    echo ""
    echo "📋 Verifica deployment:"
    echo "   ssh $SERVER_HOST"
    echo "   cd $REMOTE_DIR"
    echo "   pm2 logs audioscribe-server"

else
    print_info "Deploy manuale"
    echo ""
    echo "📦 File pronti per il deploy in:"
    echo "   - Frontend: ./dist/"
    echo "   - Backend: ./server/"
    echo ""
    echo "📋 Carica sul server:"
    echo "   1. Copia dist/ nella directory web"
    echo "   2. Copia server/ nella directory backend"
    echo "   3. Nel server:"
    echo "      cd server"
    echo "      npm install --production"
    echo "      npm start"
fi

echo ""
print_success "Deploy preparato con successo!"
echo ""
echo "📚 Documentazione:"
echo "   - CHANGELOG.md: Novità versione 2.0.0"
echo "   - UPGRADE-v2.md: Guida aggiornamento dettagliata"
echo "   - README.md: Documentazione completa"
