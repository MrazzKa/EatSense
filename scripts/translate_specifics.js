const fs = require('fs');
const path = require('path');

const frPath = path.join(__dirname, '../app/i18n/locales/fr.json');
const kkPath = path.join(__dirname, '../app/i18n/locales/kk.json');

const frTranslations = {
    'common.error': 'Erreur',
    'common.rerun': 'Relancer',
    'common.confirm': 'Confirmer',
    'common.days': 'jours',
    'help.title': 'Aide & Support',
    'help.faqTitle': 'Foire Aux Questions',
    'help.contactTitle': 'Contactez-nous',
    'help.feedbackTitle': 'Retour d\'expérience',
    'help.feedbackSubtitle': 'Partagez vos idées',
    'help.feedbackAlert': 'Merci de votre intérêt ! Cette fonctionnalité sera bientôt disponible.',
    'help.faq.howToUse.question': 'Comment utiliser l\'application ?',
    'help.faq.howToUse.answer': 'Prenez une photo de votre plat ou choisissez-en une dans votre galerie. Notre IA analysera le plat et vous indiquera les calories et les nutriments.',
    'help.faq.photoLimit.question': 'Combien de photos puis-je analyser ?',
    'help.faq.photoLimit.answer': 'Les utilisateurs gratuits peuvent analyser jusqu\'à 5 photos par jour. Les abonnés ont un accès illimité.',
    'help.faq.saveMeal.question': 'Comment sauvegarder un repas ?',
    'help.faq.saveMeal.answer': 'Après l\'analyse, appuyez sur "Sauvegarder dans le journal" pour ajouter le repas à votre journal alimentaire.',
    'help.faq.editResults.question': 'Puis-je modifier les résultats ?',
    'help.faq.editResults.answer': 'Oui, vous pouvez appuyer sur n\'importe quel ingrédient pour ajuster manuellement ses valeurs.',
    'help.faq.aiAssistant.question': 'Comment fonctionne l\'Assistant IA ?',
    'help.faq.aiAssistant.answer': 'L\'Assistant IA fournit des conseils nutritionnels personnalisés basés sur votre profil et vos habitudes.',
    'onboarding.dietTypes.keto': 'Céto',
    'onboarding.healthConditions.hypertension': 'Hypertension',
    'common.info': 'Infos'
};

const kkTranslations = {
    'analysis.healthScore': 'Денсаулық ұпайы'
};

function updateFile(filePath, translations) {
    try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let modified = false;

        Object.entries(translations).forEach(([key, val]) => {
            // Handle nested keys like 'help.faq.howToUse.question'
            const parts = key.split('.');
            let obj = content;
            for (let i = 0; i < parts.length - 1; i++) {
                if (!obj[parts[i]]) obj[parts[i]] = {};
                obj = obj[parts[i]];
            }
            const lastKey = parts[parts.length - 1];

            // Update only if it's different (or if it was English)
            if (obj[lastKey] !== val) {
                obj[lastKey] = val;
                modified = true;
            }
        });

        if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
            console.log(`Updated ${path.basename(filePath)}`);
        } else {
            console.log(`No changes needed for ${path.basename(filePath)}`);
        }
    } catch (e) {
        console.error(`Error updating ${filePath}:`, e);
    }
}

updateFile(frPath, frTranslations);
updateFile(kkPath, kkTranslations);
