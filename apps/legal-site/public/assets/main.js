/* EatSense landing — i18n + interactions.
   Zero-build, first-party. GSAP/Lenis are self-hosted (assets/vendor) and optional:
   everything degrades gracefully if they fail to load or motion is reduced. */
(function () {
  'use strict';

  var SUPPORTED_LANGS = ['en', 'de', 'fr', 'ru', 'kk', 'es'];

  var translations = {
    en: {
      "nav.how":"How it works","nav.features":"Features","nav.programs":"Programs","nav.pricing":"Pricing","nav.influencers":"For Creators","nav.experts":"For Experts","nav.download":"Get the App",
      "store.apple.small":"Download on the","store.google.small":"GET IT ON",
      "hero.badge":"Made in Switzerland","hero.title":"Nutrition that <em>understands</em> you","hero.subtitle":"AI-powered food analysis meets personalized lifestyle programs. Discover 47 ways to eat well, backed by Swiss precision.","hero.trust":"Loved by health-conscious eaters across Switzerland",
      "stats.programs":"Lifestyle programs","stats.scan":"Per food scan","stats.langs":"Languages","stats.privacy":"Swiss privacy",
      "how.tag":"How it works","how.title":"Three steps to better eating","how.subtitle":"No food diaries. No guesswork. Just snap and learn.","how.s1.title":"Snap your meal","how.s1.desc":"Take a photo of any dish — at home or at a restaurant.","how.s2.title":"Get instant insight","how.s2.desc":"AI breaks down calories, macros and nutrients in seconds.","how.s3.title":"Build better habits","how.s3.desc":"Follow personalized programs and track your progress over time.",
      "features.tag":"Why EatSense","features.title":"Smart nutrition, effortlessly","features.subtitle":"Snap a photo. Get instant insights. Make better choices.","features.ai.title":"AI Food Analysis","features.ai.desc":"Photograph any meal and receive detailed nutritional breakdown in seconds. Calories, macros, vitamins — all calculated instantly.","features.biomarkers.title":"Biomarker Integration","features.biomarkers.desc":"Connect your blood test results with your nutrition data. Understand how what you eat affects your health markers.","features.experts.title":"Expert Marketplace","features.experts.desc":"Connect with certified nutritionists who can see your real data — not just what you remember eating.",
      "programs.tag":"Lifestyle Programs","programs.title":"Find your way of eating","programs.subtitle":"Curated nutrition philosophies inspired by cultures, warriors, and iconic lifestyles.","programs.counter":"unique lifestyle programs","programs.c1.cat":"Historical","programs.c1.desc":"Elegant, portion-conscious dining inspired by golden age stars.","programs.c2.cat":"Warrior","programs.c2.desc":"High-protein, minimal processing. Fuel for strength and endurance.","programs.c3.cat":"Culture","programs.c3.desc":"Balanced, quality-focused eating with Alpine wisdom.","programs.c4.cat":"Modern","programs.c4.desc":"Beauty-inspired nutrition for radiant skin from within.","programs.c5.cat":"Lifestyle","programs.c5.desc":"High-performance eating for busy professionals on the go.","programs.c6.cat":"Spiritual","programs.c6.desc":"Optimized nutrition for Suhoor and Iftar during fasting.",
      "bio.tag":"Biomarker Intelligence","bio.title":"Connect diet to health","bio.subtitle":"Upload your lab results and see how your nutrition choices affect your body.","bio.hba1c":"Blood sugar control","bio.chol.name":"Cholesterol","bio.chol.desc":"LDL, HDL, Triglycerides","bio.vitd.name":"Vitamin D","bio.vitd.desc":"Bone & immune health","bio.ferr":"Iron stores","bio.crp":"Inflammation marker","bio.b12":"Energy & nerves","bio.cal.name":"Calcium","bio.cal.desc":"Bone density","bio.thy.name":"Thyroid","bio.thy.desc":"Metabolism balance",
      "tst.tag":"Built for trust","tst.title":"Designed around how you really eat","tst.subtitle":"Accurate, private and made for everyday life.","tst.v1.title":"Precision you can trust","tst.v1.desc":"AI estimates calories, macros and nutrients from a single photo — and you can fine-tune any portion in a tap.","tst.v2.title":"Private by design","tst.v2.desc":"Swiss-built and GDPR-compliant. Your data stays yours — you decide exactly what to share, and with whom.","tst.v3.title":"Wherever you eat","tst.v3.desc":"At home or at a restaurant, in 6 languages — EatSense fits real life, not just perfect meal-prep days.",
      "pricing.tag":"Pricing","pricing.title":"Choose your journey","pricing.subtitle":"Start free. Upgrade when you're ready for more.","pricing.note":"Prices in Swiss francs. Cancel anytime — no hidden fees.",
      "pricing.free.name":"Free","pricing.free.desc":"Get started","pricing.free.period":"forever","pricing.free.f1":"3 scans per day","pricing.free.f2":"Basic nutrition data","pricing.free.f3":"7-day history","pricing.free.cta":"Get Started",
      "pricing.proAnnual.badge":"Most Popular","pricing.proAnnual.name":"PRO Annual","pricing.proAnnual.desc":"Best value","pricing.proAnnual.period":"/year","pricing.proAnnual.f1":"Unlimited scans","pricing.proAnnual.f2":"AI nutrition assistant","pricing.proAnnual.f3":"Biomarker tracking","pricing.proAnnual.f4":"All 47 programs","pricing.proAnnual.f5":"PDF reports","pricing.proAnnual.cta":"Upgrade to PRO",
      "pricing.proMonthly.name":"PRO Monthly","pricing.proMonthly.desc":"Flexible","pricing.proMonthly.period":"/month","pricing.proMonthly.f1":"Unlimited scans","pricing.proMonthly.f2":"AI nutrition assistant","pricing.proMonthly.f3":"Biomarker tracking","pricing.proMonthly.f4":"All 47 programs","pricing.proMonthly.cta":"Try PRO","pricing.student.badge":"Student","pricing.student.name":"PRO Student","pricing.student.desc":"For verified students","pricing.student.period":"/year","pricing.student.f1":"Everything in PRO","pricing.student.f2":"Unlimited scans","pricing.student.f3":"Student ID required","pricing.student.cta":"Get Student",
      "pricing.founders.badge":"Limited","pricing.founders.name":"Founders Pass","pricing.founders.desc":"Lifetime access","pricing.founders.period":"one-time","pricing.founders.f1":"Everything in PRO","pricing.founders.f2":"Lifetime updates","pricing.founders.f3":"Founder badge","pricing.founders.f4":"Early access to features","pricing.founders.cta":"Claim Now",
      "influencers.title":"Become an <em>Inspiration</em>","influencers.subtitle":"We're creating lifestyle programs inspired by health & fitness creators. Your philosophy. Your principles. Featured in our app.","influencers.b1":"Permanent feature in the app","influencers.b2":"Free lifetime PRO access","influencers.b3":"Credit as inspiration source","influencers.b4":"No work required from you","influencers.cta":"Get in Touch","influencers.card1.title":"Fitness Creators","influencers.card1.desc":"Training + nutrition combined","influencers.card2.title":"Nutritionists","influencers.card2.desc":"Science-based approaches","influencers.card3.title":"Lifestyle Influencers","influencers.card3.desc":"Wellness philosophy",
      "faq.tag":"FAQ","faq.title":"Questions, answered","faq.q1":"Is EatSense free?","faq.a1":"Yes. You can scan 3 meals a day for free, forever. PRO unlocks unlimited scans and advanced features.","faq.q2":"How accurate is the AI analysis?","faq.a2":"Our AI estimates calories and macros from a single photo with high accuracy, and you can always fine-tune portions.","faq.q3":"Which languages are supported?","faq.a3":"EatSense is available in English, German, French, Russian, Kazakh and Spanish.","faq.q4":"Is my data private?","faq.a4":"Absolutely. We're Swiss-built and GDPR-compliant. Your data is yours — you control exactly what you share.","faq.q5":"Can I work with a real nutritionist?","faq.a5":"Yes. The Expert Marketplace connects you with certified professionals who can view the data you choose to share.","faq.q6":"Is it available on Android and iPhone?","faq.a6":"Yes — EatSense is on the App Store for iPhone and on Google Play for Android.",
      "cta.title":"Start eating with intention","cta.subtitle":"Download EatSense and turn every meal into insight.",
      "footer.tagline":"AI nutrition, Swiss precision. Understand what you eat.","footer.product":"Product","footer.company":"Company","footer.legal":"Legal","footer.contact":"Contact","footer.privacy":"Privacy Policy","footer.terms":"Terms of Service","footer.support":"Support","footer.faq":"FAQ","footer.appstore":"App Store","footer.googleplay":"Google Play","footer.swiss":"Swiss Made","footer.gdpr":"GDPR Compliant"
    },
    de: {
      "nav.how":"So funktioniert's","nav.features":"Funktionen","nav.programs":"Programme","nav.pricing":"Preise","nav.influencers":"Für Creator","nav.experts":"Für Experten","nav.download":"App holen",
      "store.apple.small":"Laden im","store.google.small":"JETZT BEI",
      "hero.badge":"Made in Switzerland","hero.title":"Ernährung, die dich <em>versteht</em>","hero.subtitle":"KI-gestützte Lebensmittelanalyse trifft personalisierte Lifestyle-Programme. Entdecke 47 Wege, gut zu essen, mit Schweizer Präzision.","hero.trust":"Beliebt bei gesundheitsbewussten Menschen in der ganzen Schweiz",
      "stats.programs":"Lifestyle-Programme","stats.scan":"Pro Foto-Scan","stats.langs":"Sprachen","stats.privacy":"Schweizer Datenschutz",
      "how.tag":"So funktioniert's","how.title":"Drei Schritte zu besserer Ernährung","how.subtitle":"Kein Ernährungstagebuch. Kein Rätselraten. Einfach fotografieren und lernen.","how.s1.title":"Mahlzeit fotografieren","how.s1.desc":"Mach ein Foto von jedem Gericht — zu Hause oder im Restaurant.","how.s2.title":"Sofort Einblick erhalten","how.s2.desc":"Die KI analysiert Kalorien, Makros und Nährstoffe in Sekunden.","how.s3.title":"Bessere Gewohnheiten aufbauen","how.s3.desc":"Folge personalisierten Programmen und verfolge deinen Fortschritt.",
      "features.tag":"Warum EatSense","features.title":"Smarte Ernährung, mühelos","features.subtitle":"Foto machen. Sofort Einblicke erhalten. Bessere Entscheidungen treffen.","features.ai.title":"KI-Lebensmittelanalyse","features.ai.desc":"Fotografiere jede Mahlzeit und erhalte in Sekunden eine detaillierte Nährwertanalyse.","features.biomarkers.title":"Biomarker-Integration","features.biomarkers.desc":"Verbinde deine Blutwerte mit deinen Ernährungsdaten.","features.experts.title":"Experten-Marktplatz","features.experts.desc":"Verbinde dich mit zertifizierten Ernährungsberatern.",
      "programs.tag":"Lifestyle-Programme","programs.title":"Finde deine Art zu essen","programs.subtitle":"Kuratierte Ernährungsphilosophien, inspiriert von Kulturen und Lebensstilen.","programs.counter":"einzigartige Programme","programs.c1.cat":"Historisch","programs.c1.desc":"Elegantes, portionsbewusstes Essen, inspiriert von Stars der goldenen Ära.","programs.c2.cat":"Krieger","programs.c2.desc":"Proteinreich, kaum verarbeitet. Treibstoff für Kraft und Ausdauer.","programs.c3.cat":"Kultur","programs.c3.desc":"Ausgewogenes, qualitätsbewusstes Essen mit alpiner Weisheit.","programs.c4.cat":"Modern","programs.c4.desc":"Beauty-inspirierte Ernährung für strahlende Haut von innen.","programs.c5.cat":"Lifestyle","programs.c5.desc":"Leistungsstarke Ernährung für vielbeschäftigte Profis.","programs.c6.cat":"Spirituell","programs.c6.desc":"Optimierte Ernährung für Suhoor und Iftar während des Fastens.",
      "bio.tag":"Biomarker-Intelligenz","bio.title":"Ernährung mit Gesundheit verbinden","bio.subtitle":"Lade deine Laborwerte hoch und sieh, wie deine Ernährung deinen Körper beeinflusst.","bio.hba1c":"Blutzuckerkontrolle","bio.chol.name":"Cholesterin","bio.chol.desc":"LDL, HDL, Triglyceride","bio.vitd.name":"Vitamin D","bio.vitd.desc":"Knochen & Immunsystem","bio.ferr":"Eisenspeicher","bio.crp":"Entzündungsmarker","bio.b12":"Energie & Nerven","bio.cal.name":"Kalzium","bio.cal.desc":"Knochendichte","bio.thy.name":"Schilddrüse","bio.thy.desc":"Stoffwechsel-Balance",
      "tst.tag":"Auf Vertrauen gebaut","tst.title":"Entwickelt für deinen echten Alltag","tst.subtitle":"Genau, privat und für das echte Leben gemacht.","tst.v1.title":"Präzision, der du vertraust","tst.v1.desc":"Die KI schätzt Kalorien, Makros und Nährstoffe aus einem einzigen Foto — und du justierst jede Portion mit einem Tipp.","tst.v2.title":"Privat von Grund auf","tst.v2.desc":"Schweizer Entwicklung, DSGVO-konform. Deine Daten gehören dir — du entscheidest, was du teilst und mit wem.","tst.v3.title":"Wo auch immer du isst","tst.v3.desc":"Zu Hause oder im Restaurant, in 6 Sprachen — EatSense passt ins echte Leben, nicht nur an perfekte Meal-Prep-Tage.",
      "pricing.tag":"Preise","pricing.title":"Wähle deinen Weg","pricing.subtitle":"Kostenlos starten. Upgrade, wenn du bereit bist.","pricing.note":"Preise in Schweizer Franken. Jederzeit kündbar — keine versteckten Kosten.",
      "pricing.free.name":"Kostenlos","pricing.free.desc":"Einstieg","pricing.free.period":"für immer","pricing.free.f1":"3 Scans pro Tag","pricing.free.f2":"Basis-Nährwertdaten","pricing.free.f3":"7-Tage-Verlauf","pricing.free.cta":"Loslegen",
      "pricing.proAnnual.badge":"Am beliebtesten","pricing.proAnnual.name":"PRO Jahres","pricing.proAnnual.desc":"Bester Wert","pricing.proAnnual.period":"/Jahr","pricing.proAnnual.f1":"Unbegrenzte Scans","pricing.proAnnual.f2":"KI-Ernährungsassistent","pricing.proAnnual.f3":"Biomarker-Tracking","pricing.proAnnual.f4":"Alle 47 Programme","pricing.proAnnual.f5":"PDF-Berichte","pricing.proAnnual.cta":"Auf PRO upgraden",
      "pricing.proMonthly.name":"PRO Monat","pricing.proMonthly.desc":"Flexibel","pricing.proMonthly.period":"/Monat","pricing.proMonthly.f1":"Unbegrenzte Scans","pricing.proMonthly.f2":"KI-Ernährungsassistent","pricing.proMonthly.f3":"Biomarker-Tracking","pricing.proMonthly.f4":"Alle 47 Programme","pricing.proMonthly.cta":"PRO testen","pricing.student.badge":"Student","pricing.student.name":"PRO Student","pricing.student.desc":"Für verifizierte Studenten","pricing.student.period":"/Jahr","pricing.student.f1":"Alles aus PRO","pricing.student.f2":"Unbegrenzte Scans","pricing.student.f3":"Studierendenausweis erforderlich","pricing.student.cta":"Student holen",
      "pricing.founders.badge":"Limitiert","pricing.founders.name":"Founders Pass","pricing.founders.desc":"Lebenslanger Zugang","pricing.founders.period":"einmalig","pricing.founders.f1":"Alles aus PRO","pricing.founders.f2":"Lebenslange Updates","pricing.founders.f3":"Founder-Badge","pricing.founders.f4":"Früher Zugang zu Features","pricing.founders.cta":"Jetzt sichern",
      "influencers.title":"Werde eine <em>Inspiration</em>","influencers.subtitle":"Wir entwickeln Lifestyle-Programme, inspiriert von Gesundheits- und Fitness-Creatorn. Deine Philosophie. Deine Prinzipien. In unserer App.","influencers.b1":"Dauerhafter Platz in der App","influencers.b2":"Kostenloser lebenslanger PRO-Zugang","influencers.b3":"Nennung als Inspirationsquelle","influencers.b4":"Kein Aufwand für dich","influencers.cta":"Kontakt aufnehmen","influencers.card1.title":"Fitness-Creator","influencers.card1.desc":"Training + Ernährung kombiniert","influencers.card2.title":"Ernährungsberater","influencers.card2.desc":"Wissenschaftsbasierte Ansätze","influencers.card3.title":"Lifestyle-Influencer","influencers.card3.desc":"Wellness-Philosophie",
      "faq.tag":"FAQ","faq.title":"Antworten auf deine Fragen","faq.q1":"Ist EatSense kostenlos?","faq.a1":"Ja. Du kannst täglich 3 Mahlzeiten kostenlos scannen, für immer. PRO schaltet unbegrenzte Scans und erweiterte Funktionen frei.","faq.q2":"Wie genau ist die KI-Analyse?","faq.a2":"Unsere KI schätzt Kalorien und Makros aus einem einzigen Foto sehr genau, und du kannst Portionen jederzeit anpassen.","faq.q3":"Welche Sprachen werden unterstützt?","faq.a3":"EatSense ist auf Englisch, Deutsch, Französisch, Russisch, Kasachisch und Spanisch verfügbar.","faq.q4":"Sind meine Daten privat?","faq.a4":"Absolut. Wir sind Schweizer und DSGVO-konform. Deine Daten gehören dir — du bestimmst, was du teilst.","faq.q5":"Kann ich mit einem echten Ernährungsberater arbeiten?","faq.a5":"Ja. Der Experten-Marktplatz verbindet dich mit zertifizierten Fachleuten, die die von dir freigegebenen Daten einsehen können.","faq.q6":"Ist es für Android und iPhone verfügbar?","faq.a6":"Ja — EatSense ist im App Store für iPhone und bei Google Play für Android erhältlich.",
      "cta.title":"Iss mit Bewusstsein","cta.subtitle":"Lade EatSense herunter und mach jede Mahlzeit zu einer Erkenntnis.",
      "footer.tagline":"KI-Ernährung, Schweizer Präzision. Verstehe, was du isst.","footer.product":"Produkt","footer.company":"Unternehmen","footer.legal":"Rechtliches","footer.contact":"Kontakt","footer.privacy":"Datenschutz","footer.terms":"Nutzungsbedingungen","footer.support":"Support","footer.faq":"FAQ","footer.appstore":"App Store","footer.googleplay":"Google Play","footer.swiss":"Swiss Made","footer.gdpr":"DSGVO-konform"
    },
    fr: {
      "nav.how":"Comment ça marche","nav.features":"Fonctionnalités","nav.programs":"Programmes","nav.pricing":"Tarifs","nav.influencers":"Pour Créateurs","nav.experts":"Pour les Experts","nav.download":"Obtenir l'app",
      "store.apple.small":"Télécharger dans l'","store.google.small":"DISPONIBLE SUR",
      "hero.badge":"Made in Switzerland","hero.title":"Une nutrition qui vous <em>comprend</em>","hero.subtitle":"L'analyse alimentaire par IA rencontre les programmes lifestyle personnalisés. Découvrez 47 façons de bien manger, avec la précision suisse.","hero.trust":"Apprécié par les amateurs de bien-être dans toute la Suisse",
      "stats.programs":"Programmes lifestyle","stats.scan":"Par scan de repas","stats.langs":"Langues","stats.privacy":"Confidentialité suisse",
      "how.tag":"Comment ça marche","how.title":"Trois étapes pour mieux manger","how.subtitle":"Pas de journal alimentaire. Pas de devinettes. Photographiez et apprenez.","how.s1.title":"Photographiez votre repas","how.s1.desc":"Prenez une photo de n'importe quel plat — à la maison ou au restaurant.","how.s2.title":"Obtenez une analyse instantanée","how.s2.desc":"L'IA décompose calories, macros et nutriments en quelques secondes.","how.s3.title":"Créez de meilleures habitudes","how.s3.desc":"Suivez des programmes personnalisés et suivez vos progrès dans le temps.",
      "features.tag":"Pourquoi EatSense","features.title":"Nutrition intelligente, sans effort","features.subtitle":"Prenez une photo. Obtenez des insights instantanés.","features.ai.title":"Analyse IA des Aliments","features.ai.desc":"Photographiez n'importe quel repas et recevez une analyse nutritionnelle détaillée.","features.biomarkers.title":"Intégration Biomarqueurs","features.biomarkers.desc":"Connectez vos résultats sanguins à vos données nutritionnelles.","features.experts.title":"Marketplace d'Experts","features.experts.desc":"Connectez-vous avec des nutritionnistes certifiés.",
      "programs.tag":"Programmes Lifestyle","programs.title":"Trouvez votre façon de manger","programs.subtitle":"Des philosophies nutritionnelles inspirées de cultures et de modes de vie.","programs.counter":"programmes uniques","programs.c1.cat":"Historique","programs.c1.desc":"Repas élégants et raisonnés, inspirés des stars de l'âge d'or.","programs.c2.cat":"Guerrier","programs.c2.desc":"Riche en protéines, peu transformé. Du carburant pour la force.","programs.c3.cat":"Culture","programs.c3.desc":"Une alimentation équilibrée et de qualité, avec la sagesse alpine.","programs.c4.cat":"Moderne","programs.c4.desc":"Nutrition beauté pour une peau radieuse de l'intérieur.","programs.c5.cat":"Lifestyle","programs.c5.desc":"Une alimentation performante pour les pros pressés.","programs.c6.cat":"Spirituel","programs.c6.desc":"Nutrition optimisée pour le Suhoor et l'Iftar pendant le jeûne.",
      "bio.tag":"Intelligence Biomarqueurs","bio.title":"Reliez alimentation et santé","bio.subtitle":"Téléchargez vos résultats d'analyses et voyez comment votre alimentation affecte votre corps.","bio.hba1c":"Contrôle de la glycémie","bio.chol.name":"Cholestérol","bio.chol.desc":"LDL, HDL, Triglycérides","bio.vitd.name":"Vitamine D","bio.vitd.desc":"Os & immunité","bio.ferr":"Réserves de fer","bio.crp":"Marqueur d'inflammation","bio.b12":"Énergie & nerfs","bio.cal.name":"Calcium","bio.cal.desc":"Densité osseuse","bio.thy.name":"Thyroïde","bio.thy.desc":"Équilibre métabolique",
      "tst.tag":"Conçu pour la confiance","tst.title":"Pensé pour votre vraie vie","tst.subtitle":"Précis, privé et fait pour le quotidien.","tst.v1.title":"Une précision fiable","tst.v1.desc":"L'IA estime calories, macros et nutriments à partir d'une seule photo — et vous ajustez chaque portion d'un geste.","tst.v2.title":"Privé par conception","tst.v2.desc":"Conçu en Suisse, conforme RGPD. Vos données restent les vôtres — vous décidez quoi partager, et avec qui.","tst.v3.title":"Où que vous mangiez","tst.v3.desc":"À la maison ou au restaurant, en 6 langues — EatSense s'adapte à la vraie vie, pas seulement aux journées parfaites.",
      "pricing.tag":"Tarifs","pricing.title":"Choisissez votre parcours","pricing.subtitle":"Commencez gratuitement. Passez au niveau supérieur quand vous êtes prêt.","pricing.note":"Prix en francs suisses. Annulable à tout moment — sans frais cachés.",
      "pricing.free.name":"Gratuit","pricing.free.desc":"Commencer","pricing.free.period":"pour toujours","pricing.free.f1":"3 scans par jour","pricing.free.f2":"Données nutritionnelles de base","pricing.free.f3":"Historique de 7 jours","pricing.free.cta":"Commencer",
      "pricing.proAnnual.badge":"Le plus populaire","pricing.proAnnual.name":"PRO Annuel","pricing.proAnnual.desc":"Meilleur rapport","pricing.proAnnual.period":"/an","pricing.proAnnual.f1":"Scans illimités","pricing.proAnnual.f2":"Assistant nutrition IA","pricing.proAnnual.f3":"Suivi des biomarqueurs","pricing.proAnnual.f4":"Les 47 programmes","pricing.proAnnual.f5":"Rapports PDF","pricing.proAnnual.cta":"Passer à PRO",
      "pricing.proMonthly.name":"PRO Mensuel","pricing.proMonthly.desc":"Flexible","pricing.proMonthly.period":"/mois","pricing.proMonthly.f1":"Scans illimités","pricing.proMonthly.f2":"Assistant nutrition IA","pricing.proMonthly.f3":"Suivi des biomarqueurs","pricing.proMonthly.f4":"Les 47 programmes","pricing.proMonthly.cta":"Essayer PRO","pricing.student.badge":"Étudiant","pricing.student.name":"PRO Étudiant","pricing.student.desc":"Pour étudiants vérifiés","pricing.student.period":"/an","pricing.student.f1":"Tout de PRO","pricing.student.f2":"Scans illimités","pricing.student.f3":"Carte étudiante requise","pricing.student.cta":"Offre étudiante",
      "pricing.founders.badge":"Limité","pricing.founders.name":"Founders Pass","pricing.founders.desc":"Accès à vie","pricing.founders.period":"paiement unique","pricing.founders.f1":"Tout de PRO","pricing.founders.f2":"Mises à jour à vie","pricing.founders.f3":"Badge fondateur","pricing.founders.f4":"Accès anticipé","pricing.founders.cta":"Obtenir",
      "influencers.title":"Devenez une <em>Inspiration</em>","influencers.subtitle":"Nous créons des programmes lifestyle inspirés par des créateurs santé & fitness. Votre philosophie. Vos principes. Dans notre app.","influencers.b1":"Présence permanente dans l'app","influencers.b2":"Accès PRO à vie gratuit","influencers.b3":"Crédité comme source d'inspiration","influencers.b4":"Aucun travail requis de votre part","influencers.cta":"Nous contacter","influencers.card1.title":"Créateurs fitness","influencers.card1.desc":"Entraînement + nutrition combinés","influencers.card2.title":"Nutritionnistes","influencers.card2.desc":"Approches scientifiques","influencers.card3.title":"Influenceurs lifestyle","influencers.card3.desc":"Philosophie bien-être",
      "faq.tag":"FAQ","faq.title":"Vos questions, nos réponses","faq.q1":"EatSense est-il gratuit ?","faq.a1":"Oui. Vous pouvez scanner 3 repas par jour gratuitement, pour toujours. PRO débloque les scans illimités et les fonctions avancées.","faq.q2":"Quelle est la précision de l'analyse IA ?","faq.a2":"Notre IA estime calories et macros à partir d'une seule photo avec une grande précision, et vous pouvez toujours ajuster les portions.","faq.q3":"Quelles langues sont prises en charge ?","faq.a3":"EatSense est disponible en anglais, allemand, français, russe, kazakh et espagnol.","faq.q4":"Mes données sont-elles privées ?","faq.a4":"Absolument. Nous sommes suisses et conformes au RGPD. Vos données vous appartiennent — vous contrôlez ce que vous partagez.","faq.q5":"Puis-je travailler avec un vrai nutritionniste ?","faq.a5":"Oui. Le Marketplace d'Experts vous connecte à des professionnels certifiés qui peuvent voir les données que vous choisissez de partager.","faq.q6":"Est-ce disponible sur Android et iPhone ?","faq.a6":"Oui — EatSense est sur l'App Store pour iPhone et sur Google Play pour Android.",
      "cta.title":"Mangez avec intention","cta.subtitle":"Téléchargez EatSense et transformez chaque repas en information.",
      "footer.tagline":"Nutrition IA, précision suisse. Comprenez ce que vous mangez.","footer.product":"Produit","footer.company":"Entreprise","footer.legal":"Mentions légales","footer.contact":"Contact","footer.privacy":"Politique de confidentialité","footer.terms":"Conditions d'utilisation","footer.support":"Support","footer.faq":"FAQ","footer.appstore":"App Store","footer.googleplay":"Google Play","footer.swiss":"Swiss Made","footer.gdpr":"Conforme RGPD"
    },
    ru: {
      "nav.how":"Как это работает","nav.features":"Возможности","nav.programs":"Программы","nav.pricing":"Цены","nav.influencers":"Для авторов","nav.experts":"Для экспертов","nav.download":"Скачать",
      "store.apple.small":"Загрузите в","store.google.small":"ДОСТУПНО В",
      "hero.badge":"Сделано в Швейцарии","hero.title":"Питание, которое <em>понимает</em> вас","hero.subtitle":"Анализ еды на базе ИИ и персональные программы образа жизни. Откройте 47 способов питаться правильно, со швейцарской точностью.","hero.trust":"Нас любят люди, заботящиеся о здоровье, по всей Швейцарии",
      "stats.programs":"Программ образа жизни","stats.scan":"На анализ блюда","stats.langs":"Языков","stats.privacy":"Швейцарская приватность",
      "how.tag":"Как это работает","how.title":"Три шага к лучшему питанию","how.subtitle":"Никаких дневников. Никаких догадок. Просто сфотографируйте и узнайте.","how.s1.title":"Сфотографируйте блюдо","how.s1.desc":"Сделайте фото любого блюда — дома или в ресторане.","how.s2.title":"Получите мгновенный разбор","how.s2.desc":"ИИ разложит калории, макросы и нутриенты за секунды.","how.s3.title":"Формируйте полезные привычки","how.s3.desc":"Следуйте персональным программам и отслеживайте прогресс со временем.",
      "features.tag":"Почему EatSense","features.title":"Умное питание без усилий","features.subtitle":"Сфотографируйте блюдо. Получите мгновенную информацию. Принимайте лучшие решения.","features.ai.title":"ИИ-анализ еды","features.ai.desc":"Сфотографируйте любое блюдо и получите детальный нутриентный разбор за секунды: калории, макросы, витамины.","features.biomarkers.title":"Интеграция биомаркеров","features.biomarkers.desc":"Свяжите результаты анализов с питанием и поймите, как еда влияет на здоровье.","features.experts.title":"Маркетплейс экспертов","features.experts.desc":"Общайтесь с сертифицированными нутрициологами, которые видят ваши реальные данные.",
      "programs.tag":"Программы образа жизни","programs.title":"Найдите свой способ питания","programs.subtitle":"Отобранные философии питания, вдохновлённые культурами и образами жизни.","programs.counter":"уникальных программ","programs.c1.cat":"Историческое","programs.c1.desc":"Элегантное питание с контролем порций в стиле звёзд золотой эпохи.","programs.c2.cat":"Воин","programs.c2.desc":"Много белка, минимум обработки. Топливо для силы и выносливости.","programs.c3.cat":"Культура","programs.c3.desc":"Сбалансированное питание с альпийской мудростью.","programs.c4.cat":"Современное","programs.c4.desc":"Питание для сияющей кожи изнутри.","programs.c5.cat":"Лайфстайл","programs.c5.desc":"Эффективное питание для занятых профессионалов.","programs.c6.cat":"Духовное","programs.c6.desc":"Оптимизированное питание для сухура и ифтара в пост.",
      "bio.tag":"Интеллект биомаркеров","bio.title":"Свяжите питание со здоровьем","bio.subtitle":"Загрузите результаты анализов и увидите, как ваше питание влияет на организм.","bio.hba1c":"Контроль сахара","bio.chol.name":"Холестерин","bio.chol.desc":"ЛПНП, ЛПВП, триглицериды","bio.vitd.name":"Витамин D","bio.vitd.desc":"Кости и иммунитет","bio.ferr":"Запасы железа","bio.crp":"Маркер воспаления","bio.b12":"Энергия и нервы","bio.cal.name":"Кальций","bio.cal.desc":"Плотность костей","bio.thy.name":"Щитовидная железа","bio.thy.desc":"Баланс метаболизма",
      "tst.tag":"Создано для доверия","tst.title":"Под то, как вы едите на самом деле","tst.subtitle":"Точно, приватно и для повседневной жизни.","tst.v1.title":"Точность, которой доверяешь","tst.v1.desc":"ИИ оценивает калории, макросы и нутриенты по одному фото — а любую порцию можно поправить в один тап.","tst.v2.title":"Приватность по умолчанию","tst.v2.desc":"Швейцарская разработка, соответствие GDPR. Ваши данные — ваши: вы решаете, чем и с кем делиться.","tst.v3.title":"Где бы вы ни ели","tst.v3.desc":"Дома или в ресторане, на 6 языках — EatSense вписывается в реальную жизнь, а не только в идеальные дни.",
      "pricing.tag":"Цены","pricing.title":"Выберите свой путь","pricing.subtitle":"Начните бесплатно. Обновитесь, когда будете готовы к большему.","pricing.note":"Цены в швейцарских франках. Отмена в любой момент — без скрытых платежей.",
      "pricing.free.name":"Бесплатно","pricing.free.desc":"Начать","pricing.free.period":"навсегда","pricing.free.f1":"3 сканирования в день","pricing.free.f2":"Базовые данные о питании","pricing.free.f3":"История за 7 дней","pricing.free.cta":"Начать",
      "pricing.proAnnual.badge":"Популярно","pricing.proAnnual.name":"PRO Годовой","pricing.proAnnual.desc":"Лучшая цена","pricing.proAnnual.period":"/год","pricing.proAnnual.f1":"Безлимит сканов","pricing.proAnnual.f2":"ИИ-ассистент по питанию","pricing.proAnnual.f3":"Трекинг биомаркеров","pricing.proAnnual.f4":"Все 47 программ","pricing.proAnnual.f5":"PDF-отчёты","pricing.proAnnual.cta":"Перейти на PRO",
      "pricing.proMonthly.name":"PRO Месячный","pricing.proMonthly.desc":"Гибко","pricing.proMonthly.period":"/месяц","pricing.proMonthly.f1":"Безлимит сканов","pricing.proMonthly.f2":"ИИ-ассистент по питанию","pricing.proMonthly.f3":"Трекинг биомаркеров","pricing.proMonthly.f4":"Все 47 программ","pricing.proMonthly.cta":"Попробовать PRO","pricing.student.badge":"Студентам","pricing.student.name":"PRO Студент","pricing.student.desc":"Для подтверждённых студентов","pricing.student.period":"/год","pricing.student.f1":"Всё из PRO","pricing.student.f2":"Безлимит сканов","pricing.student.f3":"Нужен студенческий","pricing.student.cta":"Студенту",
      "pricing.founders.badge":"Ограниченно","pricing.founders.name":"Founders Pass","pricing.founders.desc":"Пожизненный доступ","pricing.founders.period":"разовая оплата","pricing.founders.f1":"Всё из PRO","pricing.founders.f2":"Пожизненные обновления","pricing.founders.f3":"Значок фаундера","pricing.founders.f4":"Ранний доступ к фичам","pricing.founders.cta":"Получить",
      "influencers.title":"Станьте <em>вдохновением</em>","influencers.subtitle":"Мы создаём программы образа жизни, вдохновлённые экспертами по здоровью и фитнесу. Ваша философия. Ваши принципы. В нашем приложении.","influencers.b1":"Постоянное место в приложении","influencers.b2":"Бесплатный пожизненный доступ PRO","influencers.b3":"Указание как источника вдохновения","influencers.b4":"От вас не требуется работы","influencers.cta":"Связаться","influencers.card1.title":"Фитнес-авторы","influencers.card1.desc":"Тренировки + питание вместе","influencers.card2.title":"Нутрициологи","influencers.card2.desc":"Научный подход","influencers.card3.title":"Лайфстайл-блогеры","influencers.card3.desc":"Философия благополучия",
      "faq.tag":"ЧаВо","faq.title":"Отвечаем на вопросы","faq.q1":"EatSense бесплатный?","faq.a1":"Да. Вы можете сканировать 3 блюда в день бесплатно, всегда. PRO открывает безлимит и расширенные функции.","faq.q2":"Насколько точен ИИ-анализ?","faq.a2":"Наш ИИ оценивает калории и макросы по одному фото с высокой точностью, а порции всегда можно подкорректировать.","faq.q3":"Какие языки поддерживаются?","faq.a3":"EatSense доступен на английском, немецком, французском, русском, казахском и испанском.","faq.q4":"Мои данные приватны?","faq.a4":"Абсолютно. Мы швейцарские и соответствуем GDPR. Ваши данные принадлежат вам — вы решаете, чем делиться.","faq.q5":"Могу ли я работать с настоящим нутрициологом?","faq.a5":"Да. Маркетплейс экспертов связывает вас с сертифицированными специалистами, которые видят данные, которыми вы решили поделиться.","faq.q6":"Доступно ли на Android и iPhone?","faq.a6":"Да — EatSense есть в App Store для iPhone и в Google Play для Android.",
      "cta.title":"Начните питаться осознанно","cta.subtitle":"Скачайте EatSense и превратите каждый приём пищи в инсайт.",
      "footer.tagline":"ИИ-питание, швейцарская точность. Понимайте, что вы едите.","footer.product":"Продукт","footer.company":"Компания","footer.legal":"Правовая информация","footer.contact":"Контакты","footer.privacy":"Политика конфиденциальности","footer.terms":"Условия использования","footer.support":"Поддержка","footer.faq":"ЧаВо","footer.appstore":"App Store","footer.googleplay":"Google Play","footer.swiss":"Сделано в Швейцарии","footer.gdpr":"Соответствие GDPR"
    },
    kk: {
      "nav.how":"Қалай жұмыс істейді","nav.features":"Мүмкіндіктер","nav.programs":"Бағдарламалар","nav.pricing":"Бағалар","nav.influencers":"Авторларға","nav.experts":"Сарапшыларға","nav.download":"Жүктеп алу",
      "store.apple.small":"Жүктеу","store.google.small":"ҚОЛ ЖЕТІМДІ",
      "hero.badge":"Швейцарияда жасалған","hero.title":"Сізді <em>түсінетін</em> тамақтану","hero.subtitle":"ЖИ негізіндегі тамақ талдауы және дербес бағдарламалар. Швейцариялық дәлдікпен дұрыс тамақтанудың 47 жолын ашыңыз.","hero.trust":"Швейцария бойынша денсаулыққа мән беретіндер ұнатады",
      "stats.programs":"Өмір салты бағдарламасы","stats.scan":"Бір тамақ скані","stats.langs":"Тіл","stats.privacy":"Швейцариялық құпиялық",
      "how.tag":"Қалай жұмыс істейді","how.title":"Жақсы тамақтануға үш қадам","how.subtitle":"Күнделік жоқ. Болжам жоқ. Жай ғана суретке түсіріп, біліңіз.","how.s1.title":"Тамағыңызды суретке түсіріңіз","how.s1.desc":"Кез келген тағамды суретке түсіріңіз — үйде немесе мейрамханада.","how.s2.title":"Бірден талдау алыңыз","how.s2.desc":"ЖИ калория, макро және нутриенттерді секундта талдайды.","how.s3.title":"Жақсы әдеттер қалыптастырыңыз","how.s3.desc":"Дербес бағдарламаларды орындап, прогресіңізді бақылаңыз.",
      "features.tag":"Неге EatSense","features.title":"Ақылды тамақтану, оңай","features.subtitle":"Суретке түсіріңіз. Бірден талдау алыңыз. Жақсы шешім қабылдаңыз.","features.ai.title":"ЖИ тамақ талдауы","features.ai.desc":"Кез келген тағамды суретке түсіріп, секунд ішінде калория, макро, дәрумен бойынша толық талдау алыңыз.","features.biomarkers.title":"Биомаркерлерді интеграциялау","features.biomarkers.desc":"Анализ нәтижелерін тамақтану деректерімен байланыстырыңыз.","features.experts.title":"Сарапшылар маркетплейсі","features.experts.desc":"Шынайы деректеріңізді көретін сертификатталған нутрициологтармен хабарласыңыз.",
      "programs.tag":"Өмір салты бағдарламалары","programs.title":"Өз тамақтану жолыңызды табыңыз","programs.subtitle":"Мәдениеттер мен өмір салттарынан шабыт алған таңдаулы философиялар.","programs.counter":"ерекше бағдарлама","programs.c1.cat":"Тарихи","programs.c1.desc":"Алтын дәуір жұлдыздарынан шабыт алған талғампаз, порцияға мұқият тамақтану.","programs.c2.cat":"Жауынгер","programs.c2.desc":"Ақуызы мол, өңдеуі аз. Күш пен төзімділікке жанармай.","programs.c3.cat":"Мәдениет","programs.c3.desc":"Альпілік даналықпен теңгерімді, сапалы тамақтану.","programs.c4.cat":"Заманауи","programs.c4.desc":"Іштен нұрлы тері үшін сұлулыққа бағытталған тамақтану.","programs.c5.cat":"Лайфстайл","programs.c5.desc":"Бос емес мамандарға арналған жоғары өнімді тамақтану.","programs.c6.cat":"Рухани","programs.c6.desc":"Ораза кезінде сухур мен ифтарға оңтайландырылған тамақтану.",
      "bio.tag":"Биомаркер интеллекті","bio.title":"Тамақтануды денсаулықпен байланыстырыңыз","bio.subtitle":"Зертханалық нәтижелеріңізді жүктеп, тамақтануыңыз ағзаға қалай әсер ететінін көріңіз.","bio.hba1c":"Қандағы қант бақылауы","bio.chol.name":"Холестерин","bio.chol.desc":"ЛПТП, ЛПЖП, триглицеридтер","bio.vitd.name":"D дәрумені","bio.vitd.desc":"Сүйек және иммунитет","bio.ferr":"Темір қоры","bio.crp":"Қабыну маркері","bio.b12":"Қуат және жүйке","bio.cal.name":"Кальций","bio.cal.desc":"Сүйек тығыздығы","bio.thy.name":"Қалқанша без","bio.thy.desc":"Зат алмасу тепе-теңдігі",
      "tst.tag":"Сенімге құрылған","tst.title":"Сіздің нақты өміріңізге арналған","tst.subtitle":"Дәл, құпия әрі күнделікті өмірге жасалған.","tst.v1.title":"Сенуге болатын дәлдік","tst.v1.desc":"ЖИ бір фотодан калория, макро және нутриенттерді бағалайды — кез келген порцияны бір түртумен реттейсіз.","tst.v2.title":"Бастапқыдан құпия","tst.v2.desc":"Швейцарияда жасалған, GDPR-ге сай. Деректеріңіз — өзіңіздікі: нені әрі кіммен бөлісуді өзіңіз шешесіз.","tst.v3.title":"Қайда тамақтансаңыз да","tst.v3.desc":"Үйде немесе мейрамханада, 6 тілде — EatSense нақты өмірге сай, тек мінсіз күндерге емес.",
      "pricing.tag":"Бағалар","pricing.title":"Жолыңызды таңдаңыз","pricing.subtitle":"Тегін бастаңыз. Дайын болғанда жаңартыңыз.","pricing.note":"Бағалар швейцариялық франкпен. Кез келген уақытта бас тартуға болады — жасырын төлемсіз.",
      "pricing.free.name":"Тегін","pricing.free.desc":"Бастау","pricing.free.period":"әрдайым","pricing.free.f1":"Күніне 3 сканер","pricing.free.f2":"Негізгі тамақтану деректері","pricing.free.f3":"7-күндік тарих","pricing.free.cta":"Бастау",
      "pricing.proAnnual.badge":"Ең танымал","pricing.proAnnual.name":"PRO Жылдық","pricing.proAnnual.desc":"Ең тиімді","pricing.proAnnual.period":"/жыл","pricing.proAnnual.f1":"Шексіз сканер","pricing.proAnnual.f2":"ЖИ тамақтану көмекшісі","pricing.proAnnual.f3":"Биомаркер трекингі","pricing.proAnnual.f4":"Барлық 47 бағдарлама","pricing.proAnnual.f5":"PDF есептер","pricing.proAnnual.cta":"PRO-ға жаңарту",
      "pricing.proMonthly.name":"PRO Айлық","pricing.proMonthly.desc":"Икемді","pricing.proMonthly.period":"/ай","pricing.proMonthly.f1":"Шексіз сканер","pricing.proMonthly.f2":"ЖИ тамақтану көмекшісі","pricing.proMonthly.f3":"Биомаркер трекингі","pricing.proMonthly.f4":"Барлық 47 бағдарлама","pricing.proMonthly.cta":"PRO-ны сынау","pricing.student.badge":"Студентке","pricing.student.name":"PRO Студент","pricing.student.desc":"Расталған студенттерге","pricing.student.period":"/жыл","pricing.student.f1":"PRO-дағының бәрі","pricing.student.f2":"Шексіз сканер","pricing.student.f3":"Студенттік билет қажет","pricing.student.cta":"Студентке",
      "pricing.founders.badge":"Шектеулі","pricing.founders.name":"Founders Pass","pricing.founders.desc":"Өмір бойы қолжетімділік","pricing.founders.period":"бір реттік","pricing.founders.f1":"PRO-дағының бәрі","pricing.founders.f2":"Өмір бойы жаңартулар","pricing.founders.f3":"Негізін салушы белгісі","pricing.founders.f4":"Функцияларға ерте қолжетімділік","pricing.founders.cta":"Алу",
      "influencers.title":"<em>Шабыт</em> болыңыз","influencers.subtitle":"Біз денсаулық пен фитнес авторларынан шабыт алған өмір салты бағдарламаларын жасаймыз. Сіздің философияңыз. Сіздің ұстанымдарыңыз. Біздің қосымшада.","influencers.b1":"Қосымшада тұрақты орын","influencers.b2":"Тегін өмірлік PRO қол жеткізу","influencers.b3":"Шабыт көзі ретінде көрсету","influencers.b4":"Сізден жұмыс талап етілмейді","influencers.cta":"Байланысу","influencers.card1.title":"Фитнес авторлары","influencers.card1.desc":"Жаттығу + тамақтану бірге","influencers.card2.title":"Нутрициологтар","influencers.card2.desc":"Ғылыми тәсілдер","influencers.card3.title":"Лайфстайл блогерлер","influencers.card3.desc":"Әл-ауқат философиясы",
      "faq.tag":"Жиі сұрақтар","faq.title":"Сұрақтарға жауап","faq.q1":"EatSense тегін бе?","faq.a1":"Иә. Күніне 3 тағамды тегін, әрдайым сканерлей аласыз. PRO шексіз сканерлеу мен қосымша функцияларды ашады.","faq.q2":"ЖИ талдауы қаншалықты дәл?","faq.a2":"Біздің ЖИ бір фотодан калория мен макросты жоғары дәлдікпен бағалайды, ал порцияны әрдайым реттей аласыз.","faq.q3":"Қандай тілдер қолдау табады?","faq.a3":"EatSense ағылшын, неміс, француз, орыс, қазақ және испан тілдерінде қолжетімді.","faq.q4":"Деректерім құпия ма?","faq.a4":"Әрине. Біз швейцариялықпыз әрі GDPR талаптарына сәйкеспіз. Деректеріңіз — сіздікі, нені бөлісуді өзіңіз шешесіз.","faq.q5":"Нағыз нутрициологпен жұмыс істей аламын ба?","faq.a5":"Иә. Сарапшылар маркетплейсі сізді бөліскіңіз келетін деректерді көретін сертификатталған мамандармен байланыстырады.","faq.q6":"Android пен iPhone-да қолжетімді ме?","faq.a6":"Иә — EatSense iPhone үшін App Store-да және Android үшін Google Play-де бар.",
      "cta.title":"Саналы тамақтануды бастаңыз","cta.subtitle":"EatSense жүктеп алып, әр тамақты түсінікке айналдырыңыз.",
      "footer.tagline":"ЖИ-тамақтану, швейцариялық дәлдік. Не жейтініңізді түсініңіз.","footer.product":"Өнім","footer.company":"Компания","footer.legal":"Құқықтық ақпарат","footer.contact":"Байланыс","footer.privacy":"Құпиялылық саясаты","footer.terms":"Қолдану шарттары","footer.support":"Қолдау","footer.faq":"Жиі сұрақтар","footer.appstore":"App Store","footer.googleplay":"Google Play","footer.swiss":"Швейцарияда жасалған","footer.gdpr":"GDPR сәйкестігі"
    },
    es: {
      "nav.how":"Cómo funciona","nav.features":"Funciones","nav.programs":"Programas","nav.pricing":"Precios","nav.influencers":"Para creadores","nav.experts":"Para expertos","nav.download":"Obtener la app",
      "store.apple.small":"Descárgalo en el","store.google.small":"DISPONIBLE EN",
      "hero.badge":"Hecho en Suiza","hero.title":"Nutrición que te <em>entiende</em>","hero.subtitle":"Análisis de alimentos con IA y programas de estilo de vida personalizados. Descubre 47 formas de comer bien con precisión suiza.","hero.trust":"Querido por personas conscientes de su salud en toda Suiza",
      "stats.programs":"Programas de estilo de vida","stats.scan":"Por escaneo de comida","stats.langs":"Idiomas","stats.privacy":"Privacidad suiza",
      "how.tag":"Cómo funciona","how.title":"Tres pasos para comer mejor","how.subtitle":"Sin diarios de comidas. Sin conjeturas. Solo fotografía y aprende.","how.s1.title":"Fotografía tu comida","how.s1.desc":"Haz una foto de cualquier plato — en casa o en un restaurante.","how.s2.title":"Obtén análisis al instante","how.s2.desc":"La IA desglosa calorías, macros y nutrientes en segundos.","how.s3.title":"Crea mejores hábitos","how.s3.desc":"Sigue programas personalizados y monitorea tu progreso con el tiempo.",
      "features.tag":"Por qué EatSense","features.title":"Nutrición inteligente sin esfuerzo","features.subtitle":"Haz una foto. Obtén análisis instantáneo. Toma mejores decisiones.","features.ai.title":"Análisis IA de comida","features.ai.desc":"Fotografía cualquier comida y recibe un desglose nutricional detallado en segundos: calorías, macros y vitaminas.","features.biomarkers.title":"Integración de biomarcadores","features.biomarkers.desc":"Conecta tus análisis de sangre con tus datos nutricionales.","features.experts.title":"Marketplace de expertos","features.experts.desc":"Conecta con nutricionistas certificados que ven tus datos reales.",
      "programs.tag":"Programas de estilo de vida","programs.title":"Encuentra tu forma de comer","programs.subtitle":"Filosofías nutricionales seleccionadas, inspiradas en culturas y estilos de vida.","programs.counter":"programas únicos","programs.c1.cat":"Histórico","programs.c1.desc":"Comidas elegantes y con porciones medidas, inspiradas en las estrellas de la época dorada.","programs.c2.cat":"Guerrero","programs.c2.desc":"Alto en proteínas, poco procesado. Combustible para fuerza y resistencia.","programs.c3.cat":"Cultura","programs.c3.desc":"Alimentación equilibrada y de calidad con sabiduría alpina.","programs.c4.cat":"Moderno","programs.c4.desc":"Nutrición de belleza para una piel radiante desde dentro.","programs.c5.cat":"Estilo de vida","programs.c5.desc":"Alimentación de alto rendimiento para profesionales ocupados.","programs.c6.cat":"Espiritual","programs.c6.desc":"Nutrición optimizada para Suhoor e Iftar durante el ayuno.",
      "bio.tag":"Inteligencia de biomarcadores","bio.title":"Conecta dieta y salud","bio.subtitle":"Sube tus resultados de laboratorio y ve cómo tu alimentación afecta a tu cuerpo.","bio.hba1c":"Control de glucosa","bio.chol.name":"Colesterol","bio.chol.desc":"LDL, HDL, triglicéridos","bio.vitd.name":"Vitamina D","bio.vitd.desc":"Huesos e inmunidad","bio.ferr":"Reservas de hierro","bio.crp":"Marcador de inflamación","bio.b12":"Energía y nervios","bio.cal.name":"Calcio","bio.cal.desc":"Densidad ósea","bio.thy.name":"Tiroides","bio.thy.desc":"Equilibrio metabólico",
      "tst.tag":"Hecho para la confianza","tst.title":"Pensado para cómo comes de verdad","tst.subtitle":"Preciso, privado y hecho para el día a día.","tst.v1.title":"Precisión confiable","tst.v1.desc":"La IA estima calorías, macros y nutrientes desde una sola foto — y ajustas cualquier porción con un toque.","tst.v2.title":"Privado por diseño","tst.v2.desc":"Hecho en Suiza y conforme al RGPD. Tus datos son tuyos — tú decides qué compartir y con quién.","tst.v3.title":"Donde sea que comas","tst.v3.desc":"En casa o en un restaurante, en 6 idiomas — EatSense se adapta a la vida real, no solo a los días perfectos.",
      "pricing.tag":"Precios","pricing.title":"Elige tu camino","pricing.subtitle":"Empieza gratis. Actualiza cuando estés listo.","pricing.note":"Precios en francos suizos. Cancela cuando quieras — sin cargos ocultos.",
      "pricing.free.name":"Gratis","pricing.free.desc":"Empezar","pricing.free.period":"para siempre","pricing.free.f1":"3 escaneos al día","pricing.free.f2":"Datos básicos de nutrición","pricing.free.f3":"Historial de 7 días","pricing.free.cta":"Empezar",
      "pricing.proAnnual.badge":"Más popular","pricing.proAnnual.name":"PRO Anual","pricing.proAnnual.desc":"Mejor valor","pricing.proAnnual.period":"/año","pricing.proAnnual.f1":"Escaneos ilimitados","pricing.proAnnual.f2":"Asistente IA de nutrición","pricing.proAnnual.f3":"Seguimiento de biomarcadores","pricing.proAnnual.f4":"Los 47 programas","pricing.proAnnual.f5":"Informes PDF","pricing.proAnnual.cta":"Actualizar a PRO",
      "pricing.proMonthly.name":"PRO Mensual","pricing.proMonthly.desc":"Flexible","pricing.proMonthly.period":"/mes","pricing.proMonthly.f1":"Escaneos ilimitados","pricing.proMonthly.f2":"Asistente IA de nutrición","pricing.proMonthly.f3":"Seguimiento de biomarcadores","pricing.proMonthly.f4":"Los 47 programas","pricing.proMonthly.cta":"Probar PRO","pricing.student.badge":"Estudiante","pricing.student.name":"PRO Estudiante","pricing.student.desc":"Para estudiantes verificados","pricing.student.period":"/año","pricing.student.f1":"Todo lo de PRO","pricing.student.f2":"Escaneos ilimitados","pricing.student.f3":"Se requiere ID de estudiante","pricing.student.cta":"Plan estudiante",
      "pricing.founders.badge":"Limitado","pricing.founders.name":"Founders Pass","pricing.founders.desc":"Acceso de por vida","pricing.founders.period":"pago único","pricing.founders.f1":"Todo lo de PRO","pricing.founders.f2":"Actualizaciones de por vida","pricing.founders.f3":"Insignia de fundador","pricing.founders.f4":"Acceso anticipado","pricing.founders.cta":"Obtener",
      "influencers.title":"Conviértete en una <em>Inspiración</em>","influencers.subtitle":"Creamos programas de estilo de vida inspirados en creadores de salud y fitness. Tu filosofía. Tus principios. En nuestra app.","influencers.b1":"Presencia permanente en la app","influencers.b2":"Acceso PRO de por vida gratis","influencers.b3":"Crédito como fuente de inspiración","influencers.b4":"No requiere trabajo de tu parte","influencers.cta":"Contáctanos","influencers.card1.title":"Creadores fitness","influencers.card1.desc":"Entrenamiento + nutrición combinados","influencers.card2.title":"Nutricionistas","influencers.card2.desc":"Enfoques científicos","influencers.card3.title":"Influencers de estilo de vida","influencers.card3.desc":"Filosofía de bienestar",
      "faq.tag":"Preguntas frecuentes","faq.title":"Respondemos tus preguntas","faq.q1":"¿EatSense es gratis?","faq.a1":"Sí. Puedes escanear 3 comidas al día gratis, para siempre. PRO desbloquea escaneos ilimitados y funciones avanzadas.","faq.q2":"¿Qué precisión tiene el análisis IA?","faq.a2":"Nuestra IA estima calorías y macros a partir de una sola foto con alta precisión, y siempre puedes ajustar las porciones.","faq.q3":"¿Qué idiomas son compatibles?","faq.a3":"EatSense está disponible en inglés, alemán, francés, ruso, kazajo y español.","faq.q4":"¿Mis datos son privados?","faq.a4":"Por supuesto. Somos suizos y cumplimos el RGPD. Tus datos son tuyos — tú controlas qué compartes.","faq.q5":"¿Puedo trabajar con un nutricionista real?","faq.a5":"Sí. El Marketplace de Expertos te conecta con profesionales certificados que pueden ver los datos que decidas compartir.","faq.q6":"¿Está disponible en Android y iPhone?","faq.a6":"Sí — EatSense está en la App Store para iPhone y en Google Play para Android.",
      "cta.title":"Empieza a comer con intención","cta.subtitle":"Descarga EatSense y convierte cada comida en información.",
      "footer.tagline":"Nutrición IA, precisión suiza. Entiende lo que comes.","footer.product":"Producto","footer.company":"Empresa","footer.legal":"Legal","footer.contact":"Contacto","footer.privacy":"Política de privacidad","footer.terms":"Términos de servicio","footer.support":"Soporte","footer.faq":"Preguntas frecuentes","footer.appstore":"App Store","footer.googleplay":"Google Play","footer.swiss":"Hecho en Suiza","footer.gdpr":"Conforme al RGPD"
    }
  };

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------------- i18n ---------------- */
  var currentLang = 'en';
  function setLanguage(lang) {
    if (!translations[lang]) lang = 'en';
    currentLang = lang;
    document.documentElement.lang = lang;
    var cur = $('#currentLang');
    if (cur) cur.textContent = lang.toUpperCase();
    $$('.lang-option').forEach(function (opt) {
      opt.classList.toggle('active', opt.dataset.lang === lang);
    });
    var dict = translations[lang];
    $$('[data-i18n]').forEach(function (el) {
      var key = el.dataset.i18n;
      if (dict && dict[key] != null) el.innerHTML = dict[key];
    });
    try { localStorage.setItem('eatsense-lang', lang); } catch (e) {}
  }
  // expose for the i18n parity test / debugging
  window.__eatsenseTranslations = translations;
  window.__setLanguage = setLanguage;

  function initLang() {
    var saved = null;
    try { saved = localStorage.getItem('eatsense-lang'); } catch (e) {}
    var browser = (navigator.language || 'en').slice(0, 2);
    setLanguage(saved || (SUPPORTED_LANGS.indexOf(browser) !== -1 ? browser : 'en'));
  }

  /* ---------------- Nav + mobile menu + lang dropdown ---------------- */
  function initNav() {
    var nav = $('#nav');
    if (nav) {
      var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 24); };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
    var menuBtn = $('#mobileMenuBtn');
    var navLinks = $('#navLinks');
    if (menuBtn && navLinks) {
      menuBtn.addEventListener('click', function () {
        var open = navLinks.classList.toggle('active');
        menuBtn.classList.toggle('active', open);
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.body.classList.toggle('menu-open', open);
      });
    }
    // language dropdown toggle
    var langBtn = $('#langSwitcher');
    var langMenu = $('#langMenu');
    if (langBtn && langMenu) {
      langBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = langMenu.classList.toggle('open');
        langBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      document.addEventListener('click', function () { langMenu.classList.remove('open'); });
    }
    $$('.lang-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setLanguage(btn.dataset.lang);
        if (langMenu) langMenu.classList.remove('open');
      });
    });
  }

  /* ---------------- Count-up ---------------- */
  function animateCount(el) {
    var target = parseInt(el.dataset.count, 10);
    if (isNaN(target)) return;
    var suffix = el.dataset.suffix || '';
    if (prefersReduced) { el.textContent = target + suffix; return; }
    var dur = 1500, start = performance.now();
    function tick(now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------------- Reveals: GSAP if present, else IntersectionObserver ---------------- */
  function initReveals() {
    var hasGSAP = window.gsap && window.ScrollTrigger;
    if (hasGSAP) window.gsap.registerPlugin(window.ScrollTrigger);

    var counts = $$('[data-count]');
    if (prefersReduced || !('IntersectionObserver' in window)) {
      $$('.reveal').forEach(function (el) { el.classList.add('in'); });
      counts.forEach(animateCount);
    } else {
      // staggered group reveals (respect data-reveal-group containers)
      var revObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target;
          var delay = parseFloat(el.dataset.delay || '0');
          el.style.transitionDelay = delay + 'ms';
          el.classList.add('in');
          revObs.unobserve(el);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      $$('.reveal').forEach(function (el) { revObs.observe(el); });

      var countObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { animateCount(e.target); countObs.unobserve(e.target); }
        });
      }, { threshold: 0.6 });
      counts.forEach(function (el) { countObs.observe(el); });
    }

    // Hero parallax — GSAP only, motion allowed
    if (hasGSAP && !prefersReduced) {
      var phone = $('.hero-phone');
      if (phone) {
        window.gsap.to(phone, {
          yPercent: 10, ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
        });
      }
      var glow = $('.hero-glow');
      if (glow) {
        window.gsap.to(glow, {
          yPercent: 18, ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
        });
      }
    }
  }

  /* ---------------- Programs marquee (pure CSS animation; pause on reduced motion) ---------------- */
  function initMarquee() {
    var track = $('#programsTrack');
    if (!track) return;
    if (prefersReduced) { track.style.animation = 'none'; return; }
    // duplicate cards once for a seamless loop
    var originals = Array.prototype.slice.call(track.children);
    originals.forEach(function (node) {
      var clone = node.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
  }

  /* ---------------- Smooth scroll (Lenis) + anchor links ---------------- */
  function initSmoothScroll() {
    var lenis = null;
    if (window.Lenis && !prefersReduced) {
      lenis = new window.Lenis({ duration: 1.05, smoothWheel: true });
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
      if (window.gsap && window.ScrollTrigger) {
        lenis.on('scroll', window.ScrollTrigger.update);
      }
    }
    var navLinks = $('#navLinks');
    var menuBtn = $('#mobileMenuBtn');
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = this.getAttribute('href');
        if (href === '#') return;
        var t = document.querySelector(href);
        if (!t) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(t, { offset: -72 });
        else t.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' });
        if (navLinks) navLinks.classList.remove('active');
        if (menuBtn) { menuBtn.classList.remove('active'); document.body.classList.remove('menu-open'); }
      });
    });
  }

  /* ---------------- Boot ---------------- */
  function boot() {
    initLang();
    initNav();
    initMarquee();
    initReveals();
    initSmoothScroll();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
