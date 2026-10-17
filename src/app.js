import { CATEGORIES, DEFAULT_ROOMS, MAX_BACKUP_BYTES, emptyState, demoState, normalize, validateState, upsertItem, upsertBox, removeBox, advanceItem, itemStage, totals, filterItems, parseBackup, backupText } from './domain.js';
import { InventoryRepository, STORAGE_KEY } from './storage.js';

const $ = selector => document.querySelector(selector);
const main = $('#main');
const VIEWS = { inventario: 'Inventário', caixas: 'Caixas', conferencia: 'Conferência', dados: 'Dados e ajuda' };
const STAGES = { pendente: ['A embalar', 'orange'], embalado: ['Embalagem iniciada', 'blue'], conferencia: ['A conferir', 'blue'], conferido: ['Conferido', 'green'] };
const BOX_LABELS = { preparando: 'A preparar', transporte: 'Em transporte', destino: 'No destino' };
let repository;
try { repository = new InventoryRepository(window.localStorage); }
catch (_) { repository = new InventoryRepository({ getItem() { throw new Error('Bloqueado'); }, setItem() { throw new Error('Bloqueado'); } }); }
let state;
let startupError = '';
try { state = repository.load(); } catch (error) { state = emptyState(); startupError = error.message; }
let view = VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : 'inventario';
let filters = { query: '', room: '', stage: '', fragile: false, boxId: '', includeChecked: false };
let toastTimer;
let confirmCallback;
let confirmRequiresText = false;
let lastDialogFocus;
function node(tag, className = '', text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('icon'); svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use'); use.setAttribute('href', `#i-${name}`); svg.append(use); return svg;
}
function button(text, action, className = 'button secondary', iconName) {
  const result = node('button', className); result.type = 'button';
  if (iconName) result.append(icon(iconName)); result.append(document.createTextNode(text)); result.addEventListener('click', action); return result;
}
function iconButton(label, name, action) {
  const result = button('', action, 'icon-button', name); result.setAttribute('aria-label', label); result.title = label; return result;
}
function badge(text, color = '', iconName) { const result = node('span', `badge ${color}`); if (iconName) result.append(icon(iconName)); result.append(document.createTextNode(text)); return result; }
function option(value, label) { const result = node('option', '', label); result.value = value; return result; }
function showToast(text) { const toast = $('#toast'); toast.textContent = text; toast.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 5500); }
function showGlobalError(text) {
  const target = $('#global-error'); target.replaceChildren(node('span', '', text));
  target.append(button('Recarregar página', () => location.reload(), 'button secondary')); target.hidden = false;
}
function withError(action) { return () => { try { action(); } catch (error) { showToast(error.message); } }; }
function persist(next, message, recover = false) {
  state = repository.save(next, { recover });
  startupError = ''; $('#global-error').hidden = true;
  render(); if (message) showToast(message);
}
function saveAction(transform, message) { return withError(() => persist(transform(state), message)); }
function uuid() { return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function openDialog(dialog) { lastDialogFocus = document.activeElement; dialog.showModal(); }
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelectorAll('[data-close]').forEach(control => control.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('close', () => { if (lastDialogFocus?.isConnected) lastDialogFocus.focus(); else main.focus({ preventScroll: true }); });
});
function confirmAction({ title, message, label = 'Confirmar', typed = false, danger = false, action }) {
  $('#confirm-title').textContent = title; $('#confirm-message').textContent = message;
  $('#confirm-submit').textContent = label; $('#confirm-submit').className = `button ${danger ? 'danger' : 'primary'}`;
  $('#confirm-typed-label').hidden = !typed; $('#confirm-typed').value = ''; $('#confirm-typed').required = typed;
  $('#confirm-error').hidden = true; confirmRequiresText = typed; confirmCallback = action; openDialog($('#confirm-dialog'));
}
$('#confirm-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    if (confirmRequiresText && $('#confirm-typed').value !== 'APAGAR') throw new Error('Digite APAGAR exatamente para confirmar a substituição dos dados.');
    confirmCallback(); $('#confirm-dialog').close();
  } catch (error) { $('#confirm-error').textContent = error.message; $('#confirm-error').hidden = false; }
});

