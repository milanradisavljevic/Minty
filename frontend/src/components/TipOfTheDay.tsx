import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import type { Language } from '../stores/settingsStore';

interface Quote {
  text: string;
  author: string;
}

interface LinuxTip {
  command: string;
  description: string;
}

interface KeyboardShortcut {
  keys: string;
  description: string;
}

type TipCategory = 'quote' | 'history' | 'linux' | 'shortcut';

interface Tip {
  type: TipCategory;
  content: Quote | string | LinuxTip | KeyboardShortcut;
}

// Localized category labels
const categoryLabels: Record<Language, Record<TipCategory, string>> = {
  de: {
    quote: 'Zitat',
    history: 'Tech-Geschichte',
    linux: 'Linux-Tipp',
    shortcut: 'Tastenkombination',
  },
  en: {
    quote: 'Quote',
    history: 'Tech History',
    linux: 'Linux Tip',
    shortcut: 'Keyboard Shortcut',
  },
  es: {
    quote: 'Cita',
    history: 'Historia Tech',
    linux: 'Consejo Linux',
    shortcut: 'Atajo de Teclado',
  },
  sr: {
    quote: 'Citat',
    history: 'Tech Istorija',
    linux: 'Linux Savet',
    shortcut: 'Prečica na Tastaturi',
  },
};

// Helper function to get day of year (0-365)
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

// Inspirational quotes
const quotes: Quote[] = [
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "What we do every day matters more than what we do once in a while.", author: "Gretchen Rubin" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
];

