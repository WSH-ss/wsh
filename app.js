(() => {
  const { escape: e, button: b, badge, title, text, card, row } = UI;
  const app = document.querySelector('#app');
  const projects = {
    shoplink: { name: '券序 · 本地生活服务平台', intro: '从发现店铺到参加秒杀，也可以走店铺管理、关注动态和订单补偿。', app: ShopLink },
    aftersales: { name: '电商售后 Agent', intro: '任选客户、客服或维护人员，体验一笔申请从分流到审核结案，也可以管理政策和 Skill。', app: AfterSales },
  };
  function route() {
    const [key, requested, section] = location.hash.slice(1).split('/');
    const project = projects[key];
    const policyLink = key === 'aftersales' && (requested === 'policy' || (requested === 'customer' && section === 'policy'));
    const view = project && (policyLink ? 'customer' : Object.hasOwn(project.app.tabs, requested) ? requested : project.app.defaultView);
    return { key, view, project, policyLink };
  }
  function home() {
    return '<section class="hero"><h1>两个项目，直接上手</h1><p>任选一个工作台。所有账号、订单和政策均为合成样例，状态仅保留在当前标签页。</p></section>'
      + '<div class="project-cards">'
      + '<section class="card project-card"><h2>券序 · 本地生活</h2><p>搜店、写笔记、关注用户。领取秒杀券后可模拟支付，也可观察 Broker 停机和超时返库。</p>'
      + '<div class="row"><a class="button primary" href="#shoplink">打开券序</a><a class="button" href="#shoplink/vouchers">直接看优惠券</a></div></section>'
      + '<section class="card project-card"><h2>电商售后 Agent</h2><p>提交售后申请，切到客服处理工单，再到维护人员工作区验证政策发布、反馈和 Skill 评测。</p>'
      + '<div class="row"><a class="button primary" href="#aftersales">打开售后工作台</a><a class="button" href="#aftersales/customer/policy">直接查政策</a></div></section></div>';
  }
  function notes() {
    return '<div class="section-title"><div><h1>技术复盘</h1><p>这些记录描述源码里的实现。演示台用合成样例重放业务状态。</p></div></div><div class="stack">'
      + '<details open><summary>券序 · 订单恢复与库存对账</summary><p>先持久化下单意图，再让 Redis Lua 按订单号预占库存。消费者在 MySQL 事务里建单并扣库存，唯一索引限制同一用户的有效订单。数据库恢复扫描与消息投递分别调度，超时关闭后用持久化任务释放 Redis 预占。</p><p>本机隔离用例停掉 Broker 后约 34 秒补建成功，订单支付后 MySQL 与 Redis 库存均为 99。浏览器的推进按钮用于缩短演示等待。</p><p><a href="#shoplink/orders">查看订单恢复面板</a></p></details>'
      + '<details><summary>电商售后 · 分流、只读辅助与版本治理</summary><p>Java 规则处理订单状态和申请类型，客服核实后提交人工结论。Agent 在事务外读取订单事实、客户陈述和政策条款，回写前检查任务版本、租约与引用原文。知识审核、索引和发布各有状态；已开始的任务绑定启动时的 Skill 版本。</p><p><a href="#aftersales/staff">查看客服审核</a> · <a href="#aftersales/workbench">查看知识维护</a></p></details>'
      + '<details><summary>浏览器演示与真实项目的范围</summary><p>在线版模拟业务状态和失败条件。它使用合成验证码、订单和报告，支付、模型调用、数据库、缓存、消息队列及向量索引由已启动的本地项目提供。</p><p>已启动本地项目时，可以打开 <a href="http://127.0.0.1:5173/" target="_blank" rel="noopener noreferrer">券序本地前端</a> 或 <a href="http://127.0.0.1:8124/api/login" target="_blank" rel="noopener noreferrer">售后本地前端</a>。地址只在运行相应服务的电脑上可用。</p></details></div>';
  }
  function render(message = '', isError = false) {
    const { key, view, project } = route();
    document.querySelectorAll('[data-project]').forEach((link) => {
      if (link.dataset.project === key) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.title = project ? project.name + ' · 项目演示台' : '项目演示台';
    if (!project) { app.innerHTML = key === 'notes' ? notes() : home(); return; }
    const tabs = Object.entries(project.app.tabs).map(([id, label]) => '<a href="#' + key + '/' + id + '"'
      + (id === view ? ' aria-current="page"' : '') + '>' + e(label) + '</a>').join('');
    app.innerHTML = '<header class="section-title"><div><h1>' + e(project.name) + '</h1><p>' + e(project.intro) + '</p></div>'
      + row(badge('浏览器沙箱'), b('重置此项目', 'reset')) + '</header>'
      + '<nav class="tabs" aria-label="功能模块">' + tabs + '</nav><p class="caption">当前身份 · ' + e(project.app.account()) + '</p>'
      + '<div id="notice" role="status" aria-live="polite"></div>' + project.app.render(view);
    notify(message, isError);
  }
  function notify(message, error = false) {
    const notice = app.querySelector('#notice');
    if (!notice) return;
    notice.className = message ? 'notice' + (error ? ' error' : '') : '';
    notice.textContent = message;
  }
  async function run(type, action, value, context) {
    const { key, project, view } = route();
    if (!project) return;
    let next = view;
    const go = (target) => { if (Object.hasOwn(project.app.tabs, target)) next = target; };
    const target = type === 'actions' && action === 'reset'
      ? () => { project.app.reset(); go(project.app.defaultView); return '演示数据已重置。'; }
      : project.app[type][action] ?? (key === 'aftersales' ? Knowledge[type][action] : null);
    if (!target) return;
    try {
      const message = await target(value, go, context);
      if (route().key !== key) return;
      const policyPanel = app.querySelector('#policy-question');
      if (policyPanel && ['ask-policy', 'policy-source'].includes(action)) {
        policyPanel.innerHTML = Knowledge.policy();
        notify(message);
        return;
      }
      if (next !== view) history.pushState(null, '', '#' + key + '/' + next);
      render(message);
    } catch (error) {
      notify(error.message || '操作未完成，请重试。', true);
    }
  }
  app.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || button.disabled) return;
    run('actions', button.dataset.action, button.dataset.value, button.form ? new FormData(button.form) : null);
  });
  app.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-form]');
    if (!form) return;
    event.preventDefault();
    run('forms', form.dataset.form, new FormData(form));
  });
  function renderRoute() {
    render();
    if (route().policyLink) app.querySelector('#policy-question')?.scrollIntoView({ block: 'start' });
  }
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
})();
