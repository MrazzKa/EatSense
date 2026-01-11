import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';

const PRIVACY_POLICY_TEXT = `PRIVACY POLICY
EatSense Mobile Application and Services
Effective Date: December 13, 2025

This Privacy Policy ("Policy") describes how TEMONAN Geneva Holdings Sàrl, a company incorporated under the laws of Switzerland with its registered office in Avully ("EatSense," "we," "us," or "our"), collects, uses, discloses, and otherwise processes personal data when you use our mobile application ("App"), website, and related services (collectively, the "Services").

We comply with the Swiss Federal Act on Data Protection ("FADP"), the General Data Protection Regulation (EU) 2016/679 ("GDPR"), and other applicable data protection laws.

1. DATA CONTROLLER AND ROLES

1.1 Data Controller. TEMONAN Geneva Holdings Sàrl is the data controller responsible for your personal data collected through the Services. As data controller, we determine the purposes and means of processing your personal data.

1.2 Data Processors. We engage third-party service providers who process personal data on our behalf and under our instructions ("Processors"). Our Processors include:
• Cloud hosting and infrastructure providers
• AI service providers (OpenAI) for food image analysis
• Payment processors (via Apple App Store / Google Play)
• Email delivery services

1.3 Independent Controllers. Nutrition experts ("Experts") who provide consultation services through our marketplace are independent data controllers for the personal data they collect and process in connection with their consultations. Each Expert is responsible for their own compliance with applicable data protection laws.

2. ELIGIBILITY AND AGE RESTRICTIONS

2.1 The Services are intended solely for individuals who are at least eighteen (18) years of age. By using the Services, you represent and warrant that you are at least eighteen (18) years old.

2.2 We do not knowingly collect personal data from individuals under eighteen (18). We implement technical measures to prevent minors from creating accounts. If we suspect that a user is underage, we may suspend the account pending verification.

2.3 If we become aware that we have collected personal data from an individual under eighteen (18), we will delete such data and terminate the account within thirty (30) days. If you believe we have collected data from a minor, please contact us immediately.

3. PERSONAL DATA WE COLLECT

3.1 Information You Provide

(a) Account Data
Email address, name (optional), and authentication credentials. If you use Apple ID or Google Sign-In, we receive authentication tokens and, with your permission, your name, email, and profile photograph.

(b) Profile and Health Data
• Demographic information (age, gender)
• Physical characteristics (height, weight)
• Health and wellness goals
• Dietary preferences and restrictions
• Activity level and sleep patterns
• Health focus areas (blood sugar, cholesterol)

(c) Sensitive Health Data (Special Category Data)
With your explicit consent, we may collect and process sensitive health information:
• Laboratory and biomarker results (blood glucose, HbA1c, cholesterol, vitamins, liver enzymes)
• Medication information (names, dosages, schedules)
• GLP-1 agonist medication status (Ozempic, Wegovy, Mounjaro)
• Health conditions relevant to nutritional guidance

How we obtain consent for sensitive data: Before collecting any sensitive health data, we present you with a specific consent screen that clearly identifies: (i) the categories of sensitive data to be collected; (ii) the purposes of processing; and (iii) how to withdraw consent. You may withdraw consent at any time through Settings > Privacy > Health Data, which will stop future collection and allow you to request deletion of previously collected sensitive data.

(d) Food and Nutritional Data
• Photographs of meals submitted for analysis
• Manual food entries and meal logs
• Calculated nutritional information
• Water intake data

3.2 Information Collected Automatically
• Device information (type, operating system, unique identifiers)
• Usage data (features accessed, timestamps, session duration)
• Log data (IP address, access times)
• Performance data (error logs for troubleshooting)

Privacy by Design: We do not use third-party analytics SDKs (such as Firebase Analytics or Facebook SDK). We do not request or collect advertising identifiers (IDFA on iOS, GAID on Android). We do not engage in cross-app tracking or targeted advertising based on your activity.

4. IMAGE PROCESSING AND AI ANALYSIS

4.1 How We Process Food Photographs
When you submit a food photograph for nutritional analysis:
• The image is received by our servers and held temporarily in memory (typically seconds to minutes)
• Metadata (EXIF data including geolocation, camera information, and timestamps) is stripped from the image before processing
• The processed image is transmitted to OpenAI for AI-powered analysis
• A compressed, processed version of the image is stored for your meal history
• The original high-resolution photograph is not permanently stored

4.2 Data Minimization
We apply data minimization principles: we retain only the processed image and nutritional analysis results necessary to provide the Services. We strongly recommend that you do not include faces, personal documents, location-identifying information, or other sensitive content in photographs you submit.

4.3 AI Service Provider
Food photographs are analyzed by OpenAI, LLC. No personal identifiers (name, email, user ID) are transmitted with the image. Pursuant to our data processing agreement with OpenAI, images submitted through our API are not used to train or improve OpenAI's models. For more information, see OpenAI's Privacy Policy.

4.4 Accuracy Disclaimer
IMPORTANT: AI-generated nutritional information may contain errors, inaccuracies, or biases. Results have not been verified by qualified nutrition professionals. Do not rely solely on the Services for dietary or health decisions. Always consult qualified healthcare providers.

5. HOW WE USE YOUR PERSONAL DATA

The following table summarizes our data processing activities:

Data Category	Purpose	Legal Basis	Retention
Account Data	Account management, authentication	Contract performance	Account lifetime + 30 days
Profile & Health Data	Personalization, recommendations	Contract performance	Account lifetime + 30 days
Sensitive Health Data	Advanced health insights	Explicit consent	Until consent withdrawn + 30 days
Food Photos	AI nutritional analysis	Contract performance	Account lifetime + 30 days
Meal History	Tracking, reports, trends	Contract performance	Account lifetime + 30 days
Usage Data	Service improvement, debugging	Legitimate interest	90 days
Support Requests	Customer support	Contract performance	2 years

6. DISCLOSURE OF PERSONAL DATA

6.1 Service Providers (Processors)
We share personal data with service providers who process data on our behalf under data processing agreements that require them to protect your data and use it only as instructed.

6.2 AI Providers
Food photographs (with metadata stripped and no personal identifiers) are shared with OpenAI for nutritional analysis.

6.3 Legal Obligations
We may disclose personal data when required by law, court order, or governmental authority, or to protect our rights, safety, or property.

6.4 Business Transfers
In connection with a merger, acquisition, or sale of assets, your personal data may be transferred to the successor entity. We will provide notice before your data becomes subject to a different privacy policy.

7. SHARING DATA WITH NUTRITION EXPERTS

7.1 Your Control
Sharing your data with Experts is entirely voluntary and requires your explicit consent at the time of booking. You choose which categories to share:
• Nutrition history (meal logs, calories, macronutrients)
• Health goals and dietary preferences
• Laboratory/biomarker results
• Medication information

7.2 Expert Responsibilities
Experts are independent data controllers for consultation data. They agree to confidentiality obligations and professional ethics codes. You may revoke an Expert's access at any time through your account settings.

8. AGGREGATED AND ANONYMIZED DATA

8.1 De-identification Process
We may create aggregated, de-identified, or anonymized data from personal data using irreversible techniques that prevent re-identification. Such data is no longer personal data under applicable law.

8.2 Use of Anonymized Data
We may use and disclose anonymized data for research, analytics, industry reports, product development, and commercial purposes, including licensing to third parties. Examples include population-level nutritional trends, aggregate consumption patterns, and statistical health analyses.

8.3 Safeguards
We do not sell your personal data. Anonymized data cannot identify you. We apply minimum group sizes (k-anonymity), remove unique identifiers, and contractually prohibit partners from attempting re-identification.

9. INTERNATIONAL DATA TRANSFERS

9.1 Your data may be transferred to Switzerland, the European Union, and the United States (for AI processing).

9.2 Transfer Safeguards. For transfers outside Switzerland/EEA, we implement: (a) Standard Contractual Clauses (SCCs) approved by the European Commission and Swiss FDPIC; (b) adequacy decisions where available; (c) supplementary measures where required by transfer impact assessments.

10. DATA RETENTION

10.1 Active Accounts. We retain your personal data while your account is active.

10.2 Account Deletion. Upon account deletion, we will delete or anonymize your personal data within thirty (30) days, except where retention is required for legal obligations, dispute resolution, or enforcement of our agreements.

10.3 Specific Retention Periods. See the table in Section 5 for category-specific retention periods. Security logs are retained for 90 days. Financial records required by Swiss law are retained for 10 years.

11. DATA SECURITY

We implement technical and organizational measures including:
• Encryption in transit (TLS 1.3)
• Encryption at rest (AES-256)
• Access controls and authentication
• Regular security assessments
• Employee training on data protection

No system is completely secure. We cannot guarantee absolute security of your data.

12. YOUR RIGHTS

Subject to applicable law, you have the following rights:
• Access: Obtain confirmation of processing and a copy of your data
• Rectification: Correct inaccurate or incomplete data
• Erasure: Request deletion ("right to be forgotten")
• Restriction: Limit processing in certain circumstances
• Portability: Receive your data in machine-readable format
• Objection: Object to processing based on legitimate interests
• Withdraw Consent: Withdraw consent at any time

12.1 How to Exercise Your Rights
• In-App: Settings > Privacy > Data Rights
• Email: privacy@eatsense.ch
• Response Time: Within 30 days (may be extended by 60 days for complex requests)

We may verify your identity before processing requests. You have the right to lodge a complaint with the Swiss FDPIC or your local supervisory authority.

13. COOKIES AND TRACKING

13.1 Mobile App. We do not use cookies in the mobile app. We do not use third-party analytics SDKs. We do not collect advertising identifiers (IDFA/GAID) or engage in cross-app tracking.

13.2 Website. Our website uses essential cookies for functionality. We do not use tracking or advertising cookies.

14. CHANGES TO THIS POLICY

We may update this Policy periodically. We will notify you of material changes by posting the updated Policy in the App and, for significant changes, by in-app notification or email. Your continued use after the effective date constitutes acceptance.

15. CONTACT INFORMATION

For questions or to exercise your rights:
TEMONAN Geneva Holdings Sàrl
Attn: Privacy Contact
Avully, Switzerland
Email: info@eatsense.ch

For complaints, you may contact the Swiss Federal Data Protection and Information Commissioner (FDPIC) or your local supervisory authority.

* * *
TEMONAN Geneva Holdings Sàrl — EatSense: Smart Nutrition, Swiss Precision`;

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();
  const { colors, tokens } = useTheme();
  const { t } = useI18n();

  const styles = React.useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation && typeof navigation.goBack === 'function' ? navigation.goBack() : null}
        >
          <Ionicons name="close" size={24} color={colors.textPrimary || colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary || colors.text }]}>
          {t('profile.policy') || 'Privacy Policy'}
        </Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator
      >
        <Text style={[styles.content, { color: colors.textPrimary || colors.text }]}>
          {PRIVACY_POLICY_TEXT}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (tokens, colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    closeButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      flex: 1,
      textAlign: 'center',
    },
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      padding: 20,
      paddingBottom: 40,
    },
    content: {
      fontSize: 14,
      lineHeight: 22,
      fontFamily: 'System',
    },
  });
