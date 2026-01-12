import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { devisApi } from '../services';
import { colors, statusColors } from '../theme/colors';
import type { Devis, DevisStatus } from '../types';
import type { HistoryStackParamList } from '../navigation/MainNavigator';

const STATUS_LABELS: Record<DevisStatus, string> = {
  DRAFT: 'Brouillon', VALIDATED: 'Validé', INVOICED: 'Facturé', CANCELLED: 'Annulé',
};

type Props = {
  navigation: NativeStackNavigationProp<HistoryStackParamList, 'HistoryList'>;
};

export function HistoryScreen({ navigation }: Props) {
  const [devisList, setDevisList] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDevis = async () => {
    try {
      const data = await devisApi.getAll();
      setDevisList(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDevis(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDevis();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: Devis }) => (
    <TouchableOpacity
      style={styles.devisCard}
      onPress={() => navigation.navigate('DevisDetail', { devisId: item.id })}
    >
      <View style={styles.devisHeader}>
        <Text style={styles.devisReference}>{item.reference}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + '30' }]}>
          <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>
      <Text style={styles.clientName}>{item.client.name}</Text>
      <View style={styles.devisFooter}>
        <Text style={styles.amount}>{Number(item.totalAmount).toFixed(2)} TND</Text>
        <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('fr-FR')}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={devisList}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[500]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={colors.text.muted} />
            <Text style={styles.emptyText}>Aucun devis</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.base },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.base },
  listContent: { padding: 16 },
  devisCard: {
    backgroundColor: colors.background.surface, padding: 16, borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  devisHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  devisReference: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '500' },
  clientName: { fontSize: 14, color: colors.text.secondary, marginBottom: 12 },
  devisFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: 16, fontWeight: '700', color: colors.primary[400] },
  date: { fontSize: 12, color: colors.text.muted },
  emptyState: { alignItems: 'center', paddingTop: 64 },
  emptyText: { fontSize: 16, color: colors.text.muted, marginTop: 16 },
});
