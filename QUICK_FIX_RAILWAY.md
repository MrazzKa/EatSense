# Быстрое исправление Railway деплоя

## 🚨 Проблема
После онбординга приложение не пускает дальше - ошибка `The column user_profiles.avatarUrl does not exist`

## ✅ Решение (3 шага)

### Шаг 1: Обновить Pre-deploy Command в Railway

В настройках Railway сервиса `EatSense`, в разделе **Deploy → Pre-deploy Command**, замените команду на:

```bash
pnpm --filter ./apps/api run prisma:generate && pnpm --filter ./apps/api run prisma:migrate:deploy
```

**Или альтернативный вариант:**
```bash
pnpm --filter ./apps/api exec prisma generate --schema prisma/schema.prisma && pnpm --filter ./apps/api run prisma:migrate:deploy
```

**Важно:** `prisma generate` должен быть ПЕРЕД `prisma migrate deploy`!

### Шаг 2: Проверить переменные окружения

В Railway → Variables, убедитесь что есть:
- `APPLE_BUNDLE_ID=ch.eatsense.app` (если используете Apple Sign In)

### Шаг 3: Перезапустить деплой

Сохраните изменения и дождитесь нового деплоя. Проверьте логи - должны увидеть:
- `[Schema] ✓ user_profiles.avatarUrl column exists`
- Или `[Schema] ✓ Added user_profiles."avatarUrl" column as TEXT`

## 📋 Текущие настройки Railway (для справки)

- **Root Directory:** `/`
- **Build Command:** `pnpm --filter ./apps/api exec prisma generate && pnpm -r build`
- **Pre-deploy Command:** (обновить как выше)
- **Start Command:** `pnpm --filter ./apps/api exec node dist/main.js`

## 🔍 Проверка после деплоя

1. Откройте `/user-profiles` эндпоинт - не должно быть ошибок 500
2. Попробуйте войти через приложение - онбординг должен работать корректно
3. Проверьте вход через Google/Apple - должны работать

## 🐛 Если проблема осталась

1. Проверьте логи Railway - должны быть сообщения о применении миграций
2. Проверьте что Prisma Client сгенерирован с актуальной схемой
3. Можно вручную применить миграцию через Railway SQL:

```sql
ALTER TABLE "user_profiles" ADD COLUMN "avatarUrl" TEXT;
```

