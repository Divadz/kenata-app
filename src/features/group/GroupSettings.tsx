import { useEffect, useState, type ReactNode } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { MembersManager } from '../members/MembersManager';
import { useBilling, updateBilling } from '../billing/useBilling';
import type { BillingSettings } from '../../types/models';
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
        <Section title="Facturation" ownerOnly>
          <BillingForm />
        </Section>
      )}
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

/** Paramètres émetteur des factures (association). */
function BillingForm() {
  const { settings, loading, reload } = useBilling();
  const [f, setF] = useState<BillingSettings>({});
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (settings) setF(settings);
  }, [settings]);

  if (loading) return <p className="muted small">Chargement…</p>;

  const set = (k: keyof BillingSettings, v: string) => setF((p) => ({ ...p, [k]: v }));
  const setNum = (k: 'next_year' | 'next_seq', v: string) =>
    setF((p) => ({ ...p, [k]: v === '' ? undefined : Math.max(0, parseInt(v, 10) || 0) }));
  const field = (k: keyof BillingSettings, label: string, ph = '') => (
    <label className="field">
      <span>{label}</span>
      <input value={(f[k] as string | undefined) ?? ''} onChange={(e) => set(k, e.target.value)} placeholder={ph} />
    </label>
  );

  const cyear = f.next_year || new Date().getFullYear();
  const cseq = f.next_seq && f.next_seq > 0 ? f.next_seq : 1;
  const nextNumber = `${f.prefix ?? ''}${cyear}-${String(cseq).padStart(3, '0')}`;

  async function save() {
    setBusy(true);
    setSaved(null);
    try {
      await updateBilling(f);
      setSaved('Enregistré ✓');
      await reload();
    } catch {
      setSaved('Erreur d’enregistrement');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="muted small">
        Émetteur des factures. Ces informations figurent sur chaque facture générée depuis un concert.
      </p>
      <div className="grid2">
        {field('name', 'Dénomination', 'ASSOCIATION …')}
        {field('legal_form', 'Forme juridique', 'ASSOCIATION')}
      </div>
      <label className="field">
        <span>Adresse (ligne de pied de page)</span>
        <input
          value={f.address_footer ?? ''}
          onChange={(e) => set('address_footer', e.target.value)}
          placeholder="24 Résidence … | 56270 PLOEMEUR | France"
        />
      </label>
      <div className="grid2">
        {field('siret', 'SIRET')}
        {field('naf', 'Code NAF', '94.99Z')}
      </div>
      <div className="grid2">
        {field('email', 'Email', 'contact@…')}
        {field('phone', 'Téléphone')}
      </div>
      {field('website', 'Site web', 'kenata.fr')}
      <label className="field">
        <span>Mention TVA</span>
        <input
          value={f.tva_mention ?? ''}
          onChange={(e) => set('tva_mention', e.target.value)}
          placeholder="TVA non applicable, art. 261-7-1° du CGI"
        />
      </label>
      <label className="field full">
        <span>Mentions de paiement (pénalités / indemnité)</span>
        <textarea
          rows={3}
          value={f.payment_terms ?? ''}
          onChange={(e) => set('payment_terms', e.target.value)}
          placeholder={
            'En cas de retard : indemnité forfaitaire de 40 € pour frais de recouvrement (art. L441-10 et D441-5 du Code de commerce).\nPas d’escompte pour paiement anticipé.'
          }
        />
      </label>

      <h4>Coordonnées bancaires</h4>
      <div className="grid2">
        {field('bank_name', 'Nom de la banque')}
        {field('account_holder', 'Titulaire du compte')}
      </div>
      {field('iban', 'IBAN')}
      {field('bic', 'BIC / SWIFT')}

      <h4>Envoi par email</h4>
      <label className="field full">
        <span>Signature (bas des emails d'envoi de facture)</span>
        <textarea
          rows={3}
          value={f.email_signature ?? ''}
          onChange={(e) => set('email_signature', e.target.value)}
          placeholder={'Florian Le Tiec\nPrésident\nAssociation FCK'}
        />
      </label>

      <h4>Numérotation</h4>
      {field('prefix', 'Préfixe (optionnel)', 'ex. KEN-  → KEN-2026-001')}
      <div className="grid2">
        <label className="field">
          <span>Année du compteur</span>
          <input
            inputMode="numeric"
            value={f.next_year ?? new Date().getFullYear()}
            onChange={(e) => setNum('next_year', e.target.value)}
          />
        </label>
        <label className="field">
          <span>Prochain n° (séquence)</span>
          <input inputMode="numeric" value={f.next_seq ?? 1} onChange={(e) => setNum('next_seq', e.target.value)} />
        </label>
      </div>
      <p className="muted small">
        Prochaine facture : <strong>{nextNumber}</strong>. Le compteur s'incrémente à chaque génération et
        repart à 1 chaque année. <em>Déjà à 2026-025 ? Mets 2026 et 26.</em>
      </p>

      <div className="row" style={{ marginTop: '0.6rem' }}>
        <button className="btn primary" onClick={save} disabled={busy}>
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {saved && <span className="muted small">{saved}</span>}
      </div>
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
      <ScreenInfo />
    </>
  );
}

/** Diagnostic responsive : taille du viewport CSS (clé pour les media queries) + écran. */
function ScreenInfo() {
  const read = () => ({
    vw: window.innerWidth,
    vh: window.innerHeight,
    sw: window.screen.width,
    sh: window.screen.height,
    dpr: Math.round(window.devicePixelRatio * 100) / 100,
    vvw: window.visualViewport ? Math.round(window.visualViewport.width) : null,
    vvh: window.visualViewport ? Math.round(window.visualViewport.height) : null,
    portrait: window.matchMedia('(orientation: portrait)').matches,
  });
  const [i, setI] = useState(read);

  useEffect(() => {
    const on = () => setI(read());
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    window.visualViewport?.addEventListener('resize', on);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
      window.visualViewport?.removeEventListener('resize', on);
    };
  }, []);

  // Seuils de l'app : ≤640 = mobile (menu burger, colonnes empilées).
  const bp =
    i.vw <= 560 ? 'très étroit (≤560)' : i.vw <= 640 ? 'mobile (≤640)' : i.vw <= 900 ? 'intermédiaire (≤900)' : 'large (>900)';

  return (
    <div className="screen-info">
      <h4>Diagnostic écran</h4>
      <ul className="list small">
        <li>
          <span>Viewport CSS <em>(media queries)</em></span>
          <span className="mono">{i.vw} × {i.vh} px · {bp}</span>
        </li>
        <li>
          <span>Zone visible</span>
          <span className="mono">{i.vvw ?? '?'} × {i.vvh ?? '?'} px</span>
        </li>
        <li>
          <span>Écran</span>
          <span className="mono">{i.sw} × {i.sh} px</span>
        </li>
        <li>
          <span>Densité</span>
          <span className="mono">{i.dpr}× (physique ≈ {Math.round(i.sw * i.dpr)} × {Math.round(i.sh * i.dpr)})</span>
        </li>
        <li>
          <span>Orientation</span>
          <span className="mono">{i.portrait ? 'portrait' : 'paysage'}</span>
        </li>
      </ul>
      <p className="muted small">
        Le <strong>viewport CSS</strong> est la mesure qui pilote le responsive. Tourne ou
        redimensionne : les valeurs se mettent à jour en direct.
      </p>
    </div>
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
