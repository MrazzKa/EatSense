# Команды для билда и диагностики

## Диагностика проблемы

### 1. Проверка версии EAS CLI
```bash
npx eas-cli@latest --version
```

### 2. Проверка авторизации
```bash
pnpm run eas:whoami
```

### 3. Билд с подробным выводом (БЕЗ --non-interactive)
```bash
cd /home/mrazzka/projects/work/caloriecam
npx eas-cli@latest build -p ios --profile production --verbose
```

### 4. Альтернатива: билд без verbose, но с выводом всех деталей
```bash
cd /home/mrazzka/projects/work/caloriecam
EAS_NO_VCS=1 npx eas-cli@latest build -p ios --profile production
```

### 5. Попробовать с явным указанием версии Node
```bash
cd /home/mrazzka/projects/work/caloriecam
NODE_VERSION=20.19.4 npx eas-cli@latest build -p ios --profile production
```

## Решение проблем

### Если проблема с credentials.json:
```bash
# Проверить наличие файла
ls -la credentials.json

# Если файла нет, настроить credentials заново:
npx eas-cli@latest credentials
```

### Если проблема с кешем:
```bash
# Попробовать билд без кеша
cd /home/mrazzka/projects/work/caloriecam
npx eas-cli@latest build -p ios --profile production --clear-cache
```

### Проверка конфигурации
```bash
# Проверить конфигурацию EAS
npx eas-cli@latest build:configure
```

## Основные команды (после успешного билда)

### Билд для iOS
```bash
cd /home/mrazzka/projects/work/caloriecam
pnpm run eas:build:ios
```

### Субмит в App Store (после успешного билда)
```bash
cd /home/mrazzka/projects/work/caloriecam
pnpm run eas:submit:ios
```

## Если проблема сохраняется

1. Проверить логи на https://expo.dev/accounts/eatsense/projects/eatsense/builds
2. Проверить статус EAS: https://status.expo.dev/
3. Попробовать обновить eas-cli до последней версии
4. Проверить баланс build credits

