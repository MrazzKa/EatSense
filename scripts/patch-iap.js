const fs = require('fs');
const path = require('path');

const podspecPath = path.join(__dirname, '..', 'node_modules', 'react-native-iap', 'RNIap.podspec');

if (fs.existsSync(podspecPath)) {
    console.log('Patching RNIap.podspec to remove RCT-Folly dependency...');
    let content = fs.readFileSync(podspecPath, 'utf8');

    // Comment out RCT-Folly dependency
    if (content.includes('s.dependency "RCT-Folly"')) {
        content = content.replace('s.dependency "RCT-Folly"', '# s.dependency "RCT-Folly"');
        fs.writeFileSync(podspecPath, content);
        console.log('Successfully patched RNIap.podspec');
    } else {
        console.log('RNIap.podspec already patched or dependency not found.');
    }
} else {
    console.log('RNIap.podspec not found, skipping patch.');
}
