const ShopLink = (() => {
  const { escape: e, button: b, badge, field, select, input, textarea, form, entry, list, row, title, text, card, work, trace, stat, stats, requireCondition: check } = UI;
  const accounts = { guest: '游客', admin: '演示管理员', buyer: '演示用户甲', other: '演示用户乙' };
  const categories = ['咖啡茶饮', '运动休闲', '本地餐饮', '甜品烘焙'];
  const initialShops = [
    [1, '北巷咖啡', '咖啡茶饮', '国贸', 43, .6], [2, '岩点攀岩', '运动休闲', '三里屯', 88, 2.2],
    [3, '松石面馆', '本地餐饮', '五道口', 35, 11.8], [4, '慢焙面包房', '甜品烘焙', '双井', 28, 2.9],
    [5, '松风羽毛球馆', '运动休闲', '劲松', 55, 3.2], [6, '青柚茶社', '咖啡茶饮', '朝外', 24, 1.4],
    [7, '湖畔小馆', '本地餐饮', '团结湖', 61, 4.2], [8, '麦田甜点', '甜品烘焙', '双井', 32, 3.1],
  ];
  const initialCoupons = [
    { id: 10001, shop: 1, name: '双人咖啡套餐', price: 2990, face: 5800, type: '秒杀券', timing: 'active', redis: 2, mysql: 2 },
    { id: 10002, shop: 2, name: '单人攀岩体验券', price: 4990, face: 9800, type: '秒杀券', timing: 'active', redis: 1, mysql: 1 },
    { id: 10003, shop: 3, name: '双人面食套餐', price: 3990, face: 7200, type: '普通券', timing: 'active' },
    { id: 10004, shop: 1, name: '周末咖啡体验券', price: 1990, face: 3900, type: '秒杀券', timing: 'future', redis: 3, mysql: 3 },
  ];
  const seed = () => ({
    actor: 'guest', loginAs: 'buyer', codeSent: false, signed: new Set(),
    shops: initialShops.map(([id, name, category, area, price, distance]) => ({ id, name, category, area, price, distance })),
    coupons: initialCoupons.map((item) => ({ ...item })),
    notes: [
      { id: 1, title: '周末咖啡探店', body: '双人套餐有两杯咖啡和一份甜点。', author: 'admin', shop: 1, likes: new Set(['other']), image: '' },
      { id: 2, title: '第一次室内攀岩', body: '入门线适合新手，建议提前到场热身。', author: 'other', shop: 2, likes: new Set(['admin']), image: '' },
      { id: 3, title: '五道口午餐', body: '试了招牌汤面，工作日午间可以错峰去。', author: 'buyer', shop: 3, likes: new Set(), image: '' },
    ],
    follows: { admin: new Set(['other']), buyer: new Set(), other: new Set() },
    shopId: 1, noteId: 1, userId: 'other', voucherId: 10001, orderId: '',
    query: '', category: '', near: false, page: 1, editShop: null, couponForm: false, noteForm: false, noteList: 'hot',
    voucherShop: '', online: true, sequence: 0, attempts: [], orders: [],
  });
  let state = seed();
  const tabs = { shops: '店铺', blogs: '探店笔记', feed: '关注动态', profile: '个人中心', vouchers: '优惠券', orders: '订单与恢复' };
  const shopName = (id) => state.shops.find((item) => item.id === id)?.name ?? '未关联店铺';
  const shopOptions = () => state.shops.map((item) => [item.id, item.name]);
  const money = (fen) => '¥' + (fen / 100).toFixed(2);
  const auth = () => check(state.actor !== 'guest', '请先在个人中心登录演示账号。');
  const admin = () => check(state.actor === 'admin', '需要管理员权限。');
  const orderStatus = { accepted: '已受理 · 等待建单', unpaid: '待支付', paid: '已支付', cancelled: '已取消' };
  const names = (values) => [...values].map((account) => accounts[account]).join('、') || '暂无';

  function shops() {
    const matching = state.shops.filter((item) => (!state.category || item.category === state.category)
      && (!state.query || item.name.includes(state.query)));
    if (state.near) matching.sort((a, b) => a.distance - b.distance);
    const shop = state.shops.find((item) => item.id === state.shopId);
    const edit = state.editShop;
    const editor = edit === null ? '' : card(title(edit.id ? '编辑店铺' : '新增店铺'), form('save-shop',
      field('店名', input('name', edit.name, 'required maxlength="50"')) +
      field('分类', select('category', categories.map((item) => [item, item]), edit.category)) +
      field('商圈', input('area', edit.area, 'required maxlength="30"')) +
      field('人均消费（元）', input('price', edit.price, 'required type="number" min="0" max="9999"')), '保存店铺'));
    return work(UI.stack(card(title('查询店铺'), form('search-shops',
      field('店名关键字', input('query', state.query, 'placeholder="例如 咖啡"')) +
      row(field('分类', select('category', [['', '全部分类'], ...categories.map((item) => [item, item])], state.category)),
        field('排序', select('near', [['false', '默认排序'], ['true', '附近优先（示例定位）']], state.near))), '查询'),
      list(matching.slice((state.page - 1) * 5, state.page * 5).map((item) =>
        entry(row(b(item.name, 'view-shop', item.id), badge(item.category), text(item.area + (state.near ? ' · ' + item.distance + ' km' : ''))))),
      '没有符合条件的店铺。'), row(b('上一页', 'shop-page', -1, { disabled: state.page <= 1 }),
        text('第 ' + state.page + ' 页'), b('下一页', 'shop-page', 1, { disabled: state.page * 5 >= matching.length }),
        b('新增店铺', 'edit-shop', 'new'))), editor),
    card(title(shop.name), text(shop.category + ' · ' + shop.area), stats(stat('人均消费', '¥' + shop.price), stat('示例点距离', shop.distance + ' km')),
      row(b('查看店铺优惠券', 'shop-coupons', shop.id), b('编辑店铺', 'edit-shop', shop.id)),
      title('探店笔记'), list(state.notes.filter((note) => note.shop === shop.id).map((note) => entry(b(note.title, 'view-note', note.id))))));
  }

  function blogs() {
    const items = state.noteList === 'mine' ? state.notes.filter((item) => item.author === state.actor)
      : [...state.notes].sort((a, b) => b.likes.size - a.likes.size || b.id - a.id);
    const note = state.notes.find((item) => item.id === state.noteId);
    const editor = state.noteForm ? card(title('发布探店笔记'), form('save-note',
      field('标题', input('title', '', 'required maxlength="60"')) +
      field('关联店铺', select('shop', shopOptions(), state.shopId)) +
      field('正文', textarea('body', '', 'required maxlength="600"')) +
      field('配图（可选）', '<input name="photo" type="file" accept="image/png,image/jpeg,image/webp">'), '发布笔记')) : '';
    const noteEntries = items.map((item) => entry(row(b(item.title, 'view-note', item.id), badge('点赞 ' + item.likes.size))));
    const collection = card(title(state.noteList === 'mine' ? '我的笔记' : '热门笔记'),
      row(b('热门笔记', 'note-list', 'hot'), b('我的笔记', 'note-list', 'mine'), b('写笔记', 'note-form')),
      list(noteEntries));
    return work(UI.stack(collection, editor),
      card(title(note.title), text(note.body), note.image ? '<img src="' + e(note.image) + '" alt="演示笔记配图" style="max-width:100%;border-radius:10px">' : '',
        row(b(accounts[note.author], 'profile-of', note.author), badge(shopName(note.shop))),
        row(b(note.likes.has(state.actor) ? '取消点赞' : '点赞', 'like-note'), badge(note.likes.size + ' 个赞')),
        text('点赞用户：' + names(note.likes))));
  }

  function feed() {
    const followed = state.follows[state.actor] ?? new Set();
    const posts = state.notes.filter((item) => followed.has(item.author)).sort((a, b) => b.id - a.id);
    const person = state.userId;
    const mutual = [...followed].filter((id) => state.follows[person].has(id));
    return work(card(title('关注动态'), list(posts.map((item) => entry(title(item.title) + text(accounts[item.author] + ' · ' + shopName(item.shop)) + b('打开笔记', 'view-note', item.id))),
      state.actor === 'guest' ? '登录后可查看已关注用户的动态。' : '关注一位用户后，这里会显示其样例笔记。')),
      card(title('用户资料'), row(...Object.keys(state.follows).map((id) => b(accounts[id], 'profile-of', id))),
        title(accounts[person]), text('已发布 ' + state.notes.filter((n) => n.author === person).length + ' 条笔记'),
        b(followed.has(person) ? '取消关注' : '关注', 'follow-user', person, { disabled: state.actor === person }),
        text('共同关注：' + names(mutual))));
  }

  function profile() {
    return work(card(title('演示账号'), state.actor === 'guest' ?
      form('login', field('账号', select('account', Object.keys(state.follows).map((id) => [id, accounts[id]]), state.loginAs)) +
        row(b('获取演示验证码', 'send-code'), state.codeSent ? badge('本次验证码 246810') : '') +
        field('验证码', input('code', '', 'required maxlength="6" inputmode="numeric" autocomplete="off"')), '登录')
      : row(b('退出登录', 'logout'), b('查看我的笔记', 'note-list', 'mine'))),
    card(title(accounts[state.actor]), text('验证码用于当前浏览器的合成演示。'), stats(stat('今日累计签到', state.signed.has(state.actor) ? '1 天' : '0 天')),
      b('签到', 'sign')));
  }

  function vouchers() {
    const relevant = state.coupons.filter((item) => !state.voucherShop || item.shop === state.voucherShop);
    const selected = relevant.find((item) => item.id === state.voucherId) ?? relevant[0];
    const editor = state.couponForm ? card(title('创建优惠券'), form('save-voucher',
      field('店铺', select('shop', shopOptions(), state.shopId)) +
      field('券名称', input('name', '', 'required maxlength="50"')) +
      row(field('类型', select('type', [['普通券', '普通券'], ['秒杀券', '秒杀券']], '秒杀券')),
        field('活动时间状态', select('timing', [['active', '进行中'], ['future', '未开始'], ['past', '已结束']], 'active'))) +
      row(field('售价（分）', input('price', 2990, 'type="number" min="1" required')),
        field('面值（分）', input('face', 5000, 'type="number" min="1" required')),
        field('秒杀库存', input('stock', 2, 'type="number" min="0" max="999" required'))), '创建优惠券')) : '';
    return work(UI.stack(card(title('精选优惠券'), form('filter-vouchers', field('按店铺筛选',
      select('shop', [['', '全部店铺'], ...shopOptions()], state.voucherShop)), '查询优惠券'),
      list(relevant.map((item) => entry(row(b(item.name, 'select-voucher', item.id), badge(item.type), text(money(item.price) + ' · ' + shopName(item.shop)))))),
      b('创建优惠券', 'coupon-form')), editor),
    selected ? card(title(selected.name), text(shopName(selected.shop) + ' · ' + selected.type), stats(stat('当前价', money(selected.price)), stat('面值', money(selected.face)),
      ...(selected.type === '秒杀券' ? [stat('Redis 可用库存', selected.redis)] : [])),
    text(selected.type === '普通券' ? '普通券供展示，秒杀下单入口适用于秒杀券。'
      : { active: '活动进行中', future: '活动未开始', past: '活动已结束' }[selected.timing]),
    b('抢购优惠券', 'buy', selected.id, { primary: true, disabled: selected.type !== '秒杀券' }))
      : card(title('优惠券详情'), text('该店铺当前还没有优惠券。')));
  }

  function orders() {
    const owned = state.orders.filter((item) => item.actor === state.actor);
    const order = owned.find((item) => item.id === state.orderId);
    const current = order && state.coupons.find((item) => item.id === order.coupon);
    return work(card(title('当前账号订单'), text(accounts[state.actor]), list(owned.map((item) =>
      entry(row(b(item.id, 'view-order', item.id), badge(orderStatus[item.status])))), '当前账号没有订单。'),
      form('lookup-order', field('订单号', input('orderId', '', 'required placeholder="输入订单号"')), '查询订单'),
      order ? UI.stack(title(order.id + ' · ' + orderStatus[order.status]), text(current.name), row(
        b('模拟支付成功', 'pay', true, { disabled: order.status !== 'unpaid' }), b('模拟支付失败', 'pay', false, { disabled: order.status !== 'unpaid' }),
        b('触发超时关单', 'expire-order', '', { disabled: order.status !== 'unpaid' })), trace(order.events)) : ''),
    card(title('订单恢复场景'), text('暂停 Broker 后先提交抢购，再运行数据库恢复扫描；待支付订单可推进到超时。'),
      row(b(state.online ? '暂停 Broker' : '恢复 Broker', 'broker'), badge(state.online ? '投递正常' : 'Broker 已暂停', !state.online)),
      b('运行数据库恢复扫描', 'recover'), current ? stats(stat('Redis 库存', current.redis), stat('MySQL 库存', current.mysql)) : '',
      text('此面板使用浏览器状态展示处理时序。')));
  }

  const renderers = { shops, blogs, feed, profile, vouchers, orders };
  function ownedOrder(id) {
    auth();
    const order = state.orders.find((item) => item.id === id && item.actor === state.actor);
    check(order, '订单不存在或当前账号没有查看权限。');
    return order;
  }
  function createOrder(order) {
    if (order.status !== 'accepted') return;
    const item = state.coupons.find((value) => value.id === order.coupon);
    item.mysql--;
    order.status = 'unpaid';
    order.events.push('MySQL 事务写入订单并条件扣减库存。');
  }
  const actions = {
    'send-code': (_, _go, data) => {
      state.loginAs = data.get('account');
      state.codeSent = true;
      return '已获取演示验证码。';
    },
    logout: () => { state.actor = 'guest'; state.codeSent = false; state.orderId = ''; return '已退出演示账号。'; },
    sign: () => { auth(); const signed = state.signed.has(state.actor); state.signed.add(state.actor); return signed ? '今天已经签到。' : '签到成功。'; },
    'shop-page': (value) => { state.page += Number(value); },
    'view-shop': (id) => { state.shopId = Number(id); },
    'edit-shop': (id) => { admin(); state.editShop = id === 'new' ? { category: categories[0] } : { ...state.shops.find((item) => item.id === Number(id)) }; },
    'shop-coupons': (id, go) => { state.voucherShop = Number(id); const selected = state.coupons.find((item) => item.shop === state.voucherShop); if (selected) state.voucherId = selected.id; go('vouchers'); },
    'note-list': (mode, go) => { if (mode === 'mine') auth(); state.noteList = mode; go('blogs'); },
    'note-form': () => { auth(); state.noteForm = !state.noteForm; },
    'view-note': (id, go) => { auth(); state.noteId = Number(id); go('blogs'); },
    'like-note': () => {
      auth();
      const likes = state.notes.find((item) => item.id === state.noteId).likes;
      if (likes.has(state.actor)) { likes.delete(state.actor); return '已取消点赞。'; }
      likes.add(state.actor); return '已点赞。';
    },
    'profile-of': (id, go) => { auth(); state.userId = id; go('feed'); },
    'follow-user': (id) => {
      auth(); check(id !== state.actor, '不能关注自己。');
      const followed = state.follows[state.actor];
      if (followed.has(id)) { followed.delete(id); return '已取消关注。'; }
      followed.add(id); return '已关注，动态已更新。';
    },
    'select-voucher': (id) => { state.voucherId = Number(id); },
    'coupon-form': () => { admin(); state.couponForm = !state.couponForm; },
    buy: (id, go) => {
      auth();
      const item = state.coupons.find((value) => value.id === Number(id));
      check(item?.type === '秒杀券', '请选择秒杀活动。');
      check(item.timing === 'active', item.timing === 'future' ? '活动尚未开始。' : '活动已经结束。');
      state.attempts = state.attempts.filter((record) => Date.now() - record.time < 60000);
      check(state.attempts.filter((record) => record.actor === state.actor).length < 5, '该账号一分钟内最多发起 5 次抢购请求。');
      state.attempts.push({ actor: state.actor, time: Date.now() });
      const existing = state.orders.find((order) => order.actor === state.actor && order.coupon === item.id && order.status !== 'cancelled');
      check(!existing, '你已拥有此活动的有效订单。');
      check(item.redis > 0, '优惠券已售罄。');
      const order = { id: '900719925474' + String(1000 + ++state.sequence), actor: state.actor, coupon: item.id, status: 'accepted',
        events: ['持久化下单意图。', 'Redis Lua 按订单号预占 1 份库存。'] };
      item.redis--;
      state.orders.push(order);
      state.orderId = order.id;
      if (state.online) { order.events.push('RocketMQ 消费下单消息。'); createOrder(order); }
      else order.events.push('Broker 投递失败，等待数据库恢复。');
      go('orders');
      return '抢购请求已受理。';
    },
    'view-order': (id) => { ownedOrder(id); state.orderId = id; },
    pay: (result) => {
      const order = ownedOrder(state.orderId);
      check(order.status === 'unpaid', '订单当前无法支付。');
      if (result === 'false') { order.events.push('模拟支付失败，订单仍待支付。'); return '模拟支付失败，可重试。'; }
      order.status = 'paid'; order.events.push('模拟支付成功，状态更新为已支付。'); return '模拟支付成功。';
    },
    'expire-order': () => {
      const order = ownedOrder(state.orderId);
      check(order.status === 'unpaid', '只有待支付订单可以超时关闭。');
      const item = state.coupons.find((value) => value.id === order.coupon);
      order.status = 'cancelled'; item.mysql++; item.redis++;
      order.events.push('超时扫描关闭订单，并登记库存释放任务。', 'MySQL 回补 1 份，Redis 按原预占身份幂等释放 1 份。');
      return '超时关单已完成，库存已回补。';
    },
    broker: () => { state.online = !state.online; return state.online ? '演示 Broker 已恢复。' : '演示 Broker 已暂停。'; },
    recover: () => {
      const pending = state.orders.filter((item) => item.status === 'accepted');
      pending.forEach((order) => { order.events.push('数据库恢复扫描命中持久化意图。'); createOrder(order); });
      return '本次补建 ' + pending.length + ' 笔订单。';
    },
  };
  const forms = {
    login: (data) => {
      check(state.codeSent && data.get('account') === state.loginAs && data.get('code') === '246810', '验证码错误、账号不符或尚未获取。');
      state.actor = state.loginAs; state.codeSent = false; state.orderId = ''; return '已登录 ' + accounts[state.actor] + '。';
    },
    'search-shops': (data) => { state.query = data.get('query').trim(); state.category = data.get('category'); state.near = data.get('near') === 'true'; state.page = 1; },
    'save-shop': (data) => {
      admin();
      const old = state.editShop;
      const updated = { id: old.id || Math.max(...state.shops.map((item) => item.id)) + 1, name: data.get('name').trim(),
        category: data.get('category'), area: data.get('area').trim(), price: Number(data.get('price')), distance: old.distance ?? 4.8 };
      check(updated.name && updated.area, '请填写店铺名和商圈。');
      state.shops = [...state.shops.filter((item) => item.id !== updated.id), updated].sort((a, b) => a.id - b.id);
      state.shopId = updated.id; state.editShop = null; return '店铺已保存，详情已刷新。';
    },
    'save-note': (data) => {
      auth();
      const file = data.get('photo');
      if (file?.size) check(['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 2 * 1024 * 1024, '请选择不超过 2 MB 的 PNG、JPEG 或 WebP 图片。');
      const title = data.get('title').trim(); const body = data.get('body').trim();
      check(title && body, '标题和正文不能为空。');
      const id = Math.max(...state.notes.map((item) => item.id)) + 1;
      state.notes.push({ id, title, body, shop: Number(data.get('shop')), author: state.actor, likes: new Set(), image: file?.size ? URL.createObjectURL(file) : '' });
      state.noteId = id; state.noteForm = false; return '笔记已发布，关注者可以在动态中看到它。';
    },
    'filter-vouchers': (data) => {
      state.voucherShop = Number(data.get('shop')) || '';
      const first = state.coupons.find((item) => !state.voucherShop || item.shop === state.voucherShop);
      if (first) state.voucherId = first.id;
    },
    'save-voucher': (data) => {
      admin();
      const name = data.get('name').trim(); const price = Number(data.get('price')); const face = Number(data.get('face'));
      check(name && face >= price && price > 0, '请填写券名，面值须大于或等于售价。');
      const stock = Number(data.get('stock'));
      const item = { id: Math.max(...state.coupons.map((voucher) => voucher.id)) + 1, name, shop: Number(data.get('shop')), type: data.get('type'),
        timing: data.get('timing'), price, face, redis: stock, mysql: stock };
      state.coupons.push(item); state.voucherId = item.id; state.voucherShop = ''; state.couponForm = false;
      return '优惠券已创建。';
    },
    'lookup-order': (data) => { state.orderId = ownedOrder(data.get('orderId').trim()).id; },
  };
  return { tabs, defaultView: 'shops', render: (view) => renderers[view](), actions, forms, account: () => accounts[state.actor],
    reset: () => { state.notes.filter((note) => note.image).forEach((note) => URL.revokeObjectURL(note.image)); state = seed(); } };
})();
