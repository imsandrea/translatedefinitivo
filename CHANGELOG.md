# Changelog AudioScribe

## [2.0.0] - 2025-10-06

### 🚀 Funzionalità Maggiori

#### Trascrizione Smart Server (NUOVO!)
- **Endpoint `/api/smart/transcribe`**: Gestione automatica completa di audio e video
- **Zero carico sul browser**: Tutto l'elaborazione pesante avviene sul server
- **Chunking automatico lato server**: File grandi vengono divisi automaticamente con FFmpeg
- **Estrazione audio da video**: Supporto automatico per file video con FFmpeg nativo
- **Pulizia automatica**: File temporanei eliminati dopo la trascrizione

### ⚡ Ottimizzazioni

#### Performance Chunking Browser
- Sostituito loop sample-per-sample con operazioni native `set()` → **10-100x più veloce**
- Aggiunto pause asincrone per evitare blocco del browser
- Ridotto utilizzo memoria durante elaborazione chunk

#### Interfaccia Utente
- Semplificato componente BackendTranscription con un solo pulsante
- Aggiunto supporto selezione lingua nell'interfaccia server
- Migliorato feedback visivo con progress bar gradiente
- Avvisi chiari per processi intensivi

### 🔧 Miglioramenti Tecnici

#### Server
- Nuovo servizio `smartTranscriptionService.ts` per chiamate semplificate al server
- Gestione automatica video/audio con rilevamento tipo file
- Supporto file fino a 500MB (limite server)
- Migliore gestione errori e cleanup risorse

#### Client
- Ottimizzato `audioChunker.ts` con operazioni native browser
- Migliorata gestione memoria durante chunking
- Aggiunto feedback progresso dettagliato

### 📦 Dipendenze
- Nessun cambiamento nelle dipendenze

### 🐛 Bug Fix
- Risolto problema blocco browser durante chunking file grandi
- Migliorata gestione memoria per file video pesanti

---

## [1.1.0] - Versione Precedente

### Funzionalità Base
- Trascrizione audio con OpenAI Whisper
- Supporto file audio multipli
- Estrazione audio da video (browser)
- Chunking manuale file grandi
- Backend server per elaborazione

---

## Upgrade da 1.x a 2.0

### Installazione Server

```bash
# 1. Ferma il server esistente
# Premi Ctrl+C nel terminale del server

# 2. Aggiorna le dipendenze server (se necessario)
cd server
npm install

# 3. Riavvia il server
npm run dev
```

### Deploy Produzione

```bash
# 1. Pull delle modifiche
git pull origin main

# 2. Build frontend
npm install
npm run build

# 3. Aggiorna server
cd server
npm install
npm start

# 4. (Opzionale) Riavvia con PM2
pm2 restart audioscribe-server
```

### Note Importanti

⚠️ **FFmpeg Obbligatorio**: Assicurati che FFmpeg sia installato sul server per usare la nuova funzionalità Smart Server:

```bash
# Windows: Scarica da ffmpeg.org e aggiungi al PATH
# macOS:
brew install ffmpeg

# Linux:
sudo apt install ffmpeg
```

⚠️ **Limiti File**:
- Browser: max 100MB
- Server: max 500MB

⚠️ **Variabili Ambiente**: Verifica che `OPENAI_API_KEY` sia configurata in `server/.env`
