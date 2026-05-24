import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../app/i18n/hooks';

interface AnalysisResultsProps {
  imageUri: string;
  result: any;
  onClose: () => void;
  onEdit: () => void;
  onShare: () => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  imageUri,
  result,
  onClose,
  onEdit,
  onShare
}) => {
  const totalKcal = result?.items.reduce((sum: number, item: any) => sum + (item.kcal || 0), 0) || 0;
  const totalProtein = result?.items.reduce((sum: number, item: any) => sum + (item.protein || 0), 0) || 0;
  const totalFat = result?.items.reduce((sum: number, item: any) => sum + (item.fat || 0), 0) || 0;
  const totalCarbs = result?.items.reduce((sum: number, item: any) => sum + (item.carbs || 0), 0) || 0;

  const getHealthScore = () => {
    if (totalKcal < 300) return 8;
    if (totalKcal < 500) return 6;
    if (totalKcal < 700) return 4;
    return 2;
  };

  const healthScore = getHealthScore();

  const { t } = useI18n(); // Assuming useI18n is available, if not need to import

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('analysisResults.title') || 'Analysis Result'}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.heartButton}>
            <Ionicons name="heart-outline" size={24} color="#E74C3C" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-vertical" size={24} color="#2C3E50" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageSection}>
          <Image source={{ uri: imageUri }} style={styles.dishImage} />
          <View style={styles.imageOverlay}>
            <Text style={styles.analysisTime}>
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        <View style={styles.dishNameContainer}>
          <Text style={styles.dishName}>
            {result?.items?.[0]?.label || t('analysisResults.unknownDish') || 'Unknown dish'}
          </Text>
        </View>

        <View style={styles.nutritionCard}>
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{Math.round(totalKcal)}</Text>
              <Text style={styles.nutritionLabel}>{t('analysisResults.calories') || 'Calories'}</Text>
              <TouchableOpacity style={styles.miniEditButton}>
                <Ionicons name="create-outline" size={16} color="#7F8C8D" />
              </TouchableOpacity>
            </View>

            <View style={styles.portionContainer}>
              <Text style={styles.portionLabel}>{t('analysisResults.portions') || 'Portions'}</Text>
              <View style={styles.portionControls}>
                <TouchableOpacity style={styles.portionButton}>
                  <Ionicons name="remove" size={16} color="#7F8C8D" />
                </TouchableOpacity>
                <Text style={styles.portionValue}>1</Text>
                <TouchableOpacity style={styles.portionButton}>
                  <Ionicons name="add" size={16} color="#7F8C8D" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.macrosGrid}>
            <View style={styles.macroItem}>
              <View style={[styles.macroIcon, { backgroundColor: '#E74C3C' }]}>
                <Text style={styles.macroIconText}>P</Text>
              </View>
              <Text style={styles.macroValue}>{Math.round(totalProtein)}g</Text>
              <TouchableOpacity style={styles.miniEditButton}>
                <Ionicons name="create-outline" size={16} color="#7F8C8D" />
              </TouchableOpacity>
            </View>

            <View style={styles.macroItem}>
              <View style={[styles.macroIcon, { backgroundColor: '#F39C12' }]}>
                <Text style={styles.macroIconText}>F</Text>
              </View>
              <Text style={styles.macroValue}>{Math.round(totalFat)}g</Text>
              <TouchableOpacity style={styles.miniEditButton}>
                <Ionicons name="create-outline" size={16} color="#7F8C8D" />
              </TouchableOpacity>
            </View>

            <View style={styles.macroItem}>
              <View style={[styles.macroIcon, { backgroundColor: '#3498DB' }]}>
                <Text style={styles.macroIconText}>C</Text>
              </View>
              <Text style={styles.macroValue}>{Math.round(totalCarbs)}g</Text>
              <TouchableOpacity style={styles.miniEditButton}>
                <Ionicons name="create-outline" size={16} color="#7F8C8D" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.healthScoreCard}>
          <Text style={styles.healthScoreTitle}>{t('analysisResults.healthScore') || 'Health Score'}</Text>
          <View style={styles.healthScoreBar}>
            {[...Array(10)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.healthScoreSegment,
                  i < healthScore && styles.healthScoreSegmentFilled,
                ]}
              />
            ))}
          </View>
          <Text style={styles.healthScoreText}>
            {t('analysisResults.healthScoreLevel.text', {
              level: healthScore > 7
                ? t('analysisResults.healthScoreLevel.very')
                : healthScore > 4
                  ? t('analysisResults.healthScoreLevel.moderately')
                  : t('analysisResults.healthScoreLevel.less')
            })}
          </Text>
        </View>

        <View style={styles.ingredientsCard}>
          <Text style={styles.ingredientsTitle}>{t('analysisResults.ingredients') || 'Ingredients'}</Text>

          {(result?.items && Array.isArray(result.items) ? result.items : []).map((item: any, index: number) => {
            // Helper to check if string looks like a localization key
            const isLocalizationKey = (str: string): boolean => {
              if (!str || typeof str !== 'string') return false;
              return str.includes('.') && str.length > 3 && str.split('.').length >= 2;
            };

            // Helper to safely get label, avoiding localization keys
            const getItemLabel = (label: string | undefined | null): string => {
              if (!label) return 'Ingredient';
              if (isLocalizationKey(label)) {
                // If it looks like a key, try to translate it, or fallback nicely
                const translated = t(label);
                if (translated !== label) return translated;

                const parts = label.split('.');
                const fallback = parts[parts.length - 1];
                return fallback.charAt(0).toUpperCase() + fallback.slice(1).replace(/_/g, ' ');
              }
              return label;
            };

            return (
              <View key={index} style={styles.ingredientItem}>
                <View style={styles.ingredientInfo}>
                  <Text style={styles.ingredientName}>{getItemLabel(item.label || item.name)}</Text>
                  <Text style={styles.ingredientWeight}>
                    {item.gramsMean ? `${Math.round(item.gramsMean)}g ${t('analysisResults.perPortion') || 'per portion'}` : t('analysisResults.weightNotDetermined') || 'Weight not determined'}
                  </Text>
                  <View style={styles.ingredientMacros}>
                    <Text style={styles.ingredientMacroText}>
                      P {item.protein || 0} F {item.fat || 0} C {item.carbs || 0}
                    </Text>
                  </View>
                </View>
                <Text style={styles.ingredientCalories}>
                  {Math.round(item.kcal || 0)} kcal
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.shareButton} onPress={onShare}>
            <Ionicons name="share-outline" size={20} color="#3498DB" />
            <Text style={styles.shareButtonText}>{t('analysisResults.share') || 'Share'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.editButton} onPress={onEdit}>
            <Ionicons name="sparkles" size={20} color="white" />
            <Text style={styles.editButtonText}>{t('analysisResults.correct') || 'Correct'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#3498DB',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 10,
  },
  heartButton: {
    padding: 5,
  },
  moreButton: {
    padding: 5,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  imageSection: {
    position: 'relative',
    marginBottom: 20,
  },
  dishImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  imageOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  analysisTime: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  dishNameContainer: {
    marginBottom: 20,
  },
  dishName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
  },
  nutritionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  nutritionItem: {
    alignItems: 'center',
    flex: 1,
  },
  nutritionValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  miniEditButton: {
    padding: 4,
  },
  portionContainer: {
    alignItems: 'center',
    flex: 1,
  },
  portionLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  portionControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  portionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  portionValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    minWidth: 20,
    textAlign: 'center',
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  macroIconText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  healthScoreCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  healthScoreTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  healthScoreBar: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  healthScoreSegment: {
    flex: 1,
    height: 8,
    backgroundColor: '#E9ECEF',
    borderRadius: 4,
  },
  healthScoreSegmentFilled: {
    backgroundColor: '#2ECC71',
  },
  healthScoreText: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  ingredientsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ingredientsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  ingredientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  ingredientWeight: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  ingredientMacros: {
    flexDirection: 'row',
  },
  ingredientMacroText: {
    fontSize: 12,
    color: '#95A5A6',
  },
  ingredientCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498DB',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3498DB',
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498DB',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#3498DB',
    gap: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
