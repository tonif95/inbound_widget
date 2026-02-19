import { Conversation } from '@11labs/client';

// 🚨 ASEGÚRATE DE QUE ESTA VARIABLE ESTÁ EN TU .env Y EN VERCEL
const AGENT_ID = import.meta.env.VITE_AGENT_ID;

class TugestoWidget {
  constructor() {
    this.conversation = null;
    this.isConnected = false;
    this.isAgentMuted = false;
    this.callTimeout = null; 
    
    // 🚨 VARIABLES DE CONTROL DE SECUENCIA Y SINCRONIZACIÓN
    this.currentSequence = null;
    this.currentVideoIndex = 0;
    this.stepVideoEnded = false;
    this.stepAiEnded = false;
    this.aiHasStartedSpeakingThisStep = false;
    
    this.videos = {
      'fichaje': [
        { 
          url: 'https://inboundwidget.vercel.app/videos/fichajes1.mp4', 
          frase: 'Tus empleados podrán fichar cada día fácilmente desde la pantalla de inicio o el apartado de fichajes. Podrán hacerlo desde el ordenador, móvil o de manera física con tarjetas o códigos.' 
        },
        { 
          url: 'https://inboundwidget.vercel.app/videos/fichajes2.mp4', 
          frase: 'Además, con tugesto, puedes imputar en tiempo real tus horas a proyectos específicos para luego ayudar en la contabilidad y asignación de tiempo a proyectos. Y como ves se hace muy fácilmente con un par de clicks ' 
        },
        { 
          url: 'https://inboundwidget.vercel.app/videos/fichajes3.mp4', 
          frase: 'También ten en cuenta que si a tus empleados se les pasa fichar o necesitan editar la información de fichajes de días anteriores también pueden hacerlo desde la plataforma - con la aprobación de su manager. Así les das el control a tus empleados de mantener sus fichajes actualizados. Tienes alguna duda sobre fichajes?' 
        }
      ],
      'nominas': [
        { 
          url: 'https://inboundwidget.vercel.app/videos/nominas1.mp4', 
          frase: 'En el apartado de nóminas tus empleados podrán visualizar fácilmente lo que han cobrado cada mes, la retención que se le está aplicando y su salario anual bruto y neto.' 
        },
        { 
          url: 'https://inboundwidget.vercel.app/videos/nominas2.mp4', 
          frase: 'Además, disponemos de "tu nómina fácil" que explica de manera muy sencilla la nómina de cada empleado para reducir las innumerables preguntas que debes recibir cada mes de tus empleados sobre sus nóminas. Tienes alguna duda sobre lo que hemos visto?' 
        }
      ],
      'documentosyfirmas': [
        { 
          url: 'https://inboundwidget.vercel.app/videos/documentos1.mp4', 
          frase: 'EDesde el apartado de documentos, tú y tus empleados tendréis acceso a todos los documentos típicos de la organización que ahora te suponen emails de un lado a otro. Como el modelo 145, contratos, certificados etc.' 
        },
        { 
          url: 'https://inboundwidget.vercel.app/videos/documentos2.mp4', 
          frase: 'Lo mejor de todo, es que desde la plataforma, tanto tú como tus empleados podrán firmar dichos documentos. Di adiós a todo el papeleo e ineficiencias de emails, imprimir, escanear etc. Con tugesto podrán firmarlos simplemente añadiendo su nombre o dibujando su firma en el ordenador o móvil. Tienes alguna duda sobre lo que hemos visto?' 
        }
      ],
      'vacacionesyausencias': [
        { 
          url: 'https://inboundwidget.vercel.app/videos/vacaciones1.mp4', 
          frase: 'Desde el apartado de ausencias tus empleados pueden solicitar vacaciones de una manera muy sencilla. Su manager recibe la solicitud para aprobar o rechazar en un click.' 
        },
        { 
          url: 'https://inboundwidget.vercel.app/videos/vacaciones2.mp4', 
          frase: 'Algo diferencial de tugesto es que la plataforma muestra todos las posibles tipos de ausencias incluidos en tu convenio para que tus empleados siempre elijan el correcto y entiendan si son retribuidos o no.  Además, esto se vuelca automáticamente al cálculo de las nóminas. Imagina el tiempo que ahorrarás con esto. Tienes alguna duda sobre lo que hemos visto?' 
        }
      ]
    };
    
    this.init();
  }

