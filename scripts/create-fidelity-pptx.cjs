const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function createFidelityDeck() {
  const zip = new JSZip();

  // 1x1 transparent PNG for embedded image test
  const samplePngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9QzwAEjDAGYzAE' +
    'AM08B/4zN9vLAAAAAElFTkSuQmCC';
  const pngBuffer = Buffer.from(samplePngBase64, 'base64');

  // [Content_Types].xml
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide3.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide4.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide5.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide6.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide7.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide8.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/notesSlides/notesSlide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>
</Types>`
  );

  // _rels/.rels
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`
  );

  // ppt/_rels/presentation.xml.rels
  zip.file(
    'ppt/_rels/presentation.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide4.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide5.xml"/>
  <Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide6.xml"/>
  <Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide7.xml"/>
  <Relationship Id="rId8" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide8.xml"/>
</Relationships>`
  );

  // ppt/presentation.xml (16:9 widescreen = 12192000 x 6858000 EMUs)
  zip.file(
    'ppt/presentation.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rIdMaster" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/></p:sldMasterIdLst>
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
    <p:sldId id="257" r:id="rId2" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
    <p:sldId id="258" r:id="rId3" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
    <p:sldId id="259" r:id="rId4" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
    <p:sldId id="260" r:id="rId5" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
    <p:sldId id="261" r:id="rId6" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
    <p:sldId id="262" r:id="rId7" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
    <p:sldId id="263" r:id="rId8" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
  </p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000" type="screen16x9"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`
  );

  function wrapSlide(innerXml) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      ${innerXml}
    </p:spTree>
  </p:cSld>
