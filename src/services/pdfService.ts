import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IncomingLetter, OutgoingLetter } from '../types/index.ts';
import {
  getStoredMosqueProfile,
  DEFAULT_MOSQUE_PROFILE,
  formatDkmHeaderTitle,
  formatReportCity,
  getDefaultOfficerName,
} from './storage.ts';

export interface PdfReportOptions {
  title: string;
  subtitle?: string;
  periodText?: string;
  categoryName?: string;
  summaryCards?: Array<{ label: string; value: string; sublabel?: string }>;
  tableHeaders: string[];
  tableRows: Array<Array<string | number>>;
  tableAligns?: Array<'left' | 'center' | 'right'>;
  footerNotes?: string;
  signatures?: Array<{ role: string; name: string; position?: string; signatureDataUrl?: string }>;
  filename?: string;
}

function drawSignatureImageInPdf(
  doc: jsPDF,
  dataUrl: string,
  centerX: number,
  baselineY: number,
  maxWidth: number,
  maxHeight: number
) {
  try {
    const props = doc.getImageProperties(dataUrl);
    const ratio = props.width && props.height ? props.width / props.height : 2.5;
    let drawW = maxWidth;
    let drawH = drawW / ratio;
    if (drawH > maxHeight) {
      drawH = maxHeight;
      drawW = drawH * ratio;
    }
    const imgX = centerX - drawW / 2;
    const imgY = baselineY - drawH - 1;
    doc.addImage(dataUrl, 'PNG', imgX, imgY, drawW, drawH);
  } catch (err) {
    console.warn('Failed to embed signature image in PDF:', err);
  }
}

/**
 * Generates and downloads a clean, formal vector PDF report with DKM Kop,
 * summary boxes, structured data table, and committee signature blocks.
 * Runs 100% natively in client JS (no html2canvas needed, immune to oklch CSS errors).
 */
