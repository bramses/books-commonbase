console.log('🚀 Starting Commonbase Desktop main process');
import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { CommonbaseService } from './lib/commonbase-service';
import { resetOpenAI } from './lib/embeddings';
import dotenv from 'dotenv';
console.log('📦 All imports loaded successfully');

// Load environment variables with proper path handling for Electron
try {
  // In the main process, always try to load .env from app directory
  const envPath = app.isPackaged
    ? path.join(process.resourcesPath, '.env')
    : path.join(process.cwd(), '.env');

  dotenv.config({ path: envPath });
} catch (error) {
  console.warn('Could not load .env file in main process:', error.message);
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
console.log('🔍 Squirrel startup check result:', started);
console.log('🖥️ Platform:', process.platform);
if (started && process.platform === 'win32') {
  console.log('🚪 Squirrel startup detected on Windows, quitting app');
  app.quit();
}
console.log('🎯 Main process initialization continuing...');

let mainWindow: BrowserWindow;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname || app.getAppPath(), 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname || app.getAppPath(), `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Set up menu
  createMenu();
};

const createMenu = () => {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Add File...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            selectAndAddFile();
          },
        },
        {
          label: 'Add Text Entry...',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('navigate-to', '/add');
          },
        },
        { type: 'separator' },
        {
          label: 'Search',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            mainWindow.webContents.send('navigate-to', '/search');
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Ledger',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            mainWindow.webContents.send('navigate-to', '/ledger');
          },
        },
        {
          label: 'Feed',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.webContents.send('navigate-to', '/feed');
          },
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template as any);
  Menu.setApplicationMenu(menu);
};

async function selectAndAddFile() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'All Supported', extensions: ['*'] },
      { name: 'Text Files', extensions: ['txt', 'md', 'js', 'ts', 'py', 'rb', 'php', 'html', 'css', 'json', 'xml', 'yaml', 'yml'] },
      { name: 'Documents', extensions: ['pdf', 'docx'] },
      { name: 'Data Files', extensions: ['csv'] },
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'] },
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    for (const filePath of result.filePaths) {
      try {
        await CommonbaseService.addFileEntry(filePath);
      } catch (error) {
        console.error('Failed to add file:', error);
        dialog.showErrorBox('Error', `Failed to add file ${path.basename(filePath)}: ${error.message}`);
      }
    }
    mainWindow.webContents.send('files-added', result.filePaths.length);
  }
}

// IPC Handlers
ipcMain.handle('commonbase:add-entry', async (_event, data: string, metadata: any, embedding?: number[]) => {
  try {
    return await CommonbaseService.addEntry(data, metadata, embedding);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('commonbase:add-file', async (_event, filePath: string) => {
  try {
    return await CommonbaseService.addFileEntry(filePath);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('commonbase:get-entry', async (_event, id: string) => {
  try {
    return await CommonbaseService.getEntry(id);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('commonbase:update-entry', async (_event, id: string, data?: string, metadata?: any) => {
  try {
    return await CommonbaseService.updateEntry(id, data, metadata);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('commonbase:delete-entry', async (_event, id: string) => {
  try {
    return await CommonbaseService.deleteEntry(id);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('commonbase:list-entries', async (_event, offset = 0, limit = 50) => {
  try {
    return await CommonbaseService.listEntries(offset, limit);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('commonbase:search', async (_event, query: string, limit = 20) => {
  try {
    return await CommonbaseService.searchEntries(query, limit);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('commonbase:semantic-search', async (_event, query: string, limit = 20) => {
  try {
    return await CommonbaseService.semanticSearch(query, limit);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('commonbase:random-entries', async (_event, limit = 10) => {
  try {
    return await CommonbaseService.getRandomEntries(limit);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('commonbase:link-entries', async (_event, parentId: string, childId: string) => {
  try {
    return await CommonbaseService.linkEntries(parentId, childId);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('commonbase:get-similar-entries', async (_event, entryId: string, limit = 5) => {
  try {
    return await CommonbaseService.getSimilarEntries(entryId, limit);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('dialog:select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'All Supported', extensions: ['*'] },
      { name: 'Text Files', extensions: ['txt', 'md', 'js', 'ts', 'py', 'rb', 'php', 'html', 'css', 'json', 'xml', 'yaml', 'yml'] },
      { name: 'Documents', extensions: ['pdf', 'docx'] },
      { name: 'Data Files', extensions: ['csv'] },
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'] },
    ],
  });

  return result;
});

ipcMain.handle('file:get-stats', async (_event, filePath: string) => {
  try {
    const fs = require('fs');
    const mime = require('mime');
    const stats = fs.statSync(filePath);

    return {
      size: stats.size,
      type: mime.getType(filePath) || '',
      lastModified: stats.mtime.toISOString()
    };
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('file:reveal-in-finder', async (_event, filePath: string) => {
  try {
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath);
    } else {
      throw new Error(`File does not exist: ${filePath}`);
    }
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('file:get-image-data', async (_event, filePath: string) => {
  try {
    const fs = require('fs');
    const path = require('path');

    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const imageBuffer = fs.readFileSync(filePath);
    const extension = path.extname(filePath).toLowerCase();

    // Simple MIME type mapping to avoid import issues
    const mimeTypeMap: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff'
    };

    const mimeType = mimeTypeMap[extension] || 'image/png';
    const base64Data = imageBuffer.toString('base64');

    return `data:${mimeType};base64,${base64Data}`;
  } catch (error) {
    throw error;
  }
});

// Settings management
const getSettingsPath = () => {
  const os = require('os');
  const path = require('path');
  const settingsDir = path.join(os.homedir(), '.commonbase-electron');
  const fs = require('fs');

  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }

  return path.join(settingsDir, 'settings.json');
};

const getDefaultSettings = () => ({
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/commonbase-electron',
  semanticSearchThreshold: 0.7,
  semanticSearchLimit: 20
});

ipcMain.handle('settings:get', async () => {
  try {
    const fs = require('fs');
    const settingsPath = getSettingsPath();

    if (fs.existsSync(settingsPath)) {
      const settingsData = fs.readFileSync(settingsPath, 'utf-8');
      const savedSettings = JSON.parse(settingsData);
      return { ...getDefaultSettings(), ...savedSettings };
    }

    return getDefaultSettings();
  } catch (error) {
    console.error('Failed to load settings:', error);
    return getDefaultSettings();
  }
});

ipcMain.handle('settings:save', async (_event, settings) => {
  try {
    const fs = require('fs');
    const settingsPath = getSettingsPath();

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    // Update process environment variables
    if (settings.openaiApiKey) {
      process.env.OPENAI_API_KEY = settings.openaiApiKey;
    }
    if (settings.databaseUrl) {
      process.env.DATABASE_URL = settings.databaseUrl;
    }

    // Reset OpenAI client so it uses the new API key
    resetOpenAI();

    return { success: true };
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle file drops on the dock icon (macOS)
app.on('open-file', async (_event, filePath) => {
  event.preventDefault();
  try {
    await CommonbaseService.addFileEntry(filePath);
    if (mainWindow) {
      mainWindow.webContents.send('file-added', filePath);
    }
  } catch (error) {
    console.error('Failed to add dropped file:', error);
  }
});
