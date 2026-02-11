import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { clientsApi, invoicesApi, financialApi } from '../../services';
import { colors } from '../../theme/colors';
import type { Client, CreateClientInput, ClientBalanceData, ClientBalanceDevis, CreateCaissePaymentData } from '../../types';

export function AdminClientsScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
  const [balanceData, setBalanceData] = useState<ClientBalanceData | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [selectedClientForInvoice, setSelectedClientForInvoice] = useState<Client | null>(null);

  // Devis-based payment state
  const [expandedDevisId, setExpandedDevisId] = useState<string | null>(null);
  const [paymentDevis, setPaymentDevis] = useState<ClientBalanceDevis | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Espèces');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Invoice from devis state
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  const [formData, setFormData] = useState<CreateClientInput>({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  const fetchClients = async () => {
    try {
      const data = await clientsApi.getAll();
      setClients(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchClients();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClients();
    setRefreshing(false);
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        phone: client.phone || '',
        email: client.email || '',
        address: client.address || '',
        notes: client.notes || '',
      });
    } else {
      setEditingClient(null);
      setFormData({ name: '', phone: '', email: '', address: '', notes: '' });
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire');
      return;
    }

    setSaving(true);
    try {
      if (editingClient) {
        await clientsApi.update(editingClient.id, formData);
      } else {
        await clientsApi.create(formData);
      }
      setModalVisible(false);
      fetchClients();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder le client');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (client: Client) => {
    Alert.alert(
      'Supprimer le client',
      `Voulez-vous vraiment supprimer "${client.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await clientsApi.delete(client.id);
              fetchClients();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le client');
            }
          },
        },
      ]
    );
  };

  const openBalanceModal = async (client: Client) => {
    setSelectedClientForInvoice(client);
    setLoadingBalance(true);
    setBalanceModalVisible(true);
    try {
      const data = await clientsApi.getBalance(client.id);
      setBalanceData(data);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger le solde');
      setBalanceModalVisible(false);
    } finally {
      setLoadingBalance(false);
    }
  };

  const resetPaymentForm = () => {
    setPaymentDevis(null);
    setPaymentAmount('');
    setPaymentMethod('Espèces');
    setPaymentReference('');
    setPaymentNotes('');
  };

  const handleAddPayment = async () => {
    if (!paymentDevis) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Erreur', 'Montant invalide');
      return;
    }
    if (amount > paymentDevis.remaining) {
      Alert.alert('Erreur', `Le montant dépasse le reste à payer (${paymentDevis.remaining.toFixed(3)} TND)`);
      return;
    }
    setPaymentLoading(true);
    try {
      await financialApi.createCaissePayment({
        amount,
        devisId: paymentDevis.id,
        paymentMethod,
        reference: paymentReference || undefined,
        notes: paymentNotes || undefined,
        description: `Paiement pour devis ${paymentDevis.reference}`,
      });
      resetPaymentForm();
      Alert.alert('Succès', 'Paiement enregistré');
      if (selectedClientForInvoice) {
        const data = await clientsApi.getBalance(selectedClientForInvoice.id);
        setBalanceData(data);
      }
    } catch (error: any) {
      Alert.alert('Erreur', error?.response?.data?.message || 'Impossible d\'enregistrer le paiement');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleInvoiceDevis = async (devisId: string) => {
    Alert.alert('Facturer', 'Créer une facture pour ce devis ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Facturer',
        onPress: async () => {
          setCreatingInvoice(true);
          try {
            await invoicesApi.createFromDevis([devisId]);
            Alert.alert('Succès', 'Facture créée avec succès');
            if (selectedClientForInvoice) {
              const data = await clientsApi.getBalance(selectedClientForInvoice.id);
              setBalanceData(data);
            }
          } catch (error: any) {
            Alert.alert('Erreur', error?.response?.data?.message || 'Impossible de créer la facture');
          } finally {
            setCreatingInvoice(false);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Client }) => (
    <TouchableOpacity style={styles.clientCard} onPress={() => openModal(item)}>
      <View style={styles.clientInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.clientDetails}>
          <Text style={styles.clientName}>{item.name}</Text>
          {item.phone && (
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={14} color={colors.text.muted} />
              <Text style={styles.contactText}>{item.phone}</Text>
            </View>
          )}
          {item.email && (
            <View style={styles.contactRow}>
              <Ionicons name="mail-outline" size={14} color={colors.text.muted} />
              <Text style={styles.contactText}>{item.email}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.clientActions}>
        <TouchableOpacity style={styles.balanceButton} onPress={() => openBalanceModal(item)}>
          <Ionicons name="wallet-outline" size={20} color={colors.primary[500]} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={20} color={colors.error[500]} />
        </TouchableOpacity>
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingView}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Clients</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.text.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher..."
          placeholderTextColor={colors.text.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredClients}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[500]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={colors.text.muted} />
            <Text style={styles.emptyText}>Aucun client</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingClient ? 'Modifier le client' : 'Nouveau client'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nom *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nom du client"
                  placeholderTextColor={colors.text.muted}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Téléphone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Numéro de téléphone"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="phone-pad"
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Adresse email"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Adresse</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Adresse complète"
                  placeholderTextColor={colors.text.muted}
                  multiline
                  numberOfLines={3}
                  value={formData.address}
                  onChangeText={(text) => setFormData({ ...formData, address: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Notes additionnelles"
                  placeholderTextColor={colors.text.muted}
                  multiline
                  numberOfLines={3}
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Enregistrer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Balance Modal - Devis-based */}
      <Modal visible={balanceModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.balanceModalOverlay}
        >
          <View style={styles.balanceModalContent}>
            <View style={styles.modalHeader}>
              {paymentDevis ? (
                <>
                  <TouchableOpacity onPress={resetPaymentForm} style={{ marginRight: 10 }}>
                    <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
                  </TouchableOpacity>
                  <Text style={[styles.modalTitle, { flex: 1 }]}>Paiement — {paymentDevis.reference}</Text>
                </>
              ) : (
                <Text style={styles.modalTitle}>
                  Solde - {selectedClientForInvoice?.name || ''}
                </Text>
              )}
              <TouchableOpacity onPress={() => { setBalanceModalVisible(false); resetPaymentForm(); setExpandedDevisId(null); }}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {loadingBalance ? (
              <View style={styles.balanceLoading}>
                <ActivityIndicator size="large" color={colors.primary[500]} />
              </View>
            ) : paymentDevis ? (
              /* ── Inline Payment Form ── */
              <>
                <ScrollView style={styles.balanceBody} keyboardShouldPersistTaps="handled">
                  {/* Payment summary */}
                  <View style={styles.paymentSummaryCard}>
                    <View style={styles.paymentSummaryItem}>
                      <Text style={styles.paymentSummaryLabel}>Montant total</Text>
                      <Text style={styles.paymentSummaryValue}>{Number(paymentDevis.totalAmount).toFixed(3)} TND</Text>
                    </View>
                    <View style={styles.paymentSummaryItem}>
                      <Text style={styles.paymentSummaryLabel}>Déjà payé</Text>
                      <Text style={[styles.paymentSummaryValue, { color: '#22c55e' }]}>{Number(paymentDevis.paidAmount).toFixed(3)} TND</Text>
                    </View>
                    <View style={[styles.paymentSummaryItem, styles.paymentSummaryTotal]}>
                      <Text style={[styles.paymentSummaryLabel, { fontWeight: '600' }]}>Reste à payer</Text>
                      <Text style={[styles.paymentSummaryValue, { color: '#ef4444', fontSize: 18 }]}>{Number(paymentDevis.remaining).toFixed(3)} TND</Text>
                    </View>
                  </View>

                  {/* Payment history */}
                  {(paymentDevis.payments || []).length > 0 && (
                    <View style={styles.paymentHistorySection}>
                      <Text style={styles.expandedTitle}>Historique des paiements</Text>
                      {(paymentDevis.payments || []).map((p) => (
                        <View key={p.id} style={styles.expandedRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.expandedRowText}>
                              {p.paymentMethod || 'Espèces'} — {new Date(p.paymentDate).toLocaleDateString('fr-FR')}
                            </Text>
                            {p.createdBy && (
                              <Text style={{ fontSize: 11, color: colors.text.muted }}>
                                par {p.createdBy.firstName} {p.createdBy.lastName}
                              </Text>
                            )}
                          </View>
                          <Text style={[styles.expandedRowAmount, { color: '#22c55e' }]}>+{Number(p.amount).toFixed(3)}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Amount */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Montant * <Text style={{ fontWeight: '400', color: colors.text.muted }}>(max: {Number(paymentDevis.remaining).toFixed(3)} TND)</Text></Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.000"
                      placeholderTextColor={colors.text.muted}
                      keyboardType="decimal-pad"
                      value={paymentAmount}
                      onChangeText={setPaymentAmount}
                    />
                    {parseFloat(paymentAmount) > paymentDevis.remaining && (
                      <Text style={styles.formError}>Le montant dépasse le reste à payer ({Number(paymentDevis.remaining).toFixed(3)} TND)</Text>
                    )}
                  </View>

                  {/* Method */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Mode de paiement</Text>
                    <View style={styles.methodRow}>
                      {['Espèces', 'Chèque', 'Virement'].map((m) => (
                        <TouchableOpacity
                          key={m}
                          style={[styles.methodChip, paymentMethod === m && styles.methodChipActive]}
                          onPress={() => setPaymentMethod(m)}
                        >
                          <Text style={[styles.methodChipText, paymentMethod === m && styles.methodChipTextActive]}>{m}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Reference */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Référence</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="N° chèque, réf. virement..."
                      placeholderTextColor={colors.text.muted}
                      value={paymentReference}
                      onChangeText={setPaymentReference}
                    />
                  </View>

                  {/* Notes */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Notes</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Notes..."
                      placeholderTextColor={colors.text.muted}
                      value={paymentNotes}
                      onChangeText={setPaymentNotes}
                      multiline
                      numberOfLines={2}
                    />
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.cancelButton} onPress={resetPaymentForm}>
                    <Text style={styles.cancelButtonText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, (paymentLoading || !parseFloat(paymentAmount) || parseFloat(paymentAmount) > paymentDevis.remaining) && styles.buttonDisabled]}
                    onPress={handleAddPayment}
                    disabled={paymentLoading || !parseFloat(paymentAmount) || parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > paymentDevis.remaining}
                  >
                    {paymentLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Enregistrer</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : balanceData ? (
              /* ── Devis List View ── */
              <ScrollView style={styles.balanceBody}>
                {/* Summary Cards */}
                <View style={styles.summaryGrid}>
                  <View style={[styles.summaryCard, styles.invoicedCard]}>
                    <Ionicons name="document-text" size={20} color="#3b82f6" />
                    <Text style={styles.summaryValue}>
                      {Number(balanceData.summary.totalDevisAmount || 0).toFixed(2)}
                    </Text>
                    <Text style={styles.summaryLabel}>Total Devis</Text>
                  </View>
                  <View style={[styles.summaryCard, styles.paidCard]}>
                    <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                    <Text style={styles.summaryValue}>
                      {Number(balanceData.summary.totalPaid || 0).toFixed(2)}
                    </Text>
                    <Text style={styles.summaryLabel}>Payé</Text>
                  </View>
                </View>

                {/* Outstanding Balance */}
                <View style={[
                  styles.outstandingCard,
                  balanceData.summary.outstandingBalance > 0 ? styles.outstandingPositive : styles.outstandingZero
                ]}>
                  <View style={styles.outstandingInfo}>
                    <Text style={styles.outstandingLabel}>Reste à payer</Text>
                    <Text style={[
                      styles.outstandingValue,
                      { color: balanceData.summary.outstandingBalance > 0 ? '#ef4444' : '#22c55e' }
                    ]}>
                      {Number(balanceData.summary.outstandingBalance || 0).toFixed(2)} TND
                    </Text>
                  </View>
                  <Ionicons 
                    name={balanceData.summary.outstandingBalance > 0 ? 'alert-circle' : 'checkmark-circle'} 
                    size={32} 
                    color={balanceData.summary.outstandingBalance > 0 ? '#ef4444' : '#22c55e'} 
                  />
                </View>

                {/* Devis List */}
                <Text style={styles.sectionTitle}>
                  Devis ({balanceData.summary.devisCount})
                </Text>

                {balanceData.devis.map((devis) => {
                  const isExpanded = expandedDevisId === devis.id;
                  const statusColor = devis.status === 'INVOICED' ? '#22c55e' : devis.status === 'VALIDATED' ? '#3b82f6' : '#f97316';
                  const statusLabel = devis.status === 'INVOICED' ? 'Facturé' : devis.status === 'VALIDATED' ? 'Validé' : 'Brouillon';

                  return (
                    <View key={devis.id} style={styles.devisCardItem}>
                      <TouchableOpacity
                        style={styles.devisCardHeader}
                        onPress={() => setExpandedDevisId(isExpanded ? null : devis.id)}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.devisRef}>{devis.reference}</Text>
                            <View style={[styles.devisStatusBadge, { backgroundColor: statusColor + '20' }]}>
                              <Text style={[styles.devisStatusText, { color: statusColor }]}>{statusLabel}</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                            <Text style={styles.devisDate}>
                              {new Date(devis.createdAt).toLocaleDateString('fr-FR')}
                            </Text>
                            <Text style={styles.devisAmount}>
                              {Number(devis.totalAmount).toFixed(2)} TND
                            </Text>
                          </View>
                          {/* Payment progress */}
                          <View style={styles.devisProgress}>
                            <View style={styles.devisProgressBar}>
                              <View style={[styles.devisProgressFill, { width: `${devis.totalAmount > 0 ? Math.min(100, (devis.paidAmount / devis.totalAmount) * 100) : 0}%` }]} />
                            </View>
                            <Text style={styles.devisProgressText}>
                              {Number(devis.paidAmount).toFixed(2)} / {Number(devis.totalAmount).toFixed(2)}
                            </Text>
                          </View>
                        </View>
                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.text.muted} />
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.devisExpanded}>
                          {/* Lines */}
                          {(devis.lines || []).length > 0 && (
                            <View style={styles.expandedSection}>
                              <Text style={styles.expandedTitle}>Lignes</Text>
                              {(devis.lines || []).map((line) => (
                                <View key={line.id} style={styles.expandedRow}>
                                  <Text style={styles.expandedRowText} numberOfLines={1}>
                                    {line.description || line.machineType}
                                    {line.material ? ` (${line.material.name})` : ''}
                                  </Text>
                                  <Text style={styles.expandedRowAmount}>{Number(line.lineTotal).toFixed(2)}</Text>
                                </View>
                              ))}
                            </View>
                          )}

                          {/* Services */}
                          {(devis.services || []).length > 0 && (
                            <View style={styles.expandedSection}>
                              <Text style={styles.expandedTitle}>Services</Text>
                              {(devis.services || []).map((svc) => (
                                <View key={svc.id} style={styles.expandedRow}>
                                  <Text style={styles.expandedRowText}>{svc.service?.name || 'Service'}</Text>
                                  <Text style={styles.expandedRowAmount}>{Number(svc.price).toFixed(2)}</Text>
                                </View>
                              ))}
                            </View>
                          )}

                          {/* Payments */}
                          <View style={styles.expandedSection}>
                            <Text style={styles.expandedTitle}>Paiements ({(devis.payments || []).length})</Text>
                            {(devis.payments || []).length > 0 ? (devis.payments || []).map((p) => (
                              <View key={p.id} style={styles.expandedRow}>
                                <View>
                                  <Text style={styles.expandedRowText}>
                                    {p.paymentMethod || 'Espèces'} - {new Date(p.paymentDate).toLocaleDateString('fr-FR')}
                                  </Text>
                                  {p.createdBy && (
                                    <Text style={{ fontSize: 11, color: colors.text.muted }}>
                                      par {p.createdBy.firstName} {p.createdBy.lastName}
                                    </Text>
                                  )}
                                </View>
                                <Text style={[styles.expandedRowAmount, { color: '#22c55e' }]}>
                                  +{Number(p.amount).toFixed(2)}
                                </Text>
                              </View>
                            )) : (
                              <Text style={{ fontSize: 13, color: colors.text.muted }}>Aucun paiement</Text>
                            )}
                          </View>

                          {/* Invoice info */}
                          {devis.invoice && (
                            <View style={[styles.expandedSection, { backgroundColor: '#22c55e10', borderRadius: 8, padding: 10 }]}>
                              <Text style={{ fontSize: 13, color: '#22c55e', fontWeight: '600' }}>
                                Facturé: {devis.invoice.reference}
                              </Text>
                            </View>
                          )}

                          {/* Actions */}
                          <View style={styles.devisActions}>
                            {!devis.isFullyPaid && devis.status !== 'INVOICED' && (
                              <TouchableOpacity
                                style={styles.devisActionBtn}
                                onPress={() => { setPaymentDevis(devis); setPaymentAmount(String(devis.remaining.toFixed(3))); setPaymentMethod('Espèces'); setPaymentReference(''); setPaymentNotes(''); }}
                              >
                                <Ionicons name="card" size={16} color="#fff" />
                                <Text style={styles.devisActionText}>Payer</Text>
                              </TouchableOpacity>
                            )}
                            {devis.isFullyPaid && !devis.invoice && (
                              <TouchableOpacity
                                style={[styles.devisActionBtn, { backgroundColor: '#22c55e' }]}
                                onPress={() => handleInvoiceDevis(devis.id)}
                                disabled={creatingInvoice}
                              >
                                <Ionicons name="receipt" size={16} color="#fff" />
                                <Text style={styles.devisActionText}>Facturer</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}

                {balanceData.devis.length === 0 && (
                  <View style={styles.noDataState}>
                    <Ionicons name="document-outline" size={48} color={colors.text.muted} />
                    <Text style={styles.noDataText}>Aucun devis</Text>
                  </View>
                )}
              </ScrollView>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.base },
  keyboardAvoidingView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.base },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.text.primary },
  addButton: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary[500],
    justifyContent: 'center', alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 16,
    backgroundColor: colors.background.elevated, borderRadius: 12, paddingHorizontal: 16,
    borderWidth: 1, borderColor: colors.border.default,
  },
  searchInput: { flex: 1, paddingVertical: 14, paddingLeft: 12, fontSize: 16, color: colors.text.primary },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  clientCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.background.surface, padding: 16, borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  clientInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary[500],
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  avatarText: { fontSize: 20, fontWeight: '600', color: '#fff' },
  clientDetails: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 4 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  contactText: { fontSize: 13, color: colors.text.muted },
  clientActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balanceButton: { padding: 8 },
  deleteButton: { padding: 8 },
  emptyState: { alignItems: 'center', paddingTop: 64 },
  emptyText: { fontSize: 16, color: colors.text.muted, marginTop: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.background.base, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%',
    width: '100%', maxWidth: 600, alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
  },
  modalTitle: { fontSize: 20, fontWeight: '600', color: colors.text.primary },
  modalBody: { padding: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: colors.text.secondary, marginBottom: 8 },
  input: {
    backgroundColor: colors.background.elevated, borderRadius: 12, padding: 16, fontSize: 16,
    color: colors.text.primary, borderWidth: 1, borderColor: colors.border.default,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modalFooter: {
    flexDirection: 'row', padding: 20, gap: 12,
    borderTopWidth: 1, borderTopColor: colors.border.subtle,
  },
  cancelButton: {
    flex: 1, padding: 16, borderRadius: 12, backgroundColor: colors.background.elevated,
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: colors.text.secondary },
  saveButton: {
    flex: 2, padding: 16, borderRadius: 12, backgroundColor: colors.primary[500],
    alignItems: 'center',
  },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  buttonDisabled: { opacity: 0.7 },
  balanceModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  balanceModalContent: {
    backgroundColor: colors.background.base, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%',
    width: '100%', maxWidth: 600, alignSelf: 'center',
    display: 'flex', flexDirection: 'column',
  },
  balanceLoading: { padding: 60, alignItems: 'center' },
  balanceBody: { padding: 20 },
  summaryGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: {
    flex: 1, padding: 16, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  invoicedCard: { backgroundColor: '#3b82f610' },
  paidCard: { backgroundColor: '#22c55e10' },
  summaryValue: { fontSize: 18, fontWeight: '700', color: colors.text.primary, marginTop: 8 },
  summaryLabel: { fontSize: 12, color: colors.text.muted, marginTop: 4 },
  outstandingCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderRadius: 12, marginBottom: 20,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  outstandingPositive: { backgroundColor: '#ef444410' },
  outstandingZero: { backgroundColor: '#22c55e10' },
  outstandingInfo: { flex: 1 },
  outstandingLabel: { fontSize: 14, color: colors.text.muted },
  outstandingValue: { fontSize: 28, fontWeight: '700', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 12 },
  devisRef: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  devisDate: { fontSize: 12, color: colors.text.muted, marginTop: 2 },
  devisAmount: { fontSize: 15, fontWeight: '600', color: colors.primary[500] },
  noDataState: { alignItems: 'center', padding: 40 },
  noDataText: { fontSize: 14, color: colors.text.muted, marginTop: 12 },
  // Devis card styles
  devisCardItem: {
    backgroundColor: colors.background.elevated, borderRadius: 12, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border.subtle, overflow: 'hidden',
  },
  devisCardHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10,
  },
  devisStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  devisStatusText: { fontSize: 11, fontWeight: '600' },
  devisProgress: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  devisProgressBar: { flex: 1, height: 5, backgroundColor: colors.background.base, borderRadius: 3 },
  devisProgressFill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 3 },
  devisProgressText: { fontSize: 11, color: colors.text.muted },
  devisExpanded: { padding: 14, borderTopWidth: 1, borderTopColor: colors.border.subtle, backgroundColor: colors.background.surface },
  expandedSection: { marginBottom: 14 },
  expandedTitle: { fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  expandedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  expandedRowText: { fontSize: 13, color: colors.text.secondary, flex: 1 },
  expandedRowAmount: { fontSize: 13, fontWeight: '600', color: colors.text.primary, marginLeft: 8 },
  devisActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  devisActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.primary[500], padding: 10, borderRadius: 8,
  },
  devisActionText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  // Inline payment form styles
  paymentSummaryCard: {
    backgroundColor: colors.background.elevated, borderRadius: 12, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  paymentSummaryItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
  },
  paymentSummaryTotal: { borderBottomWidth: 0, paddingTop: 12 },
  paymentSummaryLabel: { fontSize: 14, color: colors.text.muted },
  paymentSummaryValue: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  paymentHistorySection: {
    backgroundColor: colors.background.elevated, borderRadius: 12, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  formError: { fontSize: 12, color: '#ef4444', marginTop: 6 },
  methodRow: { flexDirection: 'row', gap: 8 },
  methodChip: {
    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
    backgroundColor: colors.background.elevated, borderWidth: 1, borderColor: colors.border.default,
  },
  methodChipActive: { backgroundColor: colors.primary[500] + '20', borderColor: colors.primary[500] },
  methodChipText: { fontSize: 13, fontWeight: '500', color: colors.text.muted },
  methodChipTextActive: { color: colors.primary[500], fontWeight: '600' },
});
