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

// Get metadata value
async function getMetadata(key: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`playerctl metadata ${key} 2>/dev/null`);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

// Get player status
async function getPlayerStatus(): Promise<'Playing' | 'Paused' | 'Stopped' | null> {
  try {
    const { stdout } = await execAsync('playerctl status 2>/dev/null');
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
    const { stdout } = await execAsync('playerctl -l 2>/dev/null | head -1');
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

// Get position in microseconds
async function getPosition(): Promise<number> {
  try {
    const { stdout } = await execAsync('playerctl position 2>/dev/null');
    return Math.floor(parseFloat(stdout.trim()) || 0);
  } catch {
    return 0;
  }
}

// Get track length in microseconds
async function getLength(): Promise<number> {
  try {
    const { stdout } = await execAsync('playerctl metadata mpris:length 2>/dev/null');
    return Math.floor(parseInt(stdout.trim(), 10) / 1000000) || 0;
  } catch {
    return 0;
  }
}

// Get volume (0-1)
async function getVolume(): Promise<number> {
  try {
    const { stdout } = await execAsync('playerctl volume 2>/dev/null');
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

  const status = await getPlayerStatus();

  if (!status || status === 'Stopped') {
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

  const [player, title, artist, album, artUrl, position, length, volume] = await Promise.all([
    getPlayerName(),
    getMetadata('xesam:title'),
    getMetadata('xesam:artist'),
    getMetadata('xesam:album'),
    getMetadata('mpris:artUrl'),
    getPosition(),
    getLength(),
    getVolume(),
  ]);

  return {
    available: true,
    playing: status === 'Playing',
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
  try {
    await execAsync('playerctl play-pause');
    return true;
  } catch {
    return false;
  }
}

export async function mprisNext(): Promise<boolean> {
  try {
    await execAsync('playerctl next');
    return true;
  } catch {
    return false;
  }
}

export async function mprisPrevious(): Promise<boolean> {
  try {
    await execAsync('playerctl previous');
    return true;
  } catch {
    return false;
  }
}

export async function mprisSetVolume(volume: number): Promise<boolean> {
  try {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    await execAsync(`playerctl volume ${clampedVolume}`);
    return true;
  } catch {
    return false;
  }
}

export async function mprisSeek(position: number): Promise<boolean> {
  try {
    await execAsync(`playerctl position ${position}`);
    return true;
  } catch {
    return false;
  }
}
