const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const net = require('net');

let mainWindow;
let backendProcess;
const DEFAULT_PORT = 3001;
let currentPort = DEFAULT_PORT;

if (process.platform === 'linux') {
  // Force X11 for reliable transparency on Cinnamon/other WMs
  process.env.ELECTRON_OZONE_PLATFORM_HINT = 'x11';
  app.commandLine.appendSwitch('enable-transparent-visuals');
  app.commandLine.appendSwitch('ozone-platform-hint', 'x11');
}

// Log file for debugging
const logFile = path.join(app.getPath('userData'), 'minty-debug.log');

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp}: ${message}\n`;
  console.log(logMessage.trim());
  try {
    fs.appendFileSync(logFile, logMessage);
  } catch (err) {
    // Ignore log write errors
  }
}

function findBackendPath() {
  // Possible paths to check - order matters!
  const candidates = [
    // Production .deb / AppImage - extraResources
    path.join(process.resourcesPath, 'backend'),
    path.join(process.resourcesPath, 'app', 'backend'),
    // Alternative production paths
    path.join(process.resourcesPath, '..', 'backend'),
    path.join(app.getAppPath(), '..', 'backend'),
    // Development
    path.join(__dirname, '..', 'backend'),
    path.join(__dirname, '..', '..', 'backend'),
  ];

  log('Searching for backend in:');
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    const exists = fs.existsSync(resolved);
    log(`  - ${resolved}: ${exists ? 'EXISTS' : 'not found'}`);
    if (exists) {
      log(`Found backend at: ${resolved}`);
      return resolved;
    }
  }

  log('ERROR: Backend not found!');
  return null;
}

function findEntryPoint(backendPath) {
  const candidates = [
    path.join(backendPath, 'dist', 'index.js'),
    path.join(backendPath, 'dist', 'backend', 'src', 'index.js'),
    path.join(backendPath, 'build', 'index.js'),
    path.join(backendPath, 'src', 'index.js'),
    path.join(backendPath, 'index.js'),
  ];

  log('Searching for entry point:');
  for (const candidate of candidates) {
    const exists = fs.existsSync(candidate);
    log(`  - ${candidate}: ${exists ? 'EXISTS' : 'not found'}`);
    if (exists) {
      return candidate;
    }
  }
  return null;
}

function waitForBackend(port, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const check = () => {
      attempts++;
      log(`Checking backend health on port ${port} (attempt ${attempts}/${maxAttempts})...`);

      const req = http.get(`http://localhost:${port}/api/health`, (res) => {
        log(`Backend responded with status ${res.statusCode}`);
        resolve(true);
      });

      req.on('error', (err) => {
        log(`Backend not ready: ${err.message}`);
        if (attempts >= maxAttempts) {
          reject(new Error('Backend did not start within timeout'));
        } else {
          setTimeout(check, 500);
        }
      });

      req.setTimeout(2000, () => {
        req.destroy();
        if (attempts >= maxAttempts) {
          reject(new Error('Backend health check timed out'));
        } else {
          setTimeout(check, 500);
        }
      });
    };

    // Start checking after a short delay
    setTimeout(check, 1000);
  });
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      server.close();
      resolve(false);
    });
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function probeExistingBackend(port) {
  try {
    await waitForBackend(port, 2);
    return true;
  } catch {
    return false;
  }
}

async function pickPort(start = DEFAULT_PORT, tries = 5) {
  // First try default; if healthy backend already there, reuse
  if (await probeExistingBackend(start)) {
    log(`Port ${start} already has a healthy backend; will reuse.`);
    return { port: start, alreadyRunning: true };
  }

  // Find first free port
  for (let i = 0; i < tries; i++) {
    const candidate = start + i;
    const free = await isPortFree(candidate);
    if (free) {
      return { port: candidate, alreadyRunning: false };
    }
  }

  // Fallback to default even if not free
  return { port: start, alreadyRunning: false };
}

