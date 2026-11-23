const AfterSales = (() => {
  const { escape: e, button: b, badge, field, select, input, textarea, form, entry, list, row, title, text, card, work, trace, stat, stats, requireCondition: check } = UI;
  const roles = { guest: '游客', customer: '客户甲', customerB: '客户乙', staff: '客服审核', maintainer: '维护人员' };
  const intents = { CANCEL_ORDER: '取消订单', RETURN_REFUND: '申请退货', QUALITY_ISSUE: '质量问题' };
  const statuses = { NEEDS_INFORMATION: '待客户补充', UNDER_REVIEW: '待人工审核', CLAIMED: '审核中', RETURN_PENDING: '待寄回商品', COMPLETED: '已完成', DECLINED: '暂不受理' };
  const routes = { RULE: '规则处理', INFORMATION: '补充信息', MANUAL_REVIEW: '人工审核', ASSISTED_REVIEW: '人工审核 · 可整理辅助材料' };
  const orders = [
    { id: 'ORD-1001', owner: 'customer', product: '无线耳机', state: 'PAID', status: '已付款 · 未发货', type: '标准商品', days: 0, intent: 'CANCEL_ORDER' },
    { id: 'ORD-1002', owner: 'customer', product: '通勤背包', state: 'DELIVERED', status: '已签收', type: '标准商品', days: 3, intent: 'QUALITY_ISSUE' },
    { id: 'ORD-1003', owner: 'customer', product: '旅行水杯', state: 'SHIPPED', status: '已发货', type: '标准商品', days: 0, intent: 'RETURN_REFUND' },
    { id: 'ORD-1004', owner: 'customer', product: '定制刻字杯', state: 'DELIVERED', status: '已签收', type: '定制商品', days: 4, intent: 'RETURN_REFUND' },
    { id: 'ORD-1005', owner: 'customer', product: '轻便雨伞', state: 'DELIVERED', status: '已签收', type: '标准商品', days: 12, intent: 'RETURN_REFUND' },
    { id: 'ORD-1006', owner: 'customer', product: '便携水壶', state: 'DELIVERED', status: '已签收', type: '标准商品', days: 2, intent: 'RETURN_REFUND' },
    { id: 'ORD-2001', owner: 'customerB', product: '帆布双肩包', state: 'UNPAID', status: '未付款', type: '标准商品', days: 0, intent: 'CANCEL_ORDER' },
  ];
  const seed = () => ({ role: 'customer', selectedOrder: 'ORD-1004', id: '', applications: [], notifications: [], messageSequence: 0,
    history: false, failDelivery: false, diagnosticId: '', legacyStage: 'idle' });
  let state = seed();
  const tabs = { customer: '客户工作台', staff: '客服审核', workbench: '知识维护',
    feedback: '知识反馈', lab: 'Skill 评测', diagnostics: '处理诊断', messages: '通知投递', legacy: '流程试验', account: '账号' };
  const selected = () => state.applications.find((item) => item.id === state.id);
  const orderFor = (item) => orders.find((order) => order.id === item.orderId);
  const customers = () => ['customer', 'customerB'].includes(state.role);
  const roleFor = { customer: 'customer', staff: 'staff', workbench: 'maintainer', feedback: 'maintainer', lab: 'maintainer',
    diagnostics: 'maintainer', messages: 'maintainer', legacy: 'customer' };
  const landing = { customer: 'customer', customerB: 'customer', staff: 'staff', maintainer: 'workbench', guest: 'account' };
  function requireRole(role) {
    check(role === 'customer' ? customers() : state.role === role, '当前账号无法执行此操作。');
  }
  function requireCustomer(item = selected()) {
    requireRole('customer'); check(item?.owner === state.role, '当前账号无权查看这个申请。'); return item;
  }
  function requireStaff(claimed = false) {
    requireRole('staff'); const item = selected(); check(item, '请先选择工单。');
    if (claimed) check(item.claimed && item.status === 'CLAIMED', '请先领取有效工单。');
    return item;
  }
  function audit(item, note) {
    item.audit.push('v' + item.version + ' · ' + note);
  }
  function notify(item, label) {
    state.notifications.push({ id: 'MSG-' + (++state.messageSequence), owner: item.owner, destination: item.id,
      label, state: state.failDelivery ? 'DEAD' : 'SENT', attempts: state.failDelivery ? 3 : 1 });
  }
  function classify(item) {
    const order = orderFor(item);
    const reason = item.reason.replace(/\s+/g, '');
    const route = (path, status, message, code) => ({ route: path, status, message, code, claimed: false });
    const information = (message, code) => route('INFORMATION', 'NEEDS_INFORMATION', message, code);
    const manual = (message, code, assisted = false) => route(assisted ? 'ASSISTED_REVIEW' : 'MANUAL_REVIEW', 'UNDER_REVIEW', message, code);
    const rule = (status, message, code) => route('RULE', status, message, code);
    if (/(不要取消|不想取消|暂不取消|不取消|别取消|不要退货|不想退货|并非要退款|没有质量问题|不是质量问题)/.test(reason))
      return information('说明与申请类型可能不一致，请重新说明。', 'INTENT_NEGATED');
    if (/(咨询|问一下|想了解|是否|能不能|可不可以|如果|假如|有什么影响|需要几天)/.test(reason))
      return information('说明可能是在咨询，请明确希望办理的事项。', 'CONSULTATION_OR_CONDITIONAL');
    if (/取消.*(换货|退货)|(换货|退货).*取消/.test(reason)) return information('请先选择并确认一项申请。', 'MULTIPLE_REQUESTS');
    if (order.state === 'PAID' && item.intent !== 'CANCEL_ORDER')
      return information('订单尚未发货，请确认是否希望取消订单。', 'CANCEL_INTENT_REQUIRED');
    if (item.intent === 'QUALITY_ISSUE' && !reason) return information('请补充商品问题说明。', 'ISSUE_DESCRIPTION_REQUIRED');
    if (/(仅退款|只退款|只退钱|开发票|补开发票|维修|补发|换货)/.test(reason))
      return manual('请等待客服核实该事项。', 'REQUEST_REQUIRES_REVIEW');
    if (order.state === 'UNPAID') return rule('DECLINED', '订单尚未付款，没有可退金额。', 'UNPAID_ORDER');
    if (order.state === 'PAID') return rule('COMPLETED', '未发货订单已取消，已模拟退还实付金额。', 'PAID_NOT_SHIPPED');
    if (order.state === 'SHIPPED') return manual('商品已发货，客服需确认拦截或退货方案。', 'SHIPPED_REQUIRES_REVIEW');
    if (item.intent === 'QUALITY_ISSUE') {
      if (order.days > 30) return manual('已超出演示政策的自动受理范围，转人工核验。', 'QUALITY_OUTSIDE_AUTO_SCOPE');
      return item.evidence.length ? manual('凭证已收集，进入人工审核。', 'QUALITY_EVIDENCE_REVIEW', true)
        : information('请补充商品问题的凭证编号。', 'QUALITY_EVIDENCE_REQUIRED');
    }
    if (item.intent === 'CANCEL_ORDER') return rule('DECLINED', '订单已签收，请使用退货申请流程。', 'DELIVERED_USE_RETURN');
    if (order.type === '定制商品') return manual('定制商品需人工确认适用条件。', 'CUSTOM_PRODUCT_REVIEW', true);
    return order.days > 7 ? rule('DECLINED', '超出演示政策的退货期限。', 'RETURN_WINDOW_EXPIRED')
      : rule('RETURN_PENDING', '已登记退货申请，待收到商品后验收。', 'RETURN_WITHIN_WINDOW');
  }
  function applyRoute(item, note) {
    Object.assign(item, classify(item));
    audit(item, note); audit(item, routes[item.route] + ' · ' + item.code);
    notify(item, item.message);
  }
  const conclusion = (item) => row(badge(statuses[item.status]), badge(routes[item.route]), badge('v' + item.version));
  const applicationFact = (item) => UI.stack(conclusion(item), text(item.id + ' · ' + item.orderId + ' · ' + intents[item.intent]),
    text(item.reason || '未填写说明'), text('凭证：' + (item.evidence.join('、') || '未提供')), text(item.message));
  const confirmation = (label) => '<label class="row"><input type="checkbox" required name="confirmed" style="width:18px;min-height:18px">' + e(label) + '</label>';
  function customer() {
    const ownOrders = orders.filter((order) => order.owner === state.role);
    const order = ownOrders.find((item) => item.id === state.selectedOrder) ?? ownOrders[0];
    const applications = state.applications.filter((item) => item.owner === state.role);
    const item = applications.find((value) => value.id === state.id);
    const submits = form('application', field('售后订单', select('order', ownOrders.map((value) => [value.id, value.id + ' · ' + value.product + ' · ' + value.status]), order.id)) +
      field('申请类型', select('intent', Object.entries(intents), order.intent)) +
      field('说明', textarea('reason', '', 'maxlength="1000" placeholder="例如 刻字与确认稿不一致"')) +
      field('凭证编号（可选）', input('evidence', '', 'maxlength="160"')) + confirmation('我确认提交本次售后申请'), '提交申请');
    const editable = item?.status === 'NEEDS_INFORMATION' && !item.prompt;
    const canForEvidence = editable || item?.status === 'UNDER_REVIEW';
    const additions = item ? UI.stack(
      editable ? form('amend', field('新的申请类型', select('intent', Object.entries(intents), item.intent)) +
        field('重新说明办理事项', textarea('reason', item.reason, 'required maxlength="1000"')) + confirmation('我确认修改后的申请'), '重新确认申请') : '',
      editable && item.code === 'CANCEL_INTENT_REQUIRED' ? b('确认改为取消订单', 'adopt-cancel') : '',
      canForEvidence && !item.prompt ? form('evidence', field('补交凭证编号', input('evidence', '', 'required maxlength="160"')) + confirmation('我确认凭证用于这笔申请'), '补交凭证') : '',
      item.prompt ? form('reply', text('客服补充要求：' + item.prompt) +
        field('给客服的回复', textarea('reason', '', 'required maxlength="1000"')) +
        field('补充凭证编号（可选）', input('evidence', '', 'maxlength="160"')) + confirmation('我确认发送补充内容'), '提交补件回复') : '') : '';
    const ownCases = applications.map((value) => entry(row(b(value.id + ' · ' + value.orderId, 'open-customer-case', value.id), badge(statuses[value.status]))));
    const ownNotices = state.notifications.filter((notice) => notice.owner === state.role && notice.state === 'SENT').slice().reverse()
      .map((notice) => entry(text(notice.id + ' · ' + notice.label) + b('查看关联申请', 'open-customer-case', notice.destination)));
    return work(UI.stack(card(title('提交售后申请'), text(order.product + ' · ' + order.type + ' · ' + order.status),
      row(...ownOrders.map((value) => b(value.id, 'choose-order', value.id))), submits),
      card(title('我的申请'), list(ownCases)), card(title('站内通知'), list(ownNotices))),
    UI.stack(card(title('申请进度'), item ? UI.stack(applicationFact(item), additions, title('处理记录'), trace(item.audit)) : text('提交申请后可在这里查进度与补充材料。')),
      '<section id="policy-question" aria-label="政策问答">' + Knowledge.policy() + '</section>'));
  }
  function assistPanel(item) {
    const job = item.assist;
    const valid = item.claimed && item.status === 'CLAIMED';
    const eligible = item.route === 'ASSISTED_REVIEW';
    const jobButtons = job ? row(
      b('模拟完成任务', 'assist-run', 'success', { disabled: job.status !== '运行中' || !valid }),
      b('模拟模型或检索失败', 'assist-run', 'failure', { disabled: job.status !== '运行中' || !valid }),
      b('取消辅助任务', 'assist-cancel', '', { disabled: job.status !== '运行中' }),
      b('在剩余预算内重试', 'assist-retry', '', { disabled: job.status !== '可重试' || job.used >= 4 || !valid })) : '';
    return UI.stack(title('只读 Agent 辅助'),
      text('报告按样例生成，供客服核实订单事实、客户陈述、政策依据和待核查信息。'),
      b('整理辅助材料', 'assist-start', '', { primary: true, disabled: !eligible || !valid || job?.status === '运行中' }), jobButtons,
      job ? row(badge(job.status), badge('请求预算 ' + job.used + ' / 4'), badge(job.skill)) : '',
      job?.status === '已整理' ? UI.stack(text('订单事实：' + orderFor(item).status), text('客户陈述（待核实）：' + (item.reason || '未填写')),
        text('演示政策引用 ' + job.citation.id + ' · ' + job.citation.source + '：' + job.citation.quote),
        text('建议核实：商品问题位置与表现、凭证编号、使用情况与相关定制信息。')) : '',
      job ? trace(job.log) : '');
  }
  function staff() {
    const items = state.applications.filter((item) => state.history ? item.resolved : ['UNDER_REVIEW', 'CLAIMED'].includes(item.status) || item.prompt);
    const item = items.find((value) => value.id === state.id);
    const active = item?.status === 'CLAIMED';
    return work(card(title(state.history ? '审核历史' : '审核队列'), row(b(state.history ? '查看待审核' : '查看审核历史', 'staff-history')),
      list(items.map((value) => entry(row(b(value.id + ' · ' + value.orderId, 'open-staff-case', value.id), badge(statuses[value.status])))))),
      card(title('审核详情'), item ? UI.stack(applicationFact(item),
        item.status === 'UNDER_REVIEW' ? b('领取工单', 'claim', '', { primary: true }) : '',
        active ? row(b('延长领取时间', 'renew'), b('退回队列', 'release'), b('模拟领取过期', 'lease-expire')) : '',
        active ? form('request-info', field('需要客户补充什么', textarea('question', '', 'required maxlength="500"')), '发送补充要求') : '',
        item.prompt ? text('已发补充要求：' + item.prompt) : '', assistPanel(item),
        active ? form('resolve', field('审核结论', select('outcome', [['RETURN_PENDING', '同意登记退货 · 待寄回'], ['DECLINED', '本次申请暂不受理']], 'RETURN_PENDING')) +
          field('结案说明', textarea('note', '', 'required maxlength="500"')) + confirmation('我已核实材料并确认提交人工结论'), '提交结论') : '',
        title('审核记录'), trace(item.audit)) : text('从队列选择一笔申请。')));
  }
  function diagnostics() {
    const item = state.applications.find((value) => value.id === state.diagnosticId);
    return work(card(title('售后处理诊断'), list(state.applications.map((value) => entry(row(b(value.id + ' · ' + value.orderId, 'diagnostic', value.id), badge(value.code)))))),
      card(title('工单执行轨迹'), item ? UI.stack(applicationFact(item), trace(item.audit), item.assist ? trace(item.assist.log) : '') : text('选择一笔申请查看分流、审核和辅助任务轨迹。')));
  }
  function messages() {
    return work(card(title('通知记录'), list(state.notifications.slice().reverse().map((notice) => entry(UI.stack(
      row(title(notice.id), badge(notice.state === 'SENT' ? '已投递' : '需人工处理', notice.state === 'DEAD')),
      text(notice.destination + ' · 尝试 ' + notice.attempts + ' 次 · ' + notice.label),
      b('重放通知', 'replay-message', notice.id, { disabled: notice.state === 'SENT' })))))),
    card(title('通知投递诊断'), stats(stat('已投递', state.notifications.filter((value) => value.state === 'SENT').length),
      stat('需人工处理', state.notifications.filter((value) => value.state === 'DEAD').length)),
      b(state.failDelivery ? '恢复模拟投递' : '模拟投递持续失败', 'toggle-delivery'),
      text('客户只看到投递成功的通知。恢复投递后可重放失败记录。')));
  }
  function legacy() {
    const sequence = ['idle', '已评估', '已执行'];
    const l = state.legacyStage;
    const advanced = state.legacyRun || '未启动';
    const agent = state.legacyAgent || '未启动';
    const proposal = state.proposal || '未生成';
    return work(card(title('规则评估与执行'), text('独立样例：ORD-1001 已付款未发货。'),
      row(...sequence.slice(1).map((step, index) => b(index === 0 ? '评估工单' : '执行模拟取消', 'legacy-step', step, { disabled: l !== sequence[index] }))), badge(l === 'idle' ? '待评估' : l),
      title('分步编排'), row(b('创建分步任务', 'legacy-run', '已创建'), b('推进分步任务', 'legacy-run', '已完成', { disabled: advanced !== '已创建' }),
        b('取消分步任务', 'legacy-run', '已取消', { disabled: advanced !== '已创建' })), badge(advanced)),
      card(title('Agent 编排与提案'), text('浏览器演示分步与自动编排接口的状态，实际写操作仍需要业务确认。'),
        row(b('启动分步 Agent', 'legacy-agent', '待推进', { disabled: advanced !== '已创建' }), b('启动自动 Agent', 'legacy-agent', '已完成', { disabled: advanced !== '已创建' }),
          b('推进 Agent', 'legacy-agent', '已完成', { disabled: agent !== '待推进' }), b('取消 Agent', 'legacy-agent', '已取消', { disabled: agent !== '待推进' })), badge(agent),
        row(b('生成固定提案', 'legacy-proposal', '待确认', { disabled: agent !== '已完成' || proposal !== '未生成' }),
          b('确认提案', 'legacy-proposal', '已确认', { disabled: proposal !== '待确认' }), b('取消提案', 'legacy-proposal', '已取消', { disabled: proposal !== '待确认' })),
        badge(proposal), trace(state.legacyLog || [])));
  }
  function account() {
    return card(title('演示身份'), text('切换为合成客户、客服或维护人员。身份仅在当前页面生效。'),
      row(...Object.entries(roles).filter(([value]) => value !== 'guest').map(([value, label]) => b('切换到' + label, 'actor', value)),
        b('退出登录', 'actor', 'guest')), text('当前身份：' + roles[state.role]));
  }

  function transitionClaim(item, label, status) {
    item.version++; item.status = status; item.claimed = status === 'CLAIMED'; audit(item, label);
  }
  const actions = {
    actor: (role, go) => {
      const [identity, preferred] = role.split('/');
      state.role = identity;
      go(preferred || landing[identity]);
      return '当前身份为' + roles[identity] + '。';
    },
    'choose-order': (id) => { state.selectedOrder = id; },
    'open-customer-case': (id) => { requireCustomer(state.applications.find((item) => item.id === id)); state.id = id; },
    'open-staff-case': (id) => { requireRole('staff'); state.id = id; },
    'staff-history': () => { requireRole('staff'); state.history = !state.history; },
    'adopt-cancel': () => {
      const item = requireCustomer(); check(item.code === 'CANCEL_INTENT_REQUIRED', '当前未提供改办建议。');
      item.intent = 'CANCEL_ORDER'; item.reason = '确认取消尚未发货的订单'; item.version++; applyRoute(item, '客户确认改办取消订单。');
    },
    claim: () => { const item = requireStaff(); check(item.status === 'UNDER_REVIEW', '当前无法领取。'); transitionClaim(item, '客服领取，建立领取租约。', 'CLAIMED'); },
    renew: () => { const item = requireStaff(true); transitionClaim(item, '客服延长领取租约。', 'CLAIMED'); },
    release: () => { const item = requireStaff(true); transitionClaim(item, '客服退回队列。', 'UNDER_REVIEW'); },
    'lease-expire': () => {
      const item = requireStaff(true); transitionClaim(item, '模拟租约到期，工单退回队列。', 'UNDER_REVIEW');
      if (item.assist?.status === '运行中') { item.assist.status = '可重试'; item.assist.log.push('校验租约失败，旧执行者的回写被拒绝。'); }
    },
    'assist-start': () => {
      const item = requireStaff(true); check(item.route === 'ASSISTED_REVIEW', '此工单未进入辅助审核路径。');
      item.assist = { status: '运行中', used: 0, skill: 'Skill v' + Knowledge.skillFor(item.intent), log: ['读取订单事实和客户陈述。'] };
    },
    'assist-run': (mode) => {
      const job = requireStaff(true).assist; check(job?.status === '运行中' && job.used < 4, '任务当前不可推进。');
      job.used++;
      const item = selected();
      const citation = mode === 'success' && Knowledge.policyCitation(item.intent === 'QUALITY_ISSUE' ? 'QUALITY-001' : 'RETURN-EXCEPTION');
      if (!citation) { job.status = job.used < 4 ? '可重试' : '预算已耗尽'; job.log.push('模型或检索暂不可用，或未找到适用的已发布条款。'); }
      else { job.status = '已整理'; job.citation = citation; job.log.push('检索适用的已发布政策。', '校验引用原文、任务租约和回写令牌。'); }
    },
    'assist-retry': () => {
      const job = requireStaff(true).assist; check(job?.status === '可重试' && job.used < 4, '没有可用重试预算。'); job.status = '运行中'; job.log.push('沿用原任务预算重新运行。');
    },
    'assist-cancel': () => {
      const job = requireStaff().assist; check(job?.status === '运行中', '只有运行中的任务可取消。'); job.status = '已取消'; job.log.push('维护原预算记录，拒绝后续回写。');
    },
    diagnostic: (id) => { requireRole('maintainer'); state.diagnosticId = id; },
    'toggle-delivery': () => { requireRole('maintainer'); state.failDelivery = !state.failDelivery; },
    'replay-message': (id) => {
      requireRole('maintainer'); const item = state.notifications.find((notice) => notice.id === id);
      check(item?.state === 'DEAD', '只能重放失败的通知。'); item.attempts++;
      if (state.failDelivery) return '投递仍不可用，此通知保留在失败列表。';
      item.state = 'SENT'; return '通知已重放，客户现在可以查看。';
    },
    'legacy-step': (value) => { requireRole('customer'); state.legacyStage = value; },
    'legacy-run': (value) => { requireRole('customer'); state.legacyRun = value; },
    'legacy-agent': (value) => { requireRole('customer'); state.legacyAgent = value; },
    'legacy-proposal': (value) => {
      requireRole('customer'); state.proposal = value; state.legacyLog ??= []; state.legacyLog.push('提案状态 · ' + value);
    },
  };
  const forms = {
    application: (data) => {
      requireRole('customer'); const order = orders.find((item) => item.owner === state.role && item.id === data.get('order'));
      check(order && data.has('confirmed'), '请确认申请并选择本账号订单。');
      const intent = data.get('intent'); const reason = data.get('reason').trim(); const evidence = data.get('evidence').trim();
      const repeated = state.applications.find((item) => item.owner === state.role && item.orderId === order.id && item.intent === intent && item.originalReason === reason && item.originalEvidence === evidence);
      if (repeated) { state.id = repeated.id; return '已返回本次相同申请的进度。'; }
      const item = { id: 'AS-' + String(state.applications.length + 1).padStart(3, '0'), owner: state.role, orderId: order.id, intent,
        reason, originalReason: reason, originalEvidence: evidence, evidence: evidence ? [evidence] : [], audit: [], version: 1, prompt: '', resolved: false, assist: null };
      state.applications.push(item); state.id = item.id; state.selectedOrder = order.id;
      applyRoute(item, '客户确认提交。'); return item.message;
    },
    amend: (data) => {
      const item = requireCustomer(); check(item.status === 'NEEDS_INFORMATION' && !item.prompt && data.has('confirmed'), '当前不能修改申请。');
      item.intent = data.get('intent'); item.reason = data.get('reason').trim(); item.version++; applyRoute(item, '客户修改并确认申请。'); return item.message;
    },
    evidence: (data) => {
      const item = requireCustomer(); check(['NEEDS_INFORMATION', 'UNDER_REVIEW'].includes(item.status) && !item.prompt && data.has('confirmed'), '当前不能补交材料。');
      const value = data.get('evidence').trim(); check(value && !item.evidence.includes(value), '凭证为空或已提交。');
      item.evidence.push(value); item.version++; applyRoute(item, '客户补交凭证。'); return item.message;
    },
    'request-info': (data) => {
      const item = requireStaff(true); const question = data.get('question').trim(); check(question, '请填写补充要求。');
      item.prompt = question; transitionClaim(item, '客服发出补充要求。', 'NEEDS_INFORMATION'); notify(item, '客服需要补充信息。'); return '已发送补充要求。';
    },
    reply: (data) => {
      const item = requireCustomer(); const reason = data.get('reason').trim();
      check(item.prompt && reason && data.has('confirmed'), '请填写并确认补件回复。');
      item.prompt = ''; item.reason += (item.reason ? '；' : '') + reason;
      const reference = data.get('evidence').trim(); if (reference && !item.evidence.includes(reference)) item.evidence.push(reference);
      transitionClaim(item, '客户提交补件回复，工单回到审核队列。', 'UNDER_REVIEW'); return '回复已提交，等待客服重新领取。';
    },
    resolve: (data) => {
      const item = requireStaff(true); const note = data.get('note').trim();
      check(note && data.has('confirmed'), '请填写并确认结案说明。');
      item.resolved = true; item.message = note; transitionClaim(item, '客服提交结论 · ' + note, data.get('outcome'));
      notify(item, note); return '人工结论已提交。';
    },
  };
  const renders = { customer, staff, diagnostics, messages, account, legacy };
  return { tabs, actions, forms, defaultView: 'customer', render: (view) => {
    const role = roleFor[view];
    if (role && state.role !== role && !(role === 'customer' && customers())) return card(title(tabs[view]),
      text('请先切换到该工作区对应的演示身份。'), b('切换到' + roles[role], 'actor', role + '/' + view, { primary: true }));
    return renders[view] ? renders[view]() : Knowledge.render(view);
  }, account: () => roles[state.role], canMaintain: () => requireRole('maintainer'),
  reset: () => { state = seed(); Knowledge.reset(); } };
})();
