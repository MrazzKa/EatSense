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

const TERMS_OF_SERVICE_TEXT = `TERMS OF SERVICE
EatSense Mobile Application and Services
Effective Date: December 13, 2025

PLEASE READ CAREFULLY. By accessing or using the Services, you agree to these Terms and our Privacy Policy. If you do not agree, do not use the Services.

These Terms of Service ("Terms") constitute a legally binding agreement between you and TEMONAN Geneva Holdings Sàrl, a Swiss company based in Avully ("EatSense," "we," "us"), governing your use of our mobile application and related services (the "Services").

1. ELIGIBILITY

1.1 Age Requirement. You must be at least eighteen (18) years old to use the Services. By creating an account, you represent that you are at least 18 years old.

1.2 Verification. We may request age verification at any time. If we have reason to believe you are under 18, we may suspend your account pending verification.

1.3 Legal Capacity. You represent that you have the legal capacity to enter into binding contracts in your jurisdiction.

2. ACCOUNT REGISTRATION

2.1 You must provide accurate, current, and complete information and keep it updated.

2.2 You are responsible for maintaining account security and all activities under your account.

2.3 One account per person. Do not share your account.

2.4 Data Export. You may request an export of your data in machine-readable format at any time through Settings or by contacting us.

2.5 Account Deletion. You may delete your account at any time. Upon deletion, your data will be removed in accordance with our Privacy Policy.

3. SERVICES DESCRIPTION

3.1 EatSense provides AI-powered nutritional analysis, meal tracking, health metrics tracking, and access to nutrition experts. We may modify, suspend, or discontinue any aspect of the Services at any time.

3.2 User Content. You retain ownership of content you submit (photographs, notes). By submitting content, you grant us a license to use it solely for providing and improving the Services. We use food photographs for nutritional analysis and may use anonymized, aggregated data for research and analytics. We do not use your personal photographs to train AI models.

4. SUBSCRIPTION AND PAYMENT

4.1 Free and Premium Services
The Services include free features and optional Premium subscriptions with enhanced functionality.

4.2 Subscription Terms
• Subscriptions automatically renew unless cancelled before the renewal date
• Billing occurs through Apple App Store or Google Play
• Cancel anytime through your App Store or Google Play account settings
• Cancellation takes effect at end of current billing period

4.3 Free Trials and Promotional Offers
We may offer free trials or promotional pricing. Unless cancelled before the trial ends, you will be charged the standard subscription fee. Trial terms will be disclosed at sign-up.

4.4 Refunds
Refunds are subject to Apple App Store or Google Play policies. We do not provide direct refunds for purchases made through these platforms. For EU/EEA consumers, statutory withdrawal rights may apply.

4.5 Price Changes
We may change subscription prices with reasonable notice. Price changes apply to subsequent billing periods, not your current subscription.

5. EXPERT MARKETPLACE

5.1 Overview
The Services include a marketplace connecting you with independent nutrition professionals ("Experts"). Experts set their own prices, schedules, and consultation terms.

5.2 Independent Contractors
Experts are independent contractors, not employees or agents of EatSense. We do not endorse, recommend, or guarantee any Expert or their services. We verify Expert credentials but cannot guarantee their accuracy or completeness.

5.3 Booking and Payment
• Payments for consultations are processed through our payment processor
• EatSense retains a service fee (disclosed at checkout)
• Remaining amount is paid to the Expert

5.4 Cancellations and Refunds
• By You: Cancel more than 24 hours before scheduled time for full refund. Cancel within 24 hours: no refund (unless Expert agrees otherwise).
• By Expert: If Expert cancels, you receive full refund. We will assist in rescheduling if desired.
• No-Show: If you miss a session without cancellation, no refund is provided. If Expert fails to attend, you receive full refund.

5.5 Disputes with Experts
Disputes regarding Expert services should first be addressed directly with the Expert. If unresolved, contact us at support@eatsense.ch. We will mediate in good faith but are not responsible for Expert advice, actions, or omissions.

5.6 Reviews
You may leave reviews after consultations. Reviews must be honest and based on your actual experience. We may remove reviews that violate our guidelines.

6. HEALTH AND MEDICAL DISCLAIMER

THE SERVICES ARE NOT MEDICAL ADVICE. EatSense is not a healthcare provider. The Services are for informational and educational purposes only. Always consult qualified healthcare providers before making dietary or health decisions.

6.1 No Reliance. Do not rely on the Services as a substitute for professional medical advice, diagnosis, or treatment. Do not disregard or delay seeking medical advice because of information from the Services.

6.2 Allergies and Health Conditions. You are solely responsible for knowing your food allergies and health conditions. The Services may not identify all ingredients or allergens. Always verify before consuming food.

6.3 Emergency. For medical emergencies, call emergency services immediately. Do not use the Services for emergency assistance.

6.4 Eating Disorders. If you have or are at risk for an eating disorder, please consult healthcare professionals before using nutrition tracking services. We reserve the right to limit features if we believe use may be harmful.

7. ACCURACY OF INFORMATION

7.1 AI Limitations. Nutritional information is generated by AI and may contain errors, inaccuracies, or biases. Results are estimates, not precise measurements.

7.2 No Professional Review. AI-generated content has not been reviewed by nutrition professionals unless specifically indicated.

7.3 Database Limitations. Nutritional databases may contain errors or outdated information. We make no warranty of accuracy.

8. USER CONDUCT

You agree not to: 
• Use the Services unlawfully or in violation of these Terms
• Provide false information or impersonate others
• Interfere with or disrupt the Services
• Attempt unauthorized access or reverse engineer the Services
• Use automated means to scrape or access the Services
• Transmit malware or harmful code
• Harass, abuse, or harm other users or Experts
• Promote self-harm, eating disorders, or dangerous behaviors
• Use the Services for commercial purposes without authorization

9. INTELLECTUAL PROPERTY

9.1 Our IP. The Services and all content, features, and functionality are owned by EatSense and protected by intellectual property laws.

9.2 License to You. We grant you a limited, non-exclusive, non-transferable, revocable license to use the Services for personal, non-commercial purposes.

9.3 Your Content. You retain ownership of your content. You grant us a license to use it for providing the Services and, in anonymized form only, for improvement and research.

10. DISCLAIMER OF WARRANTIES

THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICES WILL BE ACCURATE, RELIABLE, ERROR-FREE, OR UNINTERRUPTED.

Some jurisdictions do not allow warranty exclusions, so some exclusions may not apply to you.

11. LIMITATION OF LIABILITY

11.1 TO THE MAXIMUM EXTENT PERMITTED BY LAW, EATSENSE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL.

11.2 OUR TOTAL LIABILITY SHALL NOT EXCEED THE GREATER OF: (A) AMOUNTS YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM; OR (B) CHF 100.

11.3 Consumer Protection. Nothing in these Terms excludes or limits liability for: (a) death or personal injury caused by gross negligence or willful misconduct; (b) fraud or fraudulent misrepresentation; (c) any liability that cannot be excluded under applicable law, including mandatory consumer protection rights.

Some jurisdictions do not allow liability limitations, so some limitations may not apply to you.

12. INDEMNIFICATION

You agree to indemnify and hold harmless EatSense from claims arising from your use of the Services, violation of these Terms, or violation of third-party rights. This does not apply to claims caused by our gross negligence or willful misconduct.

13. TERMINATION

13.1 By You. You may terminate by deleting your account. You may request data export before deletion.

13.2 By Us. We may suspend or terminate your access for violation of these Terms, fraud, extended inactivity, or any other reason with notice where practicable.

13.3 Effect. Upon termination, your right to use the Services ceases. Sections 6, 9, 10, 11, 12, and 14 survive termination.

14. GOVERNING LAW AND DISPUTE RESOLUTION

14.1 Governing Law. These Terms are governed by Swiss law, without regard to conflict of law principles.

14.2 Informal Resolution. Before initiating formal proceedings, you agree to contact us at legal@eatsense.ch to attempt informal resolution. We will respond within 30 days.

14.3 Jurisdiction. Disputes shall be subject to the exclusive jurisdiction of the courts of Geneva, Switzerland.

14.4 EU Consumer Rights. If you are an EU/EEA consumer, you may bring proceedings in your country of residence, and mandatory consumer protection laws of your jurisdiction apply. For online dispute resolution, see: https://ec.europa.eu/odr.

15. GENERAL PROVISIONS

15.1 Entire Agreement. These Terms and our Privacy Policy constitute the entire agreement between you and EatSense.

15.2 Severability. If any provision is held invalid, the remainder continues in effect.

15.3 Waiver. Failure to enforce any right is not a waiver.

15.4 Assignment. You may not assign these Terms. We may assign without restriction.

15.5 Language. English version controls in case of translation conflicts.

15.6 Changes. We may modify these Terms with notice. Continued use constitutes acceptance.

16. CONTACT INFORMATION

TEMONAN Geneva Holdings Sàrl
Attn: Legal Department
24 Chemin De Sous-Forestal
1237 Avully, Geneva
Switzerland
Email: info@eatsense.ch

17. ACKNOWLEDGMENT

BY USING THE SERVICES, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS.

* * *
TEMONAN Geneva Holdings Sàrl — EatSense: Smart Nutrition, Swiss Precision`;

export default function TermsOfServiceScreen() {
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
          {t('profile.termsOfService') || 'Terms of Service'}
        </Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator
      >
        <Text style={[styles.content, { color: colors.textPrimary || colors.text }]}>
          {TERMS_OF_SERVICE_TEXT}
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