function openItem(item = null) {
  const form = $('#item-form'); form.reset(); $('#item-form-error').hidden = true;
  $('#item-dialog-title').textContent = item ? 'Editar objeto' : 'Adicionar objeto';
  const values = item || { id: uuid(), name: '', room: filters.room || state.rooms[0], category: 'Outros', quantity: 1, packed: 0, transported: 0, checked: 0, boxId: filters.boxId || '', fragile: false, notes: '' };
  const room = form.elements.namedItem('room'); room.replaceChildren(...state.rooms.map(value => option(value, value)));
  const category = form.elements.namedItem('category'); category.replaceChildren(...CATEGORIES.map(value => option(value, value)));
  const box = form.elements.namedItem('boxId'); box.replaceChildren(option('', 'Sem caixa'), ...state.boxes.map(entry => option(entry.id, entry.name)));
  for (const [key, value] of Object.entries(values)) {
    const field = form.elements.namedItem(key); if (!field) continue;
    if (field.type === 'checkbox') field.checked = value; else field.value = value ?? '';
  }
  openDialog($('#item-dialog')); form.elements.namedItem('name').focus();
}
$('#item-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const data = new FormData(event.currentTarget); const item = Object.fromEntries(data);
    for (const field of ['quantity', 'packed', 'transported', 'checked']) item[field] = data.get(field) === '' ? NaN : Number(data.get(field));
    item.fragile = data.has('fragile');
    persist(upsertItem(state, item), 'Objeto salvo neste navegador.'); $('#item-dialog').close();
  } catch (error) { $('#item-form-error').textContent = error.message; $('#item-form-error').hidden = false; }
});
function openBox(box = null) {
  const form = $('#box-form'); form.reset(); $('#box-form-error').hidden = true;
  $('#box-dialog-title').textContent = box ? 'Editar caixa' : 'Adicionar caixa';
  for (const [key, value] of Object.entries(box || { id: uuid(), name: '', destination: '', status: 'preparando' })) form.elements.namedItem(key).value = value;
  openDialog($('#box-dialog')); form.elements.namedItem('name').focus();
}
$('#box-form').addEventListener('submit', event => {
  event.preventDefault();
  try { persist(upsertBox(state, Object.fromEntries(new FormData(event.currentTarget))), 'Caixa salva.'); $('#box-dialog').close(); }
  catch (error) { $('#box-form-error').textContent = error.message; $('#box-form-error').hidden = false; }
});
function deleteItem(item) {
  confirmAction({ title: 'Excluir objeto?', message: `“${item.name}” e suas ${item.quantity} unidade(s) serão removidos do inventário. Esta ação não pode ser desfeita.`, label: 'Excluir objeto', danger: true,
    action: () => persist({ ...state, items: state.items.filter(entry => entry.id !== item.id) }, 'Objeto excluído.') });
}
function deleteBox(box) {
  if (state.items.some(item => item.boxId === box.id)) return showToast('Realoque os objetos desta caixa antes de excluí-la.');
  confirmAction({ title: 'Excluir caixa?', message: `A caixa “${box.name}” será removida.`, label: 'Excluir caixa', danger: true, action: () => persist(removeBox(state, box.id), 'Caixa excluída.') });
}
function go(target) { if (view === target) render(); else location.hash = target; }
window.addEventListener('hashchange', () => { view = VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : 'inventario'; render(); window.scrollTo({ top: 0 }); main.focus({ preventScroll: true }); });

