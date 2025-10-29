const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const isDev = !app.isPackaged;

let mainWindow;
let db;

let winState = {
  width: 900,
  height: 600,
  x: undefined,
  y: undefined,
};

const saveWindowState = () => {
  if (mainWindow) {
    const bounds = mainWindow.getBounds();
    winState = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
    };
    fs.writeFileSync(path.join(app.getPath('userData'), 'window-state.json'), JSON.stringify(winState));
  }
};

const loadWindowState = () => {
  try {
    const data = fs.readFileSync(path.join(app.getPath('userData'), 'window-state.json'), 'utf8');
    winState = JSON.parse(data);
  } catch (e) {
    // If file doesn't exist or is invalid, use default
  }
};

function initializeDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'pricebook.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Could not connect to database', err);
    } else {
      console.log('Connected to SQLite database at', dbPath);
      db.run(`CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY,
        articleName TEXT,
        unit TEXT,
        unitPrice REAL,
        salePrice REAL
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS cartItems (
        id INTEGER PRIMARY KEY,
        itemId INTEGER,
        articleName TEXT,
        unit TEXT,
        unitPrice REAL,
        salePrice REAL,
        quantity INTEGER
      )`);
    }
  });
}

function createWindow() {
  loadWindowState();

  mainWindow = new BrowserWindow({
    width: winState.width,
    height: winState.height,
    x: winState.x,
    y: winState.y,
    fullscreen: true, // Start in fullscreen mode
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('close', saveWindowState);

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`Failed to load URL: ${validatedURL} with error: ${errorDescription} (Code: ${errorCode})`);
    // Optionally, display an error page or message to the user
  });

  setupMenu();
}

function setupMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Item',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('new-item'),
        },
        { type: 'separator' },
        {
          label: 'Import CSV...',
          accelerator: 'CmdOrCtrl+I',
          click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [{ name: 'CSV Files', extensions: ['csv'] }],
            });
            if (!canceled && filePaths.length > 0) {
              const filePath = filePaths[0];
              const content = fs.readFileSync(filePath, 'utf8');
              mainWindow.webContents.send('import-csv', content);
            }
          },
        },
        {
          label: 'Export CSV...',
          accelerator: 'CmdOrCtrl+E',
          click: async () => {
            mainWindow.webContents.send('export-csv-request'); // Send request without filePath, App.jsx will handle filename
          },
        },
        { type: 'separator' },
        {
          label: 'Reset Database...',
          click: () => mainWindow.webContents.send('reset-database-request'), // IPC channel for reset
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        {
          label: 'Focus Search',
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow.webContents.send('focus-search'),
        },
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Hardware Supplies Pricebook',
              message: 'Hardware Supplies Pricebook App',
              detail: `Version: ${app.getVersion()}\nDeveloped by Cline`,
              buttons: ['OK'],
            });
          },
        },
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://electronjs.org'); // Placeholder
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  initializeDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      }
      console.log('Database connection closed.');
    });
    app.quit();
  }
});

ipcMain.on('export-csv-data', async (event, { csvData, fileName }) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      defaultPath: fileName, // Use the generated filename
    });

    if (!canceled && filePath) {
      fs.writeFileSync(filePath, csvData, 'utf8');
      event.sender.send('export-csv-success');
    } else {
      event.sender.send('export-csv-error', 'Export cancelled by user.');
    }
  } catch (error) {
    event.sender.send('export-csv-error', error.message);
  }
});

ipcMain.handle('db-reset-database', async () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('DELETE FROM items', (err) => {
        if (err) reject(err);
      });
      db.run('DELETE FROM cartItems', (err) => {
        if (err) reject(err);
      });
      resolve();
    });
  });
});

// SQLite IPC handlers
ipcMain.handle('db-get-items', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM items', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('db-add-item', async (event, item) => {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO items (id, articleName, unit, unitPrice, salePrice) VALUES (?, ?, ?, ?, ?)',
      [item.id, item.articleName, item.unit, item.unitPrice, item.salePrice],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...item });
        }
      });
  });
});

ipcMain.handle('db-update-item', async (event, item) => {
  return new Promise((resolve, reject) => {
    db.run('UPDATE items SET articleName = ?, unit = ?, unitPrice = ?, salePrice = ? WHERE id = ?',
      [item.articleName, item.unit, item.unitPrice, item.salePrice, item.id],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(item);
        }
      });
  });
});

ipcMain.handle('db-delete-item', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM items WHERE id = ?', id, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(id);
      }
    });
  });
});

ipcMain.handle('db-get-cart-items', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM cartItems', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('db-add-cart-item', async (event, item) => {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO cartItems (id, itemId, articleName, unit, unitPrice, salePrice, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [item.id, item.itemId, item.articleName, item.unit, item.unitPrice, item.salePrice, item.quantity],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...item });
        }
      });
  });
});

ipcMain.handle('db-update-cart-item-quantity', async (event, { id, quantity }) => {
  return new Promise((resolve, reject) => {
    db.run('UPDATE cartItems SET quantity = ? WHERE id = ?',
      [quantity, id],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, quantity });
        }
      });
  });
});

ipcMain.handle('db-remove-cart-item', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM cartItems WHERE id = ?', id, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(id);
      }
    });
  });
});
