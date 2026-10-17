import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from '../vendor/pdf-lib.esm.min.js';
import { buildInventoryPdf, wrapText } from '../src/pdf.js';
import { emptyState, demoState } from '../src/domain.js';
test('exporta PDF válido sem alterar as contagens', async () => {
  const state = demoState(), snapshot = structuredClone(state);
  const bytes = await buildInventoryPdf(state);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), '%PDF-');
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getTitle(), 'Inventário residencial - Mudança de exemplo');
  assert.ok(pdf.getPageCount() >= 1); assert.deepEqual(state, snapshot);
});
test('inventário vazio também gera documento imprimível', async () => {
  const pdf = await PDFDocument.load(await buildInventoryPdf(emptyState())); assert.equal(pdf.getPageCount(), 1);
});
test('paginação suporta muitos objetos, nomes longos e observações no limite', async () => {
  const state = demoState(), base = state.items[0];
  state.items = Array.from({ length: 40 }, (_, index) => ({ ...base, id: `item-${index}`, name: `Objeto ${index} ` + 'Nome extenso '.repeat(6), notes: 'W'.repeat(600) }));
  const pdf = await PDFDocument.load(await buildInventoryPdf(state)); assert.ok(pdf.getPageCount() > 5);
});
test('quebra palavras contínuas e identifica glifos indisponíveis', async () => {
  const pdf = await PDFDocument.create(), font = await pdf.embedFont(StandardFonts.Helvetica);
  const wrapped = wrapText('W'.repeat(200), font, 9, 100);
  assert.ok(wrapped.length > 1); assert.ok(wrapped.every(line => font.widthOfTextAtSize(line, 9) <= 100));
  assert.ok(wrapText('Caixa 📦', font, 9, 200).join(' ').includes('[U+1F4E6]'));
});
