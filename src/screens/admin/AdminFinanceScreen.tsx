import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, machineColors } from '../../theme/colors';
import { financialApi } from '../../services';
import type { FinancialStats } from '../../types';

const { width } = Dimensions.get('window');

// Format currency
const formatCurrency = (amount: number) => {
  return `${amount.toFixed(3)} TND`;
};

// Format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function AdminFinanceScreen({ navigation }: any) {
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'employees'>('overview');

  const fetchStats = async () => {
    try {
      const data = await financialApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching financial stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Chargement des finances...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Caisse & Finances</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons 
            name="trending-up" 
            size={18} 
            color={activeTab === 'overview' ? colors.primary[500] : colors.text.muted} 
          />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Vue d'ensemble
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'employees' && styles.activeTab]}
          onPress={() => setActiveTab('employees')}
        >
          <Ionicons 
            name="people" 
            size={18} 
            color={activeTab === 'employees' ? colors.primary[500] : colors.text.muted} 
          />
          <Text style={[styles.tabText, activeTab === 'employees' && styles.activeTabText]}>
            Par Employé
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'overview' ? (
          <>
            {/* Period Info */}
            <View style={styles.periodCard}>
              <Text style={styles.periodTitle}>Session en cours</Text>
              <Text style={styles.periodSubtitle}>
                {stats?.scope === 'ADMIN_LEVEL' ? 'Caisse Admin' : 'Caisse Employés'}
              </Text>
              <Text style={styles.periodDate}>
                Ouverture: {stats?.periodStart ? formatDate(stats.periodStart) : 'Première Session'}
              </Text>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { borderLeftColor: colors.success[500] }]}>
                <View style={[styles.iconContainer, { backgroundColor: '#dcfce7' }]}>
                  <Ionicons name="arrow-up" size={20} color={colors.success[600]} />
                </View>
                <Text style={styles.statLabel}>Recettes</Text>
                <Text style={[styles.statValue, { color: colors.success[600] }]}>
                  {formatCurrency(stats?.totalIncome || 0)}
                </Text>
              </View>

              <View style={[styles.statCard, { borderLeftColor: colors.error[500] }]}>
                <View style={[styles.iconContainer, { backgroundColor: '#fee2e2' }]}>
                  <Ionicons name="arrow-down" size={20} color={colors.error[600]} />
                </View>
                <Text style={styles.statLabel}>Dépenses</Text>
                <Text style={[styles.statValue, { color: colors.error[600] }]}>
                  {formatCurrency(stats?.totalExpense || 0)}
                </Text>
              </View>

              <View style={[styles.statCard, { borderLeftColor: (stats?.balance || 0) >= 0 ? colors.primary[500] : colors.error[500], width: '100%' }]}>
                <View style={[styles.iconContainer, { backgroundColor: (stats?.balance || 0) >= 0 ? '#dbeafe' : '#fee2e2' }]}>
                  <Ionicons name="wallet" size={20} color={(stats?.balance || 0) >= 0 ? colors.primary[600] : colors.error[600]} />
                </View>
                <Text style={styles.statLabel}>Solde Caisse</Text>
                <Text style={[
                  styles.statValue, 
                  { color: (stats?.balance || 0) >= 0 ? colors.primary[600] : colors.error[600] }
                ]}>
                  {formatCurrency(stats?.balance || 0)}
                </Text>
              </View>
            </View>
          </>
        ) : (
          /* Employees Tab */
          <View style={styles.listContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>Employé</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Nbr</Text>
              <Text style={[styles.tableHeaderText, { flex: 2, textAlign: 'right' }]}>Total</Text>
            </View>
            
            {stats?.revenueByEmployee && stats.revenueByEmployee.length > 0 ? (
              stats.revenueByEmployee.map((item, index) => (
                <View key={item.employeeId} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, { flex: 2, fontWeight: '500' }]}>
                    {item.employeeName}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>
                    {item.paymentCount}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 2, textAlign: 'right', color: colors.success[600], fontWeight: '600' }]}>
                    {formatCurrency(item.totalAmount)}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={colors.text.muted} />
                <Text style={styles.emptyStateText}>Aucune recette par employé</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.base,
  },
  loadingText: {
    marginTop: 12,
    color: colors.text.muted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: colors.background.surface,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: colors.background.base,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  activeTab: {
    backgroundColor: colors.background.elevated,
    borderColor: colors.primary[500],
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.muted,
  },
  activeTabText: {
    color: colors.primary[500],
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  periodCard: {
    backgroundColor: colors.background.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    marginBottom: 20,
  },
  periodTitle: {
    fontSize: 14,
    color: colors.text.muted,
    marginBottom: 4,
  },
  periodSubtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary[500],
    marginBottom: 8,
  },
  periodDate: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    width: (width - 44) / 2, // 2 columns with padding/gap
    backgroundColor: colors.background.surface,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  listContainer: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: colors.background.elevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: colors.background.base,
  },
  tableCell: {
    fontSize: 14,
    color: colors.text.primary,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    marginTop: 12,
    color: colors.text.muted,
    fontSize: 14,
  },
});
