const fs = require('fs');
const path = require('path');
const glob = require('glob'); // pnpm might not have glob installed by default in root, so we use simpler method or check if installed

const iapPath = path.join(__dirname, '..', 'node_modules', 'react-native-iap', 'nitrogen', 'generated', 'ios', 'swift');

if (fs.existsSync(iapPath)) {
    console.log('Fixing react-native-iap: Removing Android files from iOS target...');

    try {
        const files = fs.readdirSync(iapPath);
        let deletedCount = 0;

        files.forEach(file => {
            // Look for files with 'Android' in the name, but strictly those that look like Android platform files
            // Based on log: AlternativeBillingModeAndroid.swift, etc.
            if (file.includes('Android') && file.endsWith('.swift')) {
                const filePath = path.join(iapPath, file);
                fs.unlinkSync(filePath);
                console.log(`Deleted: ${file}`);
                deletedCount++;
            }
        });

        console.log(`Finished fixing react-native-iap. Validated ${files.length} files, removed ${deletedCount} Android files.`);
    } catch (e) {
        console.error('Error fixing react-native-iap:', e);
    }
} else {
    console.log('react-native-iap Nitrogen path not found, skipping fix (maybe older version or not installed yet).');
}