  init() {
    this.injectStyles();
    this.renderUI();
    this.attachEvents();
    document.getElementById('tugesto-bubble').style.display = 'flex';
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --tugesto-primary: #E67E22;
        --tugesto-bg: #F8F9FA;
        --tugesto-text: #333;
        --tugesto-chat-bg-user: #E67E22;
        --tugesto-chat-text-user: white;
        --tugesto-chat-bg-agent: white;
        --tugesto-chat-text-agent: #333;
      }
      #tugesto-widget-root { position: fixed; bottom: 25px; right: 25px; z-index: 999999; font-family: 'Segoe UI', system-ui, sans-serif; }
      
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

      .tugesto-modal-overlay {
        display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(3px);
        justify-content: center; align-items: center; z-index: 1000000;
        opacity: 0; transition: opacity 0.3s ease;
      }
      .tugesto-modal-overlay.active { display: flex; opacity: 1; }
      
      .tugesto-modal-window {
        background: var(--tugesto-bg);
        width: 95vw;
        max-width: 1400px;
        height: 90vh;
        max-height: 900px;
        border-radius: 16px; overflow: hidden; display: flex; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        position: relative;
      }
      .tugesto-close-modal { position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; color: #999; cursor: pointer; z-index: 10; }
      .tugesto-close-modal:hover { color: #333; }

      .tugesto-left-panel {
        flex: 3; background: #E0D4C8;
        display: flex; flex-direction: column; justify-content: center; align-items: center;
        position: relative; overflow: hidden;
      }
      .tugesto-logo { position: absolute; top: 25px; left: 25px; font-weight: bold; color: #555; display: flex; align-items: center; gap: 8px;}
      .tugesto-logo-icon { width: 24px; height: 24px; background: var(--tugesto-primary); border-radius: 50%; }
      
      .tugesto-avatar-container { text-align: center; z-index: 2; }
      .tugesto-status-badge { background: rgba(0,0,0,0.6); color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; margin-bottom: 15px; display: inline-block;}
      .tugesto-avatar-img { width: 180px; height: 180px; border-radius: 50%; border: 4px solid white; object-fit: cover; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
      
      .tugesto-video-player { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; z-index: 3; display: none; background: black; }
      
      .tugesto-hubspot-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 4; display: none; background: #F8F9FA; }
      .tugesto-hubspot-container iframe { width: 100%; height: 100%; border: none; }

      .tugesto-controls-bar {
        position: absolute; bottom: 25px; left: 50%; transform: translateX(-50%);
        display: flex; gap: 15px; z-index: 5;
        background: rgba(255,255,255,0.8); padding: 10px 20px; border-radius: 30px;
      }
      .tugesto-control-btn { width: 45px; height: 45px; border-radius: 50%; border: none; background: white; color: #555; font-size: 18px; cursor: pointer; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: all 0.2s; }
      .tugesto-control-btn:hover { background: #f0f0f0; }
      .tugesto-control-btn.hangup { background: #DC3545; color: white; }
      .tugesto-control-btn.hangup:hover { background: #C82333; }

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
          
          <button class="tugesto-close-modal" id="tugesto-close-btn">×</button>

          <div class="tugesto-left-panel">
            <div class="tugesto-logo">
              <div class="tugesto-logo-icon"></div> tugesto
            </div>
            
            <div class="tugesto-avatar-container" id="tugesto-avatar-state">
              <div class="tugesto-status-badge" id="tugesto-status-text">Conectando...</div>
              <img src="https://inboundwidget.vercel.app/images/avatar.jpg" alt="Avatar IA" class="tugesto-avatar-img">
            </div>
            
            <video id="tugesto-video-player" class="tugesto-video-player" controls></video>

            <div id="tugesto-hubspot-container" class="tugesto-hubspot-container">
              <iframe id="tugesto-hubspot-iframe" src="https://meetings-eu1.hubspot.com/angel-roman/web-home-rotacion?embed=true"></iframe>
            </div>

            <div class="tugesto-controls-bar">
              <button class="tugesto-control-btn" id="tugesto-mute-agent-btn" title="Silenciar Agente">🔊</button>
              <button class="tugesto-control-btn hangup" id="tugesto-hangup-btn" title="Colgar">📞</button>
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
              <button class="tugesto-reply-chip" data-text="Agendar demo con un experto">Agendar demo</button>
              <button class="tugesto-reply-chip" data-text="Tengo preguntas sobre tugesto">Tengo preguntas</button>
              <button class="tugesto-reply-chip" data-text="Quiero que me muestres el producto">Ver el producto</button>
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
    document.getElementById('tugesto-bubble').addEventListener('click', () => this.openModal());
    document.getElementById('tugesto-close-btn').addEventListener('click', () => this.closeModal());
    document.getElementById('tugesto-hangup-btn').addEventListener('click', () => this.closeModal());

    document.querySelectorAll('.tugesto-reply-chip').forEach(button => {
      button.addEventListener('click', (e) => this.sendMessage(e.target.dataset.text));
    });

    const input = document.getElementById('tugesto-input');
    const sendBtn = document.getElementById('tugesto-send-btn');
    
    sendBtn.addEventListener('click', () => this.sendMessage(input.value));
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage(input.value);
    });

    document.getElementById('tugesto-mute-agent-btn').addEventListener('click', () => this.toggleAgentVolume());

    // 🚨 CUANDO TERMINA EL VÍDEO
    const videoPlayer = document.getElementById('tugesto-video-player');
    videoPlayer.addEventListener('ended', () => {
      this.stepVideoEnded = true; // Marcamos que el vídeo ha acabado
      this.checkSequenceAdvance(); // Comprobamos si la IA también ha acabado
    });

    window.addEventListener('message', (event) => {
      if (event.data && event.data.meetingBooked) {
        document.getElementById('tugesto-hubspot-container').style.display = 'none';
        document.getElementById('tugesto-avatar-state').style.display = 'block';
        if (this.conversation && this.isConnected) {
          this.sendMessage("He completado la reserva en el calendario.");
        }
      }
    });
  }

  // 🚨 FUNCIÓN PARA REPRODUCIR LA PARTE ACTUAL DE LA SECUENCIA
  async playCurrentStep() {
    if (!this.currentSequence) return;

    // Reseteamos validadores
    this.stepVideoEnded = false;
    this.stepAiEnded = false;
    this.aiHasStartedSpeakingThisStep = false;

    const currentVideo = this.currentSequence[this.currentVideoIndex];
    
    // Mostramos el vídeo
    const player = document.getElementById('tugesto-video-player');
    player.src = currentVideo.url;
    player.style.display = 'block';
    player.play().catch(e => console.log(e));

    // Mandamos a la IA su frase
    if (this.conversation && this.isConnected) {
      const promptSistema = `[Instrucción estricta del sistema]: Di EXACTAMENTE esta frase, de forma natural, y luego guarda silencio absoluto hasta que te vuelva a avisar: "${currentVideo.frase}"`;
      await this.conversation.sendUserMessage(promptSistema);
    }
  }

  // 🚨 FUNCIÓN QUE DECIDE SI AVANZAR O TERMINAR
  async checkSequenceAdvance() {
    // Solo avanzamos si ESTAMOS en una secuencia, el vídeo HA TERMINADO y la IA SE HA CALLADO
    if (!this.currentSequence || !this.stepVideoEnded || !this.stepAiEnded) return;

    if (this.currentVideoIndex < this.currentSequence.length - 1) {
      // Quedan vídeos, pasamos al siguiente
      this.currentVideoIndex++;
      this.playCurrentStep();
    } else {
      // Fin de la presentación
      this.currentSequence = null;
      document.getElementById('tugesto-video-player').style.display = 'none';
      document.getElementById('tugesto-avatar-state').style.display = 'block';

      if (this.conversation && this.isConnected) {
        await this.conversation.sendUserMessage(`[Instrucción del sistema]: La demostración ha terminado y vuelves a estar en pantalla. Pregúntale al usuario qué le ha parecido o si quiere agendar una reunión.`);
      }
    }
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
    this.addMessageToChat('user', text);
    document.getElementById('tugesto-input').value = '';

    if (this.conversation && this.isConnected) {
      try {
        this.updateStatus('Procesando texto...');
        await this.conversation.sendUserMessage(text); 
      } catch (e) {
        console.error("Error al enviar mensaje:", e);
        this.addMessageToChat('agent', '(Error al enviar el mensaje. Revisa la consola)');
      }
    }
  }

  async toggleAgentVolume() {
    if (!this.conversation) return;
    this.isAgentMuted = !this.isAgentMuted;
    await this.conversation.setVolume({ volume: this.isAgentMuted ? 0 : 1 });
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
            
            document.getElementById('tugesto-avatar-state').style.display = 'none';
            document.getElementById('tugesto-hubspot-container').style.display = 'none';
            
            // Iniciamos la lógica
            this.currentSequence = this.videos[key] || this.videos['general'];
            this.currentVideoIndex = 0;
            this.playCurrentStep();
            
            return `[Instrucción del sistema]: Inicio de secuencia de videos. He enviado tu primera frase. No añadas nada más.`;
          },
          showHubSpot: async () => {
            document.getElementById('tugesto-avatar-state').style.display = 'none';
            document.getElementById('tugesto-video-player').style.display = 'none';
            document.getElementById('tugesto-video-player').pause();
            document.getElementById('tugesto-hubspot-container').style.display = 'block';
            
            return "El calendario se está mostrando en pantalla. Pide al usuario que elija una fecha y hora en el widget.";
          }
        },
        onConnect: () => {
          this.isConnected = true;
          this.updateStatus('Escuchando...');

          this.callTimeout = setTimeout(() => {
            alert("La sesión ha finalizado por límite de tiempo (10 minutos).");
            this.closeModal();
          }, 600000);
        },
        onDisconnect: () => {
          this.stopCall();
        },
        onModeChange: (mode) => {
             this.updateStatus(mode.mode === 'speaking' ? 'Hablando...' : 'Escuchando...');
             
             // 🚨 VIGILANTE DE LA IA PARA SABER CUÁNDO TERMINA DE HABLAR
             if (this.currentSequence) {
               if (mode.mode === 'speaking') {
                 // La IA acaba de empezar a hablar la frase de este paso
                 this.aiHasStartedSpeakingThisStep = true;
               } else if (mode.mode === 'listening' && this.aiHasStartedSpeakingThisStep) {
                 // La IA acaba de terminar de hablar y se ha callado
                 this.stepAiEnded = true;
                 this.checkSequenceAdvance(); // Comprobamos si el vídeo también terminó
               }
             }
        },
        onMessage: (message) => {
          const text = message.message || message.text;
          
          if (message.source === 'ai' && text) {
            const messagesList = document.getElementById('tugesto-messages-list');
            const lastMessage = messagesList.lastElementChild;
            
            if (lastMessage && lastMessage.classList.contains('agent')) {
              lastMessage.textContent += " " + text;
            } else {
              this.addMessageToChat('agent', text);
            }
            messagesList.scrollTop = messagesList.scrollHeight;
          }
        },
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
    if (this.callTimeout) {
      clearTimeout(this.callTimeout);
      this.callTimeout = null;
    }

    if (this.conversation) {
      await this.conversation.endSession();
      this.conversation = null;
    }
    this.isConnected = false;
    this.updateStatus('Desconectado');
    
    this.currentSequence = null;
    document.getElementById('tugesto-video-player').style.display = 'none';
    document.getElementById('tugesto-video-player').pause();
    document.getElementById('tugesto-hubspot-container').style.display = 'none';
    document.getElementById('tugesto-avatar-state').style.display = 'block';

    const iframe = document.getElementById('tugesto-hubspot-iframe');
    if(iframe) iframe.src = iframe.src; 

    document.getElementById('tugesto-messages-list').innerHTML = `
      <div class="tugesto-message agent">
        Hola, veo que quieres agendar una demo gratuita con un experto en tugesto. ¿Te gustaría que te ayude a reservarla ahora mismo?
      </div>
    `;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new TugestoWidget();
});