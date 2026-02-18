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

  const dailyCards = [
    {
      label: "Devis aujourd'hui",
      value: stats.todaysDevisTotal || 0,
      icon: 'document-text' as const,
      color: '#3b82f6',
      bg: '#3b82f6',
    },
    {
      label: "Factures aujourd'hui",
      value: stats.todaysInvoicesTotal || 0,
      icon: 'receipt' as const,
      color: '#8b5cf6',
      bg: '#8b5cf6',
    },
    {
      label: "Paiements aujourd'hui",
      value: stats.todaysPaymentsTotal || 0,
      icon: 'cash' as const,
      color: '#22c55e',
      bg: '#22c55e',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Tableau de bord</Text>
        <Text style={styles.subtitle}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[500]} />
        }
      >
        {/* Daily Statistics */}
        <Text style={styles.sectionLabel}>STATISTIQUES DU JOUR</Text>
        <View style={styles.dailyCards}>
          {dailyCards.map((card, index) => (
            <View key={index} style={styles.dailyCard}>
              <View style={[styles.dailyCardIconContainer, { backgroundColor: card.bg + '18' }]}>
                <Ionicons name={card.icon} size={24} color={card.color} />
              </View>
              <View style={styles.dailyCardContent}>
                <Text style={styles.dailyCardLabel}>{card.label}</Text>
                <View style={styles.dailyCardValueRow}>
                  <Text style={[styles.dailyCardValue, { color: card.color }]}>
                    {card.value.toFixed(2)}
                  </Text>
                  <Text style={[styles.dailyCardCurrency, { color: card.color }]}>TND</Text>
                </View>
              </View>
              <View style={[styles.dailyCardAccent, { backgroundColor: card.color }]} />
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionLabel}>ACCÈS RAPIDE</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('AdminDevis')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#f9731620' }]}>
              <Ionicons name="document-text" size={22} color="#f97316" />
            </View>
            <Text style={styles.quickActionText}>Devis</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('AdminInvoices')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#22c55e20' }]}>
              <Ionicons name="receipt" size={22} color="#22c55e" />
            </View>
            <Text style={styles.quickActionText}>Factures</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('AdminClients')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#3b82f620' }]}>
              <Ionicons name="people" size={22} color="#3b82f6" />
            </View>
            <Text style={styles.quickActionText}>Clients</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('AdminEmployees')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#8b5cf620' }]}>
              <Ionicons name="person" size={22} color="#8b5cf6" />
            </View>
            <Text style={styles.quickActionText}>Employés</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('AdminExpenses')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#ef444420' }]}>
              <Ionicons name="wallet" size={22} color="#ef4444" />
            </View>
            <Text style={styles.quickActionText}>Dépenses</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('AdminFinance')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#10b98120' }]}>
              <Ionicons name="cash" size={22} color="#10b981" />
            </View>
            <Text style={styles.quickActionText}>Caisse</Text>
          </TouchableOpacity>
        </View>

        {/* Unpaid Clients Warning */}
        {stats.unpaidClients && stats.unpaidClients.length > 0 && (
          <View style={styles.section}>
            <View style={styles.unpaidHeader}>
              <Ionicons name="warning" size={20} color="#f59e0b" />
              <Text style={styles.unpaidTitle}>Clients avec solde impayé ({stats.unpaidClients.length})</Text>
            </View>
            {stats.unpaidClients.map((c) => (
              <TouchableOpacity
                key={c.clientId}
                style={styles.unpaidCard}
                onPress={() => navigation.navigate('AdminClients', { openBalanceClientId: c.clientId })}
              >
                <Text style={styles.unpaidClientName}>{c.clientName}</Text>
                <View style={styles.unpaidRow}>
                  <Text style={styles.unpaidLabel}>Total: <Text style={{ fontWeight: '600' }}>{c.totalAmount.toFixed(3)} TND</Text></Text>
                  <Text style={styles.unpaidLabel}>Payé: <Text style={{ fontWeight: '600', color: '#22c55e' }}>{c.totalPaid.toFixed(3)}</Text></Text>
                </View>
                <View style={styles.unpaidRemaining}>
                  <Text style={styles.unpaidRemainingText}>Reste: {c.remaining.toFixed(3)} TND</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

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
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.muted,
    letterSpacing: 1.2,
    marginBottom: 12,
    marginTop: 8,
  },
  dailyCards: {
    gap: 12,
    marginBottom: 28,
  },
  dailyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
  },
  dailyCardIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dailyCardContent: {
    flex: 1,
  },
  dailyCardLabel: {
    fontSize: 13,
    color: colors.text.muted,
    fontWeight: '500',
    marginBottom: 4,
  },
  dailyCardValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  dailyCardValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  dailyCardCurrency: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
  },
  dailyCardAccent: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  quickAction: {
    width: '31%',
    backgroundColor: colors.background.surface,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  quickActionIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
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
  unpaidHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  unpaidTitle: { fontSize: 16, fontWeight: '600', color: '#f59e0b' },
  unpaidCard: {
    backgroundColor: colors.background.surface, padding: 14, borderRadius: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#f59e0b40', borderLeftWidth: 3, borderLeftColor: '#f59e0b',
  },
  unpaidClientName: { fontSize: 15, fontWeight: '600', color: colors.text.primary, marginBottom: 6 },
  unpaidRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  unpaidLabel: { fontSize: 13, color: colors.text.muted },
  unpaidRemaining: { backgroundColor: '#ef444415', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, alignSelf: 'flex-start' },
  unpaidRemainingText: { fontSize: 13, fontWeight: '700', color: '#ef4444' },
});
