# Команды для отправки билда в App Store

## ✅ Билд успешно завершен!

**Build ID:** `d40d91ea-9d8e-4350-9255-2c84a5dcea13`  
**Build URL:** https://expo.dev/accounts/eatsense/projects/eatsense/builds/d40d91ea-9d8e-4350-9255-2c84a5dcea13  
**IPA файл:** https://expo.dev/artifacts/eas/sbK3zKUVtqhhwanEMPHdKM.ipa

## Команда для отправки в App Store Connect

### Вариант 1: Использовать последний билд (рекомендуется)
```bash
cd /home/mrazzka/projects/work/caloriecam
eas submit -p ios --profile production --latest
```

### Вариант 2: Использовать конкретный Build ID
```bash
cd /home/mrazzka/projects/work/caloriecam
eas submit -p ios --profile production --id d40d91ea-9d8e-4350-9255-2c84a5dcea13
```

### Вариант 3: Через npm script
```bash
cd /home/mrazzka/projects/work/caloriecam
pnpm run eas:submit:ios
```

## Что произойдет после сабмита:

1. EAS загрузит IPA файл в App Store Connect
2. App Store Connect обработает билд (обычно 10-30 минут)
3. После обработки билд появится в TestFlight
4. Можно будет добавить тестеров и проверить приложение

## Проверка статуса:

- **EAS Dashboard:** https://expo.dev/accounts/eatsense/projects/eatsense/builds/d40d91ea-9d8e-4350-9255-2c84a5dcea13
- **App Store Connect:** https://appstoreconnect.apple.com/apps/6755033261/testflight/ios

## Дополнительная информация:

- **Build Number:** 52
- **Version:** 1.0.0
- **Bundle ID:** ch.eatsense.app
- **App Store Connect App ID:** 6755033261

