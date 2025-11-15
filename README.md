# Camping Buddy AI

The Camping Buddy AI is a stateful, AI-powered chatbot designed to simplify trip planning for outdoor enthusiasts. Built on Cloudflare Workers with Durable Objects for state management and Workers AI (Llama 3.3) for intelligent responses, it functions as an interactive, personalized assistant ready to suggest essential gear, recommend suitable camping spots based on user criteria, and provide advice on outdoor activities and safety.

## Features

- **Stateful Chat Sessions**: Uses Cloudflare Durable Objects to maintain conversation history across sessions
- **AI-Powered Responses**: Leverages Llama 3.3 70B model via Workers AI for intelligent camping advice
- **Simple Chat UI**: Clean, responsive web interface built with HTML, CSS, and JavaScript
- **Session Management**: Persistent chat history stored per session
- **Real-time Interaction**: Instant responses from the AI assistant

## Architecture

- **Backend**: TypeScript-based Cloudflare Worker
- **State Management**: Durable Objects (CampingSession class)
- **AI Integration**: Workers AI with Llama 3.3 70B Instruct model
- **Frontend**: HTML/CSS/JavaScript served directly from the Worker

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm
- Cloudflare account with Workers AI enabled

### Installation

```bash
npm install
```

### Development

Run the application locally using Wrangler:

```bash
npm run dev
```

The application will be available at `http://localhost:8787`

### Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

## Usage

1. Open the application in your browser
2. Start chatting with the AI about your camping needs
3. The conversation history is preserved across page refreshes
4. Use the "Clear Chat" button to start a new conversation

## API Endpoints

- `GET /` - Serves the chat UI
- `POST /chat` - Send a message to the AI (requires X-Session-ID header)
- `GET /history` - Retrieve chat history (requires X-Session-ID header)
- `POST /clear` - Clear chat history (requires X-Session-ID header)

## Technology Stack

- Cloudflare Workers
- Cloudflare Durable Objects
- Workers AI (Llama 3.3 70B Instruct)
- TypeScript
- HTML/CSS/JavaScript
