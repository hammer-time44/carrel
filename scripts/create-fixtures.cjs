const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

function generatePdf(numPages, textPrefix = 'Carrel Page') {
  const chunks = [];
  const xref = [];
  let offset = 0;

  function write(str) {
    const buf = Buffer.from(str, 'latin1');
    chunks.push(buf);
    const prev = offset;
    offset += buf.length;
    return prev;
  }

  write('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');

  // Object 1: Catalog
  xref[1] = offset;
  write('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Object 2: Pages root
  const pageObjIds = [];
  for (let i = 0; i < numPages; i++) {
    pageObjIds.push(`${4 + i * 2} 0 R`);
  }
  xref[2] = offset;
  write(`2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.join(' ')}] /Count ${numPages} >>\nendobj\n`);

  // Object 3: Font
  xref[3] = offset;
  write('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

  // For each page: Page obj + Content obj
  for (let i = 0; i < numPages; i++) {
    const pageNum = i + 1;
    const pageObjId = 4 + i * 2;
    const contentObjId = pageObjId + 1;

    // Page
    xref[pageObjId] = offset;
    write(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentObjId} 0 R /Resources << /Font << /F1 3 0 R >> >> >>\nendobj\n`
    );

    // Content stream
    const streamContent = `BT /F1 20 Tf 72 720 Td (${textPrefix} ${pageNum} of ${numPages}) Tj ET\n` +
      `BT /F1 12 Tf 72 680 Td (Minimalist high performance document study fixture) Tj ET\n`;
    const streamLen = Buffer.byteLength(streamContent, 'latin1');

    xref[contentObjId] = offset;
    write(
      `${contentObjId} 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamContent}endstream\nendobj\n`
    );
  }

  // Cross-reference table
  const startXref = offset;
  const totalObjs = 4 + numPages * 2;
  write(`xref\n0 ${totalObjs}\n`);
  write('0000000000 65535 f \n');
  for (let i = 1; i < totalObjs; i++) {
    const o = String(xref[i] || 0).padStart(10, '0');
    write(`${o} 00000 n \n`);
  }

  // Trailer
  write(`trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`);

  return Buffer.concat(chunks);
}

async function main() {
  const fixturesDir = path.join(__dirname, '..', 'tests', 'fixtures');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  // 1. Generate 300-page PDF
  const p300 = generatePdf(300, 'Carrel 300P Document');
  fs.writeFileSync(path.join(fixturesDir, 'sample-300p.pdf'), p300);
  console.log('Generated tests/fixtures/sample-300p.pdf (300 pages,', (p300.length / 1024).toFixed(1), 'KB)');

  // 2. Generate 500-page PDF
  const p500 = generatePdf(500, 'Carrel 500P Document');
  fs.writeFileSync(path.join(fixturesDir, 'sample-500p.pdf'), p500);
  console.log('Generated tests/fixtures/sample-500p.pdf (500 pages,', (p500.length / 1024).toFixed(1), 'KB)');

  // 3. Generate corrupted PPTX (valid zip, but missing ppt/presentation.xml)
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>');
  const corruptedPptx = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(path.join(fixturesDir, 'corrupted.pptx'), corruptedPptx);
  console.log('Generated tests/fixtures/corrupted.pptx (missing presentation.xml)');

  // 4. Ensure corrupted.pdf exists
  const corruptedPdf = Buffer.from('NOT A REAL PDF FILE CONTENTS', 'utf8');
  fs.writeFileSync(path.join(fixturesDir, 'corrupted.pdf'), corruptedPdf);
  console.log('Generated tests/fixtures/corrupted.pdf (invalid magic bytes)');

  // 5. Generate encrypted (password-protected) PDF
  const encryptedPdf = Buffer.from(
    '%PDF-1.4\n' +
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n' +
      '4 0 obj\n<< /Filter /Standard /V 1 /R 2 /O <0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef> /U <0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef> /P -44 >>\nendobj\n' +
      'xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000188 00000 n \n' +
      'trailer\n<< /Size 5 /Root 1 0 R /Encrypt 4 0 R /ID [<12345678901234567890123456789012><12345678901234567890123456789012>] >>\n' +
      'startxref\n380\n%%EOF\n',
    'latin1'
  );
  fs.writeFileSync(path.join(fixturesDir, 'encrypted.pdf'), encryptedPdf);
  console.log('Generated tests/fixtures/encrypted.pdf (password protected)');
}

main().catch(console.error);
