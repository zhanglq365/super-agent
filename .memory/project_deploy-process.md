---
name: deploy-process
description: 部署流程关键步骤与事故教训（已修正命令）
type: project
lastWriteAt: 1793950102760
lastReadAt: 1793950102760
---

完整部署流程参见 docs/deployment-guide.md。

执行顺序：
1. 拉代码：git clone + pnpm install --frozen-lockfile
2. 配置环境变量：复制 .env.example 为 .env
3. 数据库迁移：pnpm db:migrate
4. 构建前端产物：pnpm build
5. 启动服务：pnpm start 或 pm2 start ecosystem.config.js

上次部署事故（2026-04-15）：users 表 email 字段从 VARCHAR(255) 改成 VARCHAR(100)，导致 23 个企业用户邮箱被截断、登录失败，持续 4 小时。教训：改列类型前必须检查数据兼容性，迁移要有回滚方案，部署后跑冒烟测试。详见 docs/deployment-guide.md。

回滚流程：pm2 stop all → git checkout 上一版本 → pnpm install && pnpm build → pnpm db:rollback → pm2 start ecosystem.config.js