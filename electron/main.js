const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Keep a global reference to prevent garbage collection
let mainWindow = null;
let serverProcess = null;

const isDev = process.env.NODE_ENV !== 'production';
const SERVER_URL = 'http://localhost:5000';
const CLIENT_URL = isDev
  ? 'http://localhost:5173'
  : `file://${path.join(__dirname, '..', 'client', 'dist', 'index.html')}`;

function startServer() {
  if (isDev) return; // In dev, server started separately via concurrently

  serverProcess = spawn('node', [path.join(__dirname, '..', 'server', 'server.js')], {
    env: { ...process.env },
    stdio: 'inherit',
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start server:', err);
    dialog.showErrorBox('Server Error', `Failed to start the backend server:\n${err.message}`);
  });
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Backup Database…',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navigate', '/backup');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'Alt+F4',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.webContents.reload(),
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow?.webContents.toggleDevTools(),
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => {
            const z = mainWindow?.webContents.getZoomFactor() || 1;
            mainWindow?.webContents.setZoomFactor(Math.min(z + 0.1, 2.0));
          },
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            const z = mainWindow?.webContents.getZoomFactor() || 1;
            mainWindow?.webContents.setZoomFactor(Math.max(z - 0.1, 0.5));
          },
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => mainWindow?.webContents.setZoomFactor(1.0),
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Diesel Pump Management System',
              message: 'Diesel Pump Management System',
              detail: `Version 1.0.0\nElectron ${process.versions.electron}\nNode ${process.versions.node}\n\nOffline desktop app for managing daily pump operations.`,
              buttons: ['OK'],
            });
          },
        },
        {
          label: 'Open Backup Folder…',
          click: () => {
            const backupDir = path.join(__dirname, '..', 'backup', 'data');
            shell.openPath(backupDir).catch(() => {
              dialog.showErrorBox('Error', `Could not open folder:\n${backupDir}`);
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Diesel Pump Management System',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(CLIENT_URL);

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC: allow renderer to trigger navigation (e.g. from menu click)
ipcMain.on('navigate', (event, path) => {
  if (mainWindow) mainWindow.webContents.send('navigate', path);
});

app.whenReady().then(() => {
  startServer();
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
