# 🤝 Contribuire ad AudioScribe

Grazie per il tuo interesse nel contribuire ad AudioScribe! Questo documento ti guiderà attraverso il processo di contribuzione.

## 🚀 Come Iniziare

### 1. Fork del Repository
```bash
# Clicca "Fork" su GitHub, poi:
git clone https://github.com/your-username/audioscribe.git
cd audioscribe
```

### 2. Setup Ambiente di Sviluppo
```bash
# Frontend
npm install
cp .env.example .env
# Configura .env con la tua API Key OpenAI

# Backend (opzionale)
cd server
npm install
cp .env.example .env
```

### 3. Crea un Branch
```bash
git checkout -b feature/nome-della-tua-feature
# oppure
git checkout -b fix/nome-del-bug
```

## 📋 Tipi di Contributi

### 🐛 **Bug Reports**
- Usa il template di issue per bug
- Includi passi per riprodurre il problema
- Specifica browser, OS, versione Node.js
- Allega screenshot se utili

### 💡 **Feature Requests**
- Descrivi chiaramente la funzionalità
- Spiega perché sarebbe utile
- Considera l'impatto sulle prestazioni
- Proponi un'implementazione se possibile

### 🔧 **Code Contributions**
- Segui le convenzioni di codice esistenti
- Scrivi test per nuove funzionalità
- Aggiorna la documentazione
- Testa su più browser/dispositivi

## 🎯 Aree di Contribuzione

### **Frontend (React/TypeScript)**
- Nuovi componenti UI
- Miglioramenti UX/UI
- Ottimizzazioni prestazioni
- Supporto nuovi formati audio/video

### **Backend (Node.js)**
- Nuovi servizi di trascrizione
- Ottimizzazioni elaborazione audio
- Miglioramenti API
- Gestione errori

### **Documentazione**
- README miglioramenti
- Guide deploy
- Tutorial
- Commenti codice

### **Testing**
- Unit tests
- Integration tests
- E2E tests
- Performance tests

## 📝 Convenzioni di Codice

### **TypeScript/JavaScript**
```typescript
// Usa nomi descrittivi
const transcriptionResult = await whisperService.transcribe(audioFile);

// Commenti per logica complessa
// Divide il file in chunk da 10 minuti per rispettare i limiti di Whisper
const chunks = await audioChunker.chunkAudioFile(file, 10);

// Gestione errori esplicita
try {
  const result = await apiCall();
} catch (error) {
  console.error('Errore specifico:', error);
  throw new Error(`Operazione fallita: ${error.message}`);
}
```

### **React Components**
```tsx
// Props tipizzate
interface ComponentProps {
  audioFile: File | null;
  onResult: (text: string) => void;
}

// Componenti funzionali con hooks
export const MyComponent: React.FC<ComponentProps> = ({ audioFile, onResult }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Logica del componente
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* JSX */}
    </div>
  );
};
```

### **CSS/Tailwind**
```tsx
// Usa classi Tailwind consistenti
<div className="bg-white rounded-lg shadow-lg p-6">
  <h3 className="text-lg font-semibold text-gray-800 mb-4">
    Titolo
  </h3>
</div>

// Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

## 🧪 Testing

### **Frontend Tests**
```bash
npm test
```

### **Backend Tests**
```bash
cd server
npm test
```

### **E2E Tests**
```bash
npm run test:e2e
```

## 📚 Documentazione

### **Aggiorna README**
- Nuove funzionalità
- Modifiche configurazione
- Nuovi requisiti

### **Commenti Codice**
```typescript
/**
 * Divide un file audio in chunk per rispettare i limiti di Whisper (25MB)
 * @param audioFile - File audio da dividere
 * @param chunkDurationMinutes - Durata di ogni chunk in minuti
 * @returns Array di chunk audio
 */
async function chunkAudioFile(audioFile: File, chunkDurationMinutes: number): Promise<AudioChunk[]> {
  // Implementazione
}
```

## 🔄 Processo di Review

### **Prima di Inviare PR**
1. ✅ Testa localmente
2. ✅ Esegui linting: `npm run lint`
3. ✅ Esegui tests: `npm test`
4. ✅ Aggiorna documentazione
5. ✅ Commit con messaggi chiari

### **Messaggi Commit**
```bash
# Formato: tipo(scope): descrizione
feat(whisper): aggiungi supporto per file video grandi
fix(chunking): risolvi problema divisione audio
docs(readme): aggiorna istruzioni deploy
style(ui): migliora responsive design
```

### **Pull Request**
- Titolo descrittivo
- Descrizione dettagliata delle modifiche
- Link a issue correlate
- Screenshot per modifiche UI
- Checklist completata

## 🐛 Debug e Troubleshooting

### **Frontend Debug**
```bash
# Console browser (F12)
# Cerca log con prefisso "🚀 AudioScribe"

# Vite dev tools
npm run dev -- --debug
```

### **Backend Debug**
```bash
# PM2 logs
pm2 logs audioscribe-backend

# Node.js debug
DEBUG=* npm run dev
```

### **Problemi Comuni**
- **FFmpeg non trovato**: Installa FFmpeg e verifica PATH
- **CORS errors**: Configura backend per accettare frontend origin
- **Memory issues**: Usa chunking per file grandi
- **API key errors**: Verifica configurazione .env

## 🏆 Riconoscimenti

I contributori vengono riconosciuti in:
- README.md nella sezione Contributors
- Release notes per contributi significativi
- Hall of Fame per contributori regolari

## 📞 Supporto

Hai domande? Contattaci:
- **GitHub Discussions**: Per domande generali
- **GitHub Issues**: Per bug e feature request
- **Email**: audioscribe@example.com

## 🎉 Grazie!

Ogni contributo, grande o piccolo, è prezioso per migliorare AudioScribe. Grazie per il tuo tempo e impegno! 🙏

---

**Happy Coding! 🚀**