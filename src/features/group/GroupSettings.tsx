import { useEffect, useState, type ReactNode } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { MembersManager } from '../members/MembersManager';
import { currentSubscription, disablePush, enablePush, isIOS, isStandalone, pushSupported } from '../../push';
import { reconcileOrder, SECTION_LABELS, type SectionKey } from '../concerts/sections';
import {
  createGearItem,
  deleteGearItem,
  updateGearItem,
  useGearItems,
} from '../gear/useGearItems';

/** Section de réglages repliable (fermée par défaut, ouvre au clic sur le titre). */
function Section({
  title,
  children,
  defaultOpen = false,
  ownerOnly = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  ownerOnly?: boolean;
}) {
  return (
    <details className="card settings-section full" open={defaultOpen}>
      <summary className="settings-summary">
        {title}
        {ownerOnly && (
          <span className="settings-star" title="Visible uniquement par le owner" aria-label="Réservé au owner">
            ⭐
          </span>
        )}
      </summary>
      <div className="settings-body form">{children}</div>
    </details>
  );
}

export function GroupSettings() {
  const { member } = useAuth();
  const isOwner = member?.role === 'owner';

  return (
    <section className="stack full">
      <h2>Réglages du groupe</h2>
      {isOwner && (
        <Section title="Membres" ownerOnly>
          <MembersManager />
        </Section>
      )}
      <Section title="Notifications">
        <NotificationsSettings />
      </Section>
      {isOwner && (
        <Section title="Test des notifications" ownerOnly>
          <NotifTest />
        </Section>
      )}
      <Section title="Matos">
        <GearInventory />
      </Section>
      <Section title="Ordre des sections du concert">
        <SectionOrderSettings />
      </Section>
      {isOwner && (
        <Section title="Maintenance" ownerOnly>
          <AppMaintenance />
        </Section>
      )}
      <Section title="Compte">
        <AccountSection />
      </Section>
    </section>
  );
}

/** Compte connecté + déconnexion. */
function AccountSection() {
  const { member, logout } = useAuth();
  return (
    <>
      <p className="muted small">
        Connecté en tant que <strong>{member?.profile?.name || member?.email}</strong>
        {member?.email && member?.profile?.name ? ` (${member.email})` : ''} · rôle {member?.role}.
      </p>
      <button className="btn" onClick={() => logout()}>
        Déconnexion
      </button>
    </>
  );
}

/** Activation des notifications push, par appareil. */
function NotificationsSettings() {
  const [sub, setSub] = useState<PushSubscription | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void currentSubscription().then(setSub);
  }, []);

  const supported = pushSupported();
  const iosNotInstalled = isIOS() && !isStandalone();

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      await enablePush();
      setMsg('Notifications activées sur cet appareil ✓');
    } catch (e) {
      const m = (e as Error).message;
      setMsg(
        m === 'permission_denied'
          ? 'Permission refusée. Autorise les notifications dans les réglages du navigateur.'
          : 'Échec de l’activation.'
      );
    } finally {
      setSub(await currentSubscription());
      setBusy(false);
    }
  }
  async function disable() {
    setBusy(true);
    setMsg(null);
    try {
      await disablePush();
      setMsg('Notifications désactivées sur cet appareil.');
    } catch {
      setMsg('Désactivation partielle (réseau) — réessaie si besoin.');
    } finally {
      setSub(await currentSubscription());
      setBusy(false);
    }
  }

  return (
    <>
      {!supported ? (
        <p className="muted small">
          {iosNotInstalled
            ? "Sur iPhone, installe d'abord l'app sur l'écran d'accueil (Safari → Partager → « Sur l'écran d'accueil ») pour pouvoir activer les notifications."
            : 'Ce navigateur ne supporte pas les notifications push.'}
        </p>
      ) : sub === undefined ? (
        <p className="muted small">Vérification…</p>
      ) : (
        <>
          <p className="muted small">
            {sub
              ? '🔔 Activées sur cet appareil.'
              : 'Reçois les rappels (relances Booking, infos manquantes) même app fermée.'}
          </p>
          <div className="row">
            <button className="btn primary small" onClick={enable} disabled={busy}>
              {sub ? '🔄 Réactiver' : '🔔 Activer les notifications'}
            </button>
            {sub && (
              <button className="btn small" onClick={disable} disabled={busy}>
                Désactiver
              </button>
            )}
          </div>
        </>
      )}
      {msg && (
        <p className="muted small" aria-live="polite">
          {msg}
        </p>
      )}
    </>
  );
}

interface MemberRow {
  uid: string;
  email: string;
  profile?: { name?: string | null };
}

/** Test des notifications par membre — owner uniquement. */
function NotifTest() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [results, setResults] = useState<Record<string, string>>({});

  useEffect(() => {
    void api<MemberRow[]>('/members').then(setMembers);
  }, []);

  async function test(uid: string) {
    setResults((r) => ({ ...r, [uid]: '…' }));
    try {
      const res = await api<{ sent: number; devices: number; errors: string[] }>('/push/test', {
        method: 'POST',
        body: { user_id: uid },
      });
      setResults((r) => ({
        ...r,
        [uid]:
          res.devices === 0
            ? 'aucun appareil abonné'
            : `envoyée à ${res.sent}/${res.devices}${res.errors.length ? ' · ' + res.errors.join(', ') : ''}`,
      }));
    } catch {
      setResults((r) => ({ ...r, [uid]: 'erreur' }));
    }
  }

  return (
    <>
      <p className="muted small">Envoie une notif de test aux appareils d'un membre.</p>
      <ul className="list">
        {members.map((m) => (
          <li key={m.uid}>
            <span>{m.profile?.name || m.email}</span>
            <span className="row">
              {results[m.uid] && <span className="muted small">{results[m.uid]}</span>}
              <button className="btn small" onClick={() => test(m.uid)}>
                Tester
              </button>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Rechargement complet (vide le service worker + les caches) — réservé au owner. */
function AppMaintenance() {
  const [busy, setBusy] = useState(false);

  async function hardReload() {
    setBusy(true);
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } finally {
      window.location.reload();
    }
  }

  return (
    <>
      <p className="muted small">
        Force le rechargement complet de l'application en vidant le cache et le service worker.
        Utile juste après une mise à jour si l'ancienne version reste affichée.
      </p>
      <button className="btn" onClick={hardReload} disabled={busy}>
        {busy ? 'Rechargement…' : '↻ Tout recharger (vider le cache)'}
      </button>
    </>
  );
}

function SectionOrderSettings() {
  const { member, sectionOrderRaw, refresh } = useAuth();
  const isOwner = member?.role === 'owner';
  const [order, setOrder] = useState<SectionKey[]>(
    reconcileOrder(sectionOrderRaw.mine ?? sectionOrderRaw.default)
  );

  useEffect(() => {
    setOrder(reconcileOrder(sectionOrderRaw.mine ?? sectionOrderRaw.default));
  }, [sectionOrderRaw]);

  const customized = !isOwner && sectionOrderRaw.mine != null;

  async function persist(next: SectionKey[]) {
    setOrder(next);
    const path = isOwner ? '/group/section-order' : '/me/section-order';
    await api(path, { method: 'PATCH', body: { order: next } });
    await refresh();
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    void persist(next);
  }
  async function reset() {
    await api('/me/section-order', { method: 'PATCH', body: { order: null } });
    await refresh();
  }

  return (
    <>
      <p className="muted small">
        « Essentiel » reste toujours en premier.{' '}
        {isOwner
          ? "Tu définis l'ordre par défaut du groupe (appliqué aux membres qui n'ont pas personnalisé)."
          : customized
            ? 'Tu utilises ton ordre personnalisé.'
            : "Tu suis l'ordre par défaut du groupe."}
      </p>
      <ol className="setlist full">
        {order.map((k, i) => (
          <li key={k}>
            <div className="sl-item">
              <span className="sl-num mono">{i + 1}</span>
              <div className="sl-body">{SECTION_LABELS[k]}</div>
              <span className="sl-actions">
                <button className="btn small" aria-label="Monter" onClick={() => move(i, -1)}>
                  ↑
                </button>
                <button className="btn small" aria-label="Descendre" onClick={() => move(i, 1)}>
                  ↓
                </button>
              </span>
            </div>
          </li>
        ))}
      </ol>
      {customized && (
        <button className="btn small" onClick={reset}>
          Réinitialiser (suivre le groupe)
        </button>
      )}
    </>
  );
}

function GearInventory() {
  const { items, reload } = useGearItems();
  const [label, setLabel] = useState('');

  async function add() {
    if (!label.trim()) return;
    await createGearItem(label.trim());
    setLabel('');
    await reload();
  }

  return (
    <>
      <p className="muted small">
        Tes éléments de matériel. Coche ceux à emmener <strong>par défaut</strong> — ils seront
        pré-cochés sur les nouveaux concerts (décochables au cas par cas).
      </p>

      {items.length > 0 && (
        <div className="chips">
          {items.map((it) => (
            <span key={it.id} className={`chip ${it.default_checked ? 'on' : ''}`}>
              <button
                type="button"
                className="chip-label"
                aria-pressed={it.default_checked}
                onClick={() => updateGearItem(it.id, { default_checked: !it.default_checked }).then(reload)}
              >
                {it.label}
              </button>
              <button
                type="button"
                className="chip-x"
                aria-label={`Supprimer ${it.label}`}
                onClick={() => deleteGearItem(it.id).then(reload)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="row" style={{ marginTop: '0.85rem' }}>
        <input
          aria-label="Nouvel élément de matos"
          placeholder="Ajouter un élément (Diffu, lights, Caisson…)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="btn" onClick={add}>
          + Ajouter
        </button>
      </div>
    </>
  );
}
