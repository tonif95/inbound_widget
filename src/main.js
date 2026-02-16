import { Conversation } from '@11labs/client';

// 🚨 ASEGÚRATE DE QUE ESTA VARIABLE ESTÁ EN TU .env Y EN VERCEL
const AGENT_ID = import.meta.env.VITE_AGENT_ID;

class TugestoWidget {
  constructor() {
    this.conversation = null;
    this.isConnected = false;
    this.isMicMuted = false;
    // Tus URLs de video absolutas para que funcionen en cualquier sitio
    this.videos = {
      'fichaje': 'https://tu-dominio.com/videos/demo-fichaje.mp4',
      'nominas': 'https://tu-dominio.com/videos/demo-nominas.mp4',
      'portal': 'https://tu-dominio.com/videos/demo-portal.mp4',
      'general': 'https://tu-dominio.com/videos/demo-general.mp4'
    };
    this.chatHistory = [];
    
    this.init();
  }

  init() {
    this.injectStyles();
    this.renderUI();
    this.attachEvents();
    // Iniciar con la burbuja visible
    document.getElementById('tugesto-bubble').style.display = 'flex';
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --tugesto-primary: #E67E22; /* Naranja Tugesto */
        --tugesto-bg: #F8F9FA;
        --tugesto-text: #333;
        --tugesto-chat-bg-user: #E67E22;
        --tugesto-chat-text-user: white;
        --tugesto-chat-bg-agent: white;
        --tugesto-chat-text-agent: #333;
      }
      #tugesto-widget-root { position: fixed; bottom: 25px; right: 25px; z-index: 999999; font-family: 'Segoe UI', system-ui, sans-serif; }
      
