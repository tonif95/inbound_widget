import { Conversation } from '@11labs/client';

// 🚨 PON TU ID DE ELEVENLABS AQUÍ
const AGENT_ID = import.meta.env.VITE_AGENT_ID; 

class TugestoWidget {
  constructor() {
    this.conversation = null;
    this.isConnected = false;
    this.videos = {
      'fichaje': 'https://tu-dominio.com/videos/demo-fichaje.mp4', // Asegúrate de poner URLs absolutas si el widget es externo
      'nominas': 'https://tu-dominio.com/videos/demo-nominas.mp4',
      'portal': 'https://tu-dominio.com/videos/demo-portal.mp4',
      'general': 'https://tu-dominio.com/videos/demo-general.mp4'
    };
    
    this.init();
  }

  init() {
    this.injectStyles();
    this.renderUI();
    this.attachEvents();

    // Mostrar burbuja proactiva a los 4 segundos
    setTimeout(() => {
      if (!this.isConnected) {
        document.getElementById('tugesto-bubble').style.display = 'block';
      }
    }, 4000);
  }

  injectStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
      #tugesto-widget-root { position: fixed; bottom: 25px; right: 25px; z-index: 999999; font-family: 'Segoe UI', sans-serif; }
      .tugesto-fab { background: #111; color: white; border: none; padding: 14px 24px; border-radius: 50px; font-size: 16px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.2); transition: all 0.3s ease; display: flex; align-items: center; gap: 8px; }
      .tugesto-fab:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
      .tugesto-fab.active { background: #dc3545; }
      .tugesto-bubble { display: none; position: absolute; bottom: 75px; right: 0; width: 260px; background: white; padding: 15px; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,0.15); cursor: pointer; border: 1px solid #f0f0f0; animation: fadeUp 0.5s ease; }
      .tugesto-bubble-content { display: flex; gap: 12px; align-items: center; }
      .tugesto-overlay { display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); backdrop-filter: blur(2px); justify-content: center; align-items: center; z-index: 1000000; }
      .tugesto-card { background: white; width: 90%; max-width: 900px; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; }
      .tugesto-header { padding: 12px 20px; background: #f4f4f4; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; font-weight: bold; }
      .tugesto-header button { border: none; background: none; font-weight: bold; cursor: pointer; color: #555; }
      .tugesto-video video { width: 100%; display: block; max-height: 80vh; }
      .tugesto-iframe iframe { width: 100%; height: 650px; border: none; }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
  }

  renderUI() {
    const container = document.createElement('div');
    container.id = 'tugesto-widget-root';
    container.innerHTML = `
      <div id="tugesto-bubble" class="tugesto-bubble">
        <div class="tugesto-bubble-content">
          <span style="font-size: 24px;">👋</span>
          <div style="display: flex; flex-direction: column; line-height: 1.2;">
            <strong style="font-size: 14px; color: #111;">¿Te enseño una demo rápida?</strong>
            <small style="font-size: 12px; color: #666;">Soy Adrián, IA de Tugesto.</small>
          </div>
        </div>
      </div>

      <button id="tugesto-fab" class="tugesto-fab">🎙️ Hablar con IA</button>

      <div id="tugesto-video-modal" class="tugesto-overlay">
        <div class="tugesto-card">
          <div class="tugesto-header">
            <span>Viendo Demo</span>
            <button id="tugesto-close-video">Cerrar</button>
          </div>
          <div class="tugesto-video">
             <video id="tugesto-player" controls></video>
          </div>
        </div>
      </div>

      <div id="tugesto-hubspot-modal" class="tugesto-overlay">
        <div class="tugesto-card">
          <div class="tugesto-header">
            <span>Agendar Reunión</span>
            <button id="tugesto-close-hubspot">Cerrar</button>
          </div>
          <div class="tugesto-iframe">
            <iframe src="https://meetings.hubspot.com/TU-USUARIO?embed=true"></iframe>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(container);
  }

  attachEvents() {
    document.getElementById('tugesto-fab').addEventListener('click', () => this.toggleCall());
    document.getElementById('tugesto-bubble').addEventListener('click', () => this.toggleCall());
    
    document.getElementById('tugesto-close-video').addEventListener('click', () => {
      document.getElementById('tugesto-video-modal').style.display = 'none';
      document.getElementById('tugesto-player').pause();
    });
    
    document.getElementById('tugesto-close-hubspot').addEventListener('click', () => {
      document.getElementById('tugesto-hubspot-modal').style.display = 'none';
    });
  }

  async toggleCall() {
    if (this.isConnected) {
      this.stopCall();
    } else {
      this.startCall();
    }
  }

  async startCall() {
    try {
      document.getElementById('tugesto-bubble').style.display = 'none';
      const fab = document.getElementById('tugesto-fab');
      fab.innerHTML = 'Conectando...';

      // Pedir micro
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Iniciar SDK
      this.conversation = await Conversation.startSession({
        agentId: AGENT_ID,
        clientTools: {
          showDemoVideo: async ({ feature }) => {
            const key = feature || 'general';
            const url = this.videos[key] || this.videos['general'];
            
            document.getElementById('tugesto-hubspot-modal').style.display = 'none';
            document.getElementById('tugesto-video-modal').style.display = 'flex';
            
            const player = document.getElementById('tugesto-player');
            player.src = url;
            player.play().catch(e => console.log(e));
            
            return "Video mostrándose en pantalla.";
          },
          showHubSpot: async () => {
            document.getElementById('tugesto-video-modal').style.display = 'none';
            document.getElementById('tugesto-hubspot-modal').style.display = 'flex';
            return "He abierto el calendario.";
          }
        },
        onConnect: () => {
          this.isConnected = true;
          fab.classList.add('active');
          fab.innerHTML = 'Terminar ❌';
        },
        onDisconnect: () => {
          this.stopCall();
        },
        onError: (err) => {
          console.error("ElevenLabs Error:", err);
          this.stopCall();
          alert("Error de conexión con la IA.");
        }
      });

    } catch (error) {
      console.error("Error:", error);
      alert("Necesitamos acceso al micrófono. Comprueba los permisos o asegúrate de usar HTTPS.");
      this.stopCall();
    }
  }

  async stopCall() {
    if (this.conversation) {
      await this.conversation.endSession();
      this.conversation = null;
    }
    this.isConnected = false;
    const fab = document.getElementById('tugesto-fab');
    fab.classList.remove('active');
    fab.innerHTML = '🎙️ Hablar con IA';
  }
}

// Inicializar el widget automáticamente cuando cargue el script
window.addEventListener('DOMContentLoaded', () => {
  new TugestoWidget();
});
