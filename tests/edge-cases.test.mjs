import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, demoState, validateState, upsertItem, advanceItem, totals, parseBackup, backupText } from '../src/domain.js';
import { InventoryRepository, STORAGE_KEY } from '../src/storage.js';
import { buildInventoryPdf } from '../src/pdf.js';

test('300 combinações de contagem válidas mantêm totais, limites e backup', () => {
  let seed = 47;
  const random = limit => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % limit; };
  for (let i = 0; i < 300; i++) {
    const quantity = random(1000) + 1, packed = random(quantity + 1), transported = random(packed + 1), checked = random(transported + 1);
    const state = emptyState(); state.items = [{ ...demoState().items[0], id: `teste-${i}`, quantity, packed, transported, checked, boxId: null }];
    const valid = validateState(state), stats = totals(valid);
    assert.equal(stats.remaining, quantity - checked); assert.ok(stats.percentage >= 0 && stats.percentage <= 100);
    assert.deepEqual(parseBackup(backupText(valid)), valid);
  }
});
test('reduzir a quantidade não descarta unidades conferidas silenciosamente', () => {
  const state = demoState(), original = structuredClone(state), item = state.items[0];
  assert.throws(() => upsertItem(state, { ...item, quantity: 2 })); assert.deepEqual(state, original);
});
test('avançar várias unidades respeita os limites e rejeita quantidade inválida', () => {
  const state = demoState();
  assert.equal(advanceItem(state, 'pratos', 'checked', 2).items[0].checked, 8);
  for (const amount of [0, -1, 0.5, NaN, Infinity, 3]) assert.throws(() => advanceItem(state, 'pratos', 'checked', amount));
});
test('estruturas de backup inválidas são rejeitadas', () => {
  for (const value of [null, [], '', 1, {}, { ...emptyState(), rooms: [] }, { ...emptyState(), boxes: {} }, { ...emptyState(), items: {} }]) assert.throws(() => parseBackup(JSON.stringify(value)));
});
test('campos desconhecidos e __proto__ não contaminam o estado importado', () => {
  const raw = JSON.parse(backupText(demoState())); raw.extra = 'ignorar'; raw.items[0].extra = 'ignorar';
  Object.defineProperty(raw, '__proto__', { value: { hacked: true }, enumerable: true });
  const clean = parseBackup(JSON.stringify(raw)); assert.equal(clean.extra, undefined); assert.equal(clean.items[0].extra, undefined); assert.equal({}.hacked, undefined);
});
test('quantidades no limite são aceitas; não finitos e tipos textuais são recusados', () => {
  const base = demoState(), item = { ...base.items[0], quantity: 99999, packed: 99999, transported: 99999, checked: 99999 };
  assert.equal(upsertItem(base, item).items[0].quantity, 99999);
  for (const quantity of [100000, NaN, Infinity, '8', null]) assert.throws(() => upsertItem(base, { ...item, quantity }));
});
test('falha de leitura não reinicia dados existentes', () => {
  const storage = { getItem() { throw new Error('SecurityError'); }, setItem() { assert.fail('Não deveria gravar'); } };
  const repository = new InventoryRepository(storage); assert.throws(() => repository.load(), /bloqueou/); assert.equal(repository.blocked, true);
});
test('backup inválido não altera snapshot nem armazenamento', () => {
  let raw = backupText(demoState()); const storage = { getItem: () => raw, setItem: (_, value) => { raw = value; } };
  const repository = new InventoryRepository(storage); repository.load(); const original = raw;
  assert.throws(() => repository.save({ ...emptyState(), rooms: [] })); assert.equal(raw, original); assert.equal(repository.snapshot, original);
});
test('PDF aceita observação válida de 600 caracteres com muitas quebras de linha', async () => {
  const state = demoState(); state.items[0].notes = 'x\n'.repeat(300);
  const bytes = await buildInventoryPdf(state); assert.ok(bytes.length > 1000);
});
