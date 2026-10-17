import { PDFDocument, StandardFonts, rgb } from '../vendor/pdf-lib.esm.min.js';
import { validateState, totals } from './domain.js';

const PAGE = [595.28, 841.89];
const MARGIN = 36;
const WIDTH = PAGE[0] - MARGIN * 2;
const COLUMNS = [22, 158, 102, 45, 45, 65, WIDTH - 437];
const BLACK = rgb(0.12, 0.16, 0.14);
const MUTED = rgb(0.36, 0.40, 0.38);
const LINE = rgb(0.77, 0.80, 0.78);
const SOFT = rgb(0.94, 0.96, 0.94);

/** Standard PDF fonts support Portuguese. Unavailable glyphs use visible Unicode codes. */
function printable(value, font) {
  return String(value).normalize('NFC').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').split('\n').map(line => [...line].map(char => {
    try { font.encodeText(char); return char; } catch (_) { return `[U+${char.codePointAt(0).toString(16).toUpperCase()}]`; }
  }).join('')).join('\n');
}
export function wrapText(value, font, size, width) {
  const result = [];
  for (const paragraph of printable(value, font).split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) { line = candidate; continue; }
      if (line) { result.push(line); line = ''; }
      for (const char of word) {
        if (line && font.widthOfTextAtSize(line + char, size) > width) { result.push(line); line = ''; }
        line += char;
      }
    }
    result.push(line);
  }
  return result.length ? result : [''];
}

