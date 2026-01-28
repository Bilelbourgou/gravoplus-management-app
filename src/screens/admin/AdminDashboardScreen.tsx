import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { dashboardApi } from '../../services';
import { colors, statusColors } from '../../theme/colors';
import type { DashboardStats, DevisStatus } from '../../types';
import type { AdminStackParamList } from '../../navigation/MainNavigator';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList, 'AdminDashboard'>;

const STATUS_LABELS: Record<DevisStatus, string> = {
  DRAFT: 'Brouillon',
  VALIDATED: 'Validé',
  INVOICED: 'Facturé',
  CANCELLED: 'Annulé',
};

export function AdminDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={colors.error[500]} />
        <Text style={styles.errorText}>Erreur de chargement</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Tableau de bord</Text>
        <Text style={styles.subtitle}>Vue d'ensemble</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[500]} />
        }
      >
        {/* Financial Stats */}
        <View style={styles.financialRow}>
          <View style={[styles.financialCard, styles.revenueCard]}>
            <Ionicons name="trending-up" size={24} color="#22c55e" />
            <Text style={styles.financialValue}>{stats.totalRevenue.toFixed(0)}</Text>
            <Text style={styles.financialLabel}>Revenus TND</Text>
          </View>
          <View style={[styles.financialCard, styles.expenseCard]}>
            <Ionicons name="trending-down" size={24} color="#ef4444" />
            <Text style={styles.financialValue}>{stats.totalExpenses.toFixed(0)}</Text>
            <Text style={styles.financialLabel}>Dépenses TND</Text>
          </View>
        </View>

        <View style={[styles.profitCard, stats.netProfit >= 0 ? styles.profitPositive : styles.profitNegative]}>
          <Ionicons name="wallet" size={28} color={stats.netProfit >= 0 ? '#22c55e' : '#ef4444'} />
          <View style={styles.profitInfo}>
            <Text style={styles.profitLabel}>Bénéfice net</Text>
            <Text style={[styles.profitValue, { color: stats.netProfit >= 0 ? '#22c55e' : '#ef4444' }]}>
              {stats.netProfit.toFixed(2)} TND
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('AdminClients')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#3b82f620' }]}>
              <Ionicons name="people" size={24} color="#3b82f6" />
            </View>
            <Text style={styles.quickActionText}>Clients</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('AdminEmployees')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#8b5cf620' }]}>
              <Ionicons name="person" size={24} color="#8b5cf6" />
            </View>
            <Text style={styles.quickActionText}>Employés</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('AdminSettings')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#f9731620' }]}>
              <Ionicons name="settings" size={24} color="#f97316" />
            </View>
            <Text style={styles.quickActionText}>Paramètres</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#3b82f620' }]}>
              <Ionicons name="people" size={22} color="#3b82f6" />
            </View>
            <Text style={styles.statValue}>{stats.totalClients}</Text>
            <Text style={styles.statLabel}>Clients</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#8b5cf620' }]}>
              <Ionicons name="person" size={22} color="#8b5cf6" />
            </View>
            <Text style={styles.statValue}>{stats.totalEmployees}</Text>
            <Text style={styles.statLabel}>Employés</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#f9731620' }]}>
              <Ionicons name="document-text" size={22} color="#f97316" />
            </View>
            <Text style={styles.statValue}>{stats.totalDevis}</Text>
            <Text style={styles.statLabel}>Devis</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#22c55e20' }]}>
              <Ionicons name="receipt" size={22} color="#22c55e" />
            </View>
            <Text style={styles.statValue}>{stats.totalInvoices}</Text>
            <Text style={styles.statLabel}>Factures</Text>
          </View>
        </View>

        {/* Devis Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statut des devis</Text>
          <View style={styles.statusGrid}>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <View key={key} style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: statusColors[key as DevisStatus] }]} />
                <Text style={styles.statusLabel}>{label}</Text>
                <Text style={styles.statusValue}>
                  {stats.devisByStatus[key.toLowerCase() as keyof typeof stats.devisByStatus]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Devis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Devis récents</Text>
          {stats.recentDevis.length > 0 ? (
            stats.recentDevis.map((devis) => (
              <View key={devis.id} style={styles.devisCard}>
                <View style={styles.devisHeader}>
                  <Text style={styles.devisReference}>{devis.reference}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColors[devis.status] + '30' }]}>
                    <Text style={[styles.statusBadgeText, { color: statusColors[devis.status] }]}>
                      {STATUS_LABELS[devis.status]}
                    </Text>
                  </View>
                </View>
                <Text style={styles.devisClient}>{devis.clientName}</Text>
                <View style={styles.devisFooter}>
                  <Text style={styles.devisAmount}>{devis.totalAmount.toFixed(2)} TND</Text>
                  <Text style={styles.devisDate}>
                    {new Date(devis.createdAt).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Aucun devis récent</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.base },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.base },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.base },
  errorText: { color: colors.text.muted, marginTop: 12, fontSize: 16 },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text.primary },
  subtitle: { fontSize: 14, color: colors.text.muted, marginTop: 4 },
  content: { flex: 1, paddingHorizontal: 20 },
  financialRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  financialCard: {
    flex: 1, padding: 16, borderRadius: 16, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  revenueCard: { backgroundColor: '#22c55e10' },
  expenseCard: { backgroundColor: '#ef444410' },
  financialValue: { fontSize: 24, fontWeight: '700', color: colors.text.primary, marginTop: 8 },
  financialLabel: { fontSize: 12, color: colors.text.muted, marginTop: 4 },
  profitCard: {
    flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 16,
    marginBottom: 20, gap: 16, borderWidth: 1, borderColor: colors.border.subtle,
  },
  profitPositive: { backgroundColor: '#22c55e10' },
  profitNegative: { backgroundColor: '#ef444410' },
  profitInfo: { flex: 1 },
  profitLabel: { fontSize: 14, color: colors.text.muted },
  profitValue: { fontSize: 28, fontWeight: '700', marginTop: 4 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 12 },
  quickAction: {
    flex: 1, backgroundColor: colors.background.surface, padding: 16, borderRadius: 12,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border.subtle,
  },
  quickActionIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickActionText: { fontSize: 13, fontWeight: '500', color: colors.text.secondary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    width: '47%', backgroundColor: colors.background.surface, padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  statIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.text.primary },
  statLabel: { fontSize: 12, color: colors.text.muted, marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text.primary, marginBottom: 16 },
  statusGrid: { backgroundColor: colors.background.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border.subtle },
  statusItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  statusLabel: { flex: 1, fontSize: 14, color: colors.text.secondary },
  statusValue: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  devisCard: {
    backgroundColor: colors.background.surface, padding: 16, borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  devisHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  devisReference: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 12, fontWeight: '500' },
  devisClient: { fontSize: 14, color: colors.text.secondary, marginBottom: 12 },
  devisFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  devisAmount: { fontSize: 16, fontWeight: '700', color: colors.primary[400] },
  devisDate: { fontSize: 12, color: colors.text.muted },
  emptyState: { alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 14, color: colors.text.muted },
});