function pageHeading(eyebrow, title, description, actions = []) {
  const heading = node('div', 'page-heading'), copy = node('div');
  copy.append(node('p', 'eyebrow', eyebrow), node('h1', '', title), node('p', '', description));
  heading.append(copy); if (actions.length) { const group = node('div', 'heading-actions'); group.append(...actions); heading.append(group); } return heading;
}
function statCard(label, value, caption, iconName, color = '') {
  const card = node('article', `stat-card ${color}`), copy = node('div'), symbol = node('div', 'stat-icon');
  copy.append(node('span', 'stat-label', label), node('strong', 'stat-value', String(value)), node('span', 'stat-caption', caption)); symbol.append(icon(iconName)); card.append(copy, symbol); return card;
}
function stats() {
  const total = totals(state), grid = node('section', 'stat-grid'); grid.setAttribute('aria-label', 'Resumo da mudança');
  grid.append(statCard('Objetos cadastrados', state.items.length, `${total.quantity} unidades no inventário`, 'grid'),
    statCard('Caixas organizadas', state.boxes.length, `${state.boxes.filter(box => box.status === 'destino').length} no destino`, 'box', 'blue'),
    statCard('Unidades conferidas', total.checked, 'Verificadas uma a uma', 'check'),
    statCard('Unidades pendentes', total.remaining, 'Ainda precisam de conferência', 'list', 'orange')); return grid;
}
function progressBar(value, total, label) {
  const bar = node('div', 'progress-bar'); bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-label', label);
  bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', String(total || 1)); bar.setAttribute('aria-valuenow', String(value));
  const fill = node('div', 'progress-fill'); fill.style.width = `${total ? value / total * 100 : 0}%`; bar.append(fill); return bar;
}
function progressPanel() {
  const total = totals(state), panel = node('section', 'progress-panel'), copy = node('div'), description = node('div', 'progress-description'), text = node('div'), heading = node('h2');
  heading.append(icon('truck'), document.createTextNode('Cada objeto conta. Cada conferência também.'));
  text.append(heading, node('p', '', total.quantity ? `${total.checked} de ${total.quantity} unidades conferidas no destino. ${total.remaining ? 'Vamos encontrar o que falta?' : 'Tudo conferido. Boa nova casa!'}` : 'Comece cadastrando os objetos que vão com você.'));
  description.append(text, node('strong', '', `${total.percentage}%`)); copy.append(description, progressBar(total.checked, total.quantity, 'Unidades conferidas no destino'));
  panel.append(copy, button('Ir para conferência', () => go('conferencia'), 'button secondary', 'arrow')); return panel;
}
function infoBanner(message) { const result = node('div', 'info-banner'); result.append(icon('info'), node('p', '', message)); return result; }
function sectionTitle(title, caption) { const row = node('div', 'section-title'); row.append(node('h2', '', title)); if (caption) row.append(node('span', '', caption)); return row; }
function filterBar(checkMode = false) {
  const bar = node('div', 'filters'), searchLabel = node('label', 'search-field'); searchLabel.append(icon('search'));
  const search = node('input'); search.id = 'search'; search.type = 'search'; search.placeholder = 'Buscar objeto, caixa ou observação…'; search.setAttribute('aria-label', 'Buscar no inventário'); search.value = filters.query;
  search.addEventListener('input', () => { filters.query = search.value; render(); }); searchLabel.append(search); bar.append(searchLabel);
  const room = node('select'); room.id = 'room-filter'; room.setAttribute('aria-label', 'Filtrar por cômodo'); room.append(option('', 'Todos os cômodos'), ...state.rooms.map(entry => option(entry, entry))); room.value = filters.room;
  room.addEventListener('change', () => { filters.room = room.value; render(); }); bar.append(room);
  if (checkMode) {
    const box = node('select'); box.id = 'box-filter'; box.setAttribute('aria-label', 'Filtrar por caixa'); box.append(option('', 'Todas as caixas'), option('unboxed', 'Sem caixa'), ...state.boxes.map(entry => option(entry.id, entry.name))); box.value = filters.boxId;
    box.addEventListener('change', () => { filters.boxId = box.value; render(); }); bar.append(box);
    const include = node('label', 'checkbox-label'), input = node('input'); input.type = 'checkbox'; input.id = 'include-checked'; input.checked = filters.includeChecked;
    input.addEventListener('change', () => { filters.includeChecked = input.checked; render(); }); include.append(input, document.createTextNode('Incluir conferidos')); bar.append(include);
  } else {
    const stage = node('select'); stage.id = 'stage-filter'; stage.setAttribute('aria-label', 'Filtrar por andamento'); stage.append(option('', 'Todos os andamentos'), ...Object.entries(STAGES).map(([key, [label]]) => option(key, label))); stage.value = filters.stage;
    stage.addEventListener('change', () => { filters.stage = stage.value; render(); }); bar.append(stage);
    const fragile = node('label', 'checkbox-label'), input = node('input'); input.type = 'checkbox'; input.id = 'fragile-filter'; input.checked = filters.fragile;
    input.addEventListener('change', () => { filters.fragile = input.checked; render(); }); fragile.append(input, document.createTextNode('Só frágeis')); bar.append(fragile);
  }
  bar.append(button('Limpar filtros', () => { filters = { query: '', room: '', stage: '', fragile: false, boxId: '', includeChecked: false }; render(); }, 'filter-reset')); return bar;
}
function emptyPanel(title, description, iconName, actions = []) {
  const panel = node('section', 'empty-state'), symbol = node('div', 'empty-illustration'); symbol.append(icon(iconName));
  panel.append(symbol, node('h2', '', title), node('p', '', description));
  if (actions.length) { const group = node('div', 'empty-actions'); group.append(...actions); panel.append(group); } return panel;
}
function loadDemo() {
  confirmAction({ title: 'Explorar com dados de exemplo?', message: 'Será carregada uma mudança fictícia com 6 cadastros e 3 caixas. Os dados atuais serão substituídos. Você poderá exportar o exemplo ou reiniciar depois.', typed: !!(state.items.length || state.boxes.length || repository.blocked), label: 'Carregar demonstração',
    action: () => { filters = { query: '', room: '', stage: '', fragile: false, boxId: '', includeChecked: false }; persist(demoState(), 'Demonstração carregada. Estes dados são fictícios.', repository.blocked); } });
}
function itemCard(item) {
  const card = node('article', 'item-card'); card.dataset.itemId = item.id;
  const top = node('div', 'card-top'), symbol = node('div', 'object-symbol'), actions = node('div', 'card-actions');
  symbol.append(icon(item.category === 'Livros' ? 'book' : item.fragile ? 'fragile' : 'box'));
  actions.append(iconButton(`Editar ${item.name}`, 'edit', () => openItem(item)), iconButton(`Excluir ${item.name}`, 'trash', () => deleteItem(item)));
  top.append(symbol, actions);
  const content = node('div', 'item-content'), tags = node('div', 'tag-row'), stage = STAGES[itemStage(item)];
  tags.append(badge(stage[0], stage[1])); if (item.fragile) tags.append(badge('Frágil', 'orange', 'fragile'));
  content.append(node('p', 'item-room', `${item.room} / ${item.category}`), node('h3', '', item.name), tags);
  const box = state.boxes.find(entry => entry.id === item.boxId), boxLabel = node('div', 'box-caption'); boxLabel.append(icon('box'), document.createTextNode(box?.name || 'Sem caixa associada')); content.append(boxLabel);
  if (item.notes) content.append(node('p', 'item-notes', item.notes));
  const unit = node('div', 'unit-progress'), count = node('div', 'unit-count'); count.append(node('span', '', 'Conferência no destino'), node('strong', '', `${item.checked} de ${item.quantity}`));
  unit.append(count, progressBar(item.checked, item.quantity, `Conferência de ${item.name}`), node('p', 'unit-breakdown', `${item.packed} embalado(s) · ${item.transported} transportado(s)`)); content.append(unit);
  const footer = node('div', 'item-footer'); footer.append(node('span', 'remaining', item.checked === item.quantity ? 'Tudo conferido ✓' : `${item.quantity - item.checked} unidade(s) pendente(s)`));
  if (item.packed < item.quantity) footer.append(button('Embalar +1', saveAction(current => advanceItem(current, item.id, 'packed'), 'Uma unidade embalada.'), 'text-button', 'plus'));
  else if (item.transported < item.quantity) footer.append(button('Transportar +1', saveAction(current => advanceItem(current, item.id, 'transported'), 'Uma unidade transportada.'), 'text-button', 'arrow'));
  else if (item.checked < item.quantity) footer.append(button('Conferir +1', saveAction(current => advanceItem(current, item.id, 'checked'), 'Uma unidade conferida no destino.'), 'text-button', 'check'));
  card.append(top, content, footer); return card;
}
function renderInventory() {
  main.append(pageHeading('ORGANIZE HOJE. ENCONTRE DEPOIS.', state.moveName, 'Todos os seus objetos, do primeiro cadastro à última conferência.', [button('Nova caixa', () => openBox(), 'button secondary', 'box'), button('Adicionar objeto', () => openItem(), 'button primary', 'plus')]), stats(), progressPanel());
  main.append(sectionTitle('Seus objetos', 'Cadastro por objeto ou grupo de unidades'));
  if (!state.items.length) {
    main.append(emptyPanel('Uma mudança tranquila começa aqui.', 'Cadastre o primeiro objeto, escolha seu cômodo e acompanhe cada unidade até o destino. Quer conhecer a ferramenta antes? Explore uma mudança fictícia.', 'home', [button('Cadastrar primeiro objeto', () => openItem(), 'button primary', 'plus'), button('Explorar demonstração', loadDemo, 'button secondary')])); return;
  }
  main.append(filterBar());
  const items = filterItems(state, filters); const label = node('p', 'result-label', `${items.length} de ${state.items.length} cadastro(s) exibido(s)`); label.setAttribute('role', 'status'); main.append(label);
  if (!items.length) return main.append(emptyPanel('Nenhum objeto por aqui.', 'Experimente outro termo ou limpe os filtros para ver seu inventário.', 'search', [button('Limpar filtros', () => { filters.query = ''; filters.room = ''; filters.stage = ''; filters.fragile = false; render(); })]));
  const grid = node('div', 'item-grid'); grid.append(...items.map(itemCard)); main.append(grid);
}
function renderBoxes() {
  main.append(pageHeading('CADA COISA NO SEU LUGAR', 'Organize suas caixas', 'Identifique por fora. Saiba o que está por dentro.', [button('Adicionar caixa', () => openBox(), 'button primary', 'plus')]), infoBanner('Marcar uma caixa como “No destino” não confere seus objetos. A conferência das unidades é feita separadamente.'));
  if (!state.boxes.length) return main.append(emptyPanel('Dê um nome à primeira caixa.', 'Use etiquetas como CX-01 · Cozinha. Depois, associe os objetos à caixa no cadastro ou na edição.', 'box', [button('Criar primeira caixa', () => openBox(), 'button primary', 'plus')]));
  const grid = node('div', 'box-grid');
  for (const box of state.boxes) {
    const entries = state.items.filter(item => item.boxId === box.id), boxTotals = totals({ items: entries });
    const card = node('article', 'box-card'), top = node('div', 'box-card-header'), symbol = node('div', 'object-symbol'), actions = node('div', 'card-actions'); symbol.append(icon('box'));
    actions.append(iconButton(`Editar caixa ${box.name}`, 'edit', () => openBox(box)), iconButton(`Excluir caixa ${box.name}`, 'trash', () => deleteBox(box))); top.append(symbol, actions);
    card.append(top, node('h3', '', box.name), node('p', 'box-destination', box.destination || 'Destino não informado'), badge(BOX_LABELS[box.status], box.status === 'destino' ? 'green' : box.status === 'transporte' ? 'blue' : 'orange'));
    card.append(node('div', 'box-summary', `${entries.length} cadastro(s) · ${boxTotals.quantity} unidade(s)`), node('p', 'box-names', entries.map(item => item.name).join(' · ') || 'Nenhum objeto associado ainda.'), progressBar(boxTotals.checked, boxTotals.quantity, `Conteúdo conferido da caixa ${box.name}`));
    const footer = node('div', 'box-card-footer'); footer.append(node('span', 'result-label', `${boxTotals.checked}/${boxTotals.quantity} conferido(s)`), button('Conferir conteúdo', () => { filters.boxId = box.id; filters.query = ''; filters.room = ''; go('conferencia'); }, 'text-button', 'arrow')); card.append(footer); grid.append(card);
  }
  main.append(grid);
}
function renderCheck() {
  const total = totals(state);
  main.append(pageHeading('CHEGOU? CONFIROU?', 'Conferência da mudança', 'Conte cada unidade no destino. Chegar à casa nova é só uma das etapas.', [button('Adicionar objeto', () => openItem(), 'button secondary', 'plus')]), stats());
  main.append(infoBanner('A conferência exige unidades transportadas. Se precisar ajustar uma etapa ou corrigir uma contagem, use “Editar quantidades”. Nenhuma pendência significa falta comprovada: o objeto pode ainda não ter sido transportado.'));
  if (!state.items.length) return main.append(emptyPanel('Ainda não há objetos para conferir.', 'Cadastre seu inventário primeiro. Cada objeto terá quantidades embaladas, transportadas e conferidas.', 'list', [button('Ir ao inventário', () => go('inventario'), 'button primary', 'arrow')]));
  main.append(filterBar(true));
  const items = filterItems(state, { query: filters.query, room: filters.room }).filter(item => (!filters.boxId || (filters.boxId === 'unboxed' ? !item.boxId : item.boxId === filters.boxId)) && (filters.includeChecked || item.checked < item.quantity));
  main.append(node('p', 'result-label', `${items.length} cadastro(s) exibido(s) · ${total.remaining} unidade(s) pendente(s) no inventário completo`));
  if (!items.length) return main.append(emptyPanel(total.remaining ? 'Nenhuma pendência neste filtro.' : 'Tudo conferido. Boa nova casa!', total.remaining ? 'Outros objetos ainda podem estar pendentes. Limpe os filtros para verificar.' : 'Todas as unidades cadastradas foram conferidas. Exporte um backup para guardar seu inventário.', 'check', [button('Exportar inventário', exportBackup, 'button secondary', 'data')]));
  const list = node('div', 'check-grid');
  for (const item of items) {
    const card = node('article', 'check-card'), copy = node('div', 'check-info'), count = node('div', 'check-count'), actions = node('div', 'check-actions'); card.dataset.itemId = item.id;
    copy.append(node('h3', '', item.name), node('p', '', `${item.room} · ${state.boxes.find(box => box.id === item.boxId)?.name || 'Sem caixa'}${item.fragile ? ' · Frágil' : ''}`));
    count.append(node('strong', '', `${item.checked} / ${item.quantity}`), node('span', '', 'unidades conferidas'));
    const advance = button(item.checked === item.quantity ? 'Conferido' : 'Conferir +1', saveAction(current => advanceItem(current, item.id, 'checked'), 'Uma unidade conferida no destino.'), 'button primary', 'check');
    advance.disabled = item.checked >= item.transported;
    advance.title = advance.disabled && item.checked < item.quantity ? 'Registre o transporte antes de conferir as unidades.' : `Conferir uma unidade de ${item.name}`;
    advance.setAttribute('aria-label', `Conferir uma unidade de ${item.name}`);
    actions.append(advance, button('Editar quantidades', () => openItem(item), 'text-button', 'edit'));
    if (advance.disabled && item.checked < item.quantity) copy.append(node('p', 'note', `Há ${item.quantity - item.transported} unidade(s) ainda não transportada(s).`));
    card.append(copy, count, actions); list.append(card);
  }
  main.append(list);
}
function download(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type })), link = node('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function exportBackup() {
  try {
    if (repository.blocked) {
      const raw = repository.raw(); if (!raw) throw new Error('Não há dados acessíveis para exportar.');
      download(raw, 'inventario-dados-originais.json', 'application/json'); showToast('Dados originais exportados sem alterações.'); return;
    }
    download(backupText(state), `casa-em-ordem-${new Date().toISOString().slice(0, 10)}.json`, 'application/json'); showToast('Backup exportado. Guarde uma cópia fora deste navegador.');
  } catch (error) { showToast(error.message); }
}
$('#export-top').addEventListener('click', exportBackup);
let pdfInProgress = false;
async function exportPdf() {
  if (pdfInProgress) return;
  if (repository.blocked) return showToast('Recupere os dados salvos antes de exportar o PDF.');
  pdfInProgress = true; $('#export-pdf').disabled = true;
  try {
    showToast('Preparando o PDF completo para impressão…');
    const { buildInventoryPdf } = await import('./pdf.js');
    const bytes = await buildInventoryPdf(state);
    download(bytes, `inventario-para-conferencia-${new Date().toISOString().slice(0, 10)}.pdf`, 'application/pdf');
    showToast('PDF gerado. Abra o arquivo baixado para imprimir. O relatório inclui todo o inventário.');
  } catch (error) { showToast(`Não foi possível gerar o PDF: ${error.message}`); }
  finally { pdfInProgress = false; $('#export-pdf').disabled = false; }
}
$('#export-pdf').addEventListener('click', exportPdf);
function previewBackup() {
  try {
    $('#backup-text').value = repository.blocked ? repository.raw() : backupText(state);
    openDialog($('#backup-dialog'));
  } catch (error) { showToast(error.message); }
}
$('#select-backup').addEventListener('click', () => { $('#backup-text').focus(); $('#backup-text').select(); });
$('#import-file').addEventListener('change', async event => {
  const file = event.target.files[0]; event.target.value = ''; if (!file) return;
  try {
    if (file.size > MAX_BACKUP_BYTES) throw new Error('Arquivo muito grande. O limite é 3 MB.');
    const incoming = parseBackup(await file.text()), total = totals(incoming);
    confirmAction({ title: 'Restaurar este backup?', message: `Mudança: ${incoming.moveName}\n${incoming.items.length} cadastro(s), ${total.quantity} unidade(s) e ${incoming.boxes.length} caixa(s).\n\nA importação substitui todo o inventário atual. Exporte os dados atuais primeiro se quiser mantê-los.`, typed: !!(state.items.length || state.boxes.length || repository.blocked), label: 'Restaurar backup', action: () => { filters = { query: '', room: '', stage: '', fragile: false, boxId: '', includeChecked: false }; persist(incoming, 'Backup restaurado e validado.', true); } });
  } catch (error) { showToast(error.message); }
});
function panel(title, description) { const result = node('section', 'panel'); result.append(node('h2', '', title)); if (description) result.append(node('p', '', description)); return result; }
function renderData() {
  main.append(pageHeading('SEUS DADOS. SEU CONTROLE.', 'Dados e ajuda', 'Exporte backups, organize os cômodos e conheça os limites deste protótipo.'));
  const grid = node('div', 'data-grid');
  const backup = panel('Seu inventário fica neste navegador', 'Não existe conta nem cópia na nuvem. Limpar os dados do navegador, trocar de dispositivo ou usar outro endereço não transfere o inventário. Exporte backups regularmente.');
  backup.append(button('Exportar backup JSON', exportBackup, 'button primary', 'data'), button('Importar backup', () => $('#import-file').click(), 'button secondary', 'data'));
  backup.append(button('Visualizar JSON', previewBackup, 'button secondary'));
  backup.append(button('Exportar PDF para imprimir', exportPdf, 'button secondary', 'list'));
  backup.append(node('p', 'note', 'O PDF inclui o inventário completo, agrupado por cômodo, com espaço para marcar objetos e anotar as quantidades conferidas à mão. Não substitui o backup JSON e não pode ser importado.'));
  backup.append(node('p', 'note', 'A importação valida os dados e pede confirmação antes de substituir o inventário. O backup contém os nomes e observações dos seus objetos; compartilhe-o apenas com quem você escolher.'));
  const settings = panel('Sua mudança', 'Escolha um nome para identificar este inventário.');
  const nameForm = node('form'), nameLabel = node('label', '', 'Nome da mudança'), nameInput = node('input'); nameInput.id = 'move-name'; nameInput.name = 'moveName'; nameInput.value = state.moveName; nameInput.required = true; nameInput.maxLength = 80; nameLabel.append(nameInput);
  const saveName = node('button', 'button secondary', 'Salvar nome'); saveName.type = 'submit'; nameForm.append(nameLabel, saveName); nameForm.addEventListener('submit', event => { event.preventDefault(); withError(() => persist({ ...state, moveName: nameInput.value }, 'Nome da mudança atualizado.'))(); }); settings.append(nameForm);
  const rooms = panel('Cômodos', 'Crie cômodos para organizar os objetos. Um cômodo com objetos associados não pode ser excluído.');
  const roomList = node('ul', 'room-list');
  for (const room of state.rooms) {
    const li = node('li'); li.append(node('span', '', room), button('×', () => {
      if (state.rooms.length === 1) return showToast('Mantenha pelo menos um cômodo.');
      if (state.items.some(item => item.room === room)) return showToast('Realoque os objetos deste cômodo antes de excluí-lo.');
      confirmAction({ title: 'Excluir cômodo?', message: `Remover “${room}” da lista de cômodos?`, label: 'Excluir cômodo', action: () => { if (filters.room === room) filters.room = ''; persist({ ...state, rooms: state.rooms.filter(entry => entry !== room) }, 'Cômodo excluído.'); } });
    }, 'icon-button')); li.lastChild.setAttribute('aria-label', `Excluir cômodo ${room}`); roomList.append(li);
  }
  const roomForm = node('form', 'inline-form'), roomLabel = node('label', '', 'Novo cômodo'), roomInput = node('input'); roomInput.id = 'new-room'; roomInput.required = true; roomInput.maxLength = 60; roomInput.placeholder = 'Ex.: Garagem'; roomLabel.append(roomInput);
  const addRoom = node('button', 'button secondary', 'Adicionar'); addRoom.type = 'submit'; roomForm.append(roomLabel, addRoom);
  roomForm.addEventListener('submit', event => { event.preventDefault(); withError(() => persist({ ...state, rooms: [...state.rooms, roomInput.value] }, 'Cômodo adicionado.'))(); }); rooms.append(roomList, roomForm);
  const help = panel('Como organizar uma mudança', 'Siga as etapas para que os números representem o que você realmente verificou.');
  const steps = node('ol', 'help-list'); for (const text of ['Cadastre os objetos e suas quantidades.', 'Crie e identifique as caixas fisicamente.', 'Associe os objetos às caixas e registre a embalagem.', 'Registre as unidades transportadas.', 'No destino, confira cada unidade.', 'Exporte um backup para guardar os dados.']) steps.append(node('li', '', text)); help.append(steps);
  help.append(node('p', 'note', 'Um cadastro pertence a uma caixa. Para distribuir 8 pratos em duas caixas, crie dois cadastros de 4 unidades. Pendência não é perda comprovada. Use as observações para registrar avarias ou divergências.'));
  const about = panel('Um experimento com próxima etapa', 'Este sistema foi desenvolvido para testes e aprendizado. Valter Murilo Belluzzo pretende refazê-lo como aplicativo nativo para Android. Esta versão é web e não é um aplicativo Android nativo.');
  about.append(node('p', 'eyebrow', 'POSSÍVEIS EVOLUÇÕES'));
  const roadmap = node('ul', 'roadmap'); for (const text of ['Fotos dos objetos e etiquetas com QR Code.', 'Sincronização entre dispositivos e compartilhamento.', 'Múltiplas mudanças e histórico de conferências.', 'Versão nativa Android após validar o fluxo web.']) roadmap.append(node('li', '', text)); about.append(roadmap);
  about.append(button('Explorar dados de demonstração', loadDemo, 'button secondary'));
  const reset = panel('Reiniciar inventário', 'Apaga os objetos e caixas deste navegador e restaura os cômodos iniciais. Exporte um backup antes de continuar.'); reset.classList.add('danger-panel');
  reset.append(button('Apagar dados locais', () => confirmAction({ title: 'Apagar todo o inventário?', message: 'Todos os objetos, caixas, contagens e cômodos personalizados serão apagados deste navegador. A ação não pode ser desfeita. Um backup exportado não será apagado.', label: 'Apagar inventário', typed: true, danger: true, action: () => { filters = { query: '', room: '', stage: '', fragile: false, boxId: '', includeChecked: false }; persist(emptyState(), 'Inventário reiniciado.', true); } }), 'button secondary danger-link', 'trash'));
  grid.append(backup, settings, rooms, help, about, reset); main.append(grid);
}
function render() {
  const focused = document.activeElement, focusId = focused?.id;
  const selection = focused?.tagName === 'INPUT' && ['text', 'search'].includes(focused.type) ? focused.selectionStart : null;
  main.replaceChildren(); $('#breadcrumb-title').textContent = VIEWS[view]; $('#nav-count').textContent = state.items.length;
  document.querySelectorAll('[data-view]').forEach(link => { link.classList.toggle('active', link.dataset.view === view); if (link.dataset.view === view) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
  document.title = `${VIEWS[view]} · Casa em Ordem`;
  ({ inventario: renderInventory, caixas: renderBoxes, conferencia: renderCheck, dados: renderData })[view]();
  if (focusId) { const target = document.getElementById(focusId); if (target && main.contains(target)) { target.focus({ preventScroll: true }); if (selection !== null) target.setSelectionRange(selection, selection); } }
}
function toggleTheme() {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('casa-theme', theme); } catch (_) {} updateThemeLabels();
}
function updateThemeLabels() {
  const label = document.documentElement.dataset.theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro';
  $('#theme-toggle').lastElementChild.textContent = label; $('#mobile-theme').setAttribute('aria-label', label);
  $('meta[name="theme-color"]').content = document.documentElement.dataset.theme === 'dark' ? '#111c18' : '#f5f7f9';
}
$('#theme-toggle').addEventListener('click', toggleTheme); $('#mobile-theme').addEventListener('click', toggleTheme);
window.addEventListener('storage', event => { if (event.key === STORAGE_KEY || event.key === null) showGlobalError('Outra aba alterou os dados. Recarregue esta página antes de editar para evitar sobrescrever alterações.'); });
function updateConnection() { $('#connection-status').lastChild.textContent = navigator.onLine ? 'Dados neste navegador' : 'Offline · dados locais'; }
window.addEventListener('online', updateConnection); window.addEventListener('offline', updateConnection);
updateThemeLabels(); updateConnection(); render(); if (startupError) showGlobalError(startupError);
if ('serviceWorker' in navigator && ['https:', 'http:'].includes(location.protocol)) {
  navigator.serviceWorker.register('./sw.js').catch(() => showToast('O modo offline não pôde ser ativado. O inventário continua funcionando enquanto esta página estiver aberta.'));
}
