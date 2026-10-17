/** Regras de negócio puras. Não dependem de navegador, armazenamento ou interface. */
export const SCHEMA_VERSION = 1;
export const MAX_ITEMS = 5000;
export const MAX_BOXES = 500;
export const MAX_BACKUP_BYTES = 3 * 1024 * 1024;
export const CATEGORIES = ['Móveis', 'Eletrônicos', 'Utensílios', 'Roupas', 'Livros', 'Decoração', 'Documentos', 'Outros'];
export const BOX_STATUSES = ['preparando', 'transporte', 'destino'];
export const DEFAULT_ROOMS = ['Sala', 'Cozinha', 'Quarto', 'Banheiro', 'Escritório', 'Lavanderia'];

function fail(message) { throw new Error(message); }
function text(value, label, max = 100, required = true) {
  if (typeof value !== 'string') fail(`${label}: informe um texto válido.`);
  const clean = value.trim();
  if (required && !clean) fail(`${label} é obrigatório.`);
  if (clean.length > max) fail(`${label} deve ter até ${max} caracteres.`);
  return clean;
}
function count(value, label, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum || value > 99999) fail(`${label}: use um número inteiro entre ${minimum} e 99999.`);
  return value;
}
function id(value, label) {
  const clean = text(value, label, 80);
  if (!/^[a-zA-Z0-9_-]+$/.test(clean)) fail(`${label} inválido.`);
  return clean;
}
export function normalize(value) { return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
export function emptyState() { return { schemaVersion: SCHEMA_VERSION, revision: 0, moveName: 'Minha mudança', rooms: [...DEFAULT_ROOMS], boxes: [], items: [] }; }

export function validateBox(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('Caixa inválida.');
  if (!BOX_STATUSES.includes(raw.status)) fail('Situação da caixa inválida.');
  return { id: id(raw.id, 'Identificador da caixa'), name: text(raw.name, 'Nome da caixa', 60), destination: text(raw.destination, 'Destino da caixa', 100, false), status: raw.status };
}
export function validateItem(raw, state) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('Objeto inválido.');
  if (typeof raw.fragile !== 'boolean') fail('O indicador de fragilidade deve ser verdadeiro ou falso.');
  const result = {
    id: id(raw.id, 'Identificador do objeto'), name: text(raw.name, 'Nome do objeto', 100),
    room: text(raw.room, 'Cômodo', 60), category: text(raw.category, 'Categoria', 60),
    quantity: count(raw.quantity, 'Quantidade', 1), packed: count(raw.packed, 'Quantidade embalada'),
    transported: count(raw.transported, 'Quantidade transportada'), checked: count(raw.checked, 'Quantidade conferida'),
    boxId: raw.boxId === null || raw.boxId === '' ? null : id(raw.boxId, 'Caixa'),
    fragile: raw.fragile === true, notes: text(raw.notes, 'Observações', 600, false)
  };
  if (!state.rooms.includes(result.room)) fail('Selecione um cômodo cadastrado.');
  if (!CATEGORIES.includes(result.category)) fail('Selecione uma categoria válida.');
  if (result.boxId && !state.boxes.some(box => box.id === result.boxId)) fail('A caixa selecionada não existe.');
  if (result.checked > result.transported || result.transported > result.packed || result.packed > result.quantity) {
    fail('Respeite a ordem: conferidos ≤ transportados ≤ embalados ≤ quantidade total.');
  }
  return result;
}
export function validateState(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('O arquivo não contém um inventário válido.');
  if (raw.schemaVersion !== SCHEMA_VERSION) fail('Versão de backup não suportada.');
  if (!Array.isArray(raw.rooms) || !raw.rooms.length || raw.rooms.length > 100) fail('Cadastre de 1 a 100 cômodos.');
  const rooms = raw.rooms.map(room => text(room, 'Cômodo', 60));
  if (new Set(rooms.map(normalize)).size !== rooms.length) fail('Existem cômodos duplicados.');
  if (!Array.isArray(raw.boxes) || raw.boxes.length > MAX_BOXES) fail(`Limite de ${MAX_BOXES} caixas por inventário.`);
  if (!Array.isArray(raw.items) || raw.items.length > MAX_ITEMS) fail(`Limite de ${MAX_ITEMS} objetos por inventário.`);
  const state = { schemaVersion: SCHEMA_VERSION, revision: Number.isSafeInteger(raw.revision) && raw.revision >= 0 ? raw.revision : 0,
    moveName: text(raw.moveName, 'Nome da mudança', 80), rooms, boxes: raw.boxes.map(validateBox), items: [] };
  if (new Set(state.boxes.map(box => box.id)).size !== state.boxes.length) fail('Existem identificadores de caixa duplicados.');
  if (new Set(state.boxes.map(box => normalize(box.name))).size !== state.boxes.length) fail('Existem nomes de caixa duplicados.');
  state.items = raw.items.map(item => validateItem(item, state));
  if (new Set(state.items.map(item => item.id)).size !== state.items.length) fail('Existem identificadores de objeto duplicados.');
  return state;
}
export function upsertItem(state, item) {
  const clean = validateItem(item, state);
  const existing = state.items.some(entry => entry.id === clean.id);
  return validateState({ ...state, items: existing ? state.items.map(entry => entry.id === clean.id ? clean : entry) : [...state.items, clean] });
}
export function upsertBox(state, box) {
  const clean = validateBox(box);
  const existing = state.boxes.some(entry => entry.id === clean.id);
  return validateState({ ...state, boxes: existing ? state.boxes.map(entry => entry.id === clean.id ? clean : entry) : [...state.boxes, clean] });
}
export function removeBox(state, boxId) {
  if (state.items.some(item => item.boxId === boxId)) fail('Esta caixa contém objetos. Realoque-os antes de excluir a caixa.');
  return validateState({ ...state, boxes: state.boxes.filter(box => box.id !== boxId) });
}
export function advanceItem(state, itemId, stage, amount = 1) {
  const item = state.items.find(entry => entry.id === itemId);
  if (!item) fail('Objeto não encontrado.');
  if (!['packed', 'transported', 'checked'].includes(stage)) fail('Etapa inválida.');
  count(amount, 'Quantidade a avançar', 1);
  const limit = stage === 'packed' ? item.quantity : stage === 'transported' ? item.packed : item.transported;
  if (item[stage] + amount > limit) fail(stage === 'checked' ? 'Transporte as unidades antes de conferir no destino.' : stage === 'transported' ? 'Embale as unidades antes de transportar.' : 'Todos os itens deste cadastro já foram embalados.');
  return upsertItem(state, { ...item, [stage]: item[stage] + amount });
}
export function itemStage(item) {
  if (item.checked === item.quantity) return 'conferido';
  if (item.transported > 0) return 'conferencia';
  if (item.packed > 0) return 'embalado';
  return 'pendente';
}
export function totals(state) {
  const result = state.items.reduce((sum, item) => {
    for (const key of ['quantity', 'packed', 'transported', 'checked']) sum[key] += item[key];
    return sum;
  }, { quantity: 0, packed: 0, transported: 0, checked: 0 });
  return { ...result, remaining: result.quantity - result.checked, unpacked: result.quantity - result.packed,
    percentage: result.quantity ? Math.round(result.checked / result.quantity * 100) : 0 };
}
export function filterItems(state, { query = '', room = '', stage = '', fragile = false } = {}) {
  const term = normalize(query);
  return state.items.filter(item => {
    const box = state.boxes.find(entry => entry.id === item.boxId);
    const searchable = normalize([item.name, item.notes, item.room, item.category, box?.name || ''].join(' '));
    return (!term || searchable.includes(term)) && (!room || item.room === room) && (!stage || itemStage(item) === stage)
      && (!fragile || item.fragile);
  });
}
export function parseBackup(content) {
  if (new TextEncoder().encode(content).byteLength > MAX_BACKUP_BYTES) fail('Backup muito grande. O limite é 3 MB.');
  let parsed;
  try { parsed = JSON.parse(content); } catch (_) { fail('O arquivo não é um JSON válido.'); }
  return validateState(parsed);
}
export function backupText(state) {
  const content = JSON.stringify({ ...validateState(state), exportedAt: new Date().toISOString() }, null, 2);
  if (new TextEncoder().encode(content).byteLength > MAX_BACKUP_BYTES) fail('O inventário excede o limite de backup de 3 MB. Reduza os textos ou a quantidade de cadastros antes de salvar.');
  return content;
}

