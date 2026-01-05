import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { spawn } from 'child_process';
import { getSystemMetrics, getMetricsHistory } from './services/metricsService.js';
import { getAllFeeds, getFeed, getFeedList, testFeedUrl } from './services/newsService.js';
import { getCalendarEvents } from './services/calendarService.js';
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  listNotes,
  createNote,
  updateNote,
  deleteNote,
} from './services/tasksService.js';
import {
  listUpcoming,
  createUpcoming,
  updateUpcoming,
  deleteUpcoming,
} from './services/upcomingService.js';
import {
  getMprisStatus,
  mprisPlayPause,
  mprisNext,
  mprisPrevious,
  mprisSetVolume,
} from './services/mprisService.js';
import { getWeather } from './services/weatherService.js';
import { getConfig, loadConfig, saveDashboardConfig, saveNewsFeeds } from './services/configService.js';
import type { DashboardConfig, NewsFeedConfig } from '../../shared/types/index.js';
import {
  fetchQuotesForSymbols,
  getCachedQuotes,
  getQuotesSettings,
  refreshQuotes,
  startQuotesScheduler,
  updateQuoteSettings,
} from './services/quotesService.js';
import {
  createLayoutPreset,
  deleteLayoutPreset,
  getLayoutPreset,
  listLayoutPresets,
  setDefaultLayoutPreset,
  updateLayoutPreset,
} from './services/layoutPresetsService.js';
import { getThemeSettings, saveThemeSettings } from './services/userSettingsService.js';

const app = express();
const httpServer = createServer(app);

// Load initial config (config file + DB overrides)
loadConfig();

// Configure Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
  },
  transports: ['websocket'],
});

// Start quotes scheduler for ticker updates
startQuotesScheduler(io);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Restart endpoint: forks a new process with same args and exits this one
app.post('/api/restart', (_req, res) => {
  try {
    const args = process.argv.slice(1);
    console.log('Restart requested via /api/restart, spawning replacement process...', {
      cmd: process.argv[0],
      args,
    });
    const child = spawn(process.argv[0], args, {
      detached: true,
      stdio: 'inherit',
      env: process.env,
    });
    child.unref();
    res.json({ status: 'restarting', timestamp: Date.now() });
    setTimeout(() => process.exit(0), 200);
  } catch (error) {
    console.error('Restart failed', error);
    res.status(500).json({ error: 'Restart failed' });
  }
});

// Config endpoints
app.get('/api/config', (_req, res) => {
  res.json({ config: getConfig(), timestamp: Date.now() });
});

app.put('/api/config/dashboard', (req, res) => {
  const dashboard = req.body as DashboardConfig;
  if (!dashboard || !Array.isArray(dashboard.layouts) || !Array.isArray(dashboard.widgets)) {
    res.status(400).json({ error: 'Invalid dashboard config' });
    return;
  }
  saveDashboardConfig(dashboard);
  res.json({ status: 'ok' });
});

