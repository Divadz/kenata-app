import { useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'kenata-install-dismissed';

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}
function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Popup flottante d'installation de la PWA.
 * - Chrome/Edge/Android : bouton « Installer » qui déclenche le prompt natif.
 * - iOS / Firefox (pas de prompt) : instructions pour installer via le menu.
 */
export function InstallPrompt() {
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<'prompt' | 'ios' | 'manual'>('prompt');

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      setMode('prompt');
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      localStorage.setItem(DISMISS_KEY, '1');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // Fallback (iOS, Firefox…) : pas d'événement d'install, on montre les
    // instructions — uniquement sur écran tactile où l'installation a du sens.
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const t = window.setTimeout(() => {
      if (!deferredRef.current && isTouch && !isStandalone()) {
        setMode(isIOS() ? 'ios' : 'manual');
        setVisible(true);
      }
    }, 3500);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.clearTimeout(t);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, '1');
  }

  async function install() {
    const d = deferredRef.current;
    if (!d) return;
    await d.prompt();
    await d.userChoice;
    dismiss();
  }

  if (!visible) return null;

  return (
    <div className="install-pop" role="dialog" aria-label="Installer l'application">
      <img className="install-pop-icon" src="/icons/icon-192.png" alt="" width={44} height={44} />
      <div className="install-pop-body">
        <strong>Installer l'appli Kenata</strong>
        {mode === 'prompt' && (
          <span className="muted small">Accès direct depuis l'écran d'accueil, même hors ligne.</span>
        )}
        {mode === 'ios' && (
          <span className="muted small">
            Touche <b>Partager</b> puis « Sur l'écran d'accueil ».
          </span>
        )}
        {mode === 'manual' && (
          <span className="muted small">Menu du navigateur → « Installer » / « Ajouter à l'écran d'accueil ».</span>
        )}
      </div>
      {mode === 'prompt' && (
        <button className="btn primary small" onClick={install}>
          Installer
        </button>
      )}
      <button className="btn small install-pop-x" aria-label="Fermer" onClick={dismiss}>
        ✕
      </button>
    </div>
  );
}
