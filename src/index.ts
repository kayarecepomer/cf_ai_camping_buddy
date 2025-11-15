export interface Env {
  AI: Ai;
  CAMPING_SESSION: DurableObjectNamespace;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export class CampingSession implements DurableObject {
  private state: DurableObjectState;
  private messages: Message[];

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.messages = [];
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/chat' && request.method === 'POST') {
      return this.handleChat(request);
    }

    if (url.pathname === '/history' && request.method === 'GET') {
      return this.getHistory();
    }

    if (url.pathname === '/clear' && request.method === 'POST') {
      return this.clearHistory();
    }

    return new Response('Not Found', { status: 404 });
  }

  async initialize() {
    const stored = await this.state.storage.get<Message[]>('messages');
    if (stored) {
      this.messages = stored;
    }
  }

  async handleChat(request: Request): Promise<Response> {
    await this.initialize();

    const body = await request.json() as { message: string };
    const userMessage: Message = {
      role: 'user',
      content: body.message,
      timestamp: Date.now()
    };

    this.messages.push(userMessage);

    const env = (this.state as any).env as Env;
    
    const systemPrompt = `You are a helpful camping assistant with expertise in outdoor activities, camping gear, campsite selection, and outdoor safety. Provide practical, friendly advice to help users plan their camping trips. Keep responses concise and actionable.`;

    const conversationMessages = [
      { role: 'system', content: systemPrompt },
      ...this.messages.map(m => ({ role: m.role, content: m.content }))
    ];

    const aiResponse = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: conversationMessages
    });

    const assistantMessage: Message = {
      role: 'assistant',
      content: (aiResponse as any).response,
      timestamp: Date.now()
    };

    this.messages.push(assistantMessage);
    await this.state.storage.put('messages', this.messages);

    return new Response(JSON.stringify({
      message: assistantMessage.content,
      timestamp: assistantMessage.timestamp
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async getHistory(): Promise<Response> {
    await this.initialize();
    return new Response(JSON.stringify({
      messages: this.messages
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async clearHistory(): Promise<Response> {
    this.messages = [];
    await this.state.storage.put('messages', this.messages);
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    const sessionId = request.headers.get('X-Session-ID') || 'default';
    const durableObjectId = env.CAMPING_SESSION.idFromName(sessionId);
    const durableObject = env.CAMPING_SESSION.get(durableObjectId);

    const durableObjectRequest = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body
    });

    const response = await durableObject.fetch(durableObjectRequest);
    
    const newResponse = new Response(response.body, {
      status: response.status,
      headers: response.headers
    });

    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    
    return newResponse;
  }
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Camping Buddy AI</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 800px;
            height: 90vh;
            max-height: 700px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
            color: white;
            padding: 25px 30px;
            text-align: center;
            border-bottom: 3px solid #667eea;
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 5px;
        }
        
        .header p {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 30px;
            background: #f7fafc;
        }
        
        .message {
            margin-bottom: 20px;
            display: flex;
            animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .message.user {
            justify-content: flex-end;
        }
        
        .message-content {
            max-width: 70%;
            padding: 15px 20px;
            border-radius: 18px;
            position: relative;
            word-wrap: break-word;
        }
        
        .message.user .message-content {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-bottom-right-radius: 4px;
        }
        
        .message.assistant .message-content {
            background: white;
            color: #2d3748;
            border-bottom-left-radius: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .input-container {
            padding: 20px 30px;
            background: white;
            border-top: 1px solid #e2e8f0;
            display: flex;
            gap: 15px;
        }
        
        #messageInput {
            flex: 1;
            padding: 15px 20px;
            border: 2px solid #e2e8f0;
            border-radius: 25px;
            font-size: 15px;
            outline: none;
            transition: border-color 0.3s;
        }
        
        #messageInput:focus {
            border-color: #667eea;
        }
        
        button {
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 25px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        
        button:active {
            transform: translateY(0);
        }
        
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        
        .loading {
            display: none;
            text-align: center;
            padding: 10px;
            color: #667eea;
            font-style: italic;
        }
        
        .loading.active {
            display: block;
        }
        
        .controls {
            padding: 15px 30px;
            background: #f7fafc;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .controls button {
            padding: 10px 20px;
            font-size: 13px;
            background: #e2e8f0;
            color: #2d3748;
        }
        
        .controls button:hover {
            background: #cbd5e0;
        }
        
        .session-id {
            font-size: 12px;
            color: #718096;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏕️ Camping Buddy AI</h1>
            <p>Your AI-powered camping trip planning assistant</p>
        </div>
        
        <div class="chat-container" id="chatContainer">
            <div class="message assistant">
                <div class="message-content">
                    Hello! I'm your Camping Buddy AI assistant. I can help you with camping gear recommendations, campsite suggestions, outdoor activities, and safety tips. What would you like to know about your next camping adventure?
                </div>
            </div>
        </div>
        
        <div class="loading" id="loading">AI is thinking...</div>
        
        <div class="input-container">
            <input 
                type="text" 
                id="messageInput" 
                placeholder="Ask me anything about camping..."
                autocomplete="off"
            />
            <button id="sendButton" onclick="sendMessage()">Send</button>
        </div>
        
        <div class="controls">
            <span class="session-id">Session: <span id="sessionId"></span></span>
            <button onclick="clearChat()">Clear Chat</button>
        </div>
    </div>

    <script>
        let sessionId = localStorage.getItem('campingSessionId');
        if (!sessionId) {
            sessionId = 'session_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('campingSessionId', sessionId);
        }
        document.getElementById('sessionId').textContent = sessionId;

        const chatContainer = document.getElementById('chatContainer');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const loading = document.getElementById('loading');

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        async function sendMessage() {
            const message = messageInput.value.trim();
            if (!message) return;

            addMessage('user', message);
            messageInput.value = '';
            sendButton.disabled = true;
            messageInput.disabled = true;
            loading.classList.add('active');

            try {
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Session-ID': sessionId
                    },
                    body: JSON.stringify({ message })
                });

                const data = await response.json();
                addMessage('assistant', data.message);
            } catch (error) {
                addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
            } finally {
                loading.classList.remove('active');
                sendButton.disabled = false;
                messageInput.disabled = false;
                messageInput.focus();
            }
        }

        function addMessage(role, content) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + role;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.textContent = content;
            
            messageDiv.appendChild(contentDiv);
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        async function clearChat() {
            if (!confirm('Are you sure you want to clear the chat history?')) return;

            try {
                await fetch('/clear', {
                    method: 'POST',
                    headers: {
                        'X-Session-ID': sessionId
                    }
                });

                chatContainer.innerHTML = \`
                    <div class="message assistant">
                        <div class="message-content">
                            Hello! I'm your Camping Buddy AI assistant. I can help you with camping gear recommendations, campsite suggestions, outdoor activities, and safety tips. What would you like to know about your next camping adventure?
                        </div>
                    </div>
                \`;
            } catch (error) {
                alert('Failed to clear chat history');
            }
        }

        async function loadHistory() {
            try {
                const response = await fetch('/history', {
                    headers: {
                        'X-Session-ID': sessionId
                    }
                });

                const data = await response.json();
                
                if (data.messages && data.messages.length > 0) {
                    chatContainer.innerHTML = '';
                    data.messages.forEach(msg => {
                        addMessage(msg.role, msg.content);
                    });
                }
            } catch (error) {
                console.error('Failed to load history');
            }
        }

        loadHistory();
    </script>
</body>
</html>`;
