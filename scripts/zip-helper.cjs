const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal pure Node.js ZIP archive writer with POSIX '/' paths
function createZip(files, outputPath) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  // CRC32 table
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c;
  }
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  for (const file of files) {
    const filenameBuf = Buffer.from(file.name.replace(/\\/g, '/'), 'utf8');
    const dataBuf = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, 'utf8');
    const compressed = zlib.deflateRawSync(dataBuf);
    const crc = crc32(dataBuf);

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30 + filenameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Signature
    localHeader.writeUInt16LE(20, 4);          // Version needed
    localHeader.writeUInt16LE(0, 6);           // Flags
    localHeader.writeUInt16LE(8, 8);           // Compression: Deflate
    localHeader.writeUInt16LE(0, 10);          // Mod time
    localHeader.writeUInt16LE(0, 12);          // Mod date
    localHeader.writeUInt32LE(crc, 14);        // CRC32
    localHeader.writeUInt32LE(compressed.length, 18); // Comp size
    localHeader.writeUInt32LE(dataBuf.length, 22);    // Uncomp size
    localHeader.writeUInt16LE(filenameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);          // Extra len
    filenameBuf.copy(localHeader, 30);

    // Central directory header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46 + filenameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Signature
    centralHeader.writeUInt16LE(20, 4);          // Version made by
    centralHeader.writeUInt16LE(20, 6);          // Version needed
    centralHeader.writeUInt16LE(0, 8);           // Flags
    centralHeader.writeUInt16LE(8, 10);          // Deflate
    centralHeader.writeUInt16LE(0, 12);          // Mod time
    centralHeader.writeUInt16LE(0, 14);          // Mod date
    centralHeader.writeUInt32LE(crc, 16);        // CRC32
    centralHeader.writeUInt32LE(compressed.length, 20); // Comp size
    centralHeader.writeUInt32LE(dataBuf.length, 24);    // Uncomp size
    centralHeader.writeUInt16LE(filenameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);          // Extra
    centralHeader.writeUInt16LE(0, 32);          // Comment len
    centralHeader.writeUInt16LE(0, 34);          // Disk start
    centralHeader.writeUInt16LE(0, 36);          // Internal attr
    centralHeader.writeUInt32LE(0, 38);          // External attr
    centralHeader.writeUInt32LE(offset, 42);     // Relative offset of local header
    filenameBuf.copy(centralHeader, 46);

    localHeaders.push(localHeader, compressed);
    centralHeaders.push(centralHeader);

    offset += localHeader.length + compressed.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const h of centralHeaders) centralDirSize += h.length;

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);                     // Disk num
  eocd.writeUInt16LE(0, 6);                     // Central dir disk
  eocd.writeUInt16LE(files.length, 8);          // Entries on this disk
  eocd.writeUInt16LE(files.length, 10);         // Total entries
  eocd.writeUInt32LE(centralDirSize, 12);       // Size of central dir
  eocd.writeUInt32LE(centralDirOffset, 16);     // Offset of central dir
  eocd.writeUInt16LE(0, 20);                    // Comment length

  const finalBuf = Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
  fs.writeFileSync(outputPath, finalBuf);
  return finalBuf;
}

module.exports = { createZip };

