import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SwipeClosableModal } from './common/SwipeClosableModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const [activeSection, setActiveSection] = useState<'profile' | 'personalization' | 'settings' | 'about' | 'faq'>('profile');

  const headerStyle = {
    paddingTop: Math.max(insets.top + 20, 20),
  };

  const renderProfileSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Your Profile</Text>

      <View style={styles.profileCard}>
        <View style={styles.profileItem}>
          <Text style={styles.profileLabel}>Your Goal</Text>
          <TouchableOpacity style={styles.profileValue}>
            <Text style={styles.profileValueText}>Weight Loss</Text>
            <Ionicons name="chevron-forward" size={16} color="#7F8C8D" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileItem}>
          <Text style={styles.profileLabel}>Age</Text>
          <TouchableOpacity style={styles.profileValue}>
            <Text style={styles.profileValueText}>25 years</Text>
            <Ionicons name="chevron-forward" size={16} color="#7F8C8D" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileItem}>
          <Text style={styles.profileLabel}>Weight</Text>
          <TouchableOpacity style={styles.profileValue}>
            <Text style={styles.profileValueText}>75.2 kg</Text>
            <Ionicons name="chevron-forward" size={16} color="#7F8C8D" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileItem}>
          <Text style={styles.profileLabel}>Height</Text>
          <TouchableOpacity style={styles.profileValue}>
            <Text style={styles.profileValueText}>175 cm</Text>
            <Ionicons name="chevron-forward" size={16} color="#7F8C8D" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileItem}>
          <Text style={styles.profileLabel}>Activity Level</Text>
          <TouchableOpacity style={styles.profileValue}>
            <Text style={styles.profileValueText}>Moderately Active</Text>
            <Ionicons name="chevron-forward" size={16} color="#7F8C8D" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderPersonalizationSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Personalization</Text>

      <View style={styles.personalizationCard}>
        <View style={styles.personalizationItem}>
          <Text style={styles.personalizationLabel}>Your Plan</Text>
          <TouchableOpacity style={styles.personalizationValue}>
            <Text style={styles.personalizationValueText}>Premium</Text>
            <Ionicons name="chevron-forward" size={16} color="#7F8C8D" />
          </TouchableOpacity>
        </View>

        <View style={styles.personalizationItem}>
          <Text style={styles.personalizationLabel}>Apple Health Sync</Text>
          <TouchableOpacity style={styles.personalizationValue}>
            <Text style={styles.personalizationValueText}>Enabled</Text>
            <Ionicons name="chevron-forward" size={16} color="#7F8C8D" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderSettingsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Settings</Text>

      <View style={styles.settingsCard}>
        <View style={styles.settingsItem}>
          <Text style={styles.settingsLabel}>Units of Measurement</Text>
          <TouchableOpacity style={styles.settingsValue}>
            <Text style={styles.settingsValueText}>Metric</Text>
            <Ionicons name="chevron-forward" size={16} color="#7F8C8D" />
          </TouchableOpacity>
        </View>

        <View style={styles.settingsItem}>
          <Text style={styles.settingsLabel}>Save Photos</Text>
          <TouchableOpacity style={styles.settingsValue}>
            <Text style={styles.settingsValueText}>Auto-save to gallery</Text>
            <Ionicons name="chevron-forward" size={16} color="#7F8C8D" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderAboutSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>About Us</Text>

      <View style={styles.aboutCard}>
        <Text style={styles.aboutText}>
          EatSense is an AI-powered nutrition analysis app that helps you track your food intake and maintain a healthy lifestyle.
        </Text>
        <Text style={styles.aboutText}>
          Our advanced AI technology can identify ingredients and calculate nutritional values from photos of your meals.
        </Text>
      </View>
    </View>
  );

  const renderFAQSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

      <View style={styles.faqCard}>
        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>How accurate is the AI analysis?</Text>
          <Text style={styles.faqAnswer}>Our AI provides highly accurate nutritional analysis based on advanced machine learning models.</Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Can I edit the analysis results?</Text>
          <Text style={styles.faqAnswer}>Yes, you can manually correct any analysis results to ensure accuracy.</Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Is my data secure?</Text>
          <Text style={styles.faqAnswer}>Yes, we use industry-standard encryption to protect your personal data.</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SwipeClosableModal
      visible={visible}
      onClose={onClose}
      swipeDirection="down"
      enableSwipe={true}
      enableBackdropClose={true}
      animationType="fade"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={[styles.header, headerStyle]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.title}>Account</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeSection === 'profile' && styles.activeTab]}
            onPress={() => setActiveSection('profile')}
          >
            <Text style={[styles.tabText, activeSection === 'profile' && styles.activeTabText]}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeSection === 'personalization' && styles.activeTab]}
            onPress={() => setActiveSection('personalization')}
          >
            <Text style={[styles.tabText, activeSection === 'personalization' && styles.activeTabText]}>Personalization</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeSection === 'settings' && styles.activeTab]}
            onPress={() => setActiveSection('settings')}
          >
            <Text style={[styles.tabText, activeSection === 'settings' && styles.activeTabText]}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeSection === 'about' && styles.activeTab]}
            onPress={() => setActiveSection('about')}
          >
            <Text style={[styles.tabText, activeSection === 'about' && styles.activeTabText]}>About Us</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeSection === 'faq' && styles.activeTab]}
            onPress={() => setActiveSection('faq')}
          >
            <Text style={[styles.tabText, activeSection === 'faq' && styles.activeTabText]}>FAQ</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {activeSection === 'profile' && renderProfileSection()}
          {activeSection === 'personalization' && renderPersonalizationSection()}
          {activeSection === 'settings' && renderSettingsSection()}
          {activeSection === 'about' && renderAboutSection()}
          {activeSection === 'faq' && renderFAQSection()}
        </ScrollView>
      </View>
    </SwipeClosableModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  placeholder: {
    width: 40,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
  },
  activeTab: {
    backgroundColor: '#3498DB',
  },
  tabText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  profileLabel: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  profileValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileValueText: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  personalizationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  personalizationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  personalizationLabel: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  personalizationValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  personalizationValueText: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  settingsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  settingsLabel: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  settingsValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsValueText: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  aboutCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aboutText: {
    fontSize: 16,
    color: '#2C3E50',
    lineHeight: 24,
    marginBottom: 16,
  },
  faqCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  faqItem: {
    marginBottom: 20,
  },
  faqQuestion: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '600',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
});