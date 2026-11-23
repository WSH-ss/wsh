const Knowledge = (() => {
  const { escape: e, button: b, badge, field, select, input, textarea, form, entry, list, row, title, text, card, work, trace, stat, stats, requireCondition: check } = UI;
  const baseline = [
    { id: 'ORDER-001', heading: '订单状态核验', quote: '未付款订单没有可退金额；已退款订单不重复退款。异常实付金额、缺失或位于未来的签收时间交由人工核验。所有金额以订单实付金额的整数分为准，客户端和模型不能指定退款金额。' },
    { id: 'CANCEL-001', heading: '未发货取消', quote: '已付款但未发货的订单，明确申请取消时，可模拟退还全部实付金额。未发货订单提出退货或质量问题，需要确认是否实际希望取消订单。已签收订单应使用退货申请流程。' },
    { id: 'RETURN-001', heading: '标准商品退货申请', quote: '标准商品签收后 7×24 小时以内（包含恰好第 168 小时）可以创建退货申请。受理后状态为“待寄回商品”，不立即退款。超过该期限的无理由申请不自动受理。寄回物流、验收及验收后退款尚不属于本阶段实现范围。' },
    { id: 'RETURN-EXCEPTION', heading: '定制商品', quote: '定制商品的无理由退货申请由人工确认适用条件；商品质量问题仍走 QUALITY-001，不直接依据定制属性拒绝。', terms: '刻字 定制 例外' },
    { id: 'QUALITY-001', heading: '质量问题核验', quote: '签收后 30×24 小时以内的质量问题，没有凭证时要求补充凭证；收到凭证后转交人工审核，不直接退款。超出演示政策自动受理范围也转人工核验，不自动断言用户不再享有任何售后权利。本阶段仅保存演示凭证编号，不进行实际文件上传或图片识别。' },
    { id: 'REVIEW-001', heading: '已发货订单', quote: '商品已发货时，取消、退货和质量问题均需人工核验，确认物流拦截或后续退货方案。' },
  ];
  const template = '## RETURN-001 退货条件\n标准商品签收后 7 天内可登记退货。客户寄回后，客服核实商品状态与凭证。';
  const seed = () => ({
    drafts: [], draftId: '', active: 'demo-v1', publications: [{ id: 'demo-v1', title: '原始基线', clauses: baseline, state: '有效' }], history: ['启用示例基线 demo-v1。'],
    answer: null, feedback: [], feedbackId: '', filter: '', failures: [
      { id: 'F-01', label: '定制退货 · 未核实问题位置', skill: 'return-refund', accepted: 6, candidate: 8, safe: true },
      { id: 'F-02', label: '质量核验 · 候选缺少材料条件', skill: 'quality-triage', accepted: 7, candidate: 6, safe: true },
      { id: 'F-03', label: '取消订单 · 候选绕过确认', skill: 'cancel-order', accepted: 5, candidate: 9, safe: false },
    ],
    skills: { 'cancel-order': '1.0.0', 'quality-triage': '1.0.0', 'return-refund': '1.0.0' }, candidates: [], skillHistory: [],
  });
  let state = seed();
  const checkRole = () => AfterSales.canMaintain();
  const draft = () => state.drafts.find((value) => value.id === state.draftId);
  const active = () => state.publications.find((value) => value.id === state.active && value.state === '有效');
  const dateKey = () => new Date().toISOString().slice(0, 10);
  const effective = (value) => value && (!value.start || value.start <= dateKey()) && (!value.end || value.end >= dateKey());
  const policyCitation = (id) => {
    const current = active();
    const clause = effective(current) && current.clauses.find((item) => item.id === id);
    return clause ? { ...clause, source: current.id } : null;
  };
  const confirmation = (label) => '<label class="row"><input name="confirmed" type="checkbox" required style="width:18px;min-height:18px">' + e(label) + '</label>';
  const skillFor = (intent) => state.skills[{ RETURN_REFUND: 'return-refund', QUALITY_ISSUE: 'quality-triage', CANCEL_ORDER: 'cancel-order' }[intent]];
  function policy() {
    const answer = state.answer;
    return work(card(title('政策问答'), text('可输入“定制刻字可以退货吗”“拉链损坏需要哪些凭证”或任意不相关的问题。'),
      form('ask-policy', field('政策问题', input('question', answer?.question, 'required maxlength="200"')) +
        field('商品范围', select('scope', [['standard', '标准商品'], ['custom', '定制商品'], ['all', '不限']], answer?.scope ?? 'all')) +
        field('场景', select('mode', [['ok', '正常检索'], ['retrieval', '模拟检索失败'], ['citation', '模拟引用校验失败']], answer?.mode ?? 'ok')), '查询政策'),
      text('线上沙箱以合成条款演示发布版本、检索结果和引用校验。')),
    card(title('回答与引用'), row(badge('活动政策 ' + (active()?.id ?? '已撤销')), badge('检索回放')),
      answer ? UI.stack(badge(answer.status, !answer.clause), text(answer.message),
        answer.clause ? UI.stack(title(answer.clause.id + ' · ' + answer.clause.heading), text(answer.clause.quote), text('来源版本 ' + answer.source), b('查看来源原文', 'policy-source')) : '',
        answer.showSource && answer.clause ? text('引用原文：' + answer.clause.quote) : '',
        trace(answer.steps)) : text('提交问题后展示版本、引用及拒答原因。')));
  }
  function draftForm() {
    return form('add-draft', row(field('知识修订版本', input('version', '', 'required maxlength="40" placeholder="例如 demo-kb-v2"')),
      field('材料标题', input('title', '', 'required maxlength="80"')), field('来源名称', input('source', '', 'required maxlength="70"'))) +
      field('来源网址（可选）', input('url', '', 'type="url"')) +
      row(field('生效日期', input('start', new Date().toISOString().slice(0, 10), 'type="date" required')),
        field('失效日期（可选）', input('end', '', 'type="date"'))) +
      row(field('适用售后类型', select('intent', [['all', '全部'], ['RETURN_REFUND', '申请退货'], ['QUALITY_ISSUE', '质量问题'], ['CANCEL_ORDER', '取消订单']], 'all')),
        field('适用品类', select('scope', [['all', '全部'], ['standard', '标准商品'], ['custom', '定制商品']], 'all'))) +
      field('读取 Markdown 文件（可选）', '<input name="file" type="file" accept=".md,.markdown,text/markdown,text/plain">') +
      field('Markdown 原文', textarea('markdown', template, 'maxlength="5000"')) + confirmation('此材料为合成演示内容'), '导入草稿');
  }
  function workbench() {
    const current = draft();
    const release = current?.build === '完整';
    const rollback = state.publications.filter((value) => value.state === '有效' && value.id !== state.active);
    return UI.stack(work(UI.stack(card(title('导入 Markdown 草稿'), draftForm()),
      card(title('修订列表'), list(state.drafts.map((item) => entry(row(b(item.id, 'open-draft', item.id), badge(item.state))))))),
      UI.stack(card(title('草稿预览与审核'), current ? UI.stack(title(current.title),
        text('来源：' + current.source + ' · ' + current.id), text(current.start + (current.end ? ' 至 ' + current.end : ' 起生效')),
        list(current.clauses.map((item) => entry(title(item.id + ' ' + item.heading) + text(item.quote)))),
        current.state === '待审核' ? form('review-draft', field('审核结论', select('result', [['已审核', '通过，进入待索引'], ['已驳回', '驳回']], '已审核')) +
          field('审核意见', textarea('note', '', 'required maxlength="300"')) + confirmation('我已核对原文及适用范围'), '提交草稿审核') : text(current.review)) : text('导入或选择一个草稿。')),
      card(title('构建待发布索引'), text('审核通过后才可构建。构建完整后，由维护人员单独发布。'), current?.build ? badge(current.build) : '',
        row(b('新建索引构建任务', 'build', '', { disabled: current?.state !== '已审核' || Boolean(current?.build) }),
          b('模拟完整性检查通过', 'build-result', '完整', { disabled: current?.build !== '构建中' }),
          b('模拟索引构建失败', 'build-result', '失败可重试', { disabled: current?.build !== '构建中' }),
          b('取消索引构建', 'build-result', '已取消', { disabled: !['构建中', '失败可重试'].includes(current?.build) }),
          b('重试索引构建', 'build-retry', '', { disabled: current?.build !== '失败可重试' })),
        current ? trace(current.history) : ''))),
      card(title('知识发布与版本记录'), row(badge('当前来源 ' + (active()?.id ?? '已撤销'), !active())),
        row(b('发布已校验索引', 'publish', '', { primary: true, disabled: !release || state.publications.some((item) => item.id === current.id) }),
          b('撤销当前来源', 'revoke', '', { disabled: !active() })),
        rollback.length ? form('rollback', field('有效历史版本', select('version', rollback.map((item) => [item.id, item.title + ' · ' + item.id]))) +
          confirmation('确认回滚到此版本'), '回滚政策版本') : '',
        trace(state.history)));
  }
  function feedback() {
    const notes = state.feedback.filter((item) => !state.filter || item.state === state.filter);
    const selected = state.feedback.find((item) => item.id === state.feedbackId);
    return work(card(title('知识反馈待办'), row(...[['', '全部'], ['OPEN', '待核实'], ['TRIAGED', '核实中'], ['RESOLVED', '已处理'], ['DISMISSED', '暂不处理']].map(([value, label]) => b(label, 'feedback-filter', value))),
      list(notes.map((item) => entry(row(b(item.question, 'pick-feedback', item.id), badge(item.category), badge(item.state), badge(item.count + ' 次')))),
        '暂无待办。可以先在政策问答中提交不适用的问题或模拟检索失败。')),
    card(title('反馈详情'), selected ? UI.stack(text(selected.question), row(badge(selected.category), badge(selected.state)),
      selected.note ? text(selected.note) : '', ['OPEN', 'TRIAGED'].includes(selected.state) ?
        form('review-feedback', field('处理动作', select('result', [[selected.state === 'OPEN' ? 'TRIAGED' : 'RESOLVED', selected.state === 'OPEN' ? '开始核实' : '记录解决结果'], ['DISMISSED', '暂不纳入处理']])) +
          field('处理说明', textarea('note', '', 'required maxlength="300"')), '保存处理记录') : '', trace(selected.history)) : text('选择一条待办查看详情。')));
  }
  function lab() {
    const candidates = state.candidates;
    return work(card(title('从失败记录生成候选'), text('三个固定样例分别用于验证门禁通过、结果退步和安全检查失败。以下计数为演示结果。'),
      form('generate-skill', field('失败记录', select('source', state.failures.map((item) => [item.id, item.id + ' · ' + item.label]))), '生成待评测候选'),
      list(candidates.map((item) => entry(UI.stack(row(title(item.version + ' · ' + item.fixture.skill), badge(item.state)),
        item.scored ? stats(stat('固定开发集 · 基线', item.fixture.accepted + '/10'), stat('固定开发集 · 候选', item.fixture.candidate + '/10'),
          stat('安全门禁', item.fixture.safe ? '通过' : '未通过')) : '',
        row(b('运行对照评测', 'evaluate-skill', item.id, { disabled: item.scored }),
          b('启用已通过候选', 'activate-skill', item.id, { disabled: item.state !== '通过门禁' }))))))),
    card(title('已启用 Skill 版本'), list(Object.entries(state.skills).map(([id, version]) =>
      entry(row(badge(id + ' · ' + version), b('回滚 ' + id, 'rollback-skill', id, { disabled: version === '1.0.0' }))))),
      title('版本记录'), trace(state.skillHistory)));
  }
  function logFeedback(question, category) {
    const found = state.feedback.find((item) => item.question === question && item.category === category && ['OPEN', 'TRIAGED'].includes(item.state));
    if (found) { found.count++; return; }
    state.feedback.push({ id: 'KF-' + (state.feedback.length + 1), question, category, state: 'OPEN', count: 1, history: ['创建知识反馈待办。'] });
  }
  function parseMarkdown(markdown) {
    const parts = [...markdown.matchAll(/^##\s+([\w-]+)\s+(.+?)\s*\r?\n([\s\S]*?)(?=^##\s|$)/gm)];
    // 多行正文以完整标题分段，避免把下一条条款误作当前来源。
    const sections = markdown.trim().split(/(?=^##\s+)/m).map((part) => part.trim()).filter(Boolean);
    check(parts.length && sections.every((section) => /^##\s+([\w-]+)\s+(.+)\r?\n[\s\S]*\S/.test(section)), '每个条款需要编号、标题和非空正文。');
    const clauses = sections.map((section) => {
      const match = /^##\s+([\w-]+)\s+(.+)\r?\n([\s\S]+)$/.exec(section);
      return { id: match[1], heading: match[2].trim(), quote: match[3].trim(), terms: match[2] };
    });
    check(new Set(clauses.map((item) => item.id)).size === clauses.length, '条款编号不能重复。');
    return clauses;
  }
  const actions = {
    'policy-source': () => { if (state.answer?.clause) state.answer.showSource = !state.answer.showSource; },
    'open-draft': (id) => { checkRole(); state.draftId = id; },
    build: () => {
      checkRole(); const item = draft(); check(item?.state === '已审核' && !item.build, '请先审核草稿。');
      item.build = '构建中'; item.history.push('已固定审核稿、索引计划和请求预算。');
    },
    'build-result': (value) => {
      checkRole(); const item = draft();
      check(item?.build === '构建中' || (value === '已取消' && item?.build === '失败可重试'), '当前索引任务不可更新。');
      item.build = value; item.history.push('索引任务 · ' + value);
    },
    'build-retry': () => {
      checkRole(); const item = draft(); check(item?.build === '失败可重试', '当前任务不可重试。');
      item.build = '构建中'; item.history.push('延续索引任务重试。');
    },
    publish: () => {
      checkRole(); const item = draft(); check(item?.build === '完整' && !state.publications.some((value) => value.id === item.id), '必须使用未发布的完整索引。');
        state.publications.push({ id: item.id, title: item.title, clauses: item.clauses, state: '有效', scope: item.scope, start: item.start, end: item.end });
      state.active = item.id; state.answer = null; state.history.push('发布 ' + item.id + '。'); return '发布成功，后续问答将使用此版本。';
    },
    revoke: () => {
      checkRole(); const current = active(); check(current, '没有活动来源。');
      current.state = '撤销'; state.active = ''; state.answer = null; state.history.push('撤销 ' + current.id + '，问答暂停。');
      return '活动来源已撤销，请按需要回滚历史有效版本。';
    },
    'feedback-filter': (value) => { checkRole(); state.filter = value; },
    'pick-feedback': (value) => { checkRole(); state.feedbackId = value; },
    'evaluate-skill': (id) => {
      checkRole(); const item = state.candidates.find((value) => value.id === id); check(item && !item.scored, '候选已评测。');
      item.scored = true; item.state = !item.fixture.safe ? '安全门禁拒绝' : item.fixture.candidate > item.fixture.accepted ? '通过门禁' : '未优于基线';
      return item.state + '。';
    },
    'activate-skill': (id) => {
      checkRole(); const item = state.candidates.find((value) => value.id === id);
      check(item?.state === '通过门禁' && state.skills[item.fixture.skill] === item.baseline, '候选未通过门禁或基线已发生变更。');
      state.skills[item.fixture.skill] = item.version; item.state = '已启用'; state.skillHistory.push('启用 ' + item.fixture.skill + ' ' + item.version + '。');
    },
    'rollback-skill': (id) => {
      checkRole(); check(state.skills[id] && state.skills[id] !== '1.0.0', '当前已经使用初始版本。');
      state.skills[id] = '1.0.0'; state.skillHistory.push(id + ' 回滚至 1.0.0。');
    },
  };
  const forms = {
    'ask-policy': (data) => {
      const question = data.get('question').trim(), mode = data.get('mode'), scope = data.get('scope');
      check(question, '请输入政策问题。');
      const current = active();
      const noAnswer = (status, message, steps) => { state.answer = { question, scope, mode, status, message, steps }; logFeedback(question, status); };
      if (!current) return noAnswer('无活动来源', '已暂停政策问答，请等待有效政策版本恢复。', ['找不到活动来源。']);
      if (!effective(current)) return noAnswer('来源未在有效期', '当前政策来源未在有效期内，请联系维护人员。', ['检查政策生效及失效日期。']);
      if (mode === 'retrieval') return noAnswer('技术故障', '检索暂不可用，请稍后再试。', ['活动版本 ' + current.id, '检索失败。']);
      if (current.scope && current.scope !== 'all' && scope !== 'all' && scope !== current.scope)
        return noAnswer('适用范围不符', '活动版本不适用当前商品范围。', ['检查关联来源及适用范围。']);
      const matchRules = [
        [/质量|坏|裂|凭证|照片/, 'QUALITY-001'], [/定制|刻字/, 'RETURN-EXCEPTION'], [/未付款|退款完成/, 'ORDER-001'],
        [/取消|没发货|未发货/, 'CANCEL-001'], [/拦截|已发货|物流/, 'REVIEW-001'], [/退货|期限|七天|寄回/, 'RETURN-001'],
      ];
      const preferred = matchRules.find(([pattern]) => pattern.test(question))?.[1];
      const clause = current.clauses.find((item) => item.id === preferred) ?? current.clauses.find((item) => question.includes(item.id) || (item.heading.length >= 2 && question.includes(item.heading)));
      if (!clause) return noAnswer('候选依据不足', '未找到适用条款，请补充范围或转人工核查。', ['检索活动版本 ' + current.id, '无可用引用。']);
      if (mode === 'citation') return noAnswer('引用校验失败', '结果未通过引用检查，已停止生成回答。', ['检索命中 ' + clause.id, '校验条款原文失败。']);
      state.answer = { question, scope, mode, status: '已找到政策依据', message: clause.quote, clause, source: current.id,
        steps: ['在活动版本内查找候选条款。', '核对适用范围、条款编号和原文。'] };
    },
    'add-draft': async (data) => {
      checkRole();
      const file = data.get('file');
      if (file?.size) check(/\.(md|markdown)$/i.test(file.name) && file.size <= 20000, '请选择小于 20 KB 的 Markdown 文件。');
      const markdown = file?.size ? await file.text() : data.get('markdown');
      const id = data.get('version').trim(), name = data.get('title').trim(), source = data.get('source').trim(), url = data.get('url');
      const start = data.get('start'), end = data.get('end');
      check(/^[\w.-]+$/.test(id) && name && source && data.has('confirmed'), '请填写版本、标题、来源并确认。');
      check(!url || /^https?:\/\//i.test(url), '来源网址须以 http 或 https 开头。');
      check(!end || end >= start, '失效日期不得早于生效日期。');
      check(!state.drafts.some((item) => item.id === id) && id !== 'demo-v1', '该版本已存在。');
      const clauses = parseMarkdown(markdown);
      state.drafts.push({ id, title: name, source, url, start, end, clauses, intent: data.get('intent'), scope: data.get('scope'), state: '待审核', build: '', history: [] });
      state.draftId = id; return '草稿已导入，等待审核。';
    },
    'review-draft': (data) => {
      checkRole(); const item = draft(); const note = data.get('note').trim();
      check(item?.state === '待审核' && data.has('confirmed') && note, '请核查草稿并填写意见。');
      item.state = data.get('result'); item.review = note; item.history.push(item.state + ' · ' + note);
    },
    rollback: (data) => {
      checkRole(); const id = data.get('version');
      check(data.has('confirmed') && state.publications.some((item) => item.id === id && item.state === '有效'), '请选择仍然有效的历史版本。');
      state.active = id; state.answer = null; state.history.push('回滚到 ' + id + '。');
    },
    'review-feedback': (data) => {
      checkRole(); const item = state.feedback.find((value) => value.id === state.feedbackId);
      const result = data.get('result'); const note = data.get('note').trim();
      check(item && note && ((item.state === 'OPEN' && ['TRIAGED', 'DISMISSED'].includes(result)) || (item.state === 'TRIAGED' && ['RESOLVED', 'DISMISSED'].includes(result))), '当前待办无法执行此操作。');
      item.state = result; item.note = note; item.history.push(result + ' · ' + note);
    },
    'generate-skill': (data) => {
      checkRole(); const fixture = state.failures.find((value) => value.id === data.get('source')); const id = state.candidates.length + 1;
      state.candidates.push({ id: String(id), version: '1.0.' + id, fixture, baseline: state.skills[fixture.skill], state: '待评测', scored: false });
    },
  };
  const renderers = { policy, workbench, feedback, lab };
  return { actions, forms, render: (view) => renderers[view](), reset: () => { state = seed(); }, skillFor, policyCitation };
})();
