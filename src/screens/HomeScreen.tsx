import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth.store';
import { devisApi } from '../services';
import { colors, statusColors } from '../theme/colors';
import type { Devis, DevisStatus } from '../types';

const STATUS_LABELS: Record<DevisStatus, string> = {
  DRAFT: 'Brouillon',
  VALIDATED: 'Validé',
  INVOICED: 'Facturé',
  CANCELLED: 'Annulé',
};

export function HomeScreen() {
  const { user, logout } = useAuthStore();
  const [recentDevis, setRecentDevis] = useState<Devis[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const devis = await devisApi.getAll();
      setRecentDevis(devis.slice(0, 5));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour,</Text>
          <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color={colors.text.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[500]} />
        }
      >
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeIcon}>
            <Ionicons name="diamond" size={32} color={colors.primary[500]} />
          </View>
          <Text style={styles.welcomeTitle}>Bienvenue sur GravoPlus</Text>
          <Text style={styles.welcomeText}>
            Créez des devis rapidement et simplement pour vos clients.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Devis récents</Text>
          {recentDevis.length > 0 ? (
            recentDevis.map((devis) => (
              <View key={devis.id} style={styles.devisCard}>
                <View style={styles.devisHeader}>
                  <Text style={styles.devisReference}>{devis.reference}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColors[devis.status] + '30' }]}>
                    <Text style={[styles.statusText, { color: statusColors[devis.status] }]}>
                      {STATUS_LABELS[devis.status]}
                    </Text>
                  </View>
                </View>
                <Text style={styles.devisClient}>{devis.client.name}</Text>
                <View style={styles.devisFooter}>
                  <Text style={styles.devisAmount}>{Number(devis.totalAmount).toFixed(2)} TND</Text>
                  <Text style={styles.devisDate}>
                    {new Date(devis.createdAt).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={colors.text.muted} />
              <Text style={styles.emptyText}>Aucun devis récent</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 14,
    color: colors.text.muted,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  welcomeIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.background.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  devisCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  devisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  devisReference: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  devisClient: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  devisFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  devisAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary[400],
  },
  devisDate: {
    fontSize: 12,
    color: colors.text.muted,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: 12,
  },
});
