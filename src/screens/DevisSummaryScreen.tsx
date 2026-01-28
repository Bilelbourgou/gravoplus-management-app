import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { devisApi } from '../services';
import { useAuthStore } from '../store/auth.store';
import { colors, statusColors, machineColors } from '../theme/colors';
import type { Devis, MachineType } from '../types';
import type { NewDevisStackParamList } from '../navigation/MainNavigator';

type Props = {
  navigation: NativeStackNavigationProp<NewDevisStackParamList, 'DevisSummary'>;
  route: RouteProp<NewDevisStackParamList, 'DevisSummary'>;
};

export function DevisSummaryScreen({ navigation, route }: Props) {
  const { devisId } = route.params;
  const { user } = useAuthStore();
  const [devis, setDevis] = useState<Devis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    devisApi.getById(devisId).then(setDevis).catch(console.error).finally(() => setLoading(false));
  }, [devisId]);

  const handleDone = () => {
    Alert.alert('Succès', 'Le devis a été créé avec succès!', [
      {
        text: 'OK',
        onPress: () => {
          navigation.dispatch(
            CommonActions.reset({ index: 0, routes: [{ name: 'ClientSelect' }] })
          );
        },
      },
    ]);
  };

  if (loading || !devis) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.reference}>{devis.reference}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[devis.status] + '30' }]}>
            <Text style={[styles.statusText, { color: statusColors[devis.status] }]}>
              {devis.status === 'DRAFT' ? 'Brouillon' : devis.status}
            </Text>
          </View>
        </View>

        <View style={styles.clientCard}>
          <Ionicons name="person" size={20} color={colors.primary[400]} />
          <Text style={styles.clientName}>{devis.client.name}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lignes ({devis.lines.length})</Text>
          {devis.lines.map((line) => (
            <View key={line.id} style={styles.lineItem}>
              <View style={[styles.machineBadge, { backgroundColor: machineColors[line.machineType as MachineType] + '20' }]}>
                <Text style={[styles.machineBadgeText, { color: machineColors[line.machineType as MachineType] }]}>
                  {line.machineType}
                </Text>
              </View>
              <Text style={styles.lineDescription}>{line.description || 'Sans description'}</Text>
              {user?.role !== 'EMPLOYEE' && (
                <Text style={styles.lineTotal}>{Number(line.lineTotal).toFixed(2)} TND</Text>
              )}
            </View>
          ))}
        </View>

        {devis.services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services ({devis.services.length})</Text>
            {devis.services.map((service) => (
              <View key={service.id} style={styles.serviceItem}>
                <Text style={styles.serviceName}>{service.service.name}</Text>
              {user?.role !== 'EMPLOYEE' && (
                <Text style={styles.servicePrice}>{Number(service.price).toFixed(2)} TND</Text>
              )}
              </View>
            ))}
          </View>
        )}

        {user?.role !== 'EMPLOYEE' && (
          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>{Number(devis.totalAmount).toFixed(2)} TND</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.addMoreButton} onPress={() => navigation.goBack()}>
          <Ionicons name="add" size={20} color={colors.text.secondary} />
          <Text style={styles.addMoreText}>Ajouter</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={styles.doneButtonText}>Terminer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.base },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.base },
  content: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  reference: { fontSize: 24, fontWeight: '700', color: colors.text.primary },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  clientCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.background.surface, padding: 16, borderRadius: 12, marginBottom: 24,
  },
  clientName: { fontSize: 16, fontWeight: '500', color: colors.text.primary },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.text.muted, marginBottom: 12, textTransform: 'uppercase' },
  lineItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.background.surface, padding: 12, borderRadius: 10, marginBottom: 8,
  },
  machineBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  machineBadgeText: { fontSize: 10, fontWeight: '600' },
  lineDescription: { flex: 1, fontSize: 14, color: colors.text.secondary },
  lineTotal: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  serviceItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.background.surface, padding: 12, borderRadius: 10, marginBottom: 8,
  },
  serviceName: { fontSize: 14, color: colors.text.secondary },
  servicePrice: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  totalSection: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 20, borderTopWidth: 2, borderTopColor: colors.border.default, marginTop: 8,
  },
  totalLabel: { fontSize: 18, color: colors.text.secondary },
  totalAmount: { fontSize: 28, fontWeight: '700', color: colors.primary[400] },
  footer: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: colors.border.subtle },
  addMoreButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 16, borderRadius: 12, backgroundColor: colors.background.elevated,
  },
  addMoreText: { color: colors.text.secondary, fontSize: 16, fontWeight: '600' },
  doneButton: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 16, borderRadius: 12, backgroundColor: colors.primary[500],
  },
  doneButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