export function generateOfficialPdfReport(options: PdfReportOptions): boolean {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let currentY = 14;

    const profile = getStoredMosqueProfile();
    const mosqueName = (profile.name || DEFAULT_MOSQUE_PROFILE.name || "Masjid Jami' Al-Barkah").trim();
    const mosqueAddress = (profile.address || DEFAULT_MOSQUE_PROFILE.address || '').trim();
    const mosquePhone = (profile.phone || DEFAULT_MOSQUE_PROFILE.phone || '').trim();
    const mosqueSimas = (profile.simasNumber || DEFAULT_MOSQUE_PROFILE.simasNumber || '').trim();

    // 1. KOP SURAT RESMI MASJID
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('BISMILLAHIRRAHMANIRRAHIM', pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(6, 95, 70); // Dark Emerald
    doc.text(formatDkmHeaderTitle(mosqueName), pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`${mosqueAddress} • Telp: ${mosquePhone}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 4;

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `SK Kemenag RI No. SIMAS: ${mosqueSimas}${profile.email ? ` • ${profile.email}` : ''}`,
      pageWidth / 2,
      currentY,
      { align: 'center' }
    );
    currentY += 3;

    // Double divider line
    doc.setDrawColor(15, 23, 42); // Slate 900
    doc.setLineWidth(0.6);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 0.8;
    doc.setLineWidth(0.2);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 6;

    // 2. DOCUMENT TITLE & METADATA
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(options.title.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
    currentY += 4.5;

    if (options.subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(options.subtitle, pageWidth / 2, currentY, { align: 'center' });
      currentY += 4.5;
    }

    // Meta row (Periode & Tanggal Cetak Real-Time)
    const now = new Date();
    const currentDate = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const currentTime = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const reportCity = formatReportCity(profile.city || DEFAULT_MOSQUE_PROFILE.city);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, contentWidth, 7, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`Periode: ${options.periodText || 'Semua Data'}`, margin + 3, currentY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dicetak: ${reportCity}, ${currentDate} • Pukul ${currentTime} WIB`, pageWidth - margin - 3, currentY + 4.5, { align: 'right' });
    currentY += 9;

    // 3. SUMMARY KPI CARDS (If provided)
    if (options.summaryCards && options.summaryCards.length > 0) {
      const cards = options.summaryCards;
      const count = Math.min(cards.length, 4);
      const gap = 3;
      const cardWidth = (contentWidth - gap * (count - 1)) / count;
      const cardHeight = 13;

      cards.slice(0, 4).forEach((card, idx) => {
        const x = margin + idx * (cardWidth + gap);
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(x, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(card.label.slice(0, 24), x + 2.5, currentY + 4);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(card.value, x + 2.5, currentY + 9);

        if (card.sublabel) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          doc.setTextColor(100, 116, 139);
          doc.text(card.sublabel, x + 2.5, currentY + 12);
        }
      });

      currentY += cardHeight + 4;
    }

    // 4. DATA TABLE VIA AUTOTABLE
    const headRow = ['No', ...options.tableHeaders];
    const bodyRows = options.tableRows.map((row, idx) => [idx + 1, ...row]);

    // Build column alignments
    const columnStyles: Record<number, { halign: 'left' | 'center' | 'right' }> = {
      0: { halign: 'center' },
    };
    if (options.tableAligns) {
      options.tableAligns.forEach((align, i) => {
        columnStyles[i + 1] = { halign: align || 'left' };
      });
    }

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [headRow],
      body: bodyRows,
      theme: 'grid',
      headStyles: {
        fillColor: [6, 95, 70], // Emerald 800
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles,
      styles: {
        overflow: 'linebreak',
        cellPadding: 2,
      },
    });

    // @ts-expect-error autoTable adds lastAutoTable to doc
    let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : currentY + 40;

    // Ensure we don't overflow the page for footer notes and signatures
    if (finalY > 240) {
      doc.addPage();
      finalY = 20;
    }

    // 5. FOOTER NOTES
    if (options.footerNotes) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, finalY, contentWidth, 9, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Catatan & Keterangan Resmi:', margin + 2.5, finalY + 3.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(doc.splitTextToSize(options.footerNotes, contentWidth - 5), margin + 2.5, finalY + 6.5);

      finalY += 13;
    }

    // 6. COMMITTEE SIGNATURES (3 Columns)
    if (finalY > 250) {
      doc.addPage();
      finalY = 20;
    }

    const defaultLead = getDefaultOfficerName(
      'admin',
      profile.leadPerson || DEFAULT_MOSQUE_PROFILE.leadPerson || 'Drs. KH. Ahmad Muzammil'
    );
    const sigs: NonNullable<PdfReportOptions['signatures']> = options.signatures || [
      { role: 'Ketua DKM (Admin)', name: defaultLead },
      { role: 'Sekretaris DKM', name: getDefaultOfficerName('sekretaris', 'Ust. Farhan Basalamah, S.Kom') },
      { role: 'Bendahara Keuangan', name: getDefaultOfficerName('bendahara', 'H. Ahmad Sobari, SE, Ak.') },
    ];

    const sigColWidth = contentWidth / sigs.length;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);

    sigs.forEach((sig, i) => {
      const colX = margin + i * sigColWidth + sigColWidth / 2;
      doc.text(sig.role, colX, finalY, { align: 'center' });

      if (sig.signatureDataUrl) {
        drawSignatureImageInPdf(doc, sig.signatureDataUrl, colX, finalY + 16, 36, 13.5);
      }

      // Signature line & Name
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.3);
      doc.line(colX - 20, finalY + 16, colX + 20, finalY + 16);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(sig.name, colX, finalY + 19.5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      if (sig.position) {
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(sig.position, colX, finalY + 23, { align: 'center' });
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
      }
    });

    // 7. SAVE FILE
    const filename = options.filename || `${options.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.pdf`;
    const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    doc.save(safeName);
    return true;
  } catch (error) {
    console.error('Failed to generate PDF with jsPDF:', error);
    return false;
  }
}

/**
 * Generates an official PDF for an Incoming Letter Disposition Sheet.
 */
