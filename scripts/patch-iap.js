const fs = require('fs');
const path = require('path');

// react-native-iap@12.15.1 doesn't build against Expo SDK 55 (RN 0.83 / React 19)
// out of the box. This postinstall patches the installed copy in every node_modules
// location (root + apps/mobile) so it works locally AND on EAS Build, without bumping
// to v15 (which would change the JS API our payment flow depends on).

const rniapDirs = [
    path.join(__dirname, '..', 'node_modules', 'react-native-iap'),
    path.join(__dirname, '..', 'apps', 'mobile', 'node_modules', 'react-native-iap'),
].filter((dir) => fs.existsSync(dir));

if (rniapDirs.length === 0) {
    console.log('[patch-iap] react-native-iap not found, skipping.');
}

function replaceInFile(file, edits) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    const before = content;
    for (const [from, to] of edits) {
        if (typeof from === 'string') {
            if (content.includes(from)) content = content.split(from).join(to);
        } else {
            content = content.replace(from, to);
        }
    }
    if (content !== before) {
        fs.writeFileSync(file, content);
        console.log(`[patch-iap] Patched ${path.basename(file)}`);
    } else {
        console.log(`[patch-iap] ${path.basename(file)} already patched / nothing to do.`);
    }
}

for (const dir of rniapDirs) {
    // 1) iOS: drop the RCT-Folly pod dependency (breaks the Expo pod install).
    replaceInFile(path.join(dir, 'RNIap.podspec'), [
        ['s.dependency "RCT-Folly"', '# s.dependency "RCT-Folly"'],
    ]);

    // 2) Android: RN 0.81+ removed the `currentActivity` synthetic property — read it
    //    from the React context instead (fixes the downstream "Any vs Activity" error too).
    replaceInFile(path.join(dir, 'android/src/play/java/com/dooboolab/rniap/RNIapModule.kt'), [
        ['val activity = currentActivity', 'val activity = reactApplicationContext.currentActivity'],
    ]);
    replaceInFile(path.join(dir, 'android/src/amazon/java/com/dooboolab/rniap/RNIapModule.kt'), [
        ['val activity = currentActivity', 'val activity = reactApplicationContext.currentActivity'],
    ]);

    // 3) Android: `ObjectAlreadyConsumedException` is now internal in React 19 — drop the
    //    import and catch its public supertype (RuntimeException) instead. Also reject()
    //    now wants a non-null code.
    for (const name of ['PromiseUtlis.kt', 'PromiseUtils.kt']) {
        replaceInFile(path.join(dir, 'android/src/main/java/com/dooboolab/rniap', name), [
            ['import com.facebook.react.bridge.ObjectAlreadyConsumedException\n', ''],
            ['catch (oce: ObjectAlreadyConsumedException)', 'catch (oce: RuntimeException)'],
            ['this.reject(code, message, throwable)', 'this.reject(code ?: "E_UNKNOWN", message, throwable)'],
        ]);
    }
}