// Tech history events (MM-DD format) - localized
const techHistoryData: Record<Language, Record<string, string>> = {
  de: {
    "01-01": "1983: Das ARPANET stellt auf TCP/IP um - das Internet ist geboren",
    "01-02": "2004: NASA's Spirit Rover landet auf dem Mars",
    "01-03": "1977: Apple Computer wird offiziell als Firma eingetragen",
    "01-09": "2007: Steve Jobs stellt das erste iPhone vor",
    "01-24": "1984: Der erste Apple Macintosh wird vorgestellt",
    "02-04": "2004: Mark Zuckerberg gründet Facebook",
    "02-14": "2005: YouTube wird gegründet",
    "03-12": "1989: Tim Berners-Lee stellt das World Wide Web vor",
    "04-01": "1976: Apple Computer wird von Steve Jobs und Steve Wozniak gegründet",
    "04-03": "1973: Das erste Handy-Telefonat wird geführt (Motorola DynaTAC)",
    "04-04": "1975: Microsoft wird von Bill Gates und Paul Allen gegründet",
    "05-01": "1981: Der erste Laptop Osborne 1 kommt auf den Markt",
    "06-29": "2007: Das erste iPhone kommt in den USA auf den Markt",
    "07-01": "1994: Amazon.com wird gegründet",
    "07-10": "1856: Nikola Tesla wird in Smiljan (heute Kroatien) geboren",
    "08-06": "1991: Das World Wide Web wird öffentlich zugänglich",
    "08-12": "1981: IBM stellt den ersten Personal Computer vor",
    "09-04": "1998: Google wird gegründet",
    "09-15": "1958: ARPA (später DARPA) wird gegründet - Vorläufer des Internets",
    "10-05": "2011: Steve Jobs stirbt im Alter von 56 Jahren",
    "10-29": "1969: Die erste ARPANET-Nachricht wird verschickt",
    "11-10": "1983: Windows 1.0 wird angekündigt",
    "12-09": "1968: Douglas Engelbart demonstriert die erste Computer-Maus",
  },
  en: {
    "01-01": "1983: ARPANET switches to TCP/IP - the Internet is born",
    "01-02": "2004: NASA's Spirit Rover lands on Mars",
    "01-03": "1977: Apple Computer is officially incorporated",
    "01-09": "2007: Steve Jobs unveils the first iPhone",
    "01-24": "1984: The first Apple Macintosh is introduced",
    "02-04": "2004: Mark Zuckerberg founds Facebook",
    "02-14": "2005: YouTube is founded",
    "03-12": "1989: Tim Berners-Lee proposes the World Wide Web",
    "04-01": "1976: Apple Computer is founded by Steve Jobs and Steve Wozniak",
    "04-03": "1973: The first mobile phone call is made (Motorola DynaTAC)",
    "04-04": "1975: Microsoft is founded by Bill Gates and Paul Allen",
    "05-01": "1981: The first laptop Osborne 1 hits the market",
    "06-29": "2007: The first iPhone goes on sale in the USA",
    "07-01": "1994: Amazon.com is founded",
    "07-10": "1856: Nikola Tesla is born in Smiljan (today's Croatia)",
    "08-06": "1991: The World Wide Web becomes publicly available",
    "08-12": "1981: IBM introduces the first Personal Computer",
    "09-04": "1998: Google is founded",
    "09-15": "1958: ARPA (later DARPA) is founded - precursor of the Internet",
    "10-05": "2011: Steve Jobs passes away at age 56",
    "10-29": "1969: The first ARPANET message is sent",
    "11-10": "1983: Windows 1.0 is announced",
    "12-09": "1968: Douglas Engelbart demonstrates the first computer mouse",
  },
  es: {
    "01-01": "1983: ARPANET migra a TCP/IP - nace Internet",
    "01-02": "2004: El rover Spirit de la NASA aterriza en Marte",
    "01-03": "1977: Apple Computer se constituye oficialmente",
    "01-09": "2007: Steve Jobs presenta el primer iPhone",
    "01-24": "1984: Se presenta el primer Apple Macintosh",
    "02-04": "2004: Mark Zuckerberg funda Facebook",
    "02-14": "2005: Se funda YouTube",
    "03-12": "1989: Tim Berners-Lee propone la World Wide Web",
    "04-01": "1976: Apple Computer es fundada por Steve Jobs y Steve Wozniak",
    "04-03": "1973: Se realiza la primera llamada móvil (Motorola DynaTAC)",
    "04-04": "1975: Microsoft es fundada por Bill Gates y Paul Allen",
    "05-01": "1981: Sale al mercado el primer laptop Osborne 1",
    "06-29": "2007: El primer iPhone sale a la venta en EE.UU.",
    "07-01": "1994: Se funda Amazon.com",
    "07-10": "1856: Nikola Tesla nace en Smiljan (actual Croacia)",
    "08-06": "1991: La World Wide Web se hace pública",
    "08-12": "1981: IBM presenta el primer Personal Computer",
    "09-04": "1998: Se funda Google",
    "09-15": "1958: Se funda ARPA (luego DARPA) - precursor de Internet",
    "10-05": "2011: Steve Jobs fallece a los 56 años",
    "10-29": "1969: Se envía el primer mensaje de ARPANET",
    "11-10": "1983: Se anuncia Windows 1.0",
    "12-09": "1968: Douglas Engelbart demuestra el primer ratón de computadora",
  },
  sr: {
    "01-01": "1983: ARPANET prelazi na TCP/IP - Internet je rođen",
    "01-02": "2004: NASA-in rover Spirit sleće na Mars",
    "01-03": "1977: Apple Computer se zvanično registruje kao firma",
    "01-09": "2007: Steve Jobs predstavlja prvi iPhone",
    "01-24": "1984: Predstavljen prvi Apple Macintosh",
    "02-04": "2004: Mark Zuckerberg osniva Facebook",
    "02-14": "2005: Osnovan YouTube",
    "03-12": "1989: Tim Berners-Lee predlaže World Wide Web",
    "04-01": "1976: Apple Computer osnivaju Steve Jobs i Steve Wozniak",
    "04-03": "1973: Obavljen prvi mobilni telefonski poziv (Motorola DynaTAC)",
    "04-04": "1975: Microsoft osnivaju Bill Gates i Paul Allen",
    "05-01": "1981: Prvi laptop Osborne 1 izlazi na tržište",
    "06-29": "2007: Prvi iPhone počinje sa prodajom u SAD",
    "07-01": "1994: Osnovan Amazon.com",
    "07-10": "1856: Nikola Tesla rođen u Smiljanu (danas Hrvatska) - pionir naizmenične struje",
    "08-06": "1991: World Wide Web postaje javno dostupan",
    "08-12": "1981: IBM predstavlja prvi Personal Computer",
    "09-04": "1998: Osnovan Google",
    "09-15": "1958: Osnovana ARPA (kasnije DARPA) - preteča Interneta",
    "10-05": "2011: Steve Jobs umire u 56. godini",
    "10-29": "1969: Poslata prva ARPANET poruka",
    "11-10": "1983: Najavljen Windows 1.0",
    "12-09": "1968: Douglas Engelbart demonstrira prvi kompjuterski miš",
  },
};

