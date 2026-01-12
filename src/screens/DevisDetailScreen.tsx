import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { devisApi } from '../services';
import { colors, statusColors, machineColors } from '../theme/colors';
import type { Devis, DevisStatus, MachineType } from '../types';
import type { HistoryStackParamList } from '../navigation/MainNavigator';

const STATUS_LABELS: Record<DevisStatus, string> = {
  DRAFT: 'Brouillon', VALIDATED: 'Validé', INVOICED: 'Facturé', CANCELLED: 'Annulé',
};

type Props = {
  route: RouteProp<HistoryStackParamList, 'DevisDetail'>;
};

export function DevisDetailScreen({ route }: Props) {
  const { devisId } = route.params;
  const [devis, setDevis] = useState<Devis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    devisApi.getById(devisId).then(setDevis).catch(console.error).finally(() => setLoading(false));
  }, [devisId]);

  if (loading || !devis) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.reference}>{devis.reference}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[devis.status] + '30' }]}>
          <Text style={[styles.statusText, { color: statusColors[devis.status] }]}>
            {STATUS_LABELS[devis.status]}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Ionicons name="person" size={18} color={colors.text.muted} />
          <Text style={styles.cardLabel}>Client</Text>
        </View>
        <Text style={styles.cardValue}>{devis.client.name}</Text>
        {devis.client.phone && <Text style={styles.cardSubvalue}>{devis.client.phone}</Text>}
      </View>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Ionicons name="calendar" size={18} color={colors.text.muted} />
          <Text style={styles.cardLabel}>Date de création</Text>
        </View>
        <Text style={styles.cardValue}>{new Date(devis.createdAt).toLocaleDateString('fr-FR')}</Text>
      </View>

      {devis.lines.length > 0 && (
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
              <Text style={styles.lineTotal}>{Number(line.lineTotal).toFixed(2)} TND</Text>
            </View>
          ))}
        </View>
      )}

      {devis.services.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services ({devis.services.length})</Text>
          {devis.services.map((service) => (
            <View key={service.id} style={styles.serviceItem}>
              <Text style={styles.serviceName}>{service.service.name}</Text>
              <Text style={styles.servicePrice}>{Number(service.price).toFixed(2)} TND</Text>
            </View>
          ))}
        </View>
      )}

      {devis.notes && (
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Ionicons name="document-text" size={18} color={colors.text.muted} />
            <Text style={styles.cardLabel}>Notes</Text>
          </View>
          <Text style={styles.notesText}>{devis.notes}</Text>
        </View>
      )}

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>{Number(devis.totalAmount).toFixed(2)} TND</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.base },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.base },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  reference: { fontSize: 24, fontWeight: '700', color: colors.text.primary },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  card: { backgroundColor: colors.background.surface, padding: 16, borderRadius: 12, marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardLabel: { fontSize: 12, color: colors.text.muted, textTransform: 'uppercase' },
  cardValue: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  cardSubvalue: { fontSize: 14, color: colors.text.secondary, marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: colors.text.muted, marginBottom: 12, textTransform: 'uppercase' },
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
  notesText: { fontSize: 14, color: colors.text.secondary, lineHeight: 20 },
  totalCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.primary[500] + '15', padding: 20, borderRadius: 16,
    borderWidth: 1, borderColor: colors.primary[500],
  },
  totalLabel: { fontSize: 18, fontWeight: '500', color: colors.text.secondary },
  totalAmount: { fontSize: 28, fontWeight: '700', color: colors.primary[400] },
});
