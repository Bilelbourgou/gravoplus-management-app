import React, { useState, useEffect } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { clientsApi, invoicesApi, DirectInvoiceItem } from '../../services';
import { colors } from '../../theme/colors';
import type { Client, CreateClientInput, ClientBalanceData } from '../../types';

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
  
  // Invoice from devis state
  const [devisInvoiceModalVisible, setDevisInvoiceModalVisible] = useState(false);
  const [selectedDevisIds, setSelectedDevisIds] = useState<string[]>([]);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  
  // Direct invoice state
  const [directInvoiceModalVisible, setDirectInvoiceModalVisible] = useState(false);
  const [directInvoiceItems, setDirectInvoiceItems] = useState<DirectInvoiceItem[]>([{ description: '', quantity: 1, unitPrice: 0 }]);

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

  useEffect(() => {
    fetchClients();
  }, []);

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

  const openDevisInvoiceModal = () => {
    setBalanceModalVisible(false);
    setSelectedDevisIds([]);
    setTimeout(() => setDevisInvoiceModalVisible(true), 100);
  };

  const toggleDevisSelection = (devisId: string) => {
    if (selectedDevisIds.includes(devisId)) {
      setSelectedDevisIds(selectedDevisIds.filter((id) => id !== devisId));
    } else {
      setSelectedDevisIds([...selectedDevisIds, devisId]);
    }
  };

  const handleCreateInvoiceFromDevis = async () => {
    if (selectedDevisIds.length === 0) {
      Alert.alert('Erreur', 'Sélectionnez au moins un devis');
      return;
    }
    setCreatingInvoice(true);
    try {
      await invoicesApi.createFromDevis(selectedDevisIds);
      setDevisInvoiceModalVisible(false);
      setBalanceModalVisible(false);
      Alert.alert('Succès', 'Facture créée avec succès');
      // Refresh balance if needed
      if (selectedClientForInvoice) {
        openBalanceModal(selectedClientForInvoice);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer la facture');
    } finally {
      setCreatingInvoice(false);
    }
  };

  const openDirectInvoiceModal = () => {
    setBalanceModalVisible(false);
    setDirectInvoiceItems([{ description: '', quantity: 1, unitPrice: 0 }]);
    setTimeout(() => setDirectInvoiceModalVisible(true), 100);
  };

  const addDirectInvoiceItem = () => {
    setDirectInvoiceItems([...directInvoiceItems, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeDirectInvoiceItem = (index: number) => {
    if (directInvoiceItems.length > 1) {
      setDirectInvoiceItems(directInvoiceItems.filter((_, i) => i !== index));
    }
  };

  const updateDirectInvoiceItem = (index: number, field: keyof DirectInvoiceItem, value: string | number) => {
    const updated = [...directInvoiceItems];
    updated[index] = { ...updated[index], [field]: value };
    setDirectInvoiceItems(updated);
  };

  const handleCreateDirectInvoice = async () => {
    const validItems = directInvoiceItems.filter((item) => item.description.trim() && item.quantity > 0 && item.unitPrice > 0);
    if (validItems.length === 0) {
      Alert.alert('Erreur', 'Ajoutez au moins un article valide');
      return;
    }
    if (!selectedClientForInvoice) {
      Alert.alert('Erreur', 'Client non sélectionné');
      return;
    }
    setCreatingInvoice(true);
    try {
      await invoicesApi.createDirect(selectedClientForInvoice.id, validItems);
      setDirectInvoiceModalVisible(false);
      setBalanceModalVisible(false);
      Alert.alert('Succès', 'Facture créée avec succès');
      // Refresh balance
      openBalanceModal(selectedClientForInvoice);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer la facture');
    } finally {
      setCreatingInvoice(false);
    }
  };

  const getDirectInvoiceTotal = () => {
    return directInvoiceItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
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

      {/* Balance Modal */}
      <Modal visible={balanceModalVisible} animationType="slide" transparent>
        <View style={styles.balanceModalOverlay}>
          <View style={styles.balanceModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Solde - {balanceData?.client?.name || ''}
              </Text>
              <TouchableOpacity onPress={() => setBalanceModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {loadingBalance ? (
              <View style={styles.balanceLoading}>
                <ActivityIndicator size="large" color={colors.primary[500]} />
              </View>
            ) : balanceData ? (
              <ScrollView style={styles.balanceBody}>
                {/* Summary Cards */}
                <View style={styles.summaryGrid}>
                  <View style={[styles.summaryCard, styles.invoicedCard]}>
                    <Ionicons name="receipt" size={20} color="#3b82f6" />
                    <Text style={styles.summaryValue}>
                      {Number(balanceData.summary.totalInvoiced || 0).toFixed(2)}
                    </Text>
                    <Text style={styles.summaryLabel}>Facturé</Text>
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
                    <Text style={styles.outstandingLabel}>Solde à payer</Text>
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

                {/* Pending Devis */}
                {balanceData.summary.pendingDevisCount > 0 && (
                  <View style={styles.pendingSection}>
                    <Text style={styles.sectionTitle}>
                      Devis en attente ({balanceData.summary.pendingDevisCount})
                    </Text>
                    <Text style={styles.pendingTotal}>
                      Total: {Number(balanceData.summary.pendingDevisTotal || 0).toFixed(2)} TND
                    </Text>
                    {balanceData.pendingDevis.map((devis) => (
                      <View key={devis.id} style={styles.devisItem}>
                        <View>
                          <Text style={styles.devisRef}>{devis.reference}</Text>
                          <Text style={styles.devisDate}>
                            {new Date(devis.createdAt).toLocaleDateString('fr-FR')}
                          </Text>
                        </View>
                        <Text style={styles.devisAmount}>
                          {Number(devis.totalAmount || 0).toFixed(2)} TND
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Invoices */}
                {balanceData.invoices.length > 0 && (
                  <View style={styles.invoicesSection}>
                    <Text style={styles.sectionTitle}>
                      Factures ({balanceData.invoices.length})
                    </Text>
                    {balanceData.invoices.map((invoice) => (
                      <View key={invoice.id} style={styles.invoiceItem}>
                        <View style={styles.invoiceHeader}>
                          <Text style={styles.invoiceRef}>{invoice.reference}</Text>
                          <View style={[
                            styles.invoiceStatusBadge,
                            { backgroundColor: invoice.balance > 0 ? '#ef444420' : '#22c55e20' }
                          ]}>
                            <Text style={[
                              styles.invoiceStatusText,
                              { color: invoice.balance > 0 ? '#ef4444' : '#22c55e' }
                            ]}>
                              {invoice.balance > 0 ? 'À payer' : 'Payé'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.invoiceDetails}>
                          <View style={styles.invoiceAmounts}>
                            <Text style={styles.invoiceAmountLabel}>Total:</Text>
                            <Text style={styles.invoiceAmountValue}>
                              {Number(invoice.totalAmount || 0).toFixed(2)} TND
                            </Text>
                          </View>
                          <View style={styles.invoiceAmounts}>
                            <Text style={styles.invoiceAmountLabel}>Payé:</Text>
                            <Text style={[styles.invoiceAmountValue, { color: '#22c55e' }]}>
                              {Number(invoice.paidAmount || 0).toFixed(2)} TND
                            </Text>
                          </View>
                          {invoice.balance > 0 && (
                            <View style={styles.invoiceAmounts}>
                              <Text style={styles.invoiceAmountLabel}>Reste:</Text>
                              <Text style={[styles.invoiceAmountValue, { color: '#ef4444' }]}>
                                {Number(invoice.balance || 0).toFixed(2)} TND
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {balanceData.invoices.length === 0 && balanceData.pendingDevis.length === 0 && (
                  <View style={styles.noDataState}>
                    <Ionicons name="document-outline" size={48} color={colors.text.muted} />
                    <Text style={styles.noDataText}>Aucune facture ou devis</Text>
                  </View>
                )}

                {/* Invoice Actions - Now outside ScrollView for sticky footer */}
              </ScrollView>
            ) : null}

            {balanceData && !loadingBalance && (
              <View style={styles.invoiceActions}>
                <Text style={styles.actionsTitle}>Créer une facture</Text>
                <View style={styles.actionsRow}>
                  {(balanceData.pendingDevis?.length || 0) > 0 && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => openDevisInvoiceModal()}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="document-text" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Depuis devis</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.directActionButton]}
                    onPress={() => openDirectInvoiceModal()}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add-circle" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Facture directe</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Invoice from Devis Modal */}
      <Modal visible={devisInvoiceModalVisible} animationType="slide" transparent>
        <View style={styles.balanceModalOverlay}>
          <View style={styles.balanceModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Facturer des devis</Text>
              <TouchableOpacity onPress={() => setDevisInvoiceModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.balanceBody}>
              <Text style={styles.selectDevisHint}>Sélectionnez les devis à facturer</Text>
              {balanceData?.pendingDevis.map((devis) => {
                const isSelected = selectedDevisIds.includes(devis.id);
                return (
                  <TouchableOpacity
                    key={devis.id}
                    style={[styles.selectableDevisItem, isSelected && styles.selectedDevisItem]}
                    onPress={() => toggleDevisSelection(devis.id)}
                  >
                    <View style={styles.devisItemInfo}>
                      <Text style={styles.devisRef}>{devis.reference}</Text>
                      <Text style={styles.devisDate}>
                        {new Date(devis.createdAt).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>
                    <View style={styles.devisItemRight}>
                      <Text style={styles.devisAmount}>
                        {Number(devis.totalAmount || 0).toFixed(2)} TND
                      </Text>
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {selectedDevisIds.length > 0 && (
                <View style={styles.selectedTotal}>
                  <Text style={styles.selectedTotalLabel}>
                    {selectedDevisIds.length} devis sélectionné(s)
                  </Text>
                  <Text style={styles.selectedTotalValue}>
                    {balanceData?.pendingDevis
                      .filter((d) => selectedDevisIds.includes(d.id))
                      .reduce((sum, d) => sum + Number(d.totalAmount || 0), 0)
                      .toFixed(2)} TND
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setDevisInvoiceModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, (creatingInvoice || selectedDevisIds.length === 0) && styles.buttonDisabled]}
                onPress={handleCreateInvoiceFromDevis}
                disabled={creatingInvoice || selectedDevisIds.length === 0}
              >
                {creatingInvoice ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Créer la facture</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Direct Invoice Modal */}
      <Modal visible={directInvoiceModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.balanceModalOverlay}
        >
          <View style={styles.balanceModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Facture directe</Text>
              <TouchableOpacity onPress={() => setDirectInvoiceModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.balanceBody}>
              <Text style={styles.clientNameLabel}>
                Client: {selectedClientForInvoice?.name}
              </Text>

              {directInvoiceItems.map((item, index) => (
                <View key={index} style={styles.directInvoiceItemCard}>
                  <View style={styles.directItemHeader}>
                    <Text style={styles.directItemTitle}>Article {index + 1}</Text>
                    {directInvoiceItems.length > 1 && (
                      <TouchableOpacity onPress={() => removeDirectInvoiceItem(index)}>
                        <Ionicons name="trash-outline" size={18} color={colors.error[500]} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={styles.directInput}
                    placeholder="Description"
                    placeholderTextColor={colors.text.muted}
                    value={item.description}
                    onChangeText={(text) => updateDirectInvoiceItem(index, 'description', text)}
                  />
                  <View style={styles.directInputRow}>
                    <View style={styles.directInputHalf}>
                      <Text style={styles.directInputLabel}>Quantité</Text>
                      <TextInput
                        style={styles.directInput}
                        placeholder="1"
                        placeholderTextColor={colors.text.muted}
                        keyboardType="numeric"
                        value={item.quantity > 0 ? String(item.quantity) : ''}
                        onChangeText={(text) => updateDirectInvoiceItem(index, 'quantity', parseInt(text) || 0)}
                      />
                    </View>
                    <View style={styles.directInputHalf}>
                      <Text style={styles.directInputLabel}>Prix unitaire (TND)</Text>
                      <TextInput
                        style={styles.directInput}
                        placeholder="0.00"
                        placeholderTextColor={colors.text.muted}
                        keyboardType="decimal-pad"
                        value={item.unitPrice > 0 ? String(item.unitPrice) : ''}
                        onChangeText={(text) => updateDirectInvoiceItem(index, 'unitPrice', parseFloat(text) || 0)}
                      />
                    </View>
                  </View>
                  <Text style={styles.directItemSubtotal}>
                    Sous-total: {(item.quantity * item.unitPrice).toFixed(2)} TND
                  </Text>
                </View>
              ))}

              <TouchableOpacity style={styles.addItemButton} onPress={addDirectInvoiceItem}>
                <Ionicons name="add" size={20} color={colors.primary[500]} />
                <Text style={styles.addItemButtonText}>Ajouter un article</Text>
              </TouchableOpacity>

              <View style={styles.directInvoiceTotal}>
                <Text style={styles.directTotalLabel}>Total facture</Text>
                <Text style={styles.directTotalValue}>{getDirectInvoiceTotal().toFixed(2)} TND</Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setDirectInvoiceModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, creatingInvoice && styles.buttonDisabled]}
                onPress={handleCreateDirectInvoice}
                disabled={creatingInvoice}
              >
                {creatingInvoice ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Créer la facture</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  pendingSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 12 },
  pendingTotal: { fontSize: 14, color: colors.text.muted, marginBottom: 12 },
  devisItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.background.elevated, padding: 14, borderRadius: 10, marginBottom: 8,
  },
  devisRef: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  devisDate: { fontSize: 12, color: colors.text.muted, marginTop: 2 },
  devisAmount: { fontSize: 15, fontWeight: '600', color: colors.primary[500] },
  invoicesSection: { marginBottom: 20 },
  invoiceItem: {
    backgroundColor: colors.background.elevated, padding: 14, borderRadius: 10, marginBottom: 10,
  },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  invoiceRef: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  invoiceStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  invoiceStatusText: { fontSize: 12, fontWeight: '600' },
  invoiceDetails: { gap: 6 },
  invoiceAmounts: { flexDirection: 'row', justifyContent: 'space-between' },
  invoiceAmountLabel: { fontSize: 13, color: colors.text.muted },
  invoiceAmountValue: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  noDataState: { alignItems: 'center', padding: 40 },
  noDataText: { fontSize: 14, color: colors.text.muted, marginTop: 12 },
  // Invoice actions styles
  // Invoice actions styles
  invoiceActions: {
    padding: 20, borderTopWidth: 1, borderTopColor: colors.border.subtle,
    backgroundColor: colors.background.base,
  },
  actionsTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary[500], padding: 14, borderRadius: 10,
  },
  directActionButton: { backgroundColor: '#22c55e' },
  actionButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  // Devis selection styles
  selectDevisHint: { fontSize: 14, color: colors.text.muted, marginBottom: 16 },
  selectableDevisItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.background.elevated, padding: 14, borderRadius: 10, marginBottom: 10,
    borderWidth: 2, borderColor: 'transparent',
  },
  selectedDevisItem: { borderColor: colors.primary[500], backgroundColor: colors.primary[500] + '10' },
  devisItemInfo: { flex: 1 },
  devisItemRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border.default,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxSelected: { backgroundColor: colors.primary[500], borderColor: colors.primary[500] },
  selectedTotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.primary[500] + '10', padding: 14, borderRadius: 10, marginTop: 8,
  },
  selectedTotalLabel: { fontSize: 14, fontWeight: '500', color: colors.text.secondary },
  selectedTotalValue: { fontSize: 16, fontWeight: '700', color: colors.primary[500] },
  // Direct invoice styles
  clientNameLabel: { fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 20 },
  directInvoiceItemCard: {
    backgroundColor: colors.background.elevated, padding: 16, borderRadius: 12, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  directItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  directItemTitle: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  directInput: {
    backgroundColor: colors.background.surface, borderRadius: 10, padding: 12, fontSize: 15,
    color: colors.text.primary, borderWidth: 1, borderColor: colors.border.default, marginBottom: 10,
  },
  directInputRow: { flexDirection: 'row', gap: 12 },
  directInputHalf: { flex: 1 },
  directInputLabel: { fontSize: 12, color: colors.text.muted, marginBottom: 6 },
  directItemSubtotal: { fontSize: 14, fontWeight: '600', color: colors.primary[500], textAlign: 'right', marginTop: 4 },
  addItemButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 14, borderRadius: 10, borderWidth: 2, borderColor: colors.primary[500], borderStyle: 'dashed',
  },
  addItemButtonText: { fontSize: 14, fontWeight: '600', color: colors.primary[500] },
  directInvoiceTotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.primary[500] + '10', padding: 16, borderRadius: 12, marginTop: 20,
  },
  directTotalLabel: { fontSize: 16, fontWeight: '500', color: colors.text.secondary },
  directTotalValue: { fontSize: 22, fontWeight: '700', color: colors.primary[500] },
});
