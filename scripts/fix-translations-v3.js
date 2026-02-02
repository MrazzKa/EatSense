const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../app/i18n/locales');
const TARGET_LOCALES = ['en', 'fr']; // Only needing updates for EN (label keys) and FR (missing)

// Helper to load JSON
function loadLocale(locale) {
    try {
        return JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${locale}.json`), 'utf8'));
    } catch (e) {
        return {};
    }
}

// Helper to save JSON
function saveLocale(locale, data) {
    fs.writeFileSync(path.join(LOCALES_DIR, `${locale}.json`), JSON.stringify(data, null, 2), 'utf8');
}

// Deep merge
function deepMerge(target, source) {
    for (const key in source) {
        if (source[key] instanceof Object && !Array.isArray(source[key])) {
            if (target[key] !== undefined && (!(target[key] instanceof Object) || Array.isArray(target[key]))) {
                target[key] = {};
            }
            if (!target[key]) target[key] = {};
            deepMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
}

const FIXES = {
    en: {
        profile: {
            health: {
                chronotypeLabel: "Chronotype",
                drugTypeLabel: "Drug Type"
            }
        }
    },
    ru: {
        profile: {
            health: {
                chronotypeLabel: "Хронотип",
                drugTypeLabel: "Тип препарата"
            }
        }
    },
    kk: {
        profile: {
            health: {
                chronotypeLabel: "Хронотип",
                drugTypeLabel: "Дәрі түрі"
            }
        }
    },
    fr: {
        profile: {
            bmiUnderweight: "Insuffisance pondérale",
            bmiNormal: "Normal",
            bmiOverweight: "Surpoids",
            bmiObesity: "Obésité",
            planUpdatedTitle: "Plan mis à jour",
            planUpdatedMessage: "Votre plan a été mis à jour avec succès.",
            planUpdateError: "Échec de la mise à jour du plan.",
            metricBmi: "IMC",
            medications: "Médicaments",
            medicationsSubtitle: "Gérer le calendrier",
            supportLink: "Contacter le support",
            savingButton: "Enregistrement...",
            applyPlan: "Appliquer le plan",
            selectTime: "Sélectionner l'heure",
            theme: "Thème",
            lightMode: "Mode clair",
            darkModeSubtitle: "Sombre",
            systemTheme: "Système",
            notifications: "Notifications",
            notificationsInfo: "Infos",
            notificationsDailyDescription: "Rappels quotidiens",
            notificationsChangeTime: "Changer l'heure",
            notificationsErrorTitle: "Erreur",
            notificationsErrorMessage: "Erreur de notification",
            notificationsPermissionTitle: "Permission requise",
            notificationsPermissionMessage: "Veuillez activer les notifications",
            savedTitle: "Enregistré",
            savedMessage: "Changements enregistrés",
            errorTitle: "Erreur",
            errorMessage: "Une erreur est survenue",
            errors: {
                invalidEmail: "Email invalide",
                updateFailed: "Mise à jour échouée"
            },
            deleteAccount: "Supprimer le compte",
            deleteAccountTitle: "Supprimer",
            deleteAccountMessage: "Voulez-vous vraiment supprimer votre compte ?",
            deleteAccountConfirm: "Supprimer",
            deleteAccountCancel: "Annuler",
            deleteAccountSuccess: "Compte supprimé",
            deleteAccountError: "Erreur de suppression",
            deleteAccountDisclaimer: "Cette action est irréversible",
            monthlyReportTitle: "Rapport mensuel",
            monthlyReportSubtitle: "Aperçu",
            monthlyReportDownloaded: "Rapport téléchargé",
            monthlyReportError: "Erreur de rapport",
            goalsTitle: "Objectifs",
            goalLabel: "Objectif",
            goalLoseWeight: "Perdre du poids",
            goalMaintainWeight: "Maintenir le poids",
            goalGainMuscle: "Prendre du muscle",
            dietLabel: "Régime",
            dietBalanced: "Équilibré",
            dietHighProtein: "Riche en protéines",
            dietLowCarb: "Faible en glucides",
            dietMediterranean: "Méditerranéen",
            dietPlantBased: "Végétal",
            choosePlan: "Choisir un plan",
            selectPlan: "Sélectionner",
            subscriptionTitle: "Abonnement",
            changePlan: "Changer de plan",
            billingAnnual: "Annuel",
            billingMonthly: "Mensuel",
            billingFree: "Gratuit",
            planFreeName: "EatSense Free",
            planProName: "EatSense Pro",
            planStudentName: "EatSense Student",
            planFounderName: "EatSense Founder",
            planFreePrice: "Gratuit",
            planFounderPrice: "Paiement unique",
            planStudentDescription: "Pour les étudiants",
            planFounderDescription: "Accès à vie",
            planProMonthlyDescription: "Accès complet",
            planProAnnualDescription: "Meilleure valeur",
            planFeatures: {
                unlimitedAnalyses: "Analyses illimitées",
                advancedInsights: "Aperçus avancés",
                coachingTips: "Conseils de coaching",
                everythingInProMonthly: "Tout ce qui est dans Pro",
                annualWebinars: "Webinaires annuels",
                earlyAccess: "Accès anticipé",
                studentDiscount: "Réduction étudiante"
            },
            planBadges: {
                included: "Inclus",
                mostPopular: "Populaire",
                save33: "Économisez 33%",
                student: "Étudiant",
                limited: "Limité"
            },
            currentPlan: "Plan actuel",
            privacyPolicy: "Politique de confidentialité",
            politics: "Politique",
            aboutEatsense: "À propos d'EatSense",
            advanced: "Avancé",
            noData: "Aucune donnée",
            policyError: "Erreur de politique",
            termsError: "Erreur de conditions",
            health: {
                chronotypeLabel: "Chronotype",
                drugTypeLabel: "Type de médicament",
                advanced: "Avancé",
                show: "Afficher",
                hide: "Masquer",
                metabolic: "Métabolique",
                sleep: "Sommeil",
                eatingBehavior: "Comportement alimentaire",
                glp1Module: "Module GLP-1",
                healthFocus: "Objectif santé",
                bodyFatPercent: "Pourcentage de graisse",
                waistCm: "Tour de taille (cm)",
                hipCm: "Tour de hanches (cm)",
                whr: "Rapport taille/hanches",
                auto: "Auto",
                fatDistributionType: "Type de distribution",
                fatDistribution: {
                    visceral: "Viscérale",
                    gynoid: "Gynoïde",
                    mixed: "Mixte"
                },
                mealsPerDay: "Repas par jour",
                snackingTendency: "Tendance au grignotage",
                snacking: {
                    low: "Faible",
                    medium: "Moyenne",
                    high: "Élevée"
                },
                eveningAppetite: "Appétit le soir",
                sleepHours: "Heures de sommeil",
                chronotypeOptions: {
                    early: "Lève-tôt",
                    mid: "Intermédiaire",
                    late: "Couche-tard"
                },
                isGlp1User: "Utilisateur GLP-1",
                therapyGoal: "Objectif thérapeutique",
                therapyGoalOptions: {
                    preserve_muscle: "Préserver le muscle",
                    appetite_control: "Contrôle de l'appétit",
                    weight_maintenance: "Maintien du poids",
                    slow_weight_loss: "Perte de poids lente"
                },
                focus: {
                    sugarControl: "Contrôle du sucre",
                    cholesterol: "Cholestérol",
                    inflammation: "Inflammation",
                    iron: "Fer",
                    microbiome: "Microbiome",
                    hormonalBalance: "Équilibre hormonal"
                },
                fatLabel: "Graisse",
                sleepLabel: "Sommeil",
                waistLabel: "Taille",
                noData: "Aucune donnée",
                focusAreas: "Zones d'intérêt",
                clearData: "Effacer les données",
                clearTitle: "Effacer",
                clearMessage: "Voulez-vous effacer ?",
                cleared: "Effacé"
            }
        }
    },
    dietPrograms: {
        categories: {
            all: "Tout",
            hollywood: "Hollywood",
            athletes: "Athlètes",
            historical: "Historique"
        },
        difficulty: {
            easy: "Facile",
            medium: "Moyen",
            hard: "Difficile"
        }
    }
};

console.log("--- Starting Translation Fix V3 ---");

['en', 'ru', 'kk', 'fr'].forEach(locale => {
    console.log(`Processing ${locale}...`);
    let data = loadLocale(locale);

    if (FIXES[locale]) {
        deepMerge(data, FIXES[locale]);
    }

    saveLocale(locale, data);
});

console.log("--- Fixes (V3) Applied ---");
