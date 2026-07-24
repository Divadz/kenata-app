import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ConcertDetail } from '../../types/models';
import { ApiError } from '../../api/client';
import type { Invoice } from '../../types/models';
import {
  createInvoice,
  deleteInvoice,
  invoicePdfUrl,
  publicPdfUrl,
  sendInvoice,
  setInvoiceShare,
  useBilling,
  useInvoices,
} from './useBilling';

/** Date du jour au format YYYY-MM-DD (local). */
function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function frDate(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR');
}
/** Jour ouvré suivant une date ISO (saute samedi/dimanche). */
function nextBusinessDay(iso: string): string {
  const d = new Date((iso || todayISO()) + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
/** Premier nombre trouvé dans un cachet saisi en texte (« 1 500 € + défraiement » → 1500). */
function parseAmount(s?: string | null): number {
  if (!s) return 0;
  const m = s.match(/\d[\d\s]*(?:[.,]\d+)?/);
  if (!m) return 0;
  const n = parseFloat(m[0].replace(/\s/g, '').replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
}
const eur = (v: number) => v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export function InvoicePanel({
  concert,
  groupName,
  onSent,
}: {
  concert: ConcertDetail;
  groupName: string;
  onSent?: () => void;
}) {
  const { invoices, reload } = useInvoices(concert.id);
  const { settings } = useBilling();
  const [open, setOpen] = useState(false);
  const [delMsg, setDelMsg] = useState<string | null>(null);
  const [sendTarget, setSendTarget] = useState<Invoice | null>(null);

  async function remove(id: string, number: string) {
    if (!confirm(`Supprimer la facture ${number} ? (uniquement possible si c'est la dernière émise)`)) return;
    setDelMsg(null);
    try {
      await deleteInvoice(id);
      await reload();
    } catch (e) {
      setDelMsg(
        e instanceof ApiError && e.message === 'not_last_invoice'
          ? `Impossible : ${number} n'est pas la dernière facture émise. Seule la dernière est supprimable (continuité de la numérotation).`
          : 'Échec de la suppression.'
      );
    }
  }

  return (
    <div className="card form full">
      <h3>Facturation</h3>

      {concert.invoice_sent && <p className="small ok-text">✅ Facture envoyée</p>}

      {invoices.length > 0 ? (
        <ul className="list">
          {invoices.map((inv) => (
            <InvoiceRow key={inv.id} inv={inv} onDelete={remove} onChanged={reload} onSend={setSendTarget} />
          ))}
        </ul>
      ) : (
        <p className="muted small">Aucune facture pour ce concert.</p>
      )}

      {sendTarget && (
        <SendModal
          invoice={sendTarget}
          concert={concert}
          groupName={groupName}
          signature={settings?.email_signature ?? ''}
          onClose={() => setSendTarget(null)}
          onSent={() => {
            setSendTarget(null);
            onSent?.();
          }}
        />
      )}
      {delMsg && (
        <p className="warn" role="alert">
          {delMsg}
        </p>
      )}

      {concert.fee_guso ? (
        <p className="muted small">
          🚫 Concert réglé au <strong>GUSO</strong> : pas de facture à émettre.
        </p>
      ) : (
        <button className="btn primary" onClick={() => setOpen(true)}>
          {invoices.length > 0 ? '+ Générer une autre facture' : '+ Générer une facture'}
        </button>
      )}

      {open && (
        <InvoiceModal
          concert={concert}
          groupName={groupName}
          onClose={() => setOpen(false)}
          onCreated={reload}
        />
      )}
    </div>
  );
}

function InvoiceRow({
  inv,
  onDelete,
  onChanged,
  onSend,
}: {
  inv: Invoice;
  onDelete: (id: string, number: string) => void;
  onChanged: () => Promise<void> | void;
  onSend: (inv: Invoice) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function copy() {
    if (!inv.share_token) return;
    try {
      await navigator.clipboard?.writeText(publicPdfUrl(inv.share_token));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard indisponible */
    }
  }
  async function share(action?: 'revoke') {
    setBusy(true);
    try {
      await setInvoiceShare(inv.id, action);
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="invoice-row">
      <div className="row between full">
        <span>
          <strong>{inv.number}</strong> · {frDate(inv.issue_date)} · {eur(inv.amount)}
        </span>
        <span className="row">
          <a className="btn small" href={invoicePdfUrl(inv.id)} target="_blank" rel="noreferrer">
            PDF
          </a>
          <button className="btn small primary" onClick={() => onSend(inv)}>
            ✉ Envoyer
          </button>
          <button className="btn small danger" onClick={() => onDelete(inv.id, inv.number)}>
            Suppr.
          </button>
        </span>
      </div>
      <div className="row" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
        {inv.share_token ? (
          <>
            <button className="btn small" onClick={copy} disabled={busy}>
              {copied ? 'Lien copié ✓' : '🔗 Copier le lien public'}
            </button>
            <button className="btn small" onClick={() => share('revoke')} disabled={busy}>
              Révoquer
            </button>
          </>
        ) : (
          <button className="btn small" onClick={() => share()} disabled={busy}>
            Créer un lien de partage
          </button>
        )}
      </div>
    </li>
  );
}

function SendModal({
  invoice,
  concert,
  groupName,
  signature,
  onClose,
  onSent,
}: {
  invoice: Invoice;
  concert: ConcertDetail;
  groupName: string;
  signature: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const dateFr = frDate(concert.date);
  const venue = concert.venue_name ?? '';
  const link = invoice.share_token ? publicPdfUrl(invoice.share_token) : '';

  const [to, setTo] = useState(concert.contacts?.org?.email ?? '');
  const [subject, setSubject] = useState(
    `Facture n° ${invoice.number} - ${[groupName, venue, dateFr].filter(Boolean).join(' ')}`
  );
  const [body, setBody] = useState(
    `Bonjour,\n\n` +
      `Comme convenu, vous trouverez votre facture ci-jointe pour la prestation ${groupName}` +
      `${dateFr ? ' du ' + dateFr : ''}${link ? ', ou via ce lien : ' + link : ''}.\n\n` +
      `Facture payable le lendemain de la prestation, de préférence par virement : toutes les informations sont sur la facture.\n\n` +
      `${signature || ''}`
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await sendInvoice(invoice.id, { to: to.trim(), subject, body });
      onSent();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'send_failed');
    } finally {
      setBusy(false);
    }
  }

  const errorMsg =
    error === 'invalid_recipient'
      ? 'Adresse email invalide.'
      : error === 'empty_message'
        ? 'Objet et message obligatoires.'
        : error === 'smtp_not_configured'
          ? "L'envoi d'emails n'est pas configuré."
          : error
            ? "Échec de l'envoi."
            : '';
  // Note d'aide pour les échecs liés au SMTP/Gmail.
  const showSmtpHint = error === 'send_failed' || error === 'smtp_not_configured';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal stack" onClick={(e) => e.stopPropagation()}>
        <div className="row between full">
          <h3>Envoyer la facture {invoice.number}</h3>
          <button className="btn small" aria-label="Fermer" onClick={onClose}>
            ✕
          </button>
        </div>

        {errorMsg && (
          <div role="alert">
            <p className="error">{errorMsg}</p>
            {showSmtpHint && (
              <p className="muted small">
                Causes classiques : mot de passe d'application révoqué/expiré, ou l'alias{' '}
                <strong>contact@kenata.fr</strong> retiré des « adresses d'envoi » du compte Gmail.
              </p>
            )}
          </div>
        )}

        <label className="field full">
          <span>Destinataire</span>
          <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="organisateur@…" />
          {!to.trim() && <span className="muted small">Renseigne l'email de l'organisateur.</span>}
        </label>
        <label className="field full">
          <span>Objet</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label className="field full">
          <span>Message</span>
          <textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        <p className="muted small">📎 La facture PDF (Facture_{invoice.number}.pdf) sera jointe automatiquement.</p>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose} disabled={busy}>
            Annuler
          </button>
          <button
            className="btn primary"
            onClick={submit}
            disabled={busy || !to.trim() || !subject.trim() || !body.trim()}
          >
            {busy ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InvoiceModal({
  concert,
  groupName,
  onClose,
  onCreated,
}: {
  concert: ConcertDetail;
  groupName: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [clientBlock, setClientBlock] = useState(concert.contacts?.contract_address ?? '');
  const [objectLabel, setObjectLabel] = useState(
    `${groupName}${concert.date ? ' ' + frDate(concert.date) : ''}`
  );
  const [designation, setDesignation] = useState(`PRESTATION MUSICALE / SPECTACLE ${groupName}`.toUpperCase());
  // Date de facture = date du concert (par convention) ; échéance = +1 jour ouvré.
  const [issueDate, setIssueDate] = useState(concert.date ?? todayISO());
  const [dueDate, setDueDate] = useState(nextBusinessDay(concert.date ?? todayISO()));
  const [qty, setQty] = useState('1');
  const [unitPrice, setUnitPrice] = useState(String(parseAmount(concert.fee)));
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = (parseFloat(qty) || 0) * (parseFloat(unitPrice.replace(',', '.')) || 0);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const { id } = await createInvoice({
        concert_id: concert.id,
        client_block: clientBlock,
        object_label: objectLabel,
        designation,
        issue_date: issueDate || null,
        service_date: concert.date ?? null,
        due_date: dueDate || null,
        qty: parseFloat(qty) || 1,
        unit_price: parseFloat(unitPrice.replace(',', '.')) || 0,
        notes,
      });
      onCreated();
      window.open(invoicePdfUrl(id), '_blank');
      onClose();
    } catch (e) {
      const code = e instanceof ApiError ? e.message : '';
      setError(['billing_not_configured', 'client_required', 'guso_no_invoice'].includes(code) ? code : 'generic');
    } finally {
      setBusy(false);
    }
  }

  const clientMissing = clientBlock.trim() === '';
  const canGenerate = !busy && !clientMissing && total > 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal stack" onClick={(e) => e.stopPropagation()}>
        <div className="row between full">
          <h3>Nouvelle facture</h3>
          <button className="btn small" aria-label="Fermer" onClick={onClose}>
            ✕
          </button>
        </div>

        {error === 'billing_not_configured' ? (
          <p className="warn">
            Renseigne d'abord l'émetteur dans <Link to="/settings">Réglages → Facturation</Link>.
          </p>
        ) : error === 'guso_no_invoice' ? (
          <p className="warn">Ce concert est réglé au GUSO : pas de facture.</p>
        ) : error === 'client_required' ? (
          <p className="warn">L'adresse du client (Adresse contrat) est obligatoire.</p>
        ) : error ? (
          <p className="error" role="alert">
            Échec de la génération.
          </p>
        ) : null}

        <label className="field full">
          <span>Client (facturé à) — Adresse contrat</span>
          <textarea
            rows={3}
            placeholder="Raison sociale&#10;Adresse&#10;CP Ville"
            value={clientBlock}
            onChange={(e) => setClientBlock(e.target.value)}
          />
          {clientMissing && (
            <span className="muted small">
              Obligatoire. Renseigne l'« Adresse contrat » du concert (section Adresse &amp; conditions) ou saisis-la ici.
            </span>
          )}
        </label>
        <label className="field full">
          <span>Objet</span>
          <input value={objectLabel} onChange={(e) => setObjectLabel(e.target.value)} />
        </label>
        <label className="field full">
          <span>Description de la prestation</span>
          <input value={designation} onChange={(e) => setDesignation(e.target.value)} />
        </label>
        <div className="grid2">
          <label className="field">
            <span>Date de facture</span>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => {
                setIssueDate(e.target.value);
                if (e.target.value) setDueDate(nextBusinessDay(e.target.value));
              }}
            />
          </label>
          <label className="field">
            <span>Échéance</span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
        </div>
        <div className="grid2">
          <label className="field">
            <span>Quantité</span>
            <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" />
          </label>
          <label className="field">
            <span>Prix unitaire (€)</span>
            <input value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} inputMode="decimal" />
          </label>
        </div>
        <label className="field full">
          <span>Notes (optionnel)</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <div className="row between full">
          <strong>Total : {eur(total)}</strong>
          <button className="btn primary" onClick={submit} disabled={!canGenerate}>
            {busy ? 'Génération…' : 'Générer le PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
