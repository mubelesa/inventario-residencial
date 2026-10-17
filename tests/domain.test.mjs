import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, demoState, totals, validateState, upsertItem, upsertBox, removeBox, advanceItem, filterItems, parseBackup, backupText, itemStage } from '../src/domain.js';
const item = changes => ({ id: 'objeto-1', name: 'Pratos', room: 'Cozinha', category: 'Utensílios', quantity: 8, packed: 0, transported: 0, checked: 0, boxId: null, fragile: true, notes: '', ...changes });
test('inventário vazio inicia sem objetos e não divide por zero', () => {
  const state = emptyState(); assert.equal(state.items.length, 0); assert.equal(totals(state).percentage, 0); assert.equal(totals(state).remaining, 0);
});
test('oito pratos com seis conferidos deixam duas unidades pendentes', () => {
  const state = upsertItem(emptyState(), item({ packed: 8, transported: 8, checked: 6 }));
  assert.equal(totals(state).remaining, 2); assert.equal(totals(state).percentage, 75); assert.equal(itemStage(state.items[0]), 'conferencia');
});
test('quantidades inválidas e ordens inconsistentes são rejeitadas', () => {
  for (const changes of [{ quantity: 0 }, { quantity: 1.5 }, { packed: -1 }, { packed: 9 }, { packed: 3, transported: 4 }, { packed: 4, transported: 3, checked: 4 }]) {
    assert.throws(() => upsertItem(emptyState(), item(changes)));
  }
});
test('não é possível conferir antes de transportar', () => {
  const state = upsertItem(emptyState(), item({ packed: 8 }));
  assert.throws(() => advanceItem(state, 'objeto-1', 'checked'), /Transporte/);
});
test('não é possível transportar antes de embalar', () => {
  assert.throws(() => advanceItem(upsertItem(emptyState(), item({})), 'objeto-1', 'transported'), /Embale/);
});
test('progressão individual respeita os limites e não altera o estado anterior', () => {
  const original = upsertItem(emptyState(), item({ quantity: 1 }));
  const packed = advanceItem(original, 'objeto-1', 'packed');
  const moved = advanceItem(packed, 'objeto-1', 'transported');
  const checked = advanceItem(moved, 'objeto-1', 'checked');
  assert.equal(original.items[0].packed, 0); assert.equal(totals(checked).percentage, 100);
  assert.throws(() => advanceItem(checked, 'objeto-1', 'checked')); assert.throws(() => advanceItem(checked, 'objeto-1', 'qualquer'));
});
test('editar um objeto não duplica o cadastro', () => {
  const state = upsertItem(emptyState(), item({}));
  const edited = upsertItem(state, item({ name: 'Pratos brancos' }));
  assert.equal(edited.items.length, 1); assert.equal(edited.items[0].name, 'Pratos brancos');
});
test('caixa no destino não confere seus objetos automaticamente', () => {
  let state = upsertBox(emptyState(), { id: 'cx-1', name: 'CX-01', destination: 'Cozinha', status: 'preparando' });
  state = upsertItem(state, item({ boxId: 'cx-1', packed: 8, transported: 8 }));
  state = upsertBox(state, { ...state.boxes[0], status: 'destino' });
  assert.equal(state.items[0].checked, 0); assert.equal(totals(state).remaining, 8);
});
test('caixa com objetos não pode ser excluída; caixa vazia pode', () => {
  const state = demoState(); assert.throws(() => removeBox(state, 'box-cozinha'), /Realoque/);
  const emptyBox = upsertBox(state, { id: 'cx-vazia', name: 'Vazia', destination: '', status: 'preparando' });
  assert.equal(removeBox(emptyBox, 'cx-vazia').boxes.length, state.boxes.length);
});
test('caixa e cômodo inexistentes são rejeitados', () => {
  assert.throws(() => upsertItem(emptyState(), item({ boxId: 'nao-existe' })));
  assert.throws(() => upsertItem(emptyState(), item({ room: 'Não cadastrado' })));
});
test('importação não converte silenciosamente um indicador de fragilidade inválido', () => {
  assert.throws(() => upsertItem(emptyState(), item({ fragile: 'sim' })), /fragilidade/);
});
test('busca ignora acentos e considera cômodo e caixa', () => {
  const state = demoState(); assert.equal(filterItems(state, { query: 'luminaria' }).length, 1);
  assert.equal(filterItems(state, { query: 'CX-01' }).length, 2);
  assert.equal(filterItems(state, { room: 'Cozinha', fragile: true }).length, 2);
  assert.equal(filterItems(state, { stage: 'conferido' }).length, 1);
});
test('backup faz ida e volta sem perder dados', () => {
  const state = demoState(); assert.deepEqual(parseBackup(backupText(state)), state);
});
test('JSON inválido, versão incorreta e contagens inválidas são rejeitados', () => {
  assert.throws(() => parseBackup('{malformado'));
  assert.throws(() => parseBackup(JSON.stringify({ ...emptyState(), schemaVersion: 999 })), /Versão/);
  const state = demoState(); state.items[0].checked = 999; assert.throws(() => parseBackup(JSON.stringify(state)));
});
test('backup não pode conter identificadores ou cômodos duplicados', () => {
  const state = demoState(); state.items.push({ ...state.items[0] }); assert.throws(() => validateState(state), /duplicados/);
  assert.throws(() => validateState({ ...emptyState(), rooms: ['Sala', 'sála'] }), /duplicados/);
});
test('nomes de caixas duplicados são rejeitados sem diferenciar acentos e caixa', () => {
  const state = upsertBox(emptyState(), { id: 'cx-1', name: 'Caixa', destination: '', status: 'preparando' });
  assert.throws(() => upsertBox(state, { id: 'cx-2', name: 'CÁIXA', destination: '', status: 'preparando' }), /duplicados/);
});
test('limites de arquivo e de tamanho de campo são aplicados', () => {
  assert.throws(() => parseBackup(' '.repeat(3 * 1024 * 1024 + 1)), /grande/);
  assert.throws(() => upsertItem(emptyState(), item({ name: 'a'.repeat(101) })));
});
test('o sistema não grava um inventário que não possa ser restaurado pelo limite de backup', () => {
  const state = emptyState();
  state.items = Array.from({ length: 4000 }, (_, index) => item({ id: `item-${index}`, notes: 'á'.repeat(600) }));
  assert.throws(() => backupText(state), /limite de backup/);
});