export function generateDispositionPdf(
  letter: IncomingLetter,
  signatures?: Array<{ role: string; name: string; position?: string; signatureDataUrl?: string }>
): boolean {
  const profile = getStoredMosqueProfile();
  const mosqueName = (profile.name || DEFAULT_MOSQUE_PROFILE.name).trim();
  return generateOfficialPdfReport({
    title: 'LEMBAR DISPOSISI RESMI SURAT MASUK DKM',
    subtitle: `No. Agenda: ${letter.agendaNumber} • Klasifikasi: ${letter.urgency}`,
    periodText: `Tanggal Diterima: ${letter.receivedDate}`,
    summaryCards: [
      { label: 'Nomor Agenda', value: letter.agendaNumber },
      { label: 'Tingkat Urgensi', value: letter.urgency },
      { label: 'Status Disposisi', value: letter.status },
      { label: 'Tujuan Arahan', value: letter.dispositionTo || '-' },
    ],
    tableHeaders: ['Parameter Arsip', 'Keterangan Dokumen Surat'],
    tableAligns: ['left', 'left'],
    tableRows: [
      ['Nomor Asal Surat', letter.letterNumber],
      ['Instansi / Pengirim', letter.sender],
      ['Tanggal Tertulis Surat', letter.letterDate],
      ['Tanggal Diterima Sekretariat', letter.receivedDate],
      ['Kategori Dokumen', letter.category],
      ['Perihal Surat', letter.subject],
      ['Ringkasan Isi Surat', letter.summary || '-'],
      ['Instruksi / Arahan Disposisi', letter.dispositionInstruction || 'Mohon ditindaklanjuti sesuai protokoler DKM'],
      ['Ditujukan Kepada Pejabat', letter.dispositionTo || 'Ketua Bidang Terkait'],
      ['Lampiran Berkas', letter.attachmentName || 'Nihil / Berkas Fisik Terlampir'],
    ],
    signatures: signatures || [
      { role: 'Penerima Disposisi', name: letter.dispositionTo || 'Penerima Disposisi' },
      { role: `Ketua DKM ${mosqueName}`, name: profile.leadPerson || DEFAULT_MOSQUE_PROFILE.leadPerson || 'Drs. KH. Ahmad Muzammil' },
    ],
    footerNotes: `Lembar disposisi ini merupakan instrumen kendali administrasi resmi DKM ${mosqueName} berlandaskan tata persuratan kementerian agama.`,
    filename: `Lembar_Disposisi_${letter.agendaNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
  });
}

/**
 * Generates an official PDF for an Outgoing Letter (Surat Keluar).
 */
export function generateOutgoingLetterPdf(
  letter: OutgoingLetter,
  signatureDataUrl?: string | null
): boolean {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let currentY = 18;

    const profile = getStoredMosqueProfile();
    const mosqueName = (profile.name || DEFAULT_MOSQUE_PROFILE.name || "Masjid Jami' Al-Barkah").trim();
    const mosqueAddress = (profile.address || DEFAULT_MOSQUE_PROFILE.address || '').trim();
    const mosquePhone = (profile.phone || DEFAULT_MOSQUE_PROFILE.phone || '').trim();
    const mosqueSimas = (profile.simasNumber || DEFAULT_MOSQUE_PROFILE.simasNumber || '').trim();

    // Kop
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('BISMILLAHIRRAHMANIRRAHIM', pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(6, 95, 70);
    doc.text(formatDkmHeaderTitle(mosqueName), pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`${mosqueAddress} • Telp: ${mosquePhone}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 4;
    doc.text(`SK Kemenag RI No. SIMAS: ${mosqueSimas}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 3;

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.6);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 0.8;
    doc.setLineWidth(0.2);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;

    // Header info (Nomor, Lampiran, Perihal, Tanggal)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const reportCity = formatReportCity(profile.city || DEFAULT_MOSQUE_PROFILE.city);
    doc.text(`Nomor    : ${letter.letterNumber}`, margin, currentY);
    doc.text(`${reportCity}, ${letter.date}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 5;

    doc.text(`Lampiran : ${letter.attachmentInfo || '-'}`, margin, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'bold');
    doc.text(`Perihal   : ${letter.title}`, margin, currentY);
    currentY += 8;

    // Kepada Yth
    doc.setFont('helvetica', 'normal');
    doc.text('Kepada Yang Terhormat,', margin, currentY);
    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(letter.recipient, margin, currentY);
    currentY += 4;
    doc.setFont('helvetica', 'normal');
    doc.text('di Tempat', margin, currentY);
    currentY += 8;

    // Salam Pembuka
    doc.setFont('helvetica', 'italic');
    doc.text("Assalamu'alaikum Warahmatullahi Wabarakatuh,", margin, currentY);
    currentY += 6;

    // Content
    doc.setFont('helvetica', 'normal');
    const contentLines = doc.splitTextToSize(letter.content, pageWidth - margin * 2);
    doc.text(contentLines, margin, currentY);
    currentY += (contentLines.length * 5) + 6;

    // Salam Penutup
    doc.setFont('helvetica', 'italic');
    doc.text("Wassalamu'alaikum Warahmatullahi Wabarakatuh.", margin, currentY);
    currentY += 12;

    // Signature Block (Right side)
    const sigX = pageWidth - margin - 35;
    doc.setFont('helvetica', 'normal');
    doc.text(`Dewan Kemakmuran ${mosqueName}`, sigX, currentY, { align: 'center' });
    currentY += 4.5;
    doc.text(letter.signerPosition, sigX, currentY, { align: 'center' });
    currentY += 22;

    if (signatureDataUrl) {
      drawSignatureImageInPdf(doc, signatureDataUrl, sigX, currentY, 42, 18);
    }

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.3);
    doc.line(sigX - 25, currentY, sigX + 25, currentY);
    currentY += 4;

    doc.setFont('helvetica', 'bold');
    doc.text(letter.signerName, sigX, currentY, { align: 'center' });

    const safeFilename = `Surat_DKM_${letter.letterNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    doc.save(safeFilename);
    return true;
  } catch (err) {
    console.error('Failed to generate outgoing letter PDF:', err);
    return false;
  }
}

/**
 * Attempts to print via an isolated print iframe, falling back safely.
 */
export function printElementViaIframe(element: HTMLElement, title: string): void {
  try {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('style', 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;');
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html lang="id">
          <head>
            <meta charset="utf-8" />
            <title>${title}</title>
            <style>
              @page { size: A4; margin: 15mm; }
              * { box-sizing: border-box; }
              body { font-family: system-ui, -apple-system, sans-serif; background: #fff; color: #000; margin: 0; padding: 10px; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 11px; }
              th, td { border: 1px solid #cbd5e1; padding: 6px 10px; vertical-align: middle; }
              th { background-color: #f8fafc; font-weight: bold; }
              .text-left { text-align: left; }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .underline { text-decoration: underline; }
              .grid { display: grid; gap: 16px; }
              .grid-cols-2, .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .sm\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
              .flex { display: flex; }
              .justify-end { justify-content: flex-end; }
              .justify-between { justify-content: space-between; }
              .items-center { align-items: center; }
              .mx-auto { margin-left: auto; margin-right: auto; }
              .border-t { border-top: 1px solid #94a3b8; }
              .border-b { border-bottom: 1px solid #94a3b8; }
              .pt-1 { padding-top: 4px; }
              .pt-4 { padding-top: 16px; }
              .pt-6 { padding-top: 24px; }
              .pt-8 { padding-top: 32px; }
              img { max-width: 100%; }
              .sig-img { height: 56px; max-width: 150px; width: auto; object-fit: contain; display: block; margin: 0 auto; }
              .no-print { display: none !important; }
            </style>
          </head>
          <body>
            ${element.innerHTML}
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) document.body.removeChild(iframe);
          }, 1500);
        }
      }, 350);
      return;
    }
  } catch {
    window.print();
  }
}