</p:sld>`;
  }

  function textBox(id, title, body, x = 600000, y = 600000, cx = 11000000, cy = 5600000) {
    return `<p:sp>
      <p:nvSpPr><p:cNvPr id="${id}" name="Box-${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm></p:spPr>
      <p:txBody>
        <a:bodyPr/>
        <a:p><a:pPr><a:buNone/></a:pPr><a:r><a:rPr sz="2800" b="1"/><a:t>${title}</a:t></a:r></a:p>
        <a:p><a:r><a:rPr sz="1800"/><a:t>${body}</a:t></a:r></a:p>
      </p:txBody>
    </p:sp>`;
  }

  // Slide 1: Master/Layout Inheritance & Title
  zip.file(
    'ppt/slides/slide1.xml',
    wrapSlide(
      textBox(
        2,
        'Slide 1: Layout & Master Inheritance',
        'Demonstrates hierarchical slide layout and theme color inheritance with widescreen 16:9 projection.'
      )
    )
  );

  // Slide 2: Bullet points & rich text formatting
  zip.file(
    'ppt/slides/slide2.xml',
    wrapSlide(
      `<p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="600000" y="600000"/><a:ext cx="11000000" cy="1200000"/></a:xfrm></p:spPr>
        <p:txBody><a:bodyPr/><a:p><a:r><a:rPr sz="2800" b="1"/><a:t>Slide 2: Bullet Points &amp; Typography</a:t></a:r></a:p></p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="3" name="List"/><p:cNvSpPr/><p:nvPr/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="600000" y="2000000"/><a:ext cx="11000000" cy="4000000"/></a:xfrm></p:spPr>
        <p:txBody><a:bodyPr/>
          <a:p><a:pPr lvl="0"/><a:r><a:rPr sz="1800"/><a:t>• Primary bullet point item</a:t></a:r></a:p>
          <a:p><a:pPr lvl="1"/><a:r><a:rPr sz="1600" i="1"/><a:t>- Sub-bullet with italic styling</a:t></a:r></a:p>
          <a:p><a:pPr lvl="0"/><a:r><a:rPr sz="1800" b="1"/><a:t>• Bold emphasis item</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>`
    )
  );

  // Slide 3: Shapes & Gradients
  zip.file(
    'ppt/slides/slide3.xml',
    wrapSlide(
      textBox(2, 'Slide 3: Geometric Shapes & Vector Fill', 'Vectors and rectangles with custom fill attributes.') +
      `<p:sp>
        <p:nvSpPr><p:cNvPr id="4" name="RectShape"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="1000000" y="2400000"/><a:ext cx="3000000" cy="2000000"/></a:xfrm>
          <a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom>
          <a:solidFill><a:srgbClr val="3B82F6"/></a:solidFill>
        </p:spPr>
      </p:sp>`
    )
  );

  // Slide 4: Tables
  zip.file(
    'ppt/slides/slide4.xml',
    wrapSlide(
      textBox(2, 'Slide 4: Data Table', 'Structured tabular data with cells, borders, and alignments.') +
      `<p:graphicFrame>
        <p:nvGraphicFramePr><p:cNvPr id="5" name="Table 1"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr>
        <p:xfrm><a:off x="1000000" y="2400000"/><a:ext cx="8000000" cy="2000000"/></p:xfrm>
        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
            <a:tbl>
              <a:tblPr/><a:tblGrid><a:gridCol w="4000000"/><a:gridCol w="4000000"/></a:tblGrid>
              <a:tr h="500000">
                <a:tc><a:txBody><a:bodyPr/><a:p><a:r><a:rPr b="1"/><a:t>Header A</a:t></a:r></a:p></a:txBody></a:tc>
                <a:tc><a:txBody><a:bodyPr/><a:p><a:r><a:rPr b="1"/><a:t>Header B</a:t></a:r></a:p></a:txBody></a:tc>
              </a:tr>
              <a:tr h="500000">
                <a:tc><a:txBody><a:bodyPr/><a:p><a:r><a:t>Cell Value 1</a:t></a:r></a:p></a:txBody></a:tc>
                <a:tc><a:txBody><a:bodyPr/><a:p><a:r><a:t>Cell Value 2</a:t></a:r></a:p></a:txBody></a:tc>
              </a:tr>
            </a:tbl>
          </a:graphicData>
        </a:graphic>
      </p:graphicFrame>`
    )
  );

  // Slide 5: Embedded Media / Image
  zip.file('ppt/media/image1.png', pngBuffer);
  zip.file(
    'ppt/slides/_rels/slide5.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
</Relationships>`
  );
  zip.file(
    'ppt/slides/slide5.xml',
    wrapSlide(
      textBox(2, 'Slide 5: Embedded Image', 'Demonstrates PNG media blip resolution.') +
      `<p:pic>
        <p:nvPicPr><p:cNvPr id="6" name="Picture 1"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>
        <p:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
        <p:spPr><a:xfrm><a:off x="1000000" y="2400000"/><a:ext cx="2000000" cy="2000000"/></a:xfrm></p:spPr>
      </p:pic>`
    )
  );

  // Slide 6: Chart Representation
  zip.file(
    'ppt/slides/slide6.xml',
    wrapSlide(
      textBox(
        2,
        'Slide 6: Chart & Analytical Visuals',
        'Demonstrates chart graphic frame degradation and visualization container.'
      )
    )
  );

  // Slide 7: Non-embedded typography
  zip.file(
    'ppt/slides/slide7.xml',
    wrapSlide(
      textBox(
        2,
        'Slide 7: Non-Embedded Font Fallback',
        'Tests graceful font fallback to system serif and sans-serif stacks when custom typefaces are absent.'
      )
    )
  );

  // Slide 8: RTL & Non-Latin Scripts
  zip.file(
    'ppt/slides/slide8.xml',
    wrapSlide(
      textBox(
        2,
        'Slide 8: Multilingual & RTL Text Support',
        'Arabic: مرحبا بالعالم | Hebrew: שלום עולם | Devanagari: नमस्ते दुनिया | Japanese: こんにちは世界'
      )
    )
  );

  // Speaker notes for Slide 1
  zip.file(
    'ppt/notesSlides/notesSlide1.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvPr></p:nvGrpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Notes Placeholder"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="457200" y="457200"/><a:ext cx="5943600" cy="8229600"/></a:xfrm></p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:p><a:r><a:t>Speaker Note: Welcome audience, introduce Carrel study workspace and emphasize distraction-free reading principles.</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:notes>`
  );

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const outPath = path.join(__dirname, '..', 'tests', 'fixtures', 'fidelity-deck.pptx');
  fs.writeFileSync(outPath, buffer);
  console.log('Successfully generated tests/fixtures/fidelity-deck.pptx (8 test slides, speaker notes)');
}

createFidelityDeck().catch(console.error);