      /* Burbuja Proactiva (Botón de inicio) */
      .tugesto-bubble {
        display: flex; align-items: center; gap: 12px;
        background: white; padding: 12px 20px; border-radius: 30px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15); cursor: pointer;
        border: 1px solid #eee; transition: all 0.3s ease;
      }
      .tugesto-bubble:hover { transform: translateY(-3px); box-shadow: 0 6px 25px rgba(0,0,0,0.2); }
      .tugesto-bubble-icon { width: 40px; height: 40px; background: var(--tugesto-primary); border-radius: 50%; display: flex; justify-content: center; align-items: center; color: white; font-size: 20px; }
      .tugesto-bubble-text { display: flex; flex-direction: column; line-height: 1.3; }
      .tugesto-bubble-text strong { font-size: 14px; color: var(--tugesto-text); }
      .tugesto-bubble-text small { font-size: 12px; color: #666; }

      /* Modal Principal */
      .tugesto-modal-overlay {
        display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(3px);
        justify-content: center; align-items: center; z-index: 1000000;
        opacity: 0; transition: opacity 0.3s ease;
      }
      .tugesto-modal-overlay.active { display: flex; opacity: 1; }
      
      .tugesto-modal-window {
        background: var(--tugesto-bg); width: 95%; max-width: 1100px; height: 85vh; max-height: 700px;
        border-radius: 16px; overflow: hidden; display: flex; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        position: relative;
      }
      .tugesto-close-modal { position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; color: #999; cursor: pointer; z-index: 10; }
      .tugesto-close-modal:hover { color: #333; }

      /* Sección Izquierda (Video/Avatar) */
      .tugesto-left-panel {
        flex: 3; background: #E0D4C8; /* Color de fondo de la imagen */
        display: flex; flex-direction: column; justify-content: center; align-items: center;
        position: relative; overflow: hidden;
      }
      .tugesto-logo { position: absolute; top: 25px; left: 25px; font-weight: bold; color: #555; display: flex; align-items: center; gap: 8px;}
      .tugesto-logo-icon { width: 24px; height: 24px; background: var(--tugesto-primary); border-radius: 50%; }
      
      .tugesto-avatar-container { text-align: center; z-index: 2; }
      .tugesto-status-badge { background: rgba(0,0,0,0.6); color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; margin-bottom: 15px; display: inline-block;}
      .tugesto-avatar-img { width: 180px; height: 180px; border-radius: 50%; border: 4px solid white; object-fit: cover; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
      .tugesto-video-player { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1; display: none; }

      .tugesto-controls-bar {
        position: absolute; bottom: 25px; left: 50%; transform: translateX(-50%);
        display: flex; gap: 15px; z-index: 3;
        background: rgba(255,255,255,0.8); padding: 10px 20px; border-radius: 30px;
      }
      .tugesto-control-btn { width: 45px; height: 45px; border-radius: 50%; border: none; background: white; color: #555; font-size: 18px; cursor: pointer; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: all 0.2s; }
      .tugesto-control-btn:hover { background: #f0f0f0; }
      .tugesto-control-btn.hangup { background: #DC3545; color: white; }
      .tugesto-control-btn.hangup:hover { background: #C82333; }

      /* Sección Derecha (Chat) */
      .tugesto-right-panel {
        flex: 2; background: white; display: flex; flex-direction: column;
        border-left: 1px solid #eee;
      }
      .tugesto-chat-header { padding: 20px; border-bottom: 1px solid #eee; font-weight: 600; color: var(--tugesto-text); }
      
      .tugesto-chat-messages { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }
      .tugesto-message { max-width: 85%; padding: 12px 16px; border-radius: 12px; line-height: 1.4; font-size: 15px; }
      .tugesto-message.agent { align-self: flex-start; background: var(--tugesto-chat-bg-agent); color: var(--tugesto-chat-text-agent); border: 1px solid #eee; border-bottom-left-radius: 2px; }
      .tugesto-message.user { align-self: flex-end; background: var(--tugesto-chat-bg-user); color: var(--tugesto-chat-text-user); border-bottom-right-radius: 2px; }
      
      .tugesto-quick-replies { padding: 0 20px 15px 20px; display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
      .tugesto-reply-chip { background: white; border: 1px solid var(--tugesto-primary); color: var(--tugesto-primary); padding: 8px 14px; border-radius: 20px; font-size: 13px; cursor: pointer; transition: all 0.2s; }
      .tugesto-reply-chip:hover { background: var(--tugesto-primary); color: white; }

      .tugesto-chat-input-area { padding: 20px; border-top: 1px solid #eee; display: flex; gap: 10px; background: #fafafa; }
      .tugesto-chat-input { flex: 1; padding: 12px 15px; border: 1px solid #ddd; border-radius: 25px; outline: none; font-size: 14px; }
      .tugesto-send-btn { width: 45px; height: 45px; border: none; background: var(--tugesto-primary); color: white; border-radius: 50%; cursor: pointer; display: flex; justify-content: center; align-items: center; font-size: 18px; }
      .tugesto-send-btn:hover { background: #D35400; }
    `;
    document.head.appendChild(style);
  }

  renderUI() {
    const container = document.createElement('div');
    container.id = 'tugesto-widget-root';
    container.innerHTML = `
      <div id="tugesto-bubble" class="tugesto-bubble">
        <div class="tugesto-bubble-icon">👋</div>
        <div class="tugesto-bubble-text">
          <strong>¿Hablamos? Soy la IA de Tugesto.</strong>
          <small>Haz clic para empezar la demo.</small>
        </div>
      </div>

      <div id="tugesto-modal" class="tugesto-modal-overlay">
        <div class="tugesto-modal-window">
          <button class="tugesto-control-btn" id="tugesto-mute-agent-btn" title="Silenciar Agente">🔊</button>
          
          <div class="tugesto-left-panel">
            <div class="tugesto-logo">
              <div class="tugesto-logo-icon"></div> tugesto
            </div>
            
            <div class="tugesto-avatar-container" id="tugesto-avatar-state">
              <div class="tugesto-status-badge" id="tugesto-status-text">Conectando...</div>
              <img src="https://via.placeholder.com/180" alt="Avatar IA" class="tugesto-avatar-img">
            </div>
            
            <video id="tugesto-video-player" class="tugesto-video-player" controls></video>

            <div class="tugesto-controls-bar">
              <button class="tugesto-control-btn" id="tugesto-mute-btn">🎤</button>
              <button class="tugesto-control-btn hangup" id="tugesto-hangup-btn">📞</button>
            </div>
          </div>

          <div class="tugesto-right-panel">
            <div class="tugesto-chat-header">Chat con Asistente</div>
            
            <div class="tugesto-chat-messages" id="tugesto-messages-list">
              <div class="tugesto-message agent">
                Hola, veo que quieres agendar una demo gratuita con un experto en tugesto. ¿Te gustaría que te ayude a reservarla ahora mismo?
              </div>
            </div>
            
            <div class="tugesto-quick-replies">
              <button class="tugesto-reply-chip" data-text="Agendar demo con un experto">Agendar demo con un experto</button>
              <button class="tugesto-reply-chip" data-text="Tengo preguntas sobre tugesto">Tengo preguntas sobre tugesto</button>
              <button class="tugesto-reply-chip" data-text="Quiero que me muestres el producto">Quiero que me muestres el producto</button>
            </div>

            <div class="tugesto-chat-input-area">
              <input type="text" id="tugesto-input" class="tugesto-chat-input" placeholder="Escribe tu mensaje...">
              <button id="tugesto-send-btn" class="tugesto-send-btn">➤</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(container);
  }

  attachEvents() {
    // Abrir modal al hacer clic en la burbuja
    document.getElementById('tugesto-bubble').addEventListener('click', () => this.openModal());
    
    // Cerrar modal
    document.getElementById('tugesto-close-btn').addEventListener('click', () => this.closeModal());
    document.getElementById('tugesto-hangup-btn').addEventListener('click', () => this.closeModal());

    // Botones de respuesta rápida
    document.querySelectorAll('.tugesto-reply-chip').forEach(button => {
      button.addEventListener('click', (e) => this.sendMessage(e.target.dataset.text));
    });

    // Enviar mensaje con input y botón
    const input = document.getElementById('tugesto-input');
    const sendBtn = document.getElementById('tugesto-send-btn');
    
    sendBtn.addEventListener('click', () => this.sendMessage(input.value));
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage(input.value);
    });

    // Botón de silenciar micrófono
    document.getElementById('tugesto-mute-agent-btn').addEventListener('click', () => this.toggleAgentVolume());
  }

  async openModal() {
    document.getElementById('tugesto-bubble').style.display = 'none';
    const modal = document.getElementById('tugesto-modal');
    modal.classList.add('active');
    this.startCall();
  }

  closeModal() {
    document.getElementById('tugesto-modal').classList.remove('active');
    document.getElementById('tugesto-bubble').style.display = 'flex';
    this.stopCall();
  }

  updateStatus(text) {
    document.getElementById('tugesto-status-text').textContent = text;
  }

  addMessageToChat(role, text) {
    const messagesList = document.getElementById('tugesto-messages-list');
    const msgElement = document.createElement('div');
    msgElement.className = `tugesto-message ${role}`;
    msgElement.textContent = text;
    messagesList.appendChild(msgElement);
    messagesList.scrollTop = messagesList.scrollHeight;
  }

  async sendMessage(text) {
      if (!text.trim()) return;
      
      // 1. Mostrar tu mensaje en la pantalla
      this.addMessageToChat('user', text);
      document.getElementById('tugesto-input').value = '';

      // 2. Enviar el texto real a la IA de ElevenLabs
      if (this.conversation && this.isConnected) {
        try {
          await this.conversation.sendUserMessage(text); 
        } catch (e) {
          console.error("Error al enviar mensaje de texto:", e);
        }
      }
    }

  async toggleAgentVolume() {
    if (!this.conversation) return;
    
    this.isAgentMuted = !this.isAgentMuted;
    
    // El método setVolume de ElevenLabs acepta un valor entre 0 y 1
    await this.conversation.setVolume({ volume: this.isAgentMuted ? 0 : 1 });
    
    // Cambiamos el icono del botón
    document.getElementById('tugesto-mute-agent-btn').textContent = this.isAgentMuted ? '🔇' : '🔊';
  }

  async startCall() {
    try {
      this.updateStatus('Conectando...');
      await navigator.mediaDevices.getUserMedia({ audio: true });

      this.conversation = await Conversation.startSession({
        agentId: AGENT_ID,
        clientTools: {
          showDemoVideo: async ({ feature }) => {
            const key = feature || 'general';
            const url = this.videos[key] || this.videos['general'];
            
            const player = document.getElementById('tugesto-video-player');
            player.src = url;
            player.style.display = 'block';
            document.getElementById('tugesto-avatar-state').style.display = 'none';
            player.play().catch(e => console.log(e));
            
            return "Video mostrándose en pantalla.";
          },
          showHubSpot: async () => {
            window.open('https://meetings.hubspot.com/TU-USUARIO', '_blank');
            return "He abierto el calendario en una nueva pestaña.";
          }
        },
        onConnect: () => {
          this.isConnected = true;
          this.updateStatus('Escuchando...');
        },
        onDisconnect: () => {
          this.stopCall();
        },
        onModeChange: (mode) => {
             this.updateStatus(mode.mode === 'speaking' ? 'Hablando...' : 'Escuchando...');
        },
        // 👇 ESTO ES LO NUEVO: TRANSCRIPCIÓN EN TIEMPO REAL 👇
        onMessage: (message) => {
          const text = message.message || message.text;
          
          // Solo mostramos los mensajes de la IA, pero evitamos borradores a medias
          if (message.source === 'ai' && text) {
            // Buscamos si el último mensaje ya es de la IA (para no crear 20 burbujas por frase)
            const messagesList = document.getElementById('tugesto-messages-list');
            const lastMessage = messagesList.lastElementChild;
            
            if (lastMessage && lastMessage.classList.contains('agent')) {
              // Si el último es de la IA, simplemente le añadimos el texto nuevo
              lastMessage.textContent += " " + text;
            } else {
              // Si es un turno de habla nuevo, creamos una burbuja nueva
              this.addMessageToChat('agent', text);
            }
            // Hacemos scroll abajo del todo
            messagesList.scrollTop = messagesList.scrollHeight;
          }
        },
        // 👆 HASTA AQUÍ LA TRANSCRIPCIÓN 👆
        onError: (err) => {
          console.error("ElevenLabs Error:", err);
          this.closeModal();
          alert("Error de conexión con la IA. Revisa la consola.");
        }
      });

    } catch (error) {
      console.error("Error:", error);
      alert("Necesitamos acceso al micrófono para la demo. Asegúrate de estar en un sitio seguro (HTTPS).");
      this.closeModal();
    }
  }

  async stopCall() {
    if (this.conversation) {
      await this.conversation.endSession();
      this.conversation = null;
    }
    this.isConnected = false;
    this.updateStatus('Desconectado');
    
    // Resetear vista
    document.getElementById('tugesto-video-player').style.display = 'none';
    document.getElementById('tugesto-video-player').pause();
    document.getElementById('tugesto-avatar-state').style.display = 'block';
    // Limpiar chat (opcional, si quieres que empiece de cero cada vez)
    // document.getElementById('tugesto-messages-list').innerHTML = '';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new TugestoWidget();
});