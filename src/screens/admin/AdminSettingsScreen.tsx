import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { machinesApi, materialsApi, servicesApi } from '../../services';
import { colors, machineColors } from '../../theme/colors';
import type { Machine, Material, FixedService } from '../../types';

type TabType = 'pricing' | 'materials' | 'services';

export function AdminSettingsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('pricing');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [pricing, setPricing] = useState<Machine[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [services, setServices] = useState<FixedService[]>([]);

  const [editPriceModal, setEditPriceModal] = useState<Machine | null>(null);
  const [newPrice, setNewPrice] = useState('');

  const [materialModal, setMaterialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [materialForm, setMaterialForm] = useState({ name: '', pricePerUnit: '', unit: '', description: '', isActive: true });

  const [serviceModal, setServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<FixedService | null>(null);
  const [serviceForm, setServiceForm] = useState({ name: '', price: '', description: '', isActive: true });

  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [pricingData, materialsData, servicesData] = await Promise.all([
        machinesApi.getPricing(),
        materialsApi.getAll(),
        servicesApi.getAll(),
      ]);
      setPricing(pricingData);
      setMaterials(materialsData);
      setServices(servicesData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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

  // Pricing handlers
  const handleUpdatePrice = async () => {
    if (!editPriceModal || !newPrice) return;
    setSaving(true);
    try {
      await machinesApi.update(editPriceModal.id, { defaultPrice: parseFloat(newPrice) });
      setEditPriceModal(null);
      fetchData();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le prix');
    } finally {
      setSaving(false);
    }
  };

  // Material handlers
  const openMaterialModal = (material?: Material) => {
    if (material) {
      setEditingMaterial(material);
      setMaterialForm({
        name: material.name,
        pricePerUnit: String(material.pricePerUnit || ''),
        unit: material.unit,
        description: material.description || '',
        isActive: material.isActive,
      });
    } else {
      setEditingMaterial(null);
      setMaterialForm({ name: '', pricePerUnit: '', unit: '', description: '', isActive: true });
    }
    setMaterialModal(true);
  };

  const handleSaveMaterial = async () => {
    if (!materialForm.name || !materialForm.pricePerUnit || !materialForm.unit) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: materialForm.name,
        pricePerUnit: parseFloat(materialForm.pricePerUnit),
        unit: materialForm.unit,
        description: materialForm.description || undefined,
        isActive: materialForm.isActive,
      };
      if (editingMaterial) {
        await materialsApi.update(editingMaterial.id, data);
      } else {
        await materialsApi.create(data);
      }
      setMaterialModal(false);
      fetchData();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder le matériau');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMaterial = (material: Material) => {
    Alert.alert('Supprimer', `Supprimer "${material.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try {
            await materialsApi.delete(material.id);
            fetchData();
          } catch (error) {
            Alert.alert('Erreur', 'Impossible de supprimer');
          }
        },
      },
    ]);
  };

  // Service handlers
  const openServiceModal = (service?: FixedService) => {
    if (service) {
      setEditingService(service);
      setServiceForm({
        name: service.name,
        price: service.price.toString(),
        description: service.description || '',
        isActive: service.isActive,
      });
    } else {
      setEditingService(null);
      setServiceForm({ name: '', price: '', description: '', isActive: true });
    }
    setServiceModal(true);
  };

  const handleSaveService = async () => {
    if (!serviceForm.name || !serviceForm.price) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: serviceForm.name,
        price: parseFloat(serviceForm.price),
        description: serviceForm.description || undefined,
        isActive: serviceForm.isActive,
      };
      if (editingService) {
        await servicesApi.update(editingService.id, data);
      } else {
        await servicesApi.create(data);
      }
      setServiceModal(false);
      fetchData();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder le service');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = (service: FixedService) => {
    Alert.alert('Supprimer', `Supprimer "${service.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try {
            await servicesApi.delete(service.id);
            fetchData();
          } catch (error) {
            Alert.alert('Erreur', 'Impossible de supprimer');
          }
        },
      },
    ]);
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
        <Text style={styles.title}>Paramètres</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pricing' && styles.tabActive]}
          onPress={() => setActiveTab('pricing')}
        >
          <Ionicons name="pricetag" size={18} color={activeTab === 'pricing' ? colors.primary[500] : colors.text.muted} />
          <Text style={[styles.tabText, activeTab === 'pricing' && styles.tabTextActive]}>Tarifs</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'materials' && styles.tabActive]}
          onPress={() => setActiveTab('materials')}
        >
          <Ionicons name="cube" size={18} color={activeTab === 'materials' ? colors.primary[500] : colors.text.muted} />
          <Text style={[styles.tabText, activeTab === 'materials' && styles.tabTextActive]}>Matériaux</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'services' && styles.tabActive]}
          onPress={() => setActiveTab('services')}
        >
          <Ionicons name="construct" size={18} color={activeTab === 'services' ? colors.primary[500] : colors.text.muted} />
          <Text style={[styles.tabText, activeTab === 'services' && styles.tabTextActive]}>Services</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[500]} />}
      >
        {/* Pricing Tab */}
        {activeTab === 'pricing' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tarifs par machine</Text>
            {pricing.filter((m) => m.key !== 'CUSTOM').map((m) => (
              <TouchableOpacity
                key={m.id}
                style={styles.pricingCard}
                onPress={() => { setEditPriceModal(m); setNewPrice(String(m.defaultPrice || '')); }}
              >
                <View style={[styles.machineIcon, { backgroundColor: (machineColors as any)[m.key] ? (machineColors as any)[m.key] + '20' : colors.primary[500] + '20' }]}>
                  <Ionicons name="hardware-chip" size={24} color={(machineColors as any)[m.key] || colors.primary[500]} />
                </View>
                <View style={styles.pricingInfo}>
                  <Text style={styles.machineName}>{m.name}</Text>
                  <Text style={styles.machineDesc}>{m.description || 'Prix par défaut'}</Text>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceValue}>{Number(m.defaultPrice || 0).toFixed(2)}</Text>
                  <Text style={styles.priceCurrency}>TND</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Materials Tab */}
        {activeTab === 'materials' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Matériaux</Text>
              <TouchableOpacity style={styles.addSmallButton} onPress={() => openMaterialModal()}>
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            {materials.map((m) => (
              <TouchableOpacity key={m.id} style={styles.itemCard} onPress={() => openMaterialModal(m)}>
                <View style={styles.itemInfo}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{m.name}</Text>
                    {!m.isActive && (
                      <View style={styles.inactiveBadge}>
                        <Text style={styles.inactiveBadgeText}>Inactif</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.itemDesc}>{Number(m.pricePerUnit || 0).toFixed(2)} TND / {m.unit}</Text>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteMaterial(m)}>
                  <Ionicons name="trash-outline" size={18} color={colors.error[500]} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            {materials.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Aucun matériau</Text>
              </View>
            )}
          </View>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Services fixes</Text>
              <TouchableOpacity style={styles.addSmallButton} onPress={() => openServiceModal()}>
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            {services.map((s) => (
              <TouchableOpacity key={s.id} style={styles.itemCard} onPress={() => openServiceModal(s)}>
                <View style={styles.itemInfo}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{s.name}</Text>
                    {!s.isActive && (
                      <View style={styles.inactiveBadge}>
                        <Text style={styles.inactiveBadgeText}>Inactif</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.itemDesc}>{Number(s.price || 0).toFixed(2)} TND</Text>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteService(s)}>
                  <Ionicons name="trash-outline" size={18} color={colors.error[500]} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            {services.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Aucun service</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Price Edit Modal */}
      <Modal visible={!!editPriceModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.smallModal}>
            <Text style={styles.modalTitle}>Modifier le tarif</Text>
            <Text style={styles.modalSubtitle}>{editPriceModal?.machineType}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Prix"
              placeholderTextColor={colors.text.muted}
              keyboardType="decimal-pad"
              value={newPrice}
              onChangeText={setNewPrice}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditPriceModal(null)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, saving && styles.buttonDisabled]}
                onPress={handleUpdatePrice}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveText}>Enregistrer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Material Modal */}
      <Modal visible={materialModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <View style={styles.formModalHeader}>
              <Text style={styles.formModalTitle}>{editingMaterial ? 'Modifier' : 'Nouveau'} matériau</Text>
              <TouchableOpacity onPress={() => setMaterialModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formModalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nom *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nom du matériau"
                  placeholderTextColor={colors.text.muted}
                  value={materialForm.name}
                  onChangeText={(t) => setMaterialForm({ ...materialForm, name: t })}
                />
              </View>
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Prix *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor={colors.text.muted}
                    keyboardType="decimal-pad"
                    value={materialForm.pricePerUnit}
                    onChangeText={(t) => setMaterialForm({ ...materialForm, pricePerUnit: t })}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Unité *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="m², kg..."
                    placeholderTextColor={colors.text.muted}
                    value={materialForm.unit}
                    onChangeText={(t) => setMaterialForm({ ...materialForm, unit: t })}
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Description optionnelle"
                  placeholderTextColor={colors.text.muted}
                  value={materialForm.description}
                  onChangeText={(t) => setMaterialForm({ ...materialForm, description: t })}
                />
              </View>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setMaterialForm({ ...materialForm, isActive: !materialForm.isActive })}
              >
                <Text style={styles.toggleLabel}>Actif</Text>
                <View style={[styles.toggle, materialForm.isActive && styles.toggleActive]}>
                  <View style={[styles.toggleThumb, materialForm.isActive && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>
            </ScrollView>
            <View style={styles.formModalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setMaterialModal(false)}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.buttonDisabled]}
                onPress={handleSaveMaterial}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Enregistrer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Service Modal */}
      <Modal visible={serviceModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <View style={styles.formModalHeader}>
              <Text style={styles.formModalTitle}>{editingService ? 'Modifier' : 'Nouveau'} service</Text>
              <TouchableOpacity onPress={() => setServiceModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formModalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nom *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nom du service"
                  placeholderTextColor={colors.text.muted}
                  value={serviceForm.name}
                  onChangeText={(t) => setServiceForm({ ...serviceForm, name: t })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Prix (TND) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="decimal-pad"
                  value={serviceForm.price}
                  onChangeText={(t) => setServiceForm({ ...serviceForm, price: t })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Description optionnelle"
                  placeholderTextColor={colors.text.muted}
                  value={serviceForm.description}
                  onChangeText={(t) => setServiceForm({ ...serviceForm, description: t })}
                />
              </View>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setServiceForm({ ...serviceForm, isActive: !serviceForm.isActive })}
              >
                <Text style={styles.toggleLabel}>Actif</Text>
                <View style={[styles.toggle, serviceForm.isActive && styles.toggleActive]}>
                  <View style={[styles.toggleThumb, serviceForm.isActive && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>
            </ScrollView>
            <View style={styles.formModalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setServiceModal(false)}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.buttonDisabled]}
                onPress={handleSaveService}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Enregistrer</Text>}
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
    paddingHorizontal: 20, paddingVertical: 16,
    width: '100%', maxWidth: 600, alignSelf: 'center',
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.text.primary },
  tabsContainer: {
    flexDirection: 'row', marginHorizontal: 20, backgroundColor: colors.background.surface,
    borderRadius: 12, padding: 4, marginBottom: 16,
    width: '100%', maxWidth: 600, alignSelf: 'center',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 10,
  },
  tabActive: { backgroundColor: colors.background.base },
  tabText: { fontSize: 13, fontWeight: '500', color: colors.text.muted },
  tabTextActive: { color: colors.primary[500] },
  content: {
    flex: 1, paddingHorizontal: 20,
    width: '100%', maxWidth: 600, alignSelf: 'center',
  },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text.primary, marginBottom: 16 },
  addSmallButton: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[500],
    justifyContent: 'center', alignItems: 'center',
  },
  pricingCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background.surface,
    padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border.subtle,
  },
  machineIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  pricingInfo: { flex: 1 },
  machineName: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  machineDesc: { fontSize: 13, color: colors.text.muted, marginTop: 2 },
  priceContainer: { alignItems: 'flex-end' },
  priceValue: { fontSize: 20, fontWeight: '700', color: colors.primary[400] },
  priceCurrency: { fontSize: 12, color: colors.text.muted },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.background.surface, padding: 16, borderRadius: 12, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  itemInfo: { flex: 1 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  itemDesc: { fontSize: 13, color: colors.text.muted, marginTop: 4 },
  inactiveBadge: { backgroundColor: colors.error[500] + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  inactiveBadgeText: { fontSize: 10, fontWeight: '600', color: colors.error[500] },
  deleteBtn: { padding: 8 },
  emptyState: { alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 14, color: colors.text.muted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  smallModal: {
    backgroundColor: colors.background.base, borderRadius: 16, padding: 24,
    width: '85%', maxWidth: 500,
  },
  modalTitle: { fontSize: 20, fontWeight: '600', color: colors.text.primary, marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: colors.text.muted, marginBottom: 20 },
  modalInput: {
    backgroundColor: colors.background.elevated, borderRadius: 12, padding: 16, fontSize: 18,
    color: colors.text.primary, borderWidth: 1, borderColor: colors.border.default, marginBottom: 20,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: colors.background.elevated, alignItems: 'center' },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: colors.text.secondary },
  modalSaveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: colors.primary[500], alignItems: 'center' },
  modalSaveText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  formModal: {
    backgroundColor: colors.background.base, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '80%', width: '100%', maxWidth: 600, alignSelf: 'center', position: 'absolute', bottom: 0,
  },
  formModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
  },
  formModalTitle: { fontSize: 20, fontWeight: '600', color: colors.text.primary },
  formModalBody: { padding: 20 },
  formModalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: colors.border.subtle },
  row: { flexDirection: 'row', gap: 12 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: colors.text.secondary, marginBottom: 8 },
  input: {
    backgroundColor: colors.background.elevated, borderRadius: 12, padding: 16, fontSize: 16,
    color: colors.text.primary, borderWidth: 1, borderColor: colors.border.default,
  },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  toggleLabel: { fontSize: 16, color: colors.text.primary },
  toggle: {
    width: 50, height: 28, borderRadius: 14, backgroundColor: colors.border.default,
    justifyContent: 'center', paddingHorizontal: 2,
  },
  toggleActive: { backgroundColor: colors.primary[500] },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  toggleThumbActive: { alignSelf: 'flex-end' },
  cancelButton: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: colors.background.elevated, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: colors.text.secondary },
  saveButton: { flex: 2, padding: 16, borderRadius: 12, backgroundColor: colors.primary[500], alignItems: 'center' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  buttonDisabled: { opacity: 0.7 },
});
