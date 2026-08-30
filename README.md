# Sowa AI — Advanced Multimodal Desktop Assistant

Sowa AI is an intelligent, real-time multimodal AI assistant powered by **Google Gemini**. It combines bidirectional low-latency audio streaming, live camera and screen vision, deep operating system integration, and external tool automations into a sleek desktop experience. It features full-duplex live voice interaction, real-time voice activity barge-in, a native Windows PC controller & app launcher, hardware maintenance tools, web search, memory hub, mood customization, widgets, and optional Google Workspace integrations.

---

### ✨ Core Features

- 🎙️ **Real-Time Voice Chat:** Low-latency bidirectional conversational streaming with voice activity detection.
- 👁️ **Live Vision & Screen Context:** Real-time webcam analysis and screen-sharing for live debugging, browsing, and collaborative tasks.
- 💻 **Native PC Automation:** Control system volume, launch apps, execute background actions, and monitor system diagnostics.
- 🛠️ **Tool & Service Integrations:** Built-in support for Google Workspace (Calendar/Gmail), Telegram, Google Chat, web search, and image generation.
- 🧠 **Persistent Memory & Snapshots:** Long-term conversation memory, context snapshots, and proactive contextual nudges.
- 🖥️ **Cross-Platform Desktop App:** Built with React 19, TypeScript, Tailwind CSS, Vite, and Electron.

---

## ⚡ Quick Start: Standalone Windows App

### 1. Launch Sowa AI Directly:
Double click:
```
Launch-Sowa-AI.bat
```
Or run the packaged Windows executable:
```
release\Sowa AI-win32-x64\Sowa AI.exe
```

### 2. Build Your Own Windows Standalone EXE:
Run:
```
Build-Windows-EXE.bat
```

---

## 🚀 How to Run Locally in Browser / Dev Mode

### 1. Prerequisites
- **Node.js** (v18 or higher installed on your computer - [nodejs.org](https://nodejs.org))
- **npm** (bundled with Node.js)
- A **Gemini API Key** (Get a free key from [Google AI Studio](https://aistudio.google.com/app/apikey))

### 2. Setup

1. Open your terminal in the project directory:
   ```bash
   cd "d:/My Codes/maya-advanced"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your **Gemini API Key**:
   - **Option A (Recommended)**: Create a `.env` file in the project root:
     ```env
     GEMINI_API_KEY="AIzaSyYourActualKeyHere"
     PORT=3000
     ```
   - **Option B**: Start the app and paste your Gemini API key inside Sowa AI's **Settings > Connected Apps & APIs > Gemini API Key** field directly in the UI.

4. Start Sowa AI:
   ```bash
   npm run dev
   ```

5. Open your browser:
   ```
   http://localhost:3000
   ```

---

## 💻 Native PC & Desktop Controls

When running locally on Windows, Sowa AI integrates directly with your operating system:

### 🎙️ Voice & Natural Language Commands:
- **Instant Interruption (Barge-in)**: Simply speak whenever you want — Sowa AI immediately stops talking and listens to you.
- **Open Apps**: *"Sowa, open VS Code"*, *"Open Spotify"*, *"Open Discord"*, *"Open Telegram"*, *"Open WhatsApp"*, *"Open Steam"*, *"Open Calculator"*, *"Open Notepad"*, *"Open Chrome"*, *"Open Task Manager"*
- **Desktop Web Search**: *"Search for quantum computing on my PC"*, *"Open github.com"*
- **Keyboard & Hotkey Automation**: *"Press Ctrl+T"*, *"Type Hello World"*
- **Accessibility & System Actions**: *"Take a screenshot"*, *"Read my clipboard"*, *"Open magnifier"*, *"Open on-screen keyboard"*
- **Hardware & Power Actions**: *"Empty recycle bin"*, *"Mute PC volume"*, *"Turn up volume"*, *"Restart my PC"*, *"Shutdown PC"*

---

## 🎭 Neural Personas

Switch between 4 core personas anytime from the top-left mood badge, top-right menu, or Quick Actions:
- **💼 Serious**: Analytical, focused, high-precision assistance.
- **☕ Casual**: Relaxed, conversational, friendly companion.
- **👔 Formal**: Professional, structured, executive communication.
- **🔥 18+**: Unrestricted, passionate, deeply expressive connection.

---

## 🛠️ Project Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Express backend bridge and Vite frontend on port 3000 |
| `npm run build` | Builds production client assets in `dist/` |
| `npm run electron:build` | Packages standalone Windows EXE in `release/Sowa AI-win32-x64/` |
| `npm run lint` | Runs TypeScript type checking |

