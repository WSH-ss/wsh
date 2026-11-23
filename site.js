/* 工作台组件和安全的 HTML 插值。用户输入始终作为文本渲染。 */
const UI = (() => {
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
  const button = (label, action, value = '', { primary = false, disabled = false } = {}) =>
    '<button type="button" data-action="' + escape(action) + '" data-value="' + escape(value) + '"'
      + (primary ? ' class="primary"' : '') + (disabled ? ' disabled' : '') + '>' + escape(label) + '</button>';
  const badge = (text, alert = false) => '<span class="badge' + (alert ? ' alert' : '') + '">' + escape(text) + '</span>';
  const field = (label, control) => '<label class="field"><span>' + escape(label) + '</span>' + control + '</label>';
  const option = (value, label, current) => '<option value="' + escape(value) + '"' + (String(current) === String(value) ? ' selected' : '') + '>' + escape(label) + '</option>';
  const select = (name, items, current) => '<select name="' + escape(name) + '">' + items.map(([value, label]) => option(value, label, current)).join('') + '</select>';
  const input = (name, value = '', attributes = '') => '<input name="' + escape(name) + '" value="' + escape(value) + '" ' + attributes + '>';
  const textarea = (name, value = '', attributes = '') => '<textarea name="' + escape(name) + '" ' + attributes + '>' + escape(value) + '</textarea>';
  const form = (action, body, submit) => '<form class="stack" data-form="' + escape(action) + '">' + body + '<div><button class="primary">' + escape(submit) + '</button></div></form>';
  const entry = (body) => '<li class="entry">' + body + '</li>';
  const list = (entries, empty = '暂无记录。') => entries.length ? '<ul class="list">' + entries.join('') + '</ul>' : '<p class="empty">' + escape(empty) + '</p>';
  const row = (...items) => '<div class="row">' + items.join('') + '</div>';
  const title = (text) => '<h3>' + escape(text) + '</h3>';
  const text = (value) => '<p>' + escape(value) + '</p>';
  const stack = (...items) => '<div class="stack">' + items.join('') + '</div>';
  const card = (...body) => '<section class="card">' + stack(...body) + '</section>';
  const work = (main, side) => '<div class="work">' + main + side + '</div>';
  const trace = (events) => events.length ? '<ol class="trace">' + events.map((event) => '<li>' + escape(event) + '</li>').join('') + '</ol>' : text('执行操作后显示处理记录。');
  const stat = (label, value) => '<div class="stat"><strong>' + escape(value) + '</strong><small>' + escape(label) + '</small></div>';
  const stats = (...statItems) => '<div class="stats">' + statItems.join('') + '</div>';
  const requireCondition = (condition, message) => { if (!condition) throw new Error(message); };
  return { escape, button, badge, field, select, input, textarea, form, entry, list, row, title, text, stack, card, work, trace, stat, stats, requireCondition };
})();
