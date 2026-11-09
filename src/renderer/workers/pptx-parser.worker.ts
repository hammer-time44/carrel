import JSZip from 'jszip';

export interface SlideTextItem {
  text: string;
  isTitle?: boolean;
  level?: number;
  bold?: boolean;
  italic?: boolean;
  size?: number;
}

export interface SlideTableData {
  rows: string[][];
}

export interface SlideShapeData {
  id: string;
  type: string;
  color?: string;
  text?: string;
}

export interface ParsedSlide {
  index: number;
  title: string;
  texts: SlideTextItem[];
  tables: SlideTableData[];
  shapes: SlideShapeData[];
  images: string[]; // base64 or blob data URLs
  notes?: string;
}

export interface PptxParseResult {
  success: boolean;
  slides?: ParsedSlide[];
  width?: number;
  height?: number;
  aspectRatio?: number;
  error?: string;
}

const MAX_UNCOMPRESSED_BYTES = 200 * 1024 * 1024; // 200 MB limit
const MAX_ENTRY_COUNT = 10000;
const PARSE_TIMEOUT_MS = 10000;

self.onmessage = async (e: MessageEvent<{ buffer: ArrayBuffer }>) => {
  const timeoutId = setTimeout(() => {
    self.postMessage({
      success: false,
      error: 'PPTX parsing timed out after 10 seconds. File may be overly complex or malicious.',
    } as PptxParseResult);
  }, PARSE_TIMEOUT_MS);

  try {
    const { buffer } = e.data;
    if (!buffer || buffer.byteLength === 0) {
      clearTimeout(timeoutId);
      self.postMessage({ success: false, error: 'Empty presentation buffer' } as PptxParseResult);
      return;
    }

    const zip = await JSZip.loadAsync(buffer);

    // Safety checks: Entry count and uncompressed size
    let totalUncompressedSize = 0;
    let entryCount = 0;

    const fileKeys = Object.keys(zip.files);
    if (fileKeys.length > MAX_ENTRY_COUNT) {
      clearTimeout(timeoutId);
      self.postMessage({
        success: false,
        error: `PPTX exceeds maximum entry count limit (${fileKeys.length} > ${MAX_ENTRY_COUNT})`,
      } as PptxParseResult);
      return;
    }

    for (const key of fileKeys) {
      const entry = zip.files[key];
      if (!entry.dir) {
        entryCount++;
        // Estimating uncompressed size
        totalUncompressedSize += (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize || 0;
        if (totalUncompressedSize > MAX_UNCOMPRESSED_BYTES) {
          clearTimeout(timeoutId);
          self.postMessage({
            success: false,
            error: `PPTX uncompressed size exceeds maximum safety limit of 200MB.`,
          } as PptxParseResult);
          return;
        }
      }
    }

    // 1. Parse presentation.xml for dimensions and slide ordering
    let slideWidth = 12192000;
    let slideHeight = 6858000;
    const orderedSlideRels: string[] = [];

    const presXmlFile = zip.file('ppt/presentation.xml');
    if (presXmlFile) {
      const presXml = await presXmlFile.async('string');
      const szMatch = presXml.match(/<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/i);
      if (szMatch) {
        slideWidth = parseInt(szMatch[1], 10) || 12192000;
        slideHeight = parseInt(szMatch[2], 10) || 6858000;
      }

      // Slide IDs
      const sldIdMatches = presXml.match(/<p:sldId[^>]*r:id="([^"]+)"/g) || [];
      sldIdMatches.forEach((m) => {
        const idMatch = m.match(/r:id="([^"]+)"/);
        if (idMatch) orderedSlideRels.push(idMatch[1]);
      });
    }

    // Map relationship IDs to file paths
    const relsMap = new Map<string, string>();
    const presRelsFile = zip.file('ppt/_rels/presentation.xml.rels');
    if (presRelsFile) {
      const presRelsXml = await presRelsFile.async('string');
      const relMatches = presRelsXml.match(/<Relationship[^>]*\/>/g) || [];
      relMatches.forEach((rm) => {
        const idM = rm.match(/Id="([^"]+)"/);
        const targetM = rm.match(/Target="([^"]+)"/);
        if (idM && targetM) {
          const target = targetM[1].startsWith('slides/') ? `ppt/${targetM[1]}` : `ppt/slides/${targetM[1]}`;
          relsMap.set(idM[1], target.replace('ppt/slides/slides/', 'ppt/slides/'));
        }
      });
    }

    // Determine slide files list
    let slideFilePaths: string[] = [];
    if (orderedSlideRels.length > 0) {
      orderedSlideRels.forEach((relId) => {
        const target = relsMap.get(relId);
        if (target && zip.file(target)) {
          slideFilePaths.push(target);
        }
      });
    }

    // Fallback: search all files matching ppt/slides/slide*.xml
    if (slideFilePaths.length === 0) {
      slideFilePaths = fileKeys
        .filter((k) => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
        .sort((a, b) => {
          const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
          return numA - numB;
        });
    }

    const parsedSlides: ParsedSlide[] = [];

    // Parse each slide
    for (let i = 0; i < slideFilePaths.length; i++) {
      const slidePath = slideFilePaths[i];
      const slideFile = zip.file(slidePath);
      if (!slideFile) continue;

      const slideXml = await slideFile.async('string');
      const slideTexts: SlideTextItem[] = [];
      const tables: SlideTableData[] = [];
      const shapes: SlideShapeData[] = [];
      const images: string[] = [];

      // Extract relationships for this slide (for images & notes)
      const slideRelPath = slidePath.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
      const slideRelsFile = zip.file(slideRelPath);
      const slideRelMap = new Map<string, string>();
      if (slideRelsFile) {
        const relsXml = await slideRelsFile.async('string');
        const rmMatches = relsXml.match(/<Relationship[^>]*\/>/g) || [];
        rmMatches.forEach((rm) => {
          const idM = rm.match(/Id="([^"]+)"/);
          const targetM = rm.match(/Target="([^"]+)"/);
          if (idM && targetM) {
            slideRelMap.set(idM[1], targetM[1]);
          }
        });
      }

      // Check for speaker notes: check rels or default path
      let notesText = '';
      const notesRel = Array.from(slideRelMap.entries()).find(([_, target]) =>
        target.includes('notesSlide')
      );
      let notesFilePath = '';
      if (notesRel) {
        notesFilePath = `ppt/${notesRel[1].replace('../', '')}`;
      } else {
        notesFilePath = `ppt/notesSlides/notesSlide${i + 1}.xml`;
      }
      const notesFile = zip.file(notesFilePath);
      if (notesFile) {
        try {
          const nXml = await notesFile.async('string');
          const nTexts = (nXml.match(/<a:t>([\s\S]*?)<\/a:t>/g) || []).map((t) =>
            t.replace(/<\/?a:t>/g, '').trim()
          );
          notesText = nTexts.join(' ').trim();
        } catch {
          // Ignore notes parse errors
        }
      }

      // Extract Title & Paragraphs
      let slideTitle = '';
      const shapeMatches = slideXml.match(/<p:sp>[\s\S]*?<\/p:sp>/g) || [];

      shapeMatches.forEach((spXml, shapeIdx) => {
        const isTitleShape = /type="(title|ctrTitle)"/i.test(spXml);
        const paraMatches = spXml.match(/<a:p>[\s\S]*?<\/a:p>/g) || [];

        // Check for fill color
        const colorMatch = spXml.match(/<a:srgbClr val="([A-Fa-f0-9]{6})"/);
        const shapeColor = colorMatch ? `#${colorMatch[1]}` : undefined;

        // Check geometry
        const geomMatch = spXml.match(/<a:prstGeom prst="([^"]+)"/);
        if (geomMatch && shapeColor) {
          shapes.push({
            id: `shape-${i}-${shapeIdx}`,
            type: geomMatch[1],
            color: shapeColor,
          });
        }

        paraMatches.forEach((pXml) => {
          const lvlMatch = pXml.match(/lvl="(\d+)"/);
          const level = lvlMatch ? parseInt(lvlMatch[1], 10) : 0;

          const textRunMatches = pXml.match(/<a:r>[\s\S]*?<\/a:r>/g) || [];
          textRunMatches.forEach((rXml) => {
            const bold = /b="1"/.test(rXml);
            const italic = /i="1"/.test(rXml);
            const szMatch = rXml.match(/sz="(\d+)"/);
            const size = szMatch ? parseInt(szMatch[1], 10) / 100 : undefined;

            const tMatch = rXml.match(/<a:t>([\s\S]*?)<\/a:t>/);
            if (tMatch) {
              const textContent = tMatch[1]
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'")
                .trim();

              if (textContent) {
                if (isTitleShape && !slideTitle) {
                  slideTitle = textContent;
                }
                slideTexts.push({
                  text: textContent,
                  isTitle: isTitleShape,
                  level,
                  bold,
                  italic,
                  size,
                });
              }
            }
          });
        });
      });

      // Extract Tables
      const tableMatches = slideXml.match(/<a:tbl>[\s\S]*?<\/a:tbl>/g) || [];
      tableMatches.forEach((tblXml) => {
        const rowMatches = tblXml.match(/<a:tr[^>]*>[\s\S]*?<\/a:tr>/g) || [];
        const tableRows: string[][] = [];

        rowMatches.forEach((trXml) => {
          const cellMatches = trXml.match(/<a:tc>[\s\S]*?<\/a:tc>/g) || [];
          const rowData = cellMatches.map((tcXml) => {
            const cTexts = (tcXml.match(/<a:t>([\s\S]*?)<\/a:t>/g) || []).map((t) =>
              t.replace(/<\/?a:t>/g, '').trim()
            );
            return cTexts.join(' ');
          });
          if (rowData.length > 0) {
            tableRows.push(rowData);
          }
        });

        if (tableRows.length > 0) {
          tables.push({ rows: tableRows });
        }
      });

      // Extract Images via blip references
      const blipMatches = slideXml.match(/<a:blip[^>]*r:embed="([^"]+)"/g) || [];
      for (const blip of blipMatches) {
        const m = blip.match(/r:embed="([^"]+)"/);
        if (m) {
          const relId = m[1];
          const targetRel = slideRelMap.get(relId);
          if (targetRel) {
            const imagePath = `ppt/${targetRel.replace('../', '')}`;
            const imgFile = zip.file(imagePath);
            if (imgFile) {
              try {
                const b64 = await imgFile.async('base64');
                const ext = imagePath.split('.').pop()?.toLowerCase() || 'png';
                const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
                images.push(`data:${mime};base64,${b64}`);
              } catch {
                // Ignore single image extraction error
              }
            }
          }
        }
      }

      if (!slideTitle) {
        slideTitle = slideTexts.find((t) => t.isTitle)?.text || slideTexts[0]?.text || `Slide ${i + 1}`;
      }

      parsedSlides.push({
        index: i,
        title: slideTitle,
        texts: slideTexts,
        tables,
        shapes,
        images,
        notes: notesText || undefined,
      });
    }

    clearTimeout(timeoutId);

    const calculatedAspect = slideHeight > 0 ? slideWidth / slideHeight : 16 / 9;

    self.postMessage({
      success: true,
      slides: parsedSlides,
      width: slideWidth,
      height: slideHeight,
      aspectRatio: calculatedAspect,
    } as PptxParseResult);
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : String(err);
    self.postMessage({
      success: false,
      error: `Failed to parse presentation: ${msg}`,
    } as PptxParseResult);
  }
};

