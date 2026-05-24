import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useI18n } from '../../app/i18n/hooks';

interface IncidentNotificationScreenProps {
  onClose: () => void;
  onReport: () => void;
}

export const IncidentNotificationScreen: React.FC<IncidentNotificationScreenProps> = ({
  onClose,
  onReport,
}) => {
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            if (onClose && typeof onClose === 'function') {
              onClose();
            }
          }}
        >
          <Ionicons name="close" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('incident.title') || 'Report Incident'}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={64} color="#2ECC71" />
        </View>

        <Text style={styles.mainTitle}>{t('incident.detectedTitle') || 'Security Incident Detected'}</Text>
        <Text style={styles.description}>
          {t('incident.description') || "We've detected unusual activity in your account. For your security, we've temporarily restricted access."}
        </Text>

        <View style={styles.incidentDetails}>
          <Text style={styles.detailsTitle}>{t('incident.detailsTitle') || 'Incident Details:'}</Text>
          <Text style={styles.detailsText}>• {t('incident.loginAttempt') || 'Unusual login attempt detected'}</Text>
          <Text style={styles.detailsText}>• {t('incident.locationUnknown') || 'Location: Unknown'}</Text>
          <Text style={styles.detailsText}>• Time: {new Date().toLocaleString()}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => {
              if (onReport && typeof onReport === 'function') {
                onReport();
              }
            }}
          >
            <Ionicons name="shield" size={20} color="white" />
            <Text style={styles.reportButtonText}>{t('incident.title') || 'Report Incident'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => {
              if (onClose && typeof onClose === 'function') {
                onClose();
              }
            }}
          >
            <Ionicons name="mail" size={20} color="#3498DB" />
            <Text style={styles.contactButtonText}>{t('incident.contactSupport') || 'Contact Support'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  incidentDetails: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 32,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  reportButton: {
    backgroundColor: '#E74C3C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  contactButton: {
    backgroundColor: '#F8F9FA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    gap: 8,
  },
  contactButtonText: {
    color: '#3498DB',
    fontSize: 16,
    fontWeight: '600',
  },
});
