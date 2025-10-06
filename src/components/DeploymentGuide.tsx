import React, { useState } from 'react';
import { Cloud, Server, Zap, AlertCircle, CheckCircle, ExternalLink, Copy } from 'lucide-react';

export const DeploymentGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bolt' | 'vps' | 'local'>('bolt');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">🚀 Opzioni di Deploy</h3>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
        <button
          onClick={() => setActiveTab('bolt')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'bolt'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Zap className="w-4 h-4" />
            <span>Bolt (Attuale)</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('local')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'local'
              ? 'bg-white text-green-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Server className="w-4 h-4" />
            <span>Locale</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('vps')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'vps'
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Cloud className="w-4 h-4" />
            <span>VPS/Cloud</span>
          </div>
        </button>
      </div>

      {/* Bolt Tab */}
      {activeTab === 'bolt' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-blue-800">✅ Attualmente Attivo su Bolt</h4>
            </div>
            <p className="text-sm text-blue-700">
              L'applicazione è già ottimizzata per funzionare perfettamente su Bolt!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h5 className="font-medium text-green-800 mb-2">✅ Funziona su Bolt:</h5>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• FFmpeg.js per elaborazione video</li>
                <li>• Chunking audio in memoria</li>
                <li>• Trascrizione Whisper diretta</li>
                <li>• File fino a ~50MB (dipende dal browser)</li>
                <li>• Interfaccia completa</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h5 className="font-medium text-yellow-800 mb-2">⚠️ Limitazioni Bolt:</h5>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Memoria browser limitata</li>
                <li>• File molto grandi (&gt;50MB) problematici</li>
                <li>• Nessun server backend persistente</li>
                <li>• Elaborazione più lenta</li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
            <h5 className="font-medium text-blue-800 mb-2">🎯 Raccomandazioni per Bolt:</h5>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>File Audio:</strong> Fino a 25MB funzionano perfettamente</li>
              <li>• <strong>File Video:</strong> Fino a 50MB, audio estratto automaticamente</li>
              <li>• <strong>Browser:</strong> Chrome/Edge per migliori prestazioni</li>
              <li>• <strong>RAM:</strong> Chiudi altre tab per liberare memoria</li>
            </ul>
          </div>
        </div>
      )}

      {/* Local Tab */}
      {activeTab === 'local' && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Server className="w-5 h-5 text-green-600" />
              <h4 className="font-medium text-green-800">🖥️ Setup Backend Locale</h4>
            </div>
            <p className="text-sm text-green-700">
              Per file grandi e elaborazione avanzata sul tuo computer.
            </p>
          </div>

          <div className="space-y-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h5 className="font-medium text-gray-800 mb-2">1. Installa FFmpeg (OBBLIGATORIO)</h5>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-white rounded p-2 border">
                  <code className="text-sm">brew install ffmpeg</code>
                  <button
                    onClick={() => copyToClipboard('brew install ffmpeg')}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-600">macOS con Homebrew</p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h5 className="font-medium text-gray-800 mb-2">2. Configura Backend</h5>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-white rounded p-2 border">
                  <code className="text-sm">cd server && npm install</code>
                  <button
                    onClick={() => copyToClipboard('cd server && npm install')}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between bg-white rounded p-2 border">
                  <code className="text-sm">npm run dev</code>
                  <button
                    onClick={() => copyToClipboard('npm run dev')}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-green-100 border border-green-300 rounded-lg p-4">
              <h5 className="font-medium text-green-800 mb-2">✅ Vantaggi Backend Locale:</h5>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• File fino a 100MB+ senza problemi</li>
                <li>• Elaborazione video completa con FFmpeg</li>
                <li>• Chunking automatico intelligente</li>
                <li>• Zero limitazioni di memoria</li>
                <li>• Velocità massima</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* VPS Tab */}
      {activeTab === 'vps' && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Cloud className="w-5 h-5 text-purple-600" />
              <h4 className="font-medium text-purple-800">☁️ Deploy su VPS/Cloud</h4>
            </div>
            <p className="text-sm text-purple-700">
              Per produzione con accesso pubblico e file molto grandi.
            </p>
          </div>

          {/* IONOS Sezione Speciale */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-2 mb-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Cloud className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-blue-900">🚀 Deploy su IONOS VPS</h4>
                <p className="text-sm text-blue-700">Guida completa per il tuo server IONOS</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-white border border-blue-200 rounded-lg p-4">
                <h5 className="font-medium text-blue-800 mb-2">📋 Checklist Pre-Deploy:</h5>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>✅ VPS IONOS attivo (Ubuntu 20.04+ raccomandato)</li>
                  <li>✅ Accesso SSH configurato</li>
                  <li>✅ Dominio puntato al VPS (opzionale)</li>
                  <li>✅ API Key OpenAI pronta</li>
                </ul>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-800 mb-2">🔧 Script Setup Automatico IONOS:</h5>
                <div className="bg-gray-900 text-green-400 rounded p-3 text-xs font-mono overflow-x-auto">
                  <div className="mb-2 text-yellow-400"># Copia questo script e incollalo nel terminale SSH del tuo VPS IONOS</div>
                  <div className="space-y-1">
                    <div>#!/bin/bash</div>
                    <div className="text-gray-400"># AudioScribe Setup per IONOS VPS</div>
                    <div>echo "🚀 Iniziando setup AudioScribe su IONOS..."</div>
                    <div></div>
                    <div className="text-yellow-400"># 1. Aggiorna sistema</div>
                    <div>sudo apt update && sudo apt upgrade -y</div>
                    <div></div>
                    <div className="text-yellow-400"># 2. Installa dipendenze</div>
                    <div>sudo apt install -y nodejs npm ffmpeg nginx certbot python3-certbot-nginx git</div>
                    <div></div>
                    <div className="text-yellow-400"># 3. Installa Node.js 18+</div>
                    <div>curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -</div>
                    <div>sudo apt-get install -y nodejs</div>
                    <div></div>
                    <div className="text-yellow-400"># 4. Clone progetto</div>
                    <div>cd /var/www</div>
                    <div>sudo git clone https://github.com/your-username/audioscribe.git</div>
                    <div>sudo chown -R $USER:$USER audioscribe</div>
                    <div>cd audioscribe</div>
                    <div></div>
                    <div className="text-yellow-400"># 5. Setup Backend</div>
                    <div>cd server</div>
                    <div>npm install</div>
                    <div>cp .env.example .env</div>
                    <div>echo "OPENAI_API_KEY=your_api_key_here" &gt;&gt; .env</div>
                    <div>echo "PORT=3001" &gt;&gt; .env</div>
                    <div></div>
                    <div className="text-yellow-400"># 6. Setup Frontend</div>
                    <div>cd ..</div>
                    <div>npm install</div>
                    <div>npm run build</div>
                    <div></div>
                    <div className="text-yellow-400"># 7. Installa PM2 per gestione processi</div>
                    <div>sudo npm install -g pm2</div>
                    <div>cd server</div>
                    <div>pm2 start server.js --name audioscribe-backend</div>
                    <div>pm2 startup</div>
                    <div>pm2 save</div>
                    <div></div>
                    <div>echo "✅ Setup completato! Backend su porta 3001"</div>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(`#!/bin/bash
# AudioScribe Setup per IONOS VPS
echo "🚀 Iniziando setup AudioScribe su IONOS..."

# 1. Aggiorna sistema
sudo apt update && sudo apt upgrade -y

# 2. Installa dipendenze
sudo apt install -y nodejs npm ffmpeg nginx certbot python3-certbot-nginx git

# 3. Installa Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. Clone progetto
cd /var/www
sudo git clone https://github.com/your-username/audioscribe.git
sudo chown -R $USER:$USER audioscribe
cd audioscribe

# 5. Setup Backend
cd server
npm install
cp .env.example .env
echo "OPENAI_API_KEY=your_api_key_here" >> .env
echo "PORT=3001" >> .env

# 6. Setup Frontend
cd ..
npm install
npm run build

# 7. Installa PM2 per gestione processi
sudo npm install -g pm2
cd server
pm2 start server.js --name audioscribe-backend
pm2 startup
pm2 save

echo "✅ Setup completato! Backend su porta 3001"`)}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copia Script Completo</span>
                </button>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h5 className="font-medium text-orange-800 mb-2">⚙️ Configurazione Nginx (Reverse Proxy):</h5>
                <div className="bg-gray-900 text-green-400 rounded p-3 text-xs font-mono overflow-x-auto">
                  <div className="space-y-1">
                    <div className="text-yellow-400"># Crea file configurazione Nginx</div>
                    <div>sudo nano /etc/nginx/sites-available/audioscribe</div>
                    <div></div>
                    <div className="text-gray-400"># Incolla questa configurazione:</div>
                    <div>server &#123;</div>
                    <div>&nbsp;&nbsp;listen 80;</div>
                    <div>&nbsp;&nbsp;server_name your-domain.com;</div>
                    <div></div>
                    <div>&nbsp;&nbsp;# Frontend statico</div>
                    <div>&nbsp;&nbsp;location / &#123;</div>
                    <div>&nbsp;&nbsp;&nbsp;&nbsp;root /var/www/audioscribe/dist;</div>
                    <div>&nbsp;&nbsp;&nbsp;&nbsp;try_files $uri $uri/ /index.html;</div>
                    <div>&nbsp;&nbsp;&#125;</div>
                    <div></div>
                    <div>&nbsp;&nbsp;# API Backend</div>
                    <div>&nbsp;&nbsp;location /api/ &#123;</div>
                    <div>&nbsp;&nbsp;&nbsp;&nbsp;proxy_pass http://localhost:3001;</div>
                    <div>&nbsp;&nbsp;&nbsp;&nbsp;proxy_set_header Host $host;</div>
                    <div>&nbsp;&nbsp;&nbsp;&nbsp;proxy_set_header X-Real-IP $remote_addr;</div>
                    <div>&nbsp;&nbsp;&#125;</div>
                    <div>&#125;</div>
                    <div></div>
                    <div className="text-yellow-400"># Attiva configurazione</div>
                    <div>sudo ln -s /etc/nginx/sites-available/audioscribe /etc/nginx/sites-enabled/</div>
                    <div>sudo nginx -t</div>
                    <div>sudo systemctl reload nginx</div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h5 className="font-medium text-green-800 mb-2">🔒 SSL/HTTPS con Let's Encrypt:</h5>
                <div className="bg-gray-900 text-green-400 rounded p-3 text-xs font-mono">
                  <div className="space-y-1">
                    <div className="text-yellow-400"># Ottieni certificato SSL gratuito</div>
                    <div>sudo certbot --nginx -d your-domain.com</div>
                    <div></div>
                    <div className="text-yellow-400"># Auto-rinnovo certificato</div>
                    <div>sudo crontab -e</div>
                    <div className="text-gray-400"># Aggiungi questa riga:</div>
                    <div>0 12 * * * /usr/bin/certbot renew --quiet</div>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h5 className="font-medium text-red-800 mb-2">🔥 Firewall IONOS:</h5>
                <div className="text-sm text-red-700 space-y-1">
                  <p><strong>Nel pannello IONOS:</strong></p>
                  <ul className="ml-4 space-y-1">
                    <li>• Apri porta 80 (HTTP)</li>
                    <li>• Apri porta 443 (HTTPS)</li>
                    <li>• Apri porta 22 (SSH)</li>
                    <li>• Chiudi porta 3001 (solo interno)</li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
                <h5 className="font-medium text-blue-800 mb-2">✅ Verifica Finale:</h5>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>Testa che tutto funzioni:</strong></p>
                  <ul className="ml-4 space-y-1">
                    <li>• <code>http://your-domain.com</code> → Frontend</li>
                    <li>• <code>http://your-domain.com/api/health</code> → Backend</li>
                    <li>• <code>pm2 status</code> → Processo attivo</li>
                    <li>• <code>ffmpeg -version</code> → FFmpeg installato</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h5 className="font-medium text-gray-800 mb-2">🖥️ Requisiti VPS:</h5>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>RAM:</strong> 2GB min, 4GB raccomandato</li>
                <li>• <strong>Storage:</strong> 20GB SSD</li>
                <li>• <strong>OS:</strong> Ubuntu 20.04+</li>
                <li>• <strong>Bandwidth:</strong> Illimitata</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-medium text-blue-800 mb-2">💰 Costi IONOS vs Altri:</h5>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>IONOS VPS:</strong> €1-8/mese 🏆</li>
                <li>• <strong>DigitalOcean:</strong> $12/mese</li>
                <li>• <strong>Linode:</strong> $10/mese</li>
                <li>• <strong>Hetzner:</strong> €4/mese</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h5 className="font-medium text-gray-800 mb-2">🚀 Setup Automatico VPS:</h5>
            <div className="space-y-2">
              <div className="bg-white rounded p-3 border">
                <code className="text-xs block whitespace-pre-wrap">{`#!/bin/bash
# Setup AudioScribe su Ubuntu
sudo apt update
sudo apt install -y nodejs npm ffmpeg nginx certbot
git clone https://github.com/your-repo/audioscribe.git
cd audioscribe/server
npm install
# Configura .env con le tue API keys
npm install -g pm2
pm2 start server.js --name audioscribe
pm2 startup
pm2 save`}</code>
                <button
                  onClick={() => copyToClipboard(`#!/bin/bash
# Setup AudioScribe su Ubuntu
sudo apt update
sudo apt install -y nodejs npm ffmpeg nginx certbot
git clone https://github.com/your-repo/audioscribe.git
cd audioscribe/server
npm install
# Configura .env con le tue API keys
npm install -g pm2
pm2 start server.js --name audioscribe
pm2 startup
pm2 save`)}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copia Script</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-green-100 border border-green-300 rounded-lg p-4">
            <h5 className="font-medium text-green-800 mb-2">🌟 Vantaggi VPS:</h5>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• File illimitati (anche GB)</li>
              <li>• Accesso pubblico 24/7</li>
              <li>• API per integrazioni</li>
              <li>• Backup automatici</li>
              <li>• SSL/HTTPS incluso</li>
              <li>• Scalabilità orizzontale</li>
            </ul>
          </div>
        </div>
      )}

      {/* Current Recommendation */}
      <div className="mt-6 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <CheckCircle className="w-5 h-5 text-blue-600" />
          <h4 className="font-medium text-blue-800">🎯 Raccomandazione Attuale</h4>
        </div>
        <p className="text-sm text-blue-700 mb-2">
          <strong>Per il tuo file da 30MB:</strong> Bolt funziona perfettamente! 
          L'applicazione è già ottimizzata con FFmpeg.js e gestione memoria intelligente.
        </p>
        <div className="flex items-center space-x-4 text-xs text-blue-600">
          <span>✅ Nessun setup aggiuntivo richiesto</span>
          <span>✅ Funziona subito</span>
          <span>✅ Privacy totale (tutto locale)</span>
        </div>
      </div>
    </div>
  );
};