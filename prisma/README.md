# Prisma

项目使用 Prisma 7 + MySQL。核心模型位于 `schema.prisma`，包含：

- `User`
- `Post`
- `PostImage`
- `PromptTemplate`
- `AIUsageLog`

## 本地初始化

1. 从 `.env.example` 创建 `.env`，填写真实的 `DATABASE_URL`。
2. 运行 `npm run prisma:validate` 校验模型。
3. 运行 `npm run prisma:generate` 生成类型安全客户端。
4. 数据库可连接后运行 `npm run db:migrate -- --name init` 创建首个迁移。

业务代码统一从 `src/lib/db` 导入 `prisma`，不要在各路由中重复创建客户端。
