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
import { PaymentModal } from '../../components/PaymentModal';
import { invoicesApi, devisApi } from '../../services';
import { colors } from '../../theme/colors';
import type { InvoiceFull, Devis } from '../../types';

type InvoiceStatus = 'PENDING' | 'PARTIAL' | 'PAID';

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  PENDING: 'En attente',
  PARTIAL: 'Partiel',
  PAID: 'Payé',
};

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  PENDING: '#f97316',
  PARTIAL: '#3b82f6',
  PAID: '#22c55e',
};

export function AdminInvoicesScreen() {
  const [invoices, setInvoices] = useState<InvoiceFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [validatedDevis, setValidatedDevis] = useState<Devis[]>([]);
  const [selectedDevisIds, setSelectedDevisIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<InvoiceFull | null>(null);

  const fetchInvoices = async () => {
    try {
      const data = await invoicesApi.getAll();
      setInvoices(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchValidatedDevis = async () => {
    try {
      const allDevis = await devisApi.getAll();
      setValidatedDevis(allDevis.filter((d) => d.status === 'VALIDATED'));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInvoices();
    setRefreshing(false);
  };

  const openCreateModal = async () => {
    await fetchValidatedDevis();
    setSelectedDevisIds([]);
    setCreateModalVisible(true);
  };

  const toggleDevisSelection = (devisId: string) => {
    if (selectedDevisIds.includes(devisId)) {
      setSelectedDevisIds(selectedDevisIds.filter((id) => id !== devisId));
    } else {
      setSelectedDevisIds([...selectedDevisIds, devisId]);
    }
  };

  const handleCreateInvoice = async () => {
    if (selectedDevisIds.length === 0) {
      Alert.alert('Erreur', 'Sélectionnez au moins un devis');
      return;
    }

    setCreating(true);
    try {
      await invoicesApi.createFromDevis(selectedDevisIds);
      setCreateModalVisible(false);
      fetchInvoices();
      Alert.alert('Succès', 'Facture créée avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer la facture');
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status: string): string => {
    return STATUS_COLORS[status as InvoiceStatus] || colors.text.muted;
  };

  const renderItem = ({ item }: { item: InvoiceFull }) => {
    const status = item.status as InvoiceStatus;
    const paidPercentage = item.totalAmount > 0
      ? Math.round((Number(item.paidAmount || 0) / Number(item.totalAmount)) * 100)
      : 0;

    return (
      <View style={styles.invoiceCard}>
        <View style={styles.invoiceHeader}>
          <Text style={styles.invoiceReference}>{item.reference}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
              {STATUS_LABELS[status] || status}
            </Text>
          </View>
        </View>

        <Text style={styles.clientName}>{item.client?.name || 'Client inconnu'}</Text>

        <View style={styles.amountRow}>
          <View>
            <Text style={styles.amountLabel}>Total</Text>
            <Text style={styles.amountValue}>{Number(item.totalAmount || 0).toFixed(2)} TND</Text>
          </View>
          <View style={styles.amountDivider} />
          <View>
            <Text style={styles.amountLabel}>Payé</Text>
            <Text style={[styles.amountValue, { color: '#22c55e' }]}>
              {Number(item.paidAmount || 0).toFixed(2)} TND
            </Text>
          </View>
          <View style={styles.amountDivider} />
          <View>
            <Text style={styles.amountLabel}>Reste</Text>
            <Text style={[styles.amountValue, { color: '#ef4444' }]}>
              {(Number(item.totalAmount || 0) - Number(item.paidAmount || 0)).toFixed(2)} TND
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${paidPercentage}%` }]} />
          </View>
          <Text style={styles.progressText}>{paidPercentage}%</Text>
        </View>

        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleDateString('fr-FR')}
        </Text>

        <TouchableOpacity 
          style={styles.paymentButton}
          onPress={() => setSelectedInvoiceForPayment(item)}
        >
          <Ionicons name="card-outline" size={16} color="#fff" />
          <Text style={styles.paymentButtonText}>Gérer les paiements</Text>
        </TouchableOpacity>
      </View>
    );
  };

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
        <View>
          <Text style={styles.title}>Factures</Text>
          <Text style={styles.subtitle}>{invoices.length} facture(s)</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={invoices}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[500]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color={colors.text.muted} />
            <Text style={styles.emptyText}>Aucune facture</Text>
          </View>
        }
      />

      {selectedInvoiceForPayment && (
        <PaymentModal
          visible={!!selectedInvoiceForPayment}
          invoiceId={selectedInvoiceForPayment.id}
          invoiceReference={selectedInvoiceForPayment.reference}
          onClose={() => setSelectedInvoiceForPayment(null)}
          onSuccess={() => {
            fetchInvoices();
          }}
        />
      )}

      {/* Create Invoice Modal */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.createModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Créer une facture</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Sélectionnez les devis validés à facturer
            </Text>

            <FlatList
              data={validatedDevis}
              keyExtractor={(item) => item.id}
              style={styles.devisList}
              ListEmptyComponent={
                <View style={styles.emptyDevis}>
                  <Text style={styles.emptyDevisText}>Aucun devis validé disponible</Text>
                </View>
              }
              renderItem={({ item }) => {
                const isSelected = selectedDevisIds.includes(item.id);
                return (
                  <TouchableOpacity
                    style={[styles.devisItem, isSelected && styles.devisItemSelected]}
                    onPress={() => toggleDevisSelection(item.id)}
                  >
                    <View style={styles.devisItemInfo}>
                      <Text style={styles.devisItemRef}>{item.reference}</Text>
                      <Text style={styles.devisItemClient}>{item.client?.name}</Text>
                      <Text style={styles.devisItemAmount}>
                        {Number(item.totalAmount || 0).toFixed(2)} TND
                      </Text>
                    </View>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />

            {selectedDevisIds.length > 0 && (
              <View style={styles.selectedSummary}>
                <Text style={styles.selectedCount}>
                  {selectedDevisIds.length} devis sélectionné(s)
                </Text>
                <Text style={styles.selectedTotal}>
                  Total:{' '}
                  {validatedDevis
                    .filter((d) => selectedDevisIds.includes(d.id))
                    .reduce((sum, d) => sum + Number(d.totalAmount || 0), 0)
                    .toFixed(2)}{' '}
                  TND
                </Text>
              </View>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createButton, creating && styles.buttonDisabled]}
                onPress={handleCreateInvoice}
                disabled={creating || selectedDevisIds.length === 0}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.createButtonText}>Créer la facture</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.base },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.base },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    width: '100%', maxWidth: 600, alignSelf: 'center',
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.text.primary },
  subtitle: { fontSize: 14, color: colors.text.muted, marginTop: 4 },
  addButton: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary[500],
    justifyContent: 'center', alignItems: 'center',
  },
  list: { width: '100%', maxWidth: 600, alignSelf: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  invoiceCard: {
    backgroundColor: colors.background.surface, padding: 16, borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  invoiceReference: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  clientName: { fontSize: 14, color: colors.text.secondary, marginBottom: 16 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  amountLabel: { fontSize: 11, color: colors.text.muted, marginBottom: 4 },
  amountValue: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  amountDivider: { width: 1, backgroundColor: colors.border.subtle },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  progressBar: { flex: 1, height: 6, backgroundColor: colors.background.elevated, borderRadius: 3 },
  progressFill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 3 },
  progressText: { fontSize: 12, fontWeight: '600', color: colors.text.muted, width: 40 },
  date: { fontSize: 12, color: colors.text.muted },
  emptyState: { alignItems: 'center', paddingTop: 64 },
  emptyText: { fontSize: 16, color: colors.text.muted, marginTop: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  createModal: {
    backgroundColor: colors.background.base, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%',
    width: '100%', maxWidth: 600, alignSelf: 'center', position: 'absolute', bottom: 0,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
  },
  modalTitle: { fontSize: 20, fontWeight: '600', color: colors.text.primary },
  modalSubtitle: { fontSize: 14, color: colors.text.muted, paddingHorizontal: 20, paddingTop: 16 },
  devisList: { maxHeight: 300, paddingHorizontal: 20, paddingTop: 12 },
  emptyDevis: { padding: 32, alignItems: 'center' },
  emptyDevisText: { fontSize: 14, color: colors.text.muted },
  devisItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.background.elevated, padding: 14, borderRadius: 10, marginBottom: 10,
    borderWidth: 2, borderColor: 'transparent',
  },
  devisItemSelected: { borderColor: colors.primary[500], backgroundColor: colors.primary[500] + '10' },
  devisItemInfo: { flex: 1 },
  devisItemRef: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  devisItemClient: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  devisItemAmount: { fontSize: 14, fontWeight: '600', color: colors.primary[400], marginTop: 4 },
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border.default,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxSelected: { backgroundColor: colors.primary[500], borderColor: colors.primary[500] },
  selectedSummary: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.primary[500] + '10',
  },
  selectedCount: { fontSize: 14, fontWeight: '500', color: colors.text.secondary },
  selectedTotal: { fontSize: 16, fontWeight: '700', color: colors.primary[500] },
  modalFooter: {
    flexDirection: 'row', padding: 20, gap: 12,
    borderTopWidth: 1, borderTopColor: colors.border.subtle,
  },
  cancelButton: {
    flex: 1, padding: 16, borderRadius: 12, backgroundColor: colors.background.elevated,
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: colors.text.secondary },
  createButton: {
    flex: 2, padding: 16, borderRadius: 12, backgroundColor: colors.primary[500],
    alignItems: 'center',
  },
  createButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  buttonDisabled: { opacity: 0.7 },
  paymentButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[500],
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  paymentButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
