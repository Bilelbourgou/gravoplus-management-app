import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { servicesApi, devisApi } from '../services';
import { colors } from '../theme/colors';
import type { FixedService } from '../types';
import type { NewDevisStackParamList } from '../navigation/MainNavigator';

type Props = {
  navigation: NativeStackNavigationProp<NewDevisStackParamList, 'Services'>;
  route: RouteProp<NewDevisStackParamList, 'Services'>;
};

export function ServicesScreen({ navigation, route }: Props) {
  const { devisId } = route.params;
  const [services, setServices] = useState<FixedService[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    servicesApi.getAll().then((data) => {
      setServices(data.filter(s => s.isActive));
      setLoading(false);
    }).catch(console.error);
  }, []);

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      for (const serviceId of selectedServices) {
        await devisApi.addService(devisId, serviceId);
      }
      navigation.navigate('DevisSummary', { devisId });
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Services additionnels</Text>
        <Text style={styles.subtitle}>Sélectionnez les services à ajouter (optionnel)</Text>

        {services.map((service) => {
          const isSelected = selectedServices.includes(service.id);
          return (
            <TouchableOpacity
              key={service.id}
              style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
              onPress={() => toggleService(service.id)}
            >
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                {service.description && (
                  <Text style={styles.serviceDescription}>{service.description}</Text>
                )}
              </View>
              <View style={styles.serviceRight}>
                <Text style={styles.servicePrice}>{Number(service.price).toFixed(2)} TND</Text>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.navigate('DevisSummary', { devisId })}
        >
          <Text style={styles.skipButtonText}>Passer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.continueButton, saving && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={saving || selectedServices.length === 0}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.continueButtonText}>Continuer ({selectedServices.length})</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.base },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.base },
  content: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text.primary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.text.muted, marginBottom: 24 },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.border.subtle,
  },
  serviceCardSelected: { borderColor: colors.primary[500], backgroundColor: colors.primary[500] + '10' },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  serviceDescription: { fontSize: 14, color: colors.text.muted, marginTop: 4 },
  serviceRight: { alignItems: 'flex-end', gap: 8 },
  servicePrice: { fontSize: 16, fontWeight: '700', color: colors.primary[400] },
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: colors.border.default,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxSelected: { backgroundColor: colors.primary[500], borderColor: colors.primary[500] },
  footer: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: colors.border.subtle },
  skipButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: colors.background.elevated },
  skipButtonText: { color: colors.text.secondary, fontSize: 16, fontWeight: '600' },
  continueButton: { flex: 2, padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: colors.primary[500] },
  buttonDisabled: { opacity: 0.7 },
  continueButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
