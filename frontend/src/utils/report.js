import { jsPDF } from 'jspdf';

/**
 * Generate a professional PDF Incident Report following the official ABHEDYA structure.
 * @param {Object|Array} dataOrRecords - Single incident payload or array of evidence records
 */
export function generatePDFReport(dataOrRecords) {
  // Normalize payload
  const isArray = Array.isArray(dataOrRecords);
  const primaryData = isArray ? (dataOrRecords[0] || {}) : dataOrRecords;
  const records = isArray ? dataOrRecords : [dataOrRecords];

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let y = 0;

  // Helper for adding headers
  const renderHeader = () => {
    // Header Banner - Deep Aubergine (#260921)
    doc.setFillColor(38, 9, 33);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('ABHEDYA', margin, 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(220, 200, 215);
    doc.text('DIGITAL INCIDENT & EVIDENCE REPORT', margin, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    const genTime = new Date().toUTCString();
    doc.text(`Generated: ${genTime} • ID: ${primaryData.id || 'INC-RECORD'}`, pageWidth - margin, 18, { align: 'right' });

    y = 36;
  };

  // Helper for adding footers with page numbers
  const renderFooter = (pageNo, totalPages) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`ABHEDYA Digital Safety Platform • Confidential Evidence Dossier`, margin, pageHeight - 10);
    doc.text(`Page ${pageNo} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  };

  renderHeader();

  // 1. INCIDENT SUMMARY
  doc.setFillColor(245, 243, 240);
  doc.setDrawColor(209, 195, 202);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(38, 9, 33);
  doc.text('1. INCIDENT SUMMARY', margin + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);

  const incidentTypeStr = primaryData.incidentType || 'Digital Safety Incident';
  const dateTimeStr = primaryData.dateTime ? new Date(primaryData.dateTime).toLocaleString() : (primaryData.timestamp ? new Date(primaryData.timestamp).toLocaleString() : new Date().toLocaleString());
  const platformStr = primaryData.platform || primaryData.source || 'Online Platform';
  const statusStr = 'Evidence Sealed & Preserved';

  doc.text(`• Incident Type: ${incidentTypeStr}`, margin + 6, y + 14);
  doc.text(`• Date & Time: ${dateTimeStr}`, margin + 6, y + 20);
  doc.text(`• Platform / Source: ${platformStr}`, margin + 6, y + 26);
  doc.text(`• Incident Status: ${statusStr}`, margin + contentWidth / 2, y + 14);

  y += 40;

  // 2. WHAT HAPPENED?
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(38, 9, 33);
  doc.text('2. WHAT HAPPENED?', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);

  const whatHappenedText = primaryData.description || primaryData.content || primaryData.notes || 'User-reported digital safety incident.';
  const splitDescription = doc.splitTextToSize(whatHappenedText, contentWidth - 4);
  doc.text(splitDescription, margin + 2, y);

  y += (splitDescription.length * 5) + 8;

  // 3. DIGITAL EVIDENCE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(38, 9, 33);
  doc.text('3. DIGITAL EVIDENCE', margin, y);
  y += 6;

  records.forEach((rec, idx) => {
    if (y > 230) {
      doc.addPage();
      renderHeader();
    }

    doc.setFillColor(252, 251, 250);
    doc.setDrawColor(220, 210, 215);

    const isComment = rec.incidentType === 'Comment Safety' || rec.category === 'Comment Safety' || rec.comment;
    const isImageDiff = rec.incidentType === 'Image Investigation' || rec.thumbnailUrl || (rec.content && rec.content.includes('Difference Detected'));

    let boxHeight = 44;
    if (isImageDiff) boxHeight = 52;
    if (isComment) boxHeight = 48;

    doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(38, 9, 33);
    doc.text(`Evidence Item #${idx + 1}: ${rec.title || rec.incidentType || 'Digital Artifact'}`, margin + 4, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(70, 70, 70);

    if (isComment) {
      doc.text(`• Original Comment: "${rec.comment || rec.content || 'N/A'}"`, margin + 6, y + 14);
      doc.text(`• Category: ${rec.category || 'N/A'} | Risk Level: ${rec.riskLevel || rec.risk_level || 'N/A'} (Score: ${rec.riskScore !== undefined ? rec.riskScore : (rec.risk_score || 'N/A')}/100)`, margin + 6, y + 21);
      const reasonsStr = Array.isArray(rec.reasons) ? rec.reasons.join(', ') : (rec.reasons || 'N/A');
      doc.text(`• Detection Reasons: ${reasonsStr}`, margin + 6, y + 28);
      doc.text(`• Timestamp: ${rec.timestamp ? new Date(rec.timestamp).toUTCString() : new Date().toUTCString()}`, margin + 6, y + 35);
      if (rec.sha256) {
        doc.setFont('courier', 'normal');
        doc.text(`• SHA-256: ${rec.sha256}`, margin + 6, y + 41);
      }
    } else if (isImageDiff) {
      const details = rec.evidenceDetails || {};
      const origRef = details.origName || rec.source || 'Original Reference Image';
      const suspRef = details.suspName || 'Suspected Variant Image';
      const diffPct = details.diffPercent !== undefined ? details.diffPercent : (rec.diffPercent || 'Recorded Delta');

      doc.text(`• Original Image Reference: ${origRef}`, margin + 6, y + 14);
      doc.text(`• Suspected Image Reference: ${suspRef}`, margin + 6, y + 20);
      doc.text(`• Visual Difference Analysis: Delta percentage computed across pixel grid`, margin + 6, y + 26);
      doc.text(`• Difference Percentage: ${diffPct}%`, margin + 6, y + 32);
      doc.text(`• Analysis Note: Visual differences do not by themselves prove AI manipulation or establish authenticity.`, margin + 6, y + 38);
      doc.text(`• Timestamp: ${rec.timestamp ? new Date(rec.timestamp).toUTCString() : new Date().toUTCString()}`, margin + 6, y + 44);
    } else {
      // Photo Protection or Generic Evidence
      doc.text(`• Content / Signature: ${rec.content || 'N/A'}`, margin + 6, y + 14);
      doc.text(`• Category: ${rec.category || 'N/A'} | Source: ${rec.source || 'N/A'}`, margin + 6, y + 20);
      doc.text(`• SHA-256 Fingerprint: ${rec.sha256 || 'N/A'}`, margin + 6, y + 26);
      doc.text(`• Timestamp: ${rec.timestamp ? new Date(rec.timestamp).toUTCString() : new Date().toUTCString()}`, margin + 6, y + 32);
    }

    y += boxHeight + 6;
  });

  // Check page height for next sections
  if (y > 210) {
    doc.addPage();
    renderHeader();
  }

  // 4. SUPPORTING INFORMATION
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(38, 9, 33);
  doc.text('4. SUPPORTING INFORMATION', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);

  const urlStr = primaryData.relevantUrl || 'None specified';
  const notesStr = primaryData.additionalNotes || primaryData.notes || 'None';

  doc.text(`• Relevant URL: ${urlStr}`, margin + 4, y + 2);
  doc.text(`• Platform / Channel: ${platformStr}`, margin + 4, y + 8);

  const splitNotes = doc.splitTextToSize(`• Additional Notes: ${notesStr}`, contentWidth - 4);
  doc.text(splitNotes, margin + 4, y + 14);

  y += (splitNotes.length * 5) + 12;

  if (y > 210) {
    doc.addPage();
    renderHeader();
  }

  // 5. EVIDENCE PRESERVATION
  doc.setFillColor(245, 243, 240);
  doc.setDrawColor(209, 195, 202);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(38, 9, 33);
  doc.text('5. EVIDENCE PRESERVATION PROTOCOL', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  doc.text('1. Preserve original content: Do not delete source files or original posts before sealing.', margin + 6, y + 12);
  doc.text('2. Save screenshots: Capture full browser screens showing date, time, and visible URL.', margin + 6, y + 17);
  doc.text('3. Record timestamps: Maintain chronological records of all interactions.', margin + 6, y + 22);
  doc.text('4. Save relevant URLs: Store direct permalinks to profiles, posts, and comments.', margin + 6, y + 27);

  y += 40;

  if (y > 240) {
    doc.addPage();
    renderHeader();
  }

  // 6. IMPORTANT NOTICE
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(248, 113, 113);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(153, 27, 27);
  doc.text('6. IMPORTANT NOTICE', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 40, 40);

  const noticeText = "This report is a user-generated evidence record intended to help organize and preserve information. It is not an official legal document and does not independently establish authenticity or legal liability.";
  const splitNotice = doc.splitTextToSize(noticeText, contentWidth - 8);
  doc.text(splitNotice, margin + 4, y + 12);

  // Add footers to all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    renderFooter(p, totalPages);
  }

  const filename = `abhedya_incident_report_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
