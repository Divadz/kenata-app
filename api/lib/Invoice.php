<?php
declare(strict_types=1);

require_once __DIR__ . '/fpdf.php';

/** FPDF avec pied de page légal (dessiné sans déclencher de saut de page). */
class InvoiceFPDF extends FPDF
{
    public string $footerName = '';       // nom émetteur (gras), CP1252
    public string $footerAddress = '';    // reste de la 1re ligne, CP1252
    /** @var string[] Lignes 2/3 (contact, mentions légales), CP1252. */
    public array $footerLines = [];

    function Footer(): void
    {
        if ($this->footerName === '' && !$this->footerLines) {
            return;
        }
        $this->SetY(-24);
        $this->SetDrawColor(180, 180, 180);
        $this->Cell(0, 0, '', 'T', 1);
        $this->Ln(1.5);
        $this->SetTextColor(80, 80, 80);

        // 1re ligne : nom (gras) + « | » + adresse, centrée ; n° de page à droite.
        $epw = $this->w - $this->lMargin - $this->rMargin;
        $rest = $this->footerAddress !== '' ? ' | ' . $this->footerAddress : '';
        $this->SetFont('Arial', 'B', 8);
        $wName = $this->GetStringWidth($this->footerName);
        $this->SetFont('Arial', '', 8);
        $wRest = $this->GetStringWidth($rest);
        $y = $this->GetY();
        $this->SetXY($this->lMargin + max(0, ($epw - $wName - $wRest) / 2), $y);
        $this->SetFont('Arial', 'B', 8);
        $this->Cell($wName, 4, $this->footerName, 0, 0);
        $this->SetFont('Arial', '', 8);
        $this->Cell($wRest, 4, $rest, 0, 0);
        // Numéro de page aligné à droite, même ligne.
        $this->SetXY($this->lMargin, $y);
        $this->Cell($epw, 4, $this->PageNo() . '/{nb}', 0, 1, 'R');

        // Lignes suivantes centrées.
        $this->SetFont('Arial', '', 8);
        foreach ($this->footerLines as $line) {
            $this->Cell(0, 4, $line, 0, 1, 'C');
        }
    }
}

/** Formate une date ISO (YYYY-MM-DD) en JJ/MM/AAAA. */
function inv_date_fr(?string $iso): string
{
    if (!$iso || !preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $iso, $m)) {
        return '';
    }
    return "$m[3]/$m[2]/$m[1]";
}

/** Montant à la française : « 1 000,00 ». */
function inv_num_fr(float $amount): string
{
    return number_format($amount, 2, ',', ' ');
}

/**
 * Rend une facture PDF (bytes), gabarit association sans TVA.
 * $inv : number, issue_date, due_date, service_date, client_block, object_label,
 *        designation, qty, unit_price, amount, currency, notes.
 * $issuer : name, address_footer, phone, email, website, siret, naf, legal_form,
 *           tva_mention, bank_name, account_holder, iban, bic.
 */
