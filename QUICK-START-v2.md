# 🚀 Quick Start AudioScribe v2.0.0

## Per Utenti Esistenti (Aggiornamento da v1.x)

### Metodo Automatico ⚡
```bash
./update-to-v2.sh
```

### Metodo Manuale 🔧
```bash
# 1. Installa FFmpeg (OBBLIGATORIO)
brew install ffmpeg          # macOS
sudo apt install ffmpeg      # Linux

# 2. Aggiorna dipendenze
npm install
cd server && npm install && cd ..

# 3. Build
npm run build

# 4. Avvia server
cd server
npm run dev
```

---

## Per Nuovi Utenti

### 1. Prerequisiti
- Node.js 18+
- FFmpeg
- OpenAI API Key

### 2. Installazione
```bash
# Clone repository
git clone https://github.com/your-username/audioscribe.git
cd audioscribe

# Installa dipendenze
npm install
cd server && npm install && cd ..

# Configura API Key
cp server/.env.example server/.env
# Modifica server/.env e aggiungi OPENAI_API_KEY
```

### 3. Sviluppo
```bash
# Terminale 1 - Frontend
npm run dev

# Terminale 2 - Backend
cd server
npm run dev
```

### 4. Produzione
```bash
# Build frontend
npm run build

# Avvia backend
cd server
npm start

# (Opzionale) Con PM2
pm2 start server/server.js --name audioscribe
```

---

## Comandi Utili

### Aggiornamento
```bash
./update-to-v2.sh              # Automatico
# oppure
npm install && npm run build   # Manuale
```

### Deploy
```bash
./deploy-server.sh             # Interattivo con rsync
```

### Verifica
```bash
# Test server
curl http://localhost:3001/api/health

# Test FFmpeg
ffmpeg -version

# Logs server (con PM2)
pm2 logs audioscribe
```

---

## 🎯 Novità v2.0.0

✨ **Trascrizione Smart Server**
- Zero carico browser
- Chunking automatico lato server
- Video supportati nativamente
- 10-100x più veloce

📖 **Leggi di più:**
- [CHANGELOG.md](CHANGELOG.md) - Tutte le novità
- [UPGRADE-v2.md](UPGRADE-v2.md) - Guida dettagliata
- [README.md](README.md) - Documentazione completa

---

## 🐛 Problemi Comuni

**Server non parte?**
```bash
# Verifica porta 3001
lsof -i :3001
# Cambia porta in server/.env se occupata
```

**FFmpeg non trovato?**
```bash
# Verifica installazione
ffmpeg -version
# Installa se mancante
```

**API Key non funziona?**
```bash
# Verifica server/.env
cat server/.env | grep OPENAI_API_KEY
# Deve iniziare con sk-
```

---

## 📞 Supporto

- 📖 Documentazione: README.md
- 🔄 Aggiornamento: UPGRADE-v2.md
- 🐛 Issues: GitHub Issues
- 💬 Discussioni: GitHub Discussions

---

**Buon lavoro con AudioScribe v2.0.0! 🎉**
