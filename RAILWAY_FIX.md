# Исправление настроек Railway

## Текущая проблема
В Pre-deploy Command используется неправильный путь к schema: `apps/api/prisma/schema.prisma`
Когда команда выполняется через `pnpm --filter ./apps/api exec`, она уже в контексте `apps/api`, поэтому путь должен быть `prisma/schema.prisma`

## Правильные настройки для Railway

### Build Command
```
pnpm -r build
```
Это автоматически запустит `prebuild` в `apps/api`, который выполнит `prisma:generate`

### Pre-deploy Command

**ВАЖНО:** Сначала генерируем Prisma Client, потом применяем миграции!

```
pnpm --filter ./apps/api exec prisma generate --schema apps/api/prisma/schema.prisma && pnpm --filter ./apps/api run prisma:migrate:deploy && pnpm --filter ./apps/api run prisma:seed:nutrients && pnpm --filter ./apps/api run prisma:seed:articles
```

**Или более простой вариант (без seed):**
```
pnpm --filter ./apps/api exec prisma generate --schema apps/api/prisma/schema.prisma && pnpm --filter ./apps/api run prisma:migrate:deploy
```

**Почему это важно:**
- `prisma generate` создает Prisma Client на основе схемы
- `prisma migrate deploy` применяет миграции к базе данных
- Если Prisma Client не сгенерирован с актуальной схемой, он не будет знать о новых полях (например, `avatarUrl`)

### Start Command
```
pnpm --filter ./apps/api exec node dist/main.js
```

## Что нужно изменить в Railway

1. **Build Command** - оставить как есть: `pnpm -r build`

2. **Pre-deploy Command** - заменить на:
   ```
   pnpm --filter ./apps/api run prisma:migrate:deploy && pnpm --filter ./apps/api run prisma:seed:nutrients && pnpm --filter ./apps/api run prisma:seed:articles
   ```
   
   Или если не нужны seed команды:
   ```
   pnpm --filter ./apps/api run prisma:migrate:deploy
   ```

3. **Start Command** - оставить как есть: `pnpm --filter ./apps/api exec node dist/main.js`

## Почему это работает

- `pnpm --filter ./apps/api run <script>` запускает скрипт из `apps/api/package.json`
- Скрипты в `package.json` уже используют правильные относительные пути (`prisma/schema.prisma`)
- `prebuild` автоматически запускает `prisma:generate` перед сборкой