// Helper to get tech history for current language (fallback to English)
function getTechHistory(lang: Language): Record<string, string> {
  return techHistoryData[lang] || techHistoryData.en;
}

// Linux tips - localized descriptions
const linuxTipsData: Record<Language, LinuxTip[]> = {
  de: [
    { command: "Ctrl+Alt+T", description: "Terminal öffnen" },
    { command: "sudo apt update", description: "Paketlisten aktualisieren" },
    { command: "sudo apt upgrade", description: "Installierte Pakete aktualisieren" },
    { command: "htop", description: "Interaktiver Prozess-Manager" },
    { command: "ls -la", description: "Alle Dateien inkl. versteckte anzeigen" },
    { command: "cd ~", description: "Ins Home-Verzeichnis wechseln" },
    { command: "pwd", description: "Aktuelles Verzeichnis anzeigen" },
    { command: "Ctrl+R", description: "Befehlshistorie durchsuchen" },
    { command: "man <befehl>", description: "Handbuch für jeden Befehl" },
    { command: "df -h", description: "Festplattenbelegung anzeigen" },
    { command: "chmod +x script.sh", description: "Script ausführbar machen" },
    { command: "grep -r 'text' .", description: "Text in Dateien suchen" },
    { command: "tail -f log.txt", description: "Log-Datei live verfolgen" },
  ],
  en: [
    { command: "Ctrl+Alt+T", description: "Open terminal" },
    { command: "sudo apt update", description: "Update package lists" },
    { command: "sudo apt upgrade", description: "Upgrade installed packages" },
    { command: "htop", description: "Interactive process manager" },
    { command: "ls -la", description: "List all files including hidden" },
    { command: "cd ~", description: "Go to home directory" },
    { command: "pwd", description: "Show current directory" },
    { command: "Ctrl+R", description: "Search command history" },
    { command: "man <command>", description: "Manual for any command" },
    { command: "df -h", description: "Show disk usage" },
    { command: "chmod +x script.sh", description: "Make script executable" },
    { command: "grep -r 'text' .", description: "Search text in files" },
    { command: "tail -f log.txt", description: "Follow log file live" },
  ],
  es: [
    { command: "Ctrl+Alt+T", description: "Abrir terminal" },
    { command: "sudo apt update", description: "Actualizar listas de paquetes" },
    { command: "sudo apt upgrade", description: "Actualizar paquetes instalados" },
    { command: "htop", description: "Gestor de procesos interactivo" },
    { command: "ls -la", description: "Listar todos los archivos incluidos ocultos" },
    { command: "cd ~", description: "Ir al directorio home" },
    { command: "pwd", description: "Mostrar directorio actual" },
    { command: "Ctrl+R", description: "Buscar en historial de comandos" },
    { command: "man <comando>", description: "Manual de cualquier comando" },
    { command: "df -h", description: "Mostrar uso del disco" },
    { command: "chmod +x script.sh", description: "Hacer script ejecutable" },
    { command: "grep -r 'texto' .", description: "Buscar texto en archivos" },
    { command: "tail -f log.txt", description: "Seguir archivo de log en vivo" },
  ],
  sr: [
    { command: "Ctrl+Alt+T", description: "Otvori terminal" },
    { command: "sudo apt update", description: "Ažuriraj liste paketa" },
    { command: "sudo apt upgrade", description: "Nadogradi instalirane pakete" },
    { command: "htop", description: "Interaktivni menadžer procesa" },
    { command: "ls -la", description: "Prikaži sve fajlove uključujući skrivene" },
    { command: "cd ~", description: "Idi u home direktorijum" },
    { command: "pwd", description: "Prikaži trenutni direktorijum" },
    { command: "Ctrl+R", description: "Pretraži istoriju komandi" },
    { command: "man <komanda>", description: "Priručnik za bilo koju komandu" },
    { command: "df -h", description: "Prikaži korišćenje diska" },
    { command: "chmod +x script.sh", description: "Učini skriptu izvršnom" },
    { command: "grep -r 'tekst' .", description: "Pretraži tekst u fajlovima" },
    { command: "tail -f log.txt", description: "Prati log fajl uživo" },
  ],
};