function invoice_pdf_bytes(array $inv, array $issuer): string
{
    $tr = static fn ($s): string => (string) mb_convert_encoding((string) $s, 'Windows-1252', 'UTF-8');
    $number = (string) ($inv['number'] ?? '');
    $curr = (string) ($inv['currency'] ?? 'EUR');

    $pdf = new InvoiceFPDF('P', 'mm', 'A4');
    $pdf->SetMargins(15, 15, 15);
    $pdf->SetAutoPageBreak(true, 30);
    $pdf->AliasNbPages();
    // Pied de page légal (pré-encodé CP1252).
    $pdf->footerName = $tr($issuer['name'] ?? '');
    $pdf->footerAddress = $tr((string) ($issuer['address_footer'] ?? ''));
    $contact = implode(' | ', array_filter([
        !empty($issuer['phone']) ? 'T. ' . $issuer['phone'] : '',
        $issuer['email'] ?? '',
        $issuer['website'] ?? '',
    ]));
    $legal = implode(' | ', array_filter([
        $issuer['tva_mention'] ?? '',
        !empty($issuer['siret']) ? 'SIRET : ' . $issuer['siret'] : '',
        $issuer['legal_form'] ?? '',
        !empty($issuer['naf']) ? 'NAF ' . $issuer['naf'] : '',
    ]));
    $pdf->footerLines = array_map($tr, array_values(array_filter([$contact, $legal])));
    $pdf->AddPage();

    $eur = static fn (float $v): string => inv_num_fr($v) . ' ' . ($curr === 'EUR' ? '€' : $curr);

    // ---- En-tête : « FACTURE » (gris clair) à gauche, nom émetteur à droite ----
    $pdf->SetTextColor(150, 150, 150);
    $pdf->SetFont('Arial', 'B', 40);
    $pdf->SetXY(15, 15);
    $pdf->Cell(120, 16, 'FACTURE', 0, 0);
    $pdf->SetTextColor(0, 0, 0);
    $pdf->SetFont('Arial', 'B', 14);
    $pdf->SetXY(118, 17);
    $pdf->Cell(77, 8, $tr($issuer['name'] ?? ''), 0, 0, 'L');

    // Référence / Date / Échéance (gauche)
    $meta = [
        ['Référence :', $number],
        ['Date :', inv_date_fr($inv['issue_date'] ?? null)],
        ['Échéance :', inv_date_fr($inv['due_date'] ?? null)],
    ];
    $pdf->SetXY(15, 38);
    foreach ($meta as [$k, $v]) {
        if ($v === '') {
            continue;
        }
        $pdf->SetX(15);
        $pdf->SetFont('Arial', '', 10);
        $pdf->Cell(24, 6, $tr($k), 0, 0);
        $pdf->Cell(60, 6, $tr($v), 0, 1);
    }

    // Bloc client (droite, sous le nom émetteur)
    $client = array_values(array_filter(array_map('trim', explode("\n", (string) ($inv['client_block'] ?? '')))));
    $pdf->SetXY(118, 52);
    foreach ($client as $i => $line) {
        $pdf->SetX(118);
        $pdf->SetFont('Arial', $i === 0 ? 'B' : '', $i === 0 ? 11 : 10);
        $pdf->Cell(77, 5.4, $tr($line), 0, 1, 'L');
    }

    // ---- Objet ----
    $pdf->SetXY(15, 84);
    $pdf->SetFont('Arial', 'B', 15);
    $pdf->Cell(0, 8, $tr('Facture n° ' . $number), 0, 1);
    $obj = trim((string) ($inv['object_label'] ?? ''));
    if ($obj !== '') {
        $pdf->SetX(15);
        $pdf->SetTextColor(120, 120, 120);
        $pdf->SetFont('Arial', '', 13);
        $pdf->Cell(0, 7, $tr($obj), 0, 1);
        $pdf->SetTextColor(0, 0, 0);
    }

    // ---- Tableau prestations ----
    $qty = (float) ($inv['qty'] ?? 1);
    $unit = (float) ($inv['unit_price'] ?? 0);
    $amount = (float) ($inv['amount'] ?? ($qty * $unit));
    $desig = trim((string) ($inv['designation'] ?? 'Prestation'));
    $cDesc = 98;
    $cQty = 18;
    $cPrix = 32;
    $cMont = 32;

    $pdf->SetY(max($pdf->GetY() + 8, 108));
    $pdf->SetFillColor(224, 224, 224);
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->Cell(180, 9, $tr('  Prestations'), 0, 1, 'L', true);
    $pdf->Ln(2.5);

    // En-têtes de colonnes
    $pdf->SetFont('Arial', '', 10);
    $pdf->SetTextColor(60, 60, 60);
    $pdf->Cell($cDesc, 7, $tr('Description'), 0, 0, 'L');
    $pdf->Cell($cQty, 7, $tr('Qté.'), 0, 0, 'R');
    $pdf->Cell($cPrix, 7, $tr('Prix'), 0, 0, 'R');
    $pdf->Cell($cMont, 7, $tr('Montant ' . $curr), 0, 1, 'R');
    $pdf->SetTextColor(0, 0, 0);
    $pdf->SetDrawColor(150, 150, 150);
    $pdf->Cell(180, 0, '', 'T', 1);

    // Ligne de prestation
    $y0 = $pdf->GetY() + 1.8;
    $pdf->SetFont('Arial', '', 10);
    $pdf->SetXY(15, $y0);
    $pdf->MultiCell($cDesc, 6, $tr($desig), 0, 'L');
    $y1 = $pdf->GetY();
    $rowH = max($y1 - $y0, 6);
    $pdf->SetXY(15 + $cDesc, $y0);
    $pdf->Cell($cQty, $rowH, $tr(rtrim(rtrim(inv_num_fr($qty), '0'), ',')), 0, 0, 'R');
    $pdf->Cell($cPrix, $rowH, $tr($eur($unit)), 0, 0, 'R');
    $pdf->Cell($cMont, $rowH, $tr($eur($amount)), 0, 1, 'R');
    $pdf->SetDrawColor(205, 205, 205);
    $pdf->Cell(180, 0, '', 'T', 1);

    // ---- Totaux (alignés sous les colonnes Prix / Montant) ----
    $labX = 15 + $cDesc;              // fin de la colonne Description
    $totLabelW = $cQty + $cPrix;      // zone du libellé
    $totValW = $cMont;               // zone du montant
    $pdf->SetFont('Arial', '', 10);
    foreach ([['Total HT', $eur($amount)], ['Total taxes', '-']] as [$k, $v]) {
        $pdf->SetX($labX);
        $pdf->Cell($totLabelW, 7, $tr($k), 0, 0, 'L');
        $pdf->Cell($totValW, 7, $tr($v), 0, 1, 'R');
    }
    // Total TTC surligné
    $pdf->SetX($labX);
    $pdf->SetFillColor(210, 210, 210);
    $pdf->SetFont('Arial', 'B', 11);
    $pdf->Cell($totLabelW, 9, $tr('Total TTC'), 0, 0, 'L', true);
    $pdf->Cell($totValW, 9, $tr($eur($amount)), 0, 1, 'R', true);

    // ---- Informations de paiement ----
    $pdf->SetY(max($pdf->GetY() + 12, 158));
    $pdf->SetFont('Arial', 'B', 13);
    $pdf->Cell(0, 7, $tr('Informations de paiement'), 0, 1);
    $pdf->Ln(2);
    $pay = [
        ['Motif du versement :', 'Facture n° ' . $number],
        ['Montant dû :', $eur($amount)],
        ['Échéance :', inv_date_fr($inv['due_date'] ?? null)],
        ['Nom de la banque :', (string) ($issuer['bank_name'] ?? '')],
        ['Titulaire du compte :', (string) ($issuer['account_holder'] ?? '')],
        ['IBAN :', (string) ($issuer['iban'] ?? '')],
        ['BIC / SWIFT :', (string) ($issuer['bic'] ?? '')],
    ];
    foreach ($pay as [$k, $v]) {
        if (trim($v) === '') {
            continue;
        }
        $pdf->SetX(15);
        $pdf->SetFont('Arial', '', 10);
        $pdf->Cell(50, 6.6, $tr($k), 0, 0);
        $pdf->Cell(0, 6.6, $tr($v), 0, 1);
    }

    // Mentions légales de paiement (pénalités de retard, indemnité 40 €…).
    $terms = trim((string) ($issuer['payment_terms'] ?? ''));
    if ($terms !== '') {
        $pdf->Ln(4);
        $pdf->SetFont('Arial', 'I', 8.5);
        $pdf->SetTextColor(90, 90, 90);
        $pdf->MultiCell(0, 4.2, $tr($terms), 0, 'L');
        $pdf->SetTextColor(0, 0, 0);
    }
    if (!empty($inv['notes'])) {
        $pdf->Ln(2);
        $pdf->SetFont('Arial', 'I', 9);
        $pdf->MultiCell(0, 5, $tr((string) $inv['notes']), 0, 'L');
    }

    return $pdf->Output('S');
}