export function demoState() {
  return validateState({ ...emptyState(), moveName: 'Mudança de exemplo', boxes: [
    { id: 'box-cozinha', name: 'CX-01 · Cozinha', destination: 'Cozinha', status: 'destino' },
    { id: 'box-livros', name: 'CX-02 · Livros', destination: 'Escritório', status: 'transporte' },
    { id: 'box-sala', name: 'CX-03 · Sala', destination: 'Sala', status: 'preparando' }
  ], items: [
    { id: 'pratos', name: 'Pratos de jantar', room: 'Cozinha', category: 'Utensílios', quantity: 8, packed: 8, transported: 8, checked: 6, boxId: 'box-cozinha', fragile: true, notes: 'Separar com papel. Faltam conferir duas unidades.' },
    { id: 'canecas', name: 'Canecas', room: 'Cozinha', category: 'Utensílios', quantity: 4, packed: 4, transported: 4, checked: 4, boxId: 'box-cozinha', fragile: true, notes: '' },
    { id: 'livros', name: 'Livros de programação', room: 'Escritório', category: 'Livros', quantity: 6, packed: 6, transported: 6, checked: 0, boxId: 'box-livros', fragile: false, notes: 'Manter longe de umidade.' },
    { id: 'luminaria', name: 'Luminária de mesa', room: 'Sala', category: 'Decoração', quantity: 1, packed: 1, transported: 0, checked: 0, boxId: 'box-sala', fragile: true, notes: 'Retirar a lâmpada antes do transporte.' },
    { id: 'cadeiras', name: 'Cadeiras da sala', room: 'Sala', category: 'Móveis', quantity: 4, packed: 0, transported: 0, checked: 0, boxId: null, fragile: false, notes: 'Proteger os pés e o encosto.' },
    { id: 'monitor', name: 'Monitor', room: 'Escritório', category: 'Eletrônicos', quantity: 1, packed: 0, transported: 0, checked: 0, boxId: null, fragile: true, notes: '' }
  ] });
}