// Cinnamon keyboard shortcuts - localized
const shortcutsData: Record<Language, KeyboardShortcut[]> = {
  de: [
    { keys: "Super", description: "Menü öffnen" },
    { keys: "Super + D", description: "Desktop anzeigen" },
    { keys: "Super + L", description: "Bildschirm sperren" },
    { keys: "Alt + Tab", description: "Fenster wechseln" },
    { keys: "Ctrl + Alt + T", description: "Terminal öffnen" },
    { keys: "Super + ←/→", description: "Fenster links/rechts andocken" },
    { keys: "Super + ↑", description: "Fenster maximieren" },
    { keys: "Alt + F4", description: "Fenster schließen" },
    { keys: "Print", description: "Screenshot machen" },
    { keys: "Ctrl + H", description: "Versteckte Dateien ein/ausblenden" },
  ],
  en: [
    { keys: "Super", description: "Open menu" },
    { keys: "Super + D", description: "Show desktop" },
    { keys: "Super + L", description: "Lock screen" },
    { keys: "Alt + Tab", description: "Switch windows" },
    { keys: "Ctrl + Alt + T", description: "Open terminal" },
    { keys: "Super + ←/→", description: "Snap window left/right" },
    { keys: "Super + ↑", description: "Maximize window" },
    { keys: "Alt + F4", description: "Close window" },
    { keys: "Print", description: "Take screenshot" },
    { keys: "Ctrl + H", description: "Toggle hidden files" },
  ],
  es: [
    { keys: "Super", description: "Abrir menú" },
    { keys: "Super + D", description: "Mostrar escritorio" },
    { keys: "Super + L", description: "Bloquear pantalla" },
    { keys: "Alt + Tab", description: "Cambiar ventanas" },
    { keys: "Ctrl + Alt + T", description: "Abrir terminal" },
    { keys: "Super + ←/→", description: "Ajustar ventana izq/der" },
    { keys: "Super + ↑", description: "Maximizar ventana" },
    { keys: "Alt + F4", description: "Cerrar ventana" },
    { keys: "Print", description: "Tomar captura" },
    { keys: "Ctrl + H", description: "Mostrar/ocultar archivos ocultos" },
  ],
  sr: [
    { keys: "Super", description: "Otvori meni" },
    { keys: "Super + D", description: "Prikaži radnu površinu" },
    { keys: "Super + L", description: "Zaključaj ekran" },
    { keys: "Alt + Tab", description: "Promeni prozor" },
    { keys: "Ctrl + Alt + T", description: "Otvori terminal" },
    { keys: "Super + ←/→", description: "Zakači prozor levo/desno" },
    { keys: "Super + ↑", description: "Maksimiziraj prozor" },
    { keys: "Alt + F4", description: "Zatvori prozor" },
    { keys: "Print", description: "Napravi snimak ekrana" },
    { keys: "Ctrl + H", description: "Prikaži/sakrij skrivene fajlove" },
  ],
};

// Helper to get tips for current language
function getLinuxTips(lang: Language): LinuxTip[] {
  return linuxTipsData[lang] || linuxTipsData.en;
}

function getShortcuts(lang: Language): KeyboardShortcut[] {
  return shortcutsData[lang] || shortcutsData.en;
}

