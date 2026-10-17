import { emptyState, validateState, parseBackup, backupText } from './domain.js';
export const STORAGE_KEY = 'casa-em-ordem:inventory:v1';
/** Persistência transacional: a UI só recebe o novo estado após setItem ter sucesso. */
export class InventoryRepository {
  constructor(storage) { this.storage = storage; this.snapshot = null; this.blocked = false; }
  load() {
    let raw;
    try { raw = this.storage.getItem(STORAGE_KEY); } catch (_) { this.blocked = true; throw new Error('O navegador bloqueou o armazenamento. Habilite o armazenamento local e recarregue a página.'); }
    this.snapshot = raw;
    try { const state = raw === null ? emptyState() : parseBackup(raw); this.blocked = false; return state; }
    catch (_) { this.blocked = true; throw new Error('Os dados salvos não puderam ser lidos. Exporte os dados originais em Dados e ajuda antes de recuperar um backup ou reiniciar.'); }
  }
  save(state, { recover = false } = {}) {
    if (this.blocked && !recover) throw new Error('Armazenamento bloqueado. Recupere um backup válido ou reinicie em Dados e ajuda.');
    let current;
    try { current = this.storage.getItem(STORAGE_KEY); } catch (_) { throw new Error('Não foi possível acessar o armazenamento local.'); }
    if (current !== this.snapshot) throw new Error('Outra aba alterou o inventário. Recarregue esta página antes de salvar.');
    const next = validateState({ ...state, revision: state.revision + 1 });
    const raw = backupText(next);
    try { this.storage.setItem(STORAGE_KEY, raw); } catch (_) { throw new Error('Não foi possível salvar. O armazenamento pode estar cheio ou bloqueado. Seus dados anteriores foram preservados.'); }
    this.snapshot = raw; this.blocked = false;
    return next;
  }
  raw() { return this.storage.getItem(STORAGE_KEY) || ''; }
}
