import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface MprisStatus {
  available: boolean;
  playing: boolean;
  player: string | null;
  title: string | null;
  artist: string | null;
  album: string | null;
  artUrl: string | null;
  position: number;
  length: number;
  volume: number;
}

// Check if playerctl is available
async function isPlayerctlAvailable(): Promise<boolean> {
  try {
    await execAsync('which playerctl');
    return true;
  } catch {
    return false;
  }
}

// Get all metadata at once to avoid race conditions during track changes
async function getAllMetadata(player: string): Promise<Map<string, string>> {
  const metadataMap = new Map<string, string>();
  try {
    const { stdout } = await execAsync(`playerctl -p ${player} metadata 2>/dev/null`);
    const lines = stdout.trim().split('\n');

    for (const line of lines) {
      // Format: "playerName key value"
      // The value can contain spaces, so we need to parse carefully
      const match = line.match(/^\S+\s+(\S+)\s+(.+)$/);
      if (match) {
        const key = match[1];
        const value = match[2];
        metadataMap.set(key, value);
      }
    }
  } catch {
    // Return empty map on error
  }
  return metadataMap;
}

// Get metadata value (legacy for compatibility)
async function getMetadata(player: string, key: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`playerctl -p ${player} metadata ${key} 2>/dev/null`);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

// Get player status
async function getPlayerStatus(player: string): Promise<'Playing' | 'Paused' | 'Stopped' | null> {
  try {
    const { stdout } = await execAsync(`playerctl -p ${player} status 2>/dev/null`);
    const status = stdout.trim();
    if (status === 'Playing' || status === 'Paused' || status === 'Stopped') {
      return status;
    }
    return null;
  } catch {
    return null;
  }
}

// Get current player name
async function getPlayerName(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('playerctl -l 2>/dev/null');
    const players = stdout.trim().split('\n');
    const spotify = players.find(p => p.toLowerCase().includes('spotify'));
    if (spotify) {
      return spotify;
    }
    return players[0] || null;
  } catch {
    return null;
  }
}

// Get position in microseconds
async function getPosition(player: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`playerctl -p ${player} position 2>/dev/null`);
    return Math.floor(parseFloat(stdout.trim()) || 0);
  } catch {
    return 0;
  }
}

// Get track length in microseconds
async function getLength(player: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`playerctl -p ${player} metadata mpris:length 2>/dev/null`);
    return Math.floor(parseInt(stdout.trim(), 10) / 1000000) || 0;
  } catch {
    return 0;
  }
}

// Get volume (0-1)
async function getVolume(player: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`playerctl -p ${player} volume 2>/dev/null`);
    return parseFloat(stdout.trim()) || 1;
  } catch {
    return 1;
  }
}

// Get full MPRIS status
export async function getMprisStatus(): Promise<MprisStatus> {
  const available = await isPlayerctlAvailable();

  if (!available) {
    return {
      available: false,
      playing: false,
      player: null,
      title: null,
      artist: null,
      album: null,
      artUrl: null,
      position: 0,
      length: 0,
      volume: 1,
    };
  }

  const player = await getPlayerName();
  if (!player) {
    return {
      available: true,
      playing: false,
      player: null,
      title: null,
      artist: null,
      album: null,
      artUrl: null,
      position: 0,
      length: 0,
      volume: 1,
    };
  }

  const status = await getPlayerStatus(player);

  if (!status || status === 'Stopped') {
    return {
      available: true,
      playing: false,
      player: player,
      title: null,
      artist: null,
      album: null,
      artUrl: null,
      position: 0,
      length: 0,
      volume: 1,
    };
  }

  // Get all metadata atomically to avoid race conditions during track changes
  const metadata = await getAllMetadata(player);
  const title = metadata.get('xesam:title') || null;
  const artist = metadata.get('xesam:artist') || null;
  const album = metadata.get('xesam:album') || null;
  const artUrl = metadata.get('mpris:artUrl') || null;

  // Get position, length, and volume separately (these change independently)
  const position = await getPosition(player);
  const lengthMicros = metadata.get('mpris:length');
  const length = lengthMicros ? Math.floor(parseInt(lengthMicros, 10) / 1000000) : await getLength(player);
  const volume = await getVolume(player);
  const playing = status === 'Playing';

  console.log(`[MPRIS] Selected player: ${player}`);
  console.log(`[MPRIS] Status: playing=${playing}, title=${title}, artist=${artist}, album=${album}, artUrl=${artUrl}, position=${position}, length=${length}, volume=${volume}`);

  return {
    available: true,
    playing,
    player,
    title,
    artist,
    album,
    artUrl,
    position,
    length,
    volume,
  };
}

// Control functions
export async function mprisPlayPause(): Promise<boolean> {
  const player = await getPlayerName();
  if (!player) return false;
  try {
    await execAsync(`playerctl -p ${player} play-pause`);
    return true;
  } catch {
    return false;
  }
}

export async function mprisNext(): Promise<boolean> {
  const player = await getPlayerName();
  if (!player) return false;
  try {
    await execAsync(`playerctl -p ${player} next`);
    return true;
  } catch {
    return false;
  }
}

export async function mprisPrevious(): Promise<boolean> {
  const player = await getPlayerName();
  if (!player) return false;
  try {
    await execAsync(`playerctl -p ${player} previous`);
    return true;
  } catch {
    return false;
  }
}

export async function mprisSetVolume(volume: number): Promise<boolean> {
  const player = await getPlayerName();
  if (!player) return false;
  try {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    await execAsync(`playerctl -p ${player} volume ${clampedVolume}`);
    return true;
  } catch {
    return false;
  }
}

export async function mprisSeek(position: number): Promise<boolean> {
  const player = await getPlayerName();
  if (!player) return false;
  try {
    await execAsync(`playerctl -p ${player} position ${position}`);
    return true;
  } catch {
    return false;
  }
}