export function TipOfTheDay() {
  const { language } = useTranslation();
  const [tip, setTip] = useState<Tip | null>(null);
  const lang = language as Language;

  // Get localized data for current language
  const techHistory = getTechHistory(lang);
  const linuxTips = getLinuxTips(lang);
  const shortcuts = getShortcuts(lang);

  const getTipOfTheDay = useCallback((): Tip => {
    const today = new Date();
    const dayOfYear = getDayOfYear(today);

    // Rotate category based on day of year
    const category: TipCategory = ['quote', 'history', 'linux', 'shortcut'][dayOfYear % 4] as TipCategory;

    switch(category) {
      case 'quote':
        return { type: 'quote' as const, content: quotes[dayOfYear % quotes.length] };

      case 'history': {
        // Get today's tech history event
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const dateKey = `${month}-${day}`;
        const event = techHistory[dateKey];

        if (event) {
          return { type: 'history' as const, content: event };
        }
        // Fallback to a random tech event if today has none
        const events = Object.values(techHistory);
        return { type: 'history' as const, content: events[dayOfYear % events.length] };
      }

      case 'linux':
        return { type: 'linux' as const, content: linuxTips[dayOfYear % linuxTips.length] };

      case 'shortcut':
        return { type: 'shortcut' as const, content: shortcuts[dayOfYear % shortcuts.length] };
    }
  }, [techHistory, linuxTips, shortcuts]);

  const getNextTip = useCallback((): Tip => {
    // Get a random tip from a random category
    const categories: TipCategory[] = ['quote', 'linux', 'shortcut', 'history'];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];

    switch(randomCategory) {
      case 'quote':
        return { type: 'quote' as const, content: quotes[Math.floor(Math.random() * quotes.length)] };

      case 'history': {
        const events = Object.values(techHistory);
        return { type: 'history' as const, content: events[Math.floor(Math.random() * events.length)] };
      }

      case 'linux':
        return { type: 'linux' as const, content: linuxTips[Math.floor(Math.random() * linuxTips.length)] };

      case 'shortcut':
        return { type: 'shortcut' as const, content: shortcuts[Math.floor(Math.random() * shortcuts.length)] };
    }
  }, [linuxTips, shortcuts, techHistory]);

  // Re-fetch tip when language changes
  useEffect(() => {
    setTip(getTipOfTheDay());
  }, [getTipOfTheDay]);

  const handleRefresh = () => {
    setTip(getNextTip());
  };

  if (!tip) return null;

  const getIcon = () => {
    switch(tip.type) {
      case 'quote': return '💬';
      case 'history': return '📅';
      case 'linux': return '💡';
      case 'shortcut': return '⌨️';
      default: return '💡';
    }
  };

  const getLabel = () => {
    return categoryLabels[lang]?.[tip.type] || categoryLabels.en[tip.type];
  };

  const renderContent = () => {
    switch(tip.type) {
      case 'quote': {
        const quote = tip.content as Quote;
        return (
          <span className="text-sm">
            "{quote.text}" <span className="text-[var(--color-text-secondary)]">— {quote.author}</span>
          </span>
        );
      }

      case 'history':
        return <span className="text-sm">{tip.content as string}</span>;

      case 'linux': {
        const linuxTip = tip.content as LinuxTip;
        return (
          <span className="text-sm">
            <code className="px-2 py-0.5 rounded bg-[var(--color-widget-border)] text-[var(--color-accent)] font-mono text-xs">
              {linuxTip.command}
            </code>
            {' '}- {linuxTip.description}
          </span>
        );
      }

      case 'shortcut': {
        const shortcut = tip.content as KeyboardShortcut;
        return (
          <span className="text-sm">
            <kbd className="px-2 py-0.5 rounded bg-[var(--color-widget-border)] text-[var(--color-text-primary)] font-mono text-xs border border-[var(--color-widget-border)]">
              {shortcut.keys}
            </kbd>
            {' '}- {shortcut.description}
          </span>
        );
      }
    }
  };

  return (
    <div className="h-10 bg-[var(--color-widget-bg)] border-b border-[var(--color-widget-border)] flex items-center justify-center px-4 gap-3">
      <div className="flex items-center gap-2 flex-1 justify-center max-w-4xl">
        <span className="text-lg">{getIcon()}</span>
        <span className="text-xs font-medium text-[var(--color-accent)] uppercase tracking-wide">
          {getLabel()}:
        </span>
        <div className="text-[var(--color-text-primary)]">
          {renderContent()}
        </div>
      </div>

      <button
        onClick={handleRefresh}
        className="flex items-center justify-center w-7 h-7 rounded hover:bg-[var(--color-widget-border)] transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
        title={{ de: 'Neuer Tipp', en: 'New Tip', es: 'Nuevo consejo', sr: 'Novi savet' }[lang] || 'New Tip'}
        aria-label="Refresh tip"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 0 0-9-9" />
          <path d="M3 12a9 9 0 0 0 9 9" />
          <path d="M3 3v6h6" />
          <path d="M21 21v-6h-6" />
        </svg>
      </button>
    </div>
  );
}
