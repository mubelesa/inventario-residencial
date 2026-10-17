import test from 'node:test';
import assert from 'node:assert/strict';
import { InventoryRepository, STORAGE_KEY } from '../src/storage.js';
import { demoState, emptyState } from '../src/domain.js';
class MemoryStorage {
  map = new Map(); fail = false;
  getItem(key) { return this.map.get(key) ?? null; }
  setItem(key, value) { if (this.fail) throw new Error('QuotaExceededError'); this.map.set(key, value); }
}
test('persistência valida e incrementa a revisão', () => {
  const storage = new MemoryStorage(), repository = new InventoryRepository(storage); repository.load();
  const saved = repository.save(demoState()); assert.equal(saved.revision, 1);
  assert.deepEqual(new InventoryRepository(storage).load(), saved);
});
test('falha ao salvar preserva os dados anteriores e o snapshot', () => {
  const storage = new MemoryStorage(), repository = new InventoryRepository(storage); repository.load(); repository.save(demoState());
  const before = storage.getItem(STORAGE_KEY); storage.fail = true;
  assert.throws(() => repository.save(emptyState()), /preservados/); assert.equal(storage.getItem(STORAGE_KEY), before); assert.equal(repository.snapshot, before);
});
test('abas concorrentes não sobrescrevem alterações', () => {
  const storage = new MemoryStorage(), first = new InventoryRepository(storage), second = new InventoryRepository(storage);
  first.load(); second.load(); first.save(demoState()); assert.throws(() => second.save(emptyState()), /Outra aba/);
});
test('dados corrompidos não são substituídos automaticamente', () => {
  const storage = new MemoryStorage(); storage.setItem(STORAGE_KEY, 'dados corrompidos');
  const repository = new InventoryRepository(storage); assert.throws(() => repository.load(), /originais/);
  assert.throws(() => repository.save(emptyState()), /bloqueado/); assert.equal(repository.raw(), 'dados corrompidos');
});
test('recuperação explícita pode substituir dados corrompidos', () => {
  const storage = new MemoryStorage(); storage.setItem(STORAGE_KEY, 'corrompido');
  const repository = new InventoryRepository(storage); assert.throws(() => repository.load());
  repository.save(demoState(), { recover: true }); assert.equal(repository.blocked, false); assert.equal(repository.load().items.length, 6);
});
