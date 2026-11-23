# 项目演示台

券序和电商售后 Agent 的浏览器交互演示。打开 `index.html` 可直接体验，也可将本目录发布到静态站点。页面仅使用合成账号、订单与政策。本标签页内切换身份时会保留业务状态，刷新或点击「重置此项目」可重新开始。

## 券序

| 模块 | 可以操作 | 对照的项目实现 |
|---|---|---|
| 店铺 | 按名及分类查询、分页、示例定位排序、查看店铺详情，管理员新增与编辑 | 店铺分类、`ShopsView`、`ShopDetailView`、`ShopEditorView`、`ShopController` |
| 账号和社交 | 获取演示验证码、登录退出、签到、发笔记及本地配图、点赞、我的笔记、关注与共同关注、查看动态 | `LoginView`、`ProfileView`、笔记和关注页面，`UserController`、`BlogController`、`FollowController`、`UploadController` |
| 优惠券和订单 | 精选及店铺筛选、创建普通券或秒杀券、抢购、查单、模拟支付失败与成功 | `VouchersView`、`OrderStatusView`、`VoucherController`、`VoucherOrderController` |
| 恢复场景 | 模拟 Broker 停机、补建订单、超时关单、库存返还和再购 | `OrderRecoveryTask`、订单生命周期、库存释放任务和 Redis Lua |

建议在「个人中心」登录演示用户甲，再到「订单与恢复」暂停 Broker，返回「优惠券」选择「单人攀岩体验券」。受理后，运行数据库恢复扫描，然后触发超时并重新抢购。登录用户乙查询用户甲的订单号，可以验证越权拒绝。管理员账号可创建券和店铺。

## 电商售后 Agent

| 模块 | 可以操作 | 对照的项目实现 |
|---|---|---|
| 客户工作台 | 选择订单、取消/退货/质量申请、规则分流、修改或改办、补交凭证、补件回复、查看进度与通知 | `AfterSales.vue`、`CustomerApplicationController`、`CustomerRouter`、`AfterSalesPolicyEngine`、`NotificationController` |
| 客服审核 | 领取、续租、退回、模拟租约过期、辅助任务成功/失败/取消/重试、补件、人工结案和历史 | `AfterSalesStaff.vue`、`StaffAssistPanel.vue`、`StaffReviewController`、`StaffAssistController` |
| 政策问答 | 查询条款、查看引用原文、模拟检索及引用异常、检索拒答 | `PolicyQuestion.vue`、知识检索及回答控制器 |
| 知识维护 | 导入多条款 Markdown、草稿审核、启动/重试/取消索引、发布、撤销和回滚 | `KnowledgeWorkbench.vue`、`KnowledgeIndexPanel.vue`、`KnowledgePublicationPanel.vue` |
| 反馈和诊断 | 知识待办核实、解决、搁置，查看工单执行记录、查看投递失败并重放 | `KnowledgeFeedback.vue`、`AfterSalesDiagnostics.vue`、`MessageMaintenance.vue` |
| Skill 评测 | 生成候选、执行固定样例对照、安全门禁拒绝、启用及回滚 | `AfterSalesLab.vue`、`EvolutionService` |
| 流程试验 | 规则评估执行、分步任务、分步/自动 Agent 与固定提案确认 | `AfterSalesRunController`、`AfterSalesAutomationController` |

建议先用客户甲提交 ORD-1004，说明定制刻字有误。切换客服，领取并整理辅助材料，模拟失败后重试，再发补件要求。切回客户回复，客服重新领取后可提交结论。维护人员可以查询处理轨迹。另外可导入新政策、审核和构建索引，发布后返回问答确认引用版本，再撤销或回滚验证版本边界。

## 实际运行边界

静态站点在浏览器内推进流程。验证码、支付结果、报表和评测计数均为演示数据。MySQL、Redis、RocketMQ、PostgreSQL、RabbitMQ、pgvector、百炼和实际权限校验由本地启动的两个完整项目提供。演示台中的「技术复盘」有本地项目入口；使用其他本地端口时，以原项目的启动输出为准。
