const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow = null;
let serverProcess = null;
const PORT = process.env.PORT || 3000;

function checkServerReady() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}/api/health`, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function startServer() {
  const isAlreadyRunning = await checkServerReady();
  if (isAlreadyRunning) {
    console.log(`[Electron] Server already running on port ${PORT}`);
    return;
  }

  const isDev = !app.isPackaged;
  console.log(`[Electron] Initializing server (isDev=${isDev})...`);

  // Possible locations for compiled server bundle
  const possibleBundles = [
    path.join(__dirname, '../dist-electron/server.cjs'),
    path.join(__dirname, 'server.cjs'),
    path.join(process.resourcesPath || '', 'dist-electron/server.cjs'),
    path.join(process.resourcesPath || '', 'app.asar/dist-electron/server.cjs')
  ];

  const serverBundle = possibleBundles.find(p => p && fs.existsSync(p));

  if (serverBundle) {
    try {
      process.env.NODE_ENV = 'production';
      process.env.PORT = String(PORT);
      require(serverBundle);
      console.log(`[Electron] Successfully loaded server bundle from: ${serverBundle}`);
    } catch (err) {
      console.error('[Electron] Error loading server bundle:', err);
    }
  } else if (isDev) {
    // Development fallback: spawn tsx
    console.log('[Electron] Spawning tsx server.ts for dev...');
    serverProcess = spawn('npx', ['tsx', 'server.ts'], {
      cwd: path.join(__dirname, '..'),
      shell: true,
      env: { ...process.env, PORT: String(PORT) },
      stdio: 'inherit'
    });
  }

  // Poll until server responds
  for (let i = 0; i < 30; i++) {
    const ready = await checkServerReady();
    if (ready) {
      console.log('[Electron] Sowa AI Server ready and verified!');
      return;
    }
    await new Promise(r => setTimeout(r, 400));
  }
  console.warn('[Electron] Server verification timeout, proceeding with window load.');
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0a0502',
    title: 'Sowa AI',
    icon: path.join(__dirname, '../public/sowa-icon.svg'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    }
  });

  // Automatically grant camera and microphone permissions to Sowa AI
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'microphone', 'camera', 'screen', 'notifications'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Handle external link clicks by opening in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  await startServer();

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
