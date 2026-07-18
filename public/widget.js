(function() {
  const script = document.currentScript;
  const projectId = script.getAttribute('data-project-id');
  const apiUrl = 'https://toddler-backend.vercel.app'; // Replace with actual backend URL if different

  if (!projectId) {
    console.error('Toddler Widget: data-project-id is required');
    return;
  }

  // Styles
  const style = document.createElement('style');
  style.textContent = `
    #toddler-widget-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      font-family: 'Inter', sans-serif;
    }
    #toddler-widget-button {
      width: 60px;
      height: 60px;
      border-radius: 20px;
      background: #C6FF33;
      box-shadow: 0 0 20px rgba(198, 255, 51, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      border: none;
    }
    #toddler-widget-button:hover {
      transform: scale(1.1) rotate(5deg);
    }
    #toddler-widget-button svg {
      width: 28px;
      height: 28px;
      color: #000;
    }
    #toddler-chat-window {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 360px;
      height: 500px;
      background: #0A0812;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
      display: none;
      flex-direction: column;
      overflow: hidden;
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateY(20px);
    }
    #toddler-chat-window.open {
      display: flex;
      opacity: 1;
      transform: translateY(0);
    }
    #toddler-chat-header {
      padding: 20px;
      background: rgba(255,255,255,0.03);
      border-bottom: 1px solid rgba(255,255,255,0.05);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    #toddler-chat-header .dot {
      width: 8px;
      height: 8px;
      background: #C6FF33;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    #toddler-chat-header span {
      color: #fff;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: -0.02em;
    }
    #toddler-chat-messages {
      flex-grow: 1;
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .toddler-msg {
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
      animation: slideUp 0.3s ease;
    }
    .toddler-msg-user {
      align-self: flex-end;
      background: rgba(255,255,255,0.1);
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .toddler-msg-bot {
      align-self: flex-start;
      background: #7D39EB;
      color: #fff;
      border-bottom-left-radius: 4px;
      box-shadow: 0 10px 20px rgba(125, 57, 235, 0.2);
    }
    #toddler-chat-input-container {
      padding: 20px;
      border-top: 1px solid rgba(255,255,255,0.05);
      display: flex;
      gap: 8px;
    }
    #toddler-chat-input {
      flex-grow: 1;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 10px 16px;
      color: #fff;
      font-size: 14px;
      outline: none;
    }
    #toddler-chat-input:focus {
      border-color: #C6FF33;
    }
    #toddler-send-btn {
      background: #C6FF33;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);

  // HTML Structure
  const container = document.createElement('div');
  container.id = 'toddler-widget-container';
  container.innerHTML = `
    <div id="toddler-chat-window">
      <div id="toddler-chat-header">
        <div class="dot"></div>
        <span>Toddler AI Assistant</span>
      </div>
      <div id="toddler-chat-messages">
        <div class="toddler-msg toddler-msg-bot">Hello! How can I help you today?</div>
      </div>
      <form id="toddler-chat-input-container">
        <input type="text" id="toddler-chat-input" placeholder="Type a message..." autocomplete="off">
        <button type="submit" id="toddler-send-btn">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </form>
    </div>
    <button id="toddler-widget-button">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    </button>
  `;
  document.body.appendChild(container);

  // Logic
  const btn = document.getElementById('toddler-widget-button');
  const win = document.getElementById('toddler-chat-window');
  const form = document.getElementById('toddler-chat-input-container');
  const input = document.getElementById('toddler-chat-input');
  const messages = document.getElementById('toddler-chat-messages');

  btn.onclick = () => {
    win.classList.toggle('open');
    if (win.classList.contains('open')) input.focus();
  };

  function addMessage(text, role) {
    const div = document.createElement('div');
    div.className = `toddler-msg toddler-msg-${role}`;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    addMessage(text, 'user');

    const typing = document.createElement('div');
    typing.className = 'toddler-msg toddler-msg-bot';
    typing.textContent = '...';
    messages.appendChild(typing);

    try {
      const formData = new FormData();
      formData.append('project_id', projectId);
      formData.append('text', text);

      const response = await fetch(`${apiUrl}/predict`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      messages.removeChild(typing);
      
      // For the widget, we might want to just show the prediction label 
      // or a custom response if configured. 
      // For now, let's just show the prediction.
      addMessage(data.prediction, 'bot');
    } catch {
      messages.removeChild(typing);
      addMessage('Error connecting to engine.', 'bot');
    }
  };
})();
