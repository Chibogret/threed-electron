import { app, BrowserWindow, nativeTheme } from 'electron';
import { mkdirSync } from 'fs';
import path from 'path';

const isDev = !!process.env.VITE_DEV_SERVER_URL;

const ensureWritableUserDataPath = () => {
  if (process.platform !== 'win32') {
    return;
  }

  const safeUserDataPath = path.join(app.getPath('temp'), app.getName());

  try {
    mkdirSync(safeUserDataPath, { recursive: true });
    app.setPath('userData', safeUserDataPath);
  } catch (error) {
    console.warn('Failed to configure writable userData path', error);
  }
};

const createWindow = async () => {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1f2933' : '#f5f7fa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await window.loadURL(process.env.VITE_DEV_SERVER_URL);
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexHtml = path.join(__dirname, '../dist/index.html');
    await window.loadFile(indexHtml);
  }
};

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

app.whenReady().then(() => {
  ensureWritableUserDataPath();
  void createWindow();
});