async function startBackend() {
  log('=== Starting Backend ===');
  log(`app.isPackaged: ${app.isPackaged}`);
  log(`__dirname: ${__dirname}`);
  log(`process.resourcesPath: ${process.resourcesPath}`);
  log(`app.getAppPath(): ${app.getAppPath()}`);

  const backendPath = findBackendPath();

  if (!backendPath) {
    log('FATAL: Backend directory not found');
    dialog.showErrorBox(
      'Fehler',
      'Backend-Ordner nicht gefunden.\n\nDie App kann nicht starten.\n\nLog: ' + logFile
    );
    app.quit();
    return false;
  }

  const entryPoint = findEntryPoint(backendPath);

  if (!entryPoint) {
    log('FATAL: No entry point found');

    // List contents of backend dir for debugging
    try {
      const files = fs.readdirSync(backendPath);
      log(`Contents of ${backendPath}:`);
      files.forEach(f => log(`  - ${f}`));

      const distPath = path.join(backendPath, 'dist');
      if (fs.existsSync(distPath)) {
        const distFiles = fs.readdirSync(distPath);
        log(`Contents of ${distPath}:`);
        distFiles.forEach(f => log(`  - ${f}`));
      }
    } catch (e) {
      log(`Could not read directory: ${e.message}`);
    }

    dialog.showErrorBox(
      'Fehler',
      `Keine index.js gefunden in:\n${backendPath}\n\nLog: ${logFile}`
    );
    app.quit();
    return false;
  }

  const nodeModules = path.join(backendPath, 'node_modules');
  if (!fs.existsSync(nodeModules)) {
    log('FATAL: node_modules not found');
    dialog.showErrorBox(
      'Fehler',
      `node_modules fehlt in:\n${backendPath}\n\nBitte führe 'npm install' im Backend-Ordner aus.\n\nLog: ${logFile}`
    );
    app.quit();
    return false;
  }

  const { port, alreadyRunning } = await pickPort(DEFAULT_PORT, 5);
  currentPort = port;
  log(`Resolved backend port: ${port} (already running: ${alreadyRunning})`);

  // If something is already serving and healthy, reuse it
  if (alreadyRunning) {
    await waitForBackend(port);
    return { ok: true, port };
  }

  log(`Starting backend: ${entryPoint}`);
  log(`Working directory: ${backendPath}`);

  const nodeBinary = app.isPackaged ? process.execPath : 'node';
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
  };

  if (app.isPackaged) {
    // Use Electron's embedded Node.js to avoid ABI mismatches on user systems
    env.ELECTRON_RUN_AS_NODE = '1';
    log(`App is packaged – running backend via Electron binary: ${nodeBinary}`);
  } else {
    log(`App is not packaged – running backend via system Node.js`);
  }

  try {
    backendProcess = spawn(nodeBinary, [entryPoint], {
      cwd: backendPath,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    log(`Backend process started with PID: ${backendProcess.pid}`);

    backendProcess.stdout.on('data', (data) => {
      log(`[Backend] ${data.toString().trim()}`);
    });

    backendProcess.stderr.on('data', (data) => {
      log(`[Backend ERROR] ${data.toString().trim()}`);
    });

    backendProcess.on('error', (err) => {
      log(`[Backend SPAWN ERROR] ${err.message}`);
    });

    backendProcess.on('exit', (code, signal) => {
      log(`[Backend EXIT] code=${code}, signal=${signal}`);
    });

    // Wait for backend to be ready
    await waitForBackend(port);
    log('Backend is running and healthy!');
    return { ok: true, port };
  } catch (err) {
    log(`Backend startup failed: ${err.message}`);
    dialog.showErrorBox(
      'Fehler',
      `Backend konnte nicht gestartet werden.\n\n${err.message}\n\nLog: ${logFile}`
    );
    if (backendProcess) {
      backendProcess.kill();
    }
    app.quit();
    return { ok: false, port };
  }
}

function createWindow(port) {
  log('=== Creating Window ===');

  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    title: 'Minty Dashboard',
    icon: path.join(__dirname, 'icons', 'minty-icon.png'),
    transparent: true,
    frame: true,
    titleBarStyle: 'default',
    useContentSize: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#00000000',
    autoHideMenuBar: true,
  });

  if (app.isPackaged) {
    // Production: load from backend server (avoid file:// origin)
    const backendUrl = `http://localhost:${port}`;
    log(`Loading production URL: ${backendUrl}`);
    mainWindow.loadURL(backendUrl);
  } else {
    // Development: load from Vite dev server
    log('Loading from dev server: http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  log('=== App Ready ===');
  log(`User data path: ${app.getPath('userData')}`);
  log(`Log file: ${logFile}`);

  const { ok, port } = await startBackend();
  if (ok) {
    createWindow(port);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  log('=== All Windows Closed ===');
  if (backendProcess) {
    log('Killing backend process...');
    backendProcess.kill();
  }
  app.quit();
});

app.on('before-quit', () => {
  log('=== Before Quit ===');
  if (backendProcess) {
    backendProcess.kill('SIGTERM');
  }
});

app.on('will-quit', () => {
  log('=== Will Quit ===');
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill('SIGKILL');
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log(`UNCAUGHT EXCEPTION: ${error.message}`);
  log(error.stack);
});

process.on('unhandledRejection', (reason) => {
  log(`UNHANDLED REJECTION: ${reason}`);
});
