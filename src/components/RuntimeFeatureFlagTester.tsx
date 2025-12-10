import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  onToggle: (_key: string, _enabled: boolean) => void;
}

interface RuntimeFeatureFlagTesterProps {
  flags: FeatureFlag[];
  onSave: () => void;
  onReset: () => void;
}

export const RuntimeFeatureFlagTester: React.FC<RuntimeFeatureFlagTesterProps> = ({
  flags,
  onSave,
  onReset,
}) => {
  const [hasChanges, setHasChanges] = useState(false);

  const handleToggle = (key: string, enabled: boolean) => {
    const flag = flags.find(f => f.key === key);
    if (flag && flag.onToggle && typeof flag.onToggle === 'function') {
      flag.onToggle(key, enabled);
      setHasChanges(true);
    }
  };

  const handleSave = () => {
    if (onSave && typeof onSave === 'function') {
      onSave();
      setHasChanges(false);
    }
  };

  const handleReset = () => {
    if (onReset && typeof onReset === 'function') {
      onReset();
      setHasChanges(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Feature Flags</Text>
        <Text style={styles.subtitle}>Runtime configuration for development</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {(flags || []).map(flag => (
          <View key={flag.key} style={styles.flagContainer}>
            <View style={styles.flagHeader}>
              <Text style={styles.flagName}>{flag.name}</Text>
              <Switch
                value={flag.enabled}
                onValueChange={(enabled) => handleToggle(flag.key, enabled)}
                trackColor={{ false: '#E9ECEF', true: '#3498DB' }}
                thumbColor={flag.enabled ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>
            <Text style={styles.flagDescription}>{flag.description}</Text>
          </View>
        ))}
      </ScrollView>

      {hasChanges && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Ionicons name="refresh" size={20} color="#7F8C8D" />
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Ionicons name="checkmark" size={20} color="white" />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  content: {
    padding: 20,
  },
  flagContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  flagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  flagName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  flagDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#3498DB',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