// Quotes endpoints
app.get('/api/quotes', async (req, res) => {
  const symbolsParam = req.query.symbols as string | undefined;
  const symbols = symbolsParam ? symbolsParam.split(',') : undefined;

  try {
    if (symbols && symbols.length > 0 && symbols[0]) {
      const quotes = await fetchQuotesForSymbols(symbols);
      res.json({ quotes, timestamp: Date.now() });
      return;
    }

    let quotes = getCachedQuotes();
    if (!quotes.length) {
      quotes = await refreshQuotes(io);
    }
    res.json({ quotes, timestamp: Date.now() });
  } catch (error) {
    console.error('Failed to fetch quotes', error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

app.get('/api/quotes/default', async (_req, res) => {
  try {
    const quotes = await refreshQuotes(io);
    res.json({ quotes, timestamp: Date.now() });
  } catch (error) {
    console.error('Failed to fetch default quotes', error);
    res.status(500).json({ error: 'Failed to fetch default quotes' });
  }
});

app.get('/api/quotes/settings', (_req, res) => {
  res.json({ settings: getQuotesSettings(), timestamp: Date.now() });
});

app.put('/api/quotes/settings', async (req, res) => {
  const { symbols, refreshIntervalMinutes, apiKey } = req.body as { symbols?: string[]; refreshIntervalMinutes?: number; apiKey?: string };
  try {
    await updateQuoteSettings({ symbols, refreshIntervalMinutes, apiKey }, io);
    res.json({ settings: getQuotesSettings(), status: 'ok' });
  } catch (error) {
    console.error('Failed to update quote settings', error);
    res.status(400).json({ error: 'Failed to update quote settings' });
  }
});

// Layout preset endpoints
app.get('/api/layouts', (req, res) => {
  const screenKey = typeof req.query.screenKey === 'string' ? req.query.screenKey : undefined;
  const presets = listLayoutPresets(screenKey);
  res.json({ presets, timestamp: Date.now() });
});

app.post('/api/layouts', (req, res) => {
  const { name, screenKey, layoutJson, isDefault } = req.body as {
    name?: string;
    screenKey?: string;
    layoutJson?: string;
    isDefault?: boolean;
  };

  if (!name || !screenKey || !layoutJson) {
    res.status(400).json({ error: 'name, screenKey and layoutJson are required' });
    return;
  }

  try {
    const preset = createLayoutPreset({ name, screenKey, layoutJson, isDefault });
    res.status(201).json({ preset });
  } catch (error) {
    console.error('Failed to create layout preset', error);
    res.status(500).json({ error: 'Failed to create layout preset' });
  }
});

app.put('/api/layouts/:id', (req, res) => {
  const id = req.params.id;
  const updates = req.body as { name?: string; layoutJson?: string; isDefault?: boolean };
  const preset = updateLayoutPreset(id, updates);
  if (!preset) {
    res.status(404).json({ error: 'Preset not found' });
    return;
  }
  res.json({ preset });
});

app.post('/api/layouts/:id/set-default', (req, res) => {
  const id = req.params.id;
  const preset = setDefaultLayoutPreset(id);
  if (!preset) {
    res.status(404).json({ error: 'Preset not found' });
    return;
  }
  res.json({ preset });
});

app.delete('/api/layouts/:id', (req, res) => {
  const id = req.params.id;
  const existing = getLayoutPreset(id);
  if (!existing) {
    res.status(404).json({ error: 'Preset not found' });
    return;
  }
  const deleted = deleteLayoutPreset(id);
  res.json({ status: deleted ? 'ok' : 'noop' });
});

// Theme settings endpoints
app.get('/api/settings/theme', (_req, res) => {
  res.json({ settings: getThemeSettings(), timestamp: Date.now() });
});

app.put('/api/settings/theme', (req, res) => {
  try {
    const settings = saveThemeSettings(req.body || {});
    res.json({ settings, status: 'ok' });
  } catch (error) {
    console.error('Failed to update theme settings', error);
    res.status(400).json({ error: 'Failed to update theme settings' });
  }
});

// Tasks endpoints
app.get('/api/tasks', (_req, res) => {
  res.json({ tasks: listTasks(), timestamp: Date.now() });
});

app.post('/api/tasks', (req, res) => {
  const { title, note } = req.body as { title?: string; note?: string };
  if (!title || title.trim().length === 0) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }
  const task = createTask(title.trim(), note);
  res.status(201).json({ task });
});

app.put('/api/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const updates = req.body as { title?: string; completed?: boolean; note?: string };
  const task = updateTask(id, updates);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json({ task });
});

app.delete('/api/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const deleted = deleteTask(id);
  if (!deleted) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json({ status: 'ok' });
});

// Notes endpoints
app.get('/api/notes', (_req, res) => {
  res.json({ notes: listNotes(), timestamp: Date.now() });
});

app.post('/api/notes', (req, res) => {
  const { content } = req.body as { content?: string };
  if (!content || content.trim().length === 0) {
    res.status(400).json({ error: 'Content required' });
    return;
  }
  const note = createNote(content.trim());
  res.status(201).json({ note });
});

app.put('/api/notes/:id', (req, res) => {
  const id = Number(req.params.id);
  const { content } = req.body as { content?: string };
  if (!content) {
    res.status(400).json({ error: 'Content required' });
    return;
  }
  const note = updateNote(id, content.trim());
  if (!note) {
    res.status(404).json({ error: 'Note not found' });
    return;
  }
  res.json({ note });
});

app.delete('/api/notes/:id', (req, res) => {
  const id = Number(req.params.id);
  const deleted = deleteNote(id);
  if (!deleted) {
    res.status(404).json({ error: 'Note not found' });
    return;
  }
  res.json({ status: 'ok' });
});

// Upcoming endpoints
app.get('/api/upcoming', (_req, res) => {
  res.json({ items: listUpcoming(), timestamp: Date.now() });
});

app.post('/api/upcoming', (req, res) => {
  const { title, date, category, url, notes } = req.body as {
    title?: string;
    date?: string;
    category?: string;
    url?: string;
    notes?: string;
  };
  if (!title || !date) {
    res.status(400).json({ error: 'Title and date are required' });
    return;
  }
  const item = createUpcoming(title.trim(), date, category || 'personal', url, notes);
  res.status(201).json({ item });
});

app.put('/api/upcoming/:id', (req, res) => {
  const id = Number(req.params.id);
  const updates = req.body as { title?: string; date?: string; category?: string; url?: string; notes?: string };
  const item = updateUpcoming(id, updates);
  if (!item) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  res.json({ item });
});

app.delete('/api/upcoming/:id', (req, res) => {
  const id = Number(req.params.id);
  const deleted = deleteUpcoming(id);
  if (!deleted) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  res.json({ status: 'ok' });
});

// Weather endpoint
app.get('/api/weather', async (req, res) => {
  try {
    const lat = typeof req.query.lat === 'string' ? Number(req.query.lat) : undefined;
    const lon = typeof req.query.lon === 'string' ? Number(req.query.lon) : undefined;
    const unitsParam = typeof req.query.units === 'string' ? req.query.units : undefined;
    const units = unitsParam === 'imperial' ? 'imperial' : unitsParam === 'metric' ? 'metric' : undefined;

    const weather = await getWeather({ latitude: lat, longitude: lon, units });
    res.json({ weather, timestamp: Date.now() });
  } catch (error) {
    console.error('Error fetching weather:', error);
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
});

// News endpoints
app.get('/api/news', async (_req, res) => {
  try {
    const feeds = await getAllFeeds();
    res.json({ feeds, timestamp: Date.now() });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

app.get('/api/news/feeds', (_req, res) => {
  res.json({ feeds: getFeedList() });
});

app.put('/api/news/feeds', (req, res) => {
  const feeds = req.body as NewsFeedConfig[];
  if (!Array.isArray(feeds)) {
    res.status(400).json({ error: 'Invalid feeds payload' });
    return;
  }

  const hasInvalid = feeds.some((f) => !f || !f.id || !f.name || !f.url);
  if (hasInvalid) {
    res.status(400).json({ error: 'Each feed requires id, name, and url' });
    return;
  }

  saveNewsFeeds(feeds);
  res.json({ status: 'ok', feeds: getFeedList(), timestamp: Date.now() });
});

app.post('/api/news/feeds/test', async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url) {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  try {
    const result = await testFeedUrl(url);
    res.json({ ok: true, result });
  } catch (error) {
    console.error('Feed test failed', error);
    const message = error instanceof Error ? error.message : 'Failed to parse feed';
    res.status(400).json({ error: message });
  }
});

app.get('/api/news/:feedId', async (req, res) => {
  try {
    const feed = await getFeed(req.params.feedId);
    if (!feed) {
      res.status(404).json({ error: 'Feed not found' });
      return;
    }
    res.json({ feed, timestamp: Date.now() });
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// Calendar endpoint
app.get('/api/calendar', async (req, res) => {
  try {
    const days = Number(req.query.days ?? 3);
    const events = await getCalendarEvents(Number.isFinite(days) ? days : 3);
    res.json({ events, timestamp: Date.now() });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

// MPRIS endpoints
app.get('/api/mpris/status', async (_req, res) => {
  try {
    const status = await getMprisStatus();
    res.json({ status, timestamp: Date.now() });
  } catch (error) {
    console.error('Error fetching MPRIS status:', error);
    res.status(500).json({ error: 'Failed to fetch player status' });
  }
});

app.post('/api/mpris/play-pause', async (_req, res) => {
  const success = await mprisPlayPause();
  res.json({ success });
});

app.post('/api/mpris/next', async (_req, res) => {
  const success = await mprisNext();
  res.json({ success });
});

app.post('/api/mpris/previous', async (_req, res) => {
  const success = await mprisPrevious();
  res.json({ success });
});

app.post('/api/mpris/volume', async (req, res) => {
  const { volume } = req.body as { volume?: number };
  if (typeof volume !== 'number') {
    res.status(400).json({ error: 'Volume required' });
    return;
  }
  const success = await mprisSetVolume(volume);
  res.json({ success });
});

// Track subscribed clients
const subscribedClients = new Set<string>();
const mprisClients = new Set<string>();
let metricsInterval: NodeJS.Timeout | null = null;
let mprisInterval: NodeJS.Timeout | null = null;

// Broadcast metrics to all subscribed clients
async function broadcastMetrics() {
  if (subscribedClients.size === 0) return;

  try {
    const metrics = await getSystemMetrics();
    const history = getMetricsHistory();
    io.to('metrics').emit('metrics:update', { ...metrics, history });
  } catch (error) {
    console.error('Error collecting metrics:', error);
  }
}

// Start metrics broadcasting
function startMetricsBroadcast() {
  if (metricsInterval) return;

  console.log('Starting metrics broadcast (2s interval)');
  metricsInterval = setInterval(broadcastMetrics, 2000);

  // Send initial metrics immediately
  broadcastMetrics();
}

// Stop metrics broadcasting if no clients
function stopMetricsBroadcast() {
  if (subscribedClients.size > 0) return;

  if (metricsInterval) {
    console.log('Stopping metrics broadcast (no clients)');
    clearInterval(metricsInterval);
    metricsInterval = null;
  }
}

// Broadcast MPRIS status to subscribed clients
async function broadcastMprisStatus() {
  if (mprisClients.size === 0) return;

  try {
    const status = await getMprisStatus();
    io.to('mpris').emit('mpris:update', status);
  } catch (error) {
    console.error('Error broadcasting MPRIS status:', error);
  }
}

// Start MPRIS broadcasting
function startMprisBroadcast() {
  if (mprisInterval) return;

  console.log('Starting MPRIS broadcast (1s interval)');
  mprisInterval = setInterval(broadcastMprisStatus, 1000);

  // Send initial status immediately
  broadcastMprisStatus();
}

// Stop MPRIS broadcasting if no clients
function stopMprisBroadcast() {
  if (mprisClients.size > 0) return;

  if (mprisInterval) {
    console.log('Stopping MPRIS broadcast (no clients)');
    clearInterval(mprisInterval);
    mprisInterval = null;
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('metrics:subscribe', () => {
    console.log(`Client ${socket.id} subscribed to metrics`);
    socket.join('metrics');
    subscribedClients.add(socket.id);
    startMetricsBroadcast();
  });

  socket.on('metrics:unsubscribe', () => {
    console.log(`Client ${socket.id} unsubscribed from metrics`);
    socket.leave('metrics');
    subscribedClients.delete(socket.id);
    stopMetricsBroadcast();
  });

  // MPRIS subscription
  socket.on('mpris:subscribe', () => {
    console.log(`Client ${socket.id} subscribed to MPRIS`);
    socket.join('mpris');
    mprisClients.add(socket.id);
    startMprisBroadcast();
  });

  socket.on('mpris:unsubscribe', () => {
    console.log(`Client ${socket.id} unsubscribed from MPRIS`);
    socket.leave('mpris');
    mprisClients.delete(socket.id);
    stopMprisBroadcast();
  });

  // Quotes: send current cache immediately
  socket.emit('quotes:update', getCachedQuotes());
  socket.on('quotes:subscribe', () => {
    socket.emit('quotes:update', getCachedQuotes());
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    subscribedClients.delete(socket.id);
    mprisClients.delete(socket.id);
    stopMetricsBroadcast();
    stopMprisBroadcast();
  });
});

// Production: Serve frontend static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendDistCandidates = [
  join(__dirname, '../../frontend/dist'),
  join(process.cwd(), '../frontend/dist'),
];
const frontendDist = frontendDistCandidates.find((candidate) => existsSync(candidate));

if (frontendDist) {
  console.log('Production mode: Serving frontend from', frontendDist);
  app.use(express.static(frontendDist));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/socket.io/')) {
      res.sendFile(join(frontendDist, 'index.html'));
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });
}

// Start server
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  if (frontendDist && existsSync(frontendDist)) {
    console.log(`Frontend available at http://localhost:${PORT}`);
  }
  console.log('Waiting for clients to connect...');
});
