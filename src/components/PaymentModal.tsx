import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { paymentsApi } from '../services';
import { colors } from '../theme/colors';
import type { Payment, PaymentStats, CreatePaymentInput } from '../types';

interface PaymentModalProps {
  visible: boolean;
  invoiceId: string;
  invoiceReference: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentModal({
  visible,
  invoiceId,
  invoiceReference,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    reference: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Define payment methods for dropdown-like selection
  const PAYMENT_METHODS = ['Espèces', 'Chèque', 'Virement', 'Carte bancaire'];

  const fetchData = useCallback(async () => {
    if (!invoiceId) return;
    try {
      setLoading(true);
      const [paymentsData, statsData] = await Promise.all([
        paymentsApi.getByInvoice(invoiceId),
        paymentsApi.getStats(invoiceId),
      ]);
      setPayments(paymentsData);
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching payment data:', err);
      Alert.alert('Erreur', 'Impossible de charger les données de paiement');
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    if (visible && invoiceId) {
      fetchData();
      setShowAddForm(false);
      setFormData({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: '',
        reference: '',
        notes: '',
      });
    }
  }, [visible, invoiceId, fetchData]);

  const handleSubmit = async () => {
    if (!formData.amount || Number(formData.amount) <= 0) {
      Alert.alert('Erreur', 'Le montant doit être supérieur à 0');
      return;
    }

    setSubmitting(true);
    try {
      await paymentsApi.create(invoiceId, {
        amount: Number(formData.amount),
        paymentDate: formData.paymentDate,
        paymentMethod: formData.paymentMethod || undefined,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
      });

      setFormData({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: '',
        reference: '',
        notes: '',
      });
      setShowAddForm(false);
      await fetchData();
      onSuccess();
      Alert.alert('Succès', 'Paiement ajouté avec succès');
    } catch (err: any) {
      const message = err.message || 'Erreur lors de l\'ajout du paiement';
      Alert.alert('Erreur', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (paymentId: string) => {
    Alert.alert(
      'Confirmation',
      'Êtes-vous sûr de vouloir supprimer ce paiement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await paymentsApi.delete(paymentId);
              await fetchData();
              onSuccess();
            } catch (err) {
              Alert.alert('Erreur', 'Erreur lors de la suppression du paiement');
            }
          },
        },
      ]
    );
  };

  const SummaryCard = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Paiements</Text>
                <Text style={styles.subtitle}>{invoiceReference}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {loading && !stats ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary[500]} />
              </View>
            ) : (
              <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
                {/* Stats */}
                {stats && (
                  <>
                    <View style={styles.statsGrid}>
                      <SummaryCard
                        label="Total"
                        value={`${Number(stats.totalAmount || 0).toFixed(2)} TND`}
                      />
                      <SummaryCard
                        label="Payé"
                        value={`${Number(stats.totalPaid || 0).toFixed(2)} TND`}
                        color="#22c55e"
                      />
                      <SummaryCard
                        label="Reste"
                        value={`${Number(stats.remaining || 0).toFixed(2)} TND`}
                        color="#ef4444"
                      />
                      <SummaryCard
                        label="%"
                        value={`${Number(stats.percentPaid || 0).toFixed(1)}%`}
                      />
                    </View>

                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${Math.min(stats.percentPaid || 0, 100)}%` },
                          ]}
                        />
                      </View>
                    </View>
                  </>
                )}

                {/* Initial Payment List Logic */}
                {!showAddForm && (
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Historique ({payments.length})</Text>
                    {stats && Number(stats.remaining || 0) > 0 && (
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => setShowAddForm(true)}
                      >
                        <Ionicons name="add" size={16} color="#fff" />
                        <Text style={styles.addButtonText}>Ajouter</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Add Form */}
                {showAddForm && (
                  <View style={styles.formCard}>
                    <Text style={styles.formTitle}>Nouveau paiement</Text>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Montant (TND) *</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.amount}
                        onChangeText={(text) => setFormData({ ...formData, amount: text })}
                        keyboardType="numeric"
                        placeholder={`Max: ${stats?.remaining.toFixed(2)}`}
                      />
                    </View>

                    <View style={styles.formRow}>
                      <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>Date (AAAA-MM-JJ)</Text>
                        <TextInput
                          style={styles.input}
                          value={formData.paymentDate}
                          onChangeText={(text) => setFormData({ ...formData, paymentDate: text })}
                          placeholder="YYYY-MM-DD"
                        />
                      </View>
                    </View>

                    <View style={styles.formGroup}>
                       <Text style={styles.label}>Méthode</Text>
                       <View style={styles.methodContainer}>
                         {PAYMENT_METHODS.map((method) => (
                           <TouchableOpacity
                             key={method}
                             style={[
                               styles.methodBadge,
                               formData.paymentMethod === method && styles.methodBadgeSelected
                             ]}
                             onPress={() => setFormData({ ...formData, paymentMethod: method })}
                           >
                             <Text style={[
                               styles.methodText,
                               formData.paymentMethod === method && styles.methodTextSelected
                             ]}>
                               {method}
                             </Text>
                           </TouchableOpacity>
                         ))}
                       </View>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Référence</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.reference}
                        onChangeText={(text) => setFormData({ ...formData, reference: text })}
                        placeholder="N° chèque, virement..."
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Notes</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={formData.notes}
                        onChangeText={(text) => setFormData({ ...formData, notes: text })}
                        placeholder="Notes optionnelles..."
                        multiline
                        numberOfLines={2}
                      />
                    </View>

                    <View style={styles.formActions}>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => setShowAddForm(false)}
                      >
                        <Text style={styles.cancelButtonText}>Annuler</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.submitButton, submitting && styles.disabledButton]}
                        onPress={handleSubmit}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.submitButtonText}>Enregistrer</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Payment List */}
                {!showAddForm && (
                  <View style={styles.paymentsList}>
                    {payments.length === 0 ? (
                      <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>Aucun paiement enregistré</Text>
                      </View>
                    ) : (
                      payments.map((payment) => (
                        <View key={payment.id} style={styles.paymentCard}>
                          <View style={styles.paymentInfo}>
                            <View style={styles.paymentHeader}>
                              <Text style={styles.paymentAmount}>
                                {Number(payment.amount).toFixed(2)} TND
                              </Text>
                              <Text style={styles.paymentDate}>
                                {new Date(payment.paymentDate).toLocaleDateString('fr-FR')}
                              </Text>
                            </View>
                            
                            {payment.paymentMethod && (
                              <View style={styles.detailRow}>
                                <Ionicons name="card-outline" size={14} color={colors.text.muted} />
                                <Text style={styles.detailText}>{payment.paymentMethod}</Text>
                              </View>
                            )}
                            
                            {payment.reference && (
                              <View style={styles.detailRow}>
                                <Ionicons name="document-text-outline" size={14} color={colors.text.muted} />
                                <Text style={styles.detailText}>{payment.reference}</Text>
                              </View>
                            )}
                            
                            {payment.notes && (
                              <Text style={styles.paymentNotes}>{payment.notes}</Text>
                            )}
                          </View>
                          
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDelete(payment.id)}
                          >
                            <Ionicons name="trash-outline" size={20} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: colors.background.base,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '100%',
    width: '100%', 
    maxWidth: 600, 
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.background.elevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[500],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  formCard: {
    backgroundColor: colors.background.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.background.base,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text.primary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  methodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  methodBadgeSelected: {
    backgroundColor: colors.primary[500] + '20',
    borderColor: colors.primary[500],
  },
  methodText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  methodTextSelected: {
    color: colors.primary[500],
    fontWeight: '600',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.background.elevated,
  },
  cancelButtonText: {
    color: colors.text.secondary,
    fontWeight: '600',
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: colors.primary[500],
    minWidth: 120,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  },
  paymentsList: {
    gap: 12,
  },
  paymentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  paymentDate: {
    fontSize: 12,
    color: colors.text.muted,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  detailText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  paymentNotes: {
    fontSize: 12,
    color: colors.text.muted,
    fontStyle: 'italic',
    marginTop: 6,
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: 14,
  },
});
