const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Keep a global reference to prevent garbage collection
let mainWindow = null;
let serverProcess = null;

const isDev = process.env.NODE_ENV !== 'production';
const SERVER_URL = 'http://localhost:5000';
const CLIENT_URL = isDev ? 'http://localhost:5173' : `file://${path.join(__dirname, '..', 'client', 'dist', 'index.html')}`;

function startServer() {
  // In dev, server is started separately via concurrently
  if (isDev) return;

  serverProcess = spawn('node', [path.join(__dirname, '..', 'server', 'server.js')], {
    env: { ...process.env },
    stdio: 'inherit',
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start server:', err);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Diesel Pump Management System',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(CLIENT_URL);

  // Open DevTools in dev mode
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Kill the server process on exit
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
