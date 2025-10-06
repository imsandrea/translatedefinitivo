# 🚀 Come Avviare il Backend Server

## 1. Installazione Dipendenze
```bash
cd server
npm install
```

## 2. Configurazione Environment
- Copia il file `.env` e inserisci la tua API Key OpenAI reale
- Il server userà la porta 3001 per default

## 3. Installazione FFmpeg (Richiesto!)

### Windows:
1. Scarica da https://ffmpeg.org/download.html
2. Estrai in C:\ffmpeg
3. Aggiungi C:\ffmpeg\bin al PATH di sistema

### macOS:
```bash
brew install ffmpeg
```

### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install ffmpeg
```

### Verifica Installazione:
```bash
ffmpeg -version
```

## 4. Avvio Server
```bash
# Modalità sviluppo (con auto-restart)
npm run dev

# Oppure modalità normale
npm start
```

## 5. Test Server
Apri http://localhost:3001/api/health nel browser
Dovresti vedere: `{"status":"OK","timestamp":"...","version":"1.0.0"}`

## 6. Avvio Frontend
In un altro terminale:
```bash
# Torna alla cartella principale
cd ..
npm run dev
```

## ✅ Server Pronto!
- Backend: http://localhost:3001
- Frontend: http://localhost:5173
- Il frontend si collegherà automaticamente al backend