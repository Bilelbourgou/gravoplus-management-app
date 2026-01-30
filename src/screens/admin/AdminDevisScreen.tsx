import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { devisApi } from '../../services';
import { colors, statusColors } from '../../theme/colors';
import type { Devis, DevisStatus } from '../../types';

const STATUS_LABELS: Record<DevisStatus, string> = {
  DRAFT: 'Brouillon',
  VALIDATED: 'Validé',
  INVOICED: 'Facturé',
  CANCELLED: 'Annulé',
};

const STATUS_FILTERS: (DevisStatus | 'ALL')[] = ['ALL', 'DRAFT', 'VALIDATED', 'INVOICED', 'CANCELLED'];

export function AdminDevisScreen() {
  const [devisList, setDevisList] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<DevisStatus | 'ALL'>('ALL');
  const [selectedDevis, setSelectedDevis] = useState<Devis | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);

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

  useEffect(() => {
    fetchDevis();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDevis();
    setRefreshing(false);
  };

  const filteredDevis = devisList.filter(
    (d) => statusFilter === 'ALL' || d.status === statusFilter
  );

  const openActionModal = (devis: Devis) => {
    setSelectedDevis(devis);
    setActionModalVisible(true);
  };

  const handleValidate = async () => {
    if (!selectedDevis) return;
    try {
      await devisApi.validate(selectedDevis.id);
      setActionModalVisible(false);
      fetchDevis();
      Alert.alert('Succès', 'Devis validé avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de valider le devis');
    }
  };

  const handleCancel = async () => {
    if (!selectedDevis) return;
    Alert.alert(
      'Annuler le devis',
      'Voulez-vous vraiment annuler ce devis ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              await devisApi.cancel(selectedDevis.id);
              setActionModalVisible(false);
              fetchDevis();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible d\'annuler le devis');
            }
          },
        },
      ]
    );
  };

  const handleDelete = async () => {
    if (!selectedDevis) return;
    Alert.alert(
      'Supprimer le devis',
      'Cette action est irréversible. Continuer ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await devisApi.delete(selectedDevis.id);
              setActionModalVisible(false);
              fetchDevis();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le devis');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Devis }) => (
    <TouchableOpacity style={styles.devisCard} onPress={() => openActionModal(item)}>
      <View style={styles.devisHeader}>
        <Text style={styles.devisReference}>{item.reference}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + '20' }]}>
          <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>
      <Text style={styles.clientName}>{item.client?.name || 'Client inconnu'}</Text>
      <View style={styles.devisFooter}>
        <Text style={styles.amount}>{Number(item.totalAmount || 0).toFixed(2)} TND</Text>
        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleDateString('fr-FR')}
        </Text>
      </View>
      {item.lines && item.lines.length > 0 && (
        <Text style={styles.linesCount}>{item.lines.length} ligne(s)</Text>
      )}
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Devis</Text>
        <Text style={styles.subtitle}>{filteredDevis.length} devis</Text>
      </View>

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, statusFilter === item && styles.filterChipActive]}
              onPress={() => setStatusFilter(item)}
            >
              <Text style={[styles.filterText, statusFilter === item && styles.filterTextActive]}>
                {item === 'ALL' ? 'Tous' : STATUS_LABELS[item]}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filteredDevis}
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

      {/* Action Modal */}
      <Modal visible={actionModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.actionModal}>
            <View style={styles.actionModalHeader}>
              <Text style={styles.actionModalTitle}>{selectedDevis?.reference}</Text>
              <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.actionModalInfo}>
              <Text style={styles.actionModalClient}>{selectedDevis?.client?.name}</Text>
              <Text style={styles.actionModalAmount}>
                {Number(selectedDevis?.totalAmount || 0).toFixed(2)} TND
              </Text>
            </View>

            <View style={styles.actionButtons}>
              {selectedDevis?.status === 'DRAFT' && (
                <TouchableOpacity style={[styles.actionBtn, styles.validateBtn]} onPress={handleValidate}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Valider</Text>
                </TouchableOpacity>
              )}

              {(selectedDevis?.status === 'DRAFT' || selectedDevis?.status === 'VALIDATED') && (
                <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={handleCancel}>
                  <Ionicons name="close-circle" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Annuler</Text>
                </TouchableOpacity>
              )}

              {selectedDevis?.status !== 'INVOICED' && (
                <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={handleDelete}>
                  <Ionicons name="trash" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Supprimer</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setActionModalVisible(false)}
            >
              <Text style={styles.closeModalBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.base },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.base },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text.primary },
  subtitle: { fontSize: 14, color: colors.text.muted, marginTop: 4 },
  filterContainer: { marginBottom: 12 },
  filterList: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.background.elevated, marginRight: 8,
    borderWidth: 1, borderColor: colors.border.default,
  },
  filterChipActive: { backgroundColor: colors.primary[500], borderColor: colors.primary[500] },
  filterText: { fontSize: 14, fontWeight: '500', color: colors.text.secondary },
  filterTextActive: { color: '#fff' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  devisCard: {
    backgroundColor: colors.background.surface, padding: 16, borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  devisHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  devisReference: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  clientName: { fontSize: 14, color: colors.text.secondary, marginBottom: 12 },
  devisFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: 18, fontWeight: '700', color: colors.primary[400] },
  date: { fontSize: 12, color: colors.text.muted },
  linesCount: { fontSize: 12, color: colors.text.muted, marginTop: 8 },
  emptyState: { alignItems: 'center', paddingTop: 64 },
  emptyText: { fontSize: 16, color: colors.text.muted, marginTop: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  actionModal: { backgroundColor: colors.background.base, borderRadius: 16, padding: 24, width: '85%' },
  actionModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  actionModalTitle: { fontSize: 20, fontWeight: '600', color: colors.text.primary },
  actionModalInfo: { marginBottom: 24 },
  actionModalClient: { fontSize: 16, color: colors.text.secondary },
  actionModalAmount: { fontSize: 24, fontWeight: '700', color: colors.primary[400], marginTop: 8 },
  actionButtons: { gap: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, gap: 8 },
  actionBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  validateBtn: { backgroundColor: '#22c55e' },
  cancelBtn: { backgroundColor: '#f97316' },
  deleteBtn: { backgroundColor: colors.error[500] },
  closeModalBtn: { marginTop: 16, padding: 14, borderRadius: 10, backgroundColor: colors.background.elevated, alignItems: 'center' },
  closeModalBtnText: { fontSize: 16, fontWeight: '600', color: colors.text.secondary },
});