/** Creates a printable snapshot of the full inventory; never mutates user data. */
export async function buildInventoryPdf(rawState, { generatedAt = new Date() } = {}) {
  const state = validateState(rawState);
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle(`Inventário residencial - ${state.moveName}`);
  pdf.setAuthor('Casa em Ordem'); pdf.setSubject('Inventário para conferência manual de mudança'); pdf.setCreationDate(generatedAt);
  const total = totals(state);
  let page, y, currentRoom = '';
  const draw = (text, x, top, size = 9, font = regular, color = BLACK) => page.drawText(printable(text, font), { x, y: top - size, size, font, color });
  function lines(text, x, top, width, size = 9, font = regular, color = BLACK) {
    const wrapped = wrapText(text, font, size, width); wrapped.forEach((line, index) => draw(line, x, top - index * (size + 3), size, font, color)); return wrapped.length * (size + 3);
  }
  function tableHeading() {
    page.drawRectangle({ x: MARGIN, y: y - 25, width: WIDTH, height: 25, color: SOFT });
    let x = MARGIN;
    ['', 'Objeto / observações', 'Caixa', 'Previsto', 'Digital', 'Pendente', 'No papel'].forEach((title, index) => {
      draw(title, x + 5, y - 8, 7.5, bold); x += COLUMNS[index];
    });
    y -= 25;
  }
  function roomHeading(continued = false) {
    y -= 15;
    const height = lines(`${currentRoom}${continued ? ' (continuação)' : ''}`, MARGIN, y, WIDTH, 11, bold);
    y -= height + 7; tableHeading();
  }
  function newPage() {
    page = pdf.addPage(PAGE); y = PAGE[1] - MARGIN;
    draw('CASA EM ORDEM / CONFERÊNCIA IMPRESSA', MARGIN, y, 8, bold, MUTED); y -= 20;
    const headingHeight = lines(state.moveName, MARGIN, y, WIDTH, 17, bold); y -= headingHeight + 6;
    draw(`Emitido em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(generatedAt)}`, MARGIN, y, 8, regular, MUTED); y -= 19;
    draw(`${state.items.length} cadastros | ${total.quantity} unidades | ${total.checked} conferidas no sistema | ${total.remaining} pendentes`, MARGIN, y, 8.5); y -= 19;
    y -= lines('Marque a caixa ao verificar o objeto e anote a quantidade na coluna "No papel". "Digital" mostra a conferência salva no momento da exportação. As marcações no papel não atualizam o sistema.', MARGIN, y, WIDTH, 8, regular, MUTED) + 5;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE[0] - MARGIN, y }, thickness: 0.7, color: LINE });
  }
  newPage();
  if (!state.items.length) { y -= 25; draw('Nenhum objeto cadastrado neste inventário.', MARGIN, y, 11); }
  function rowLayout(item) {
    const box = state.boxes.find(entry => entry.id === item.boxId);
    const nameLines = wrapText(item.name, bold, 9, COLUMNS[1] - 12);
    const metadata = `${item.category}${item.fragile ? ' | FRÁGIL' : ''}\nEmbalados: ${item.packed} | Transportados: ${item.transported}`;
    const metaLines = wrapText(metadata, regular, 7.5, COLUMNS[1] - 12);
      const noteLines = item.notes ? wrapText(item.notes.replace(/\s+/g, ' ').trim(), regular, 8, COLUMNS[1] - 12) : [];
    const boxLines = wrapText(box?.name || 'Sem caixa', regular, 8, COLUMNS[2] - 12);
    const destinationLines = box?.destination ? wrapText(`Destino: ${box.destination}`, regular, 7.5, COLUMNS[2] - 12) : [];
    const contentHeight = Math.max(nameLines.length * 12 + metaLines.length * 10.5 + (noteLines.length ? 5 + noteLines.length * 11 : 0), boxLines.length * 11 + destinationLines.length * 10.5 + 5);
    return { nameLines, metaLines, noteLines, boxLines, destinationLines, height: Math.max(48, contentHeight + 17) };
  }
  for (const room of state.rooms) {
    const items = state.items.filter(item => item.room === room).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    if (!items.length) continue;
    currentRoom = room;
    // Keep room label, table headings and the first row together.
    const roomHeight = wrapText(room, bold, 11, WIDTH).length * 14 + 47;
    if (y - roomHeight - rowLayout(items[0]).height < 72) newPage();
    roomHeading();
    for (const item of items) {
      const { nameLines, metaLines, noteLines, boxLines, destinationLines, height } = rowLayout(item);
      if (y - height < 72) { newPage(); roomHeading(true); }
      // Field limits cap a row below a page, even for unbroken 600-character notes.
      if (y - height < 60) throw new Error('Um objeto contém texto demais para a página. Reduza as observações antes de exportar.');
      const top = y;
      let x = MARGIN;
      page.drawRectangle({ x: x + 5, y: top - 21, width: 10, height: 10, borderColor: MUTED, borderWidth: 0.7 });
      x += COLUMNS[0]; let textY = top - 7;
      for (const line of nameLines) { draw(line, x + 5, textY, 9, bold); textY -= 12; }
      for (const line of metaLines) { draw(line, x + 5, textY, 7.5, regular, MUTED); textY -= 10.5; }
      if (noteLines.length) { textY -= 5; for (const line of noteLines) { draw(line, x + 5, textY, 8, regular, MUTED); textY -= 11; } }
      x += COLUMNS[1]; textY = top - 8;
      for (const line of boxLines) { draw(line, x + 5, textY, 8); textY -= 11; }
      for (const line of destinationLines) { draw(line, x + 5, textY - 4, 7.5, regular, MUTED); textY -= 10.5; }
      x += COLUMNS[2];
      for (const [value, index] of [[item.quantity, 3], [item.checked, 4], [item.quantity - item.checked, 5]]) {
        draw(String(value), x + 5, top - 10, 9); x += COLUMNS[index];
      }
      page.drawLine({ start: { x: x + 5, y: top - 27 }, end: { x: x + COLUMNS[6] - 8, y: top - 27 }, thickness: 0.6, color: MUTED });
      y -= height;
      page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE[0] - MARGIN, y }, thickness: 0.4, color: LINE });
    }
  }
  const pages = pdf.getPages();
  for (const [index, sheet] of pages.entries()) {
    sheet.drawLine({ start: { x: MARGIN, y: 48 }, end: { x: PAGE[0] - MARGIN, y: 48 }, thickness: 0.5, color: LINE });
    sheet.drawText('Conferido por: ________________________   Data: ____ / ____ / ______', { x: MARGIN, y: 35, size: 8, font: regular, color: MUTED });
    sheet.drawText(`${index + 1} / ${pages.length}`, { x: PAGE[0] - MARGIN - 35, y: 35, size: 8, font: regular, color: MUTED });
    sheet.drawText('Protótipo experimental. Pendências não comprovam perda. PDF completo, sem filtros da tela.', { x: MARGIN, y: 19, size: 6.5, font: regular, color: MUTED });
  }
  return pdf.save();
}
