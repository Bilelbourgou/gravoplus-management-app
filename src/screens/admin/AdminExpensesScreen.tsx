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
import { expensesApi } from '../../services';
import { colors } from '../../theme/colors';
import type { Expense, ExpenseCategory, CreateExpenseInput } from '../../types';

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  MATERIAL: 'Matériel',
  EQUIPMENT: 'Équipement',
  UTILITIES: 'Services',
  SALARY: 'Salaire',
  RENT: 'Loyer',
  OTHER: 'Autre',
};

const CATEGORY_ICONS: Record<ExpenseCategory, keyof typeof Ionicons.glyphMap> = {
  MATERIAL: 'cube',
  EQUIPMENT: 'hardware-chip',
  UTILITIES: 'flash',
  SALARY: 'people',
  RENT: 'home',
  OTHER: 'ellipsis-horizontal',
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  MATERIAL: '#3b82f6',
  EQUIPMENT: '#8b5cf6',
  UTILITIES: '#f97316',
  SALARY: '#22c55e',
  RENT: '#ef4444',
  OTHER: '#6b7280',
};

const CATEGORIES: ExpenseCategory[] = ['MATERIAL', 'EQUIPMENT', 'UTILITIES', 'SALARY', 'RENT', 'OTHER'];

export function AdminExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [totalExpenses, setTotalExpenses] = useState(0);

  const [formData, setFormData] = useState<CreateExpenseInput>({
    description: '',
    amount: 0,
    category: 'OTHER',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const fetchExpenses = async () => {
    try {
      const data = await expensesApi.getAll();
      setExpenses(data);
      const total = data.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      setTotalExpenses(total);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchExpenses();
    setRefreshing(false);
  };

  const openModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: expense.date.split('T')[0],
        notes: expense.notes || '',
      });
    } else {
      setEditingExpense(null);
      setFormData({
        description: '',
        amount: 0,
        category: 'OTHER',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.description.trim()) {
      Alert.alert('Erreur', 'La description est obligatoire');
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      Alert.alert('Erreur', 'Le montant doit être supérieur à 0');
      return;
    }

    setSaving(true);
    try {
      if (editingExpense) {
        await expensesApi.update(editingExpense.id, formData);
      } else {
        await expensesApi.create(formData);
      }
      setModalVisible(false);
      fetchExpenses();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder la dépense');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (expense: Expense) => {
    Alert.alert(
      'Supprimer la dépense',
      `Voulez-vous vraiment supprimer "${expense.description}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await expensesApi.delete(expense.id);
              fetchExpenses();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la dépense');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Expense }) => {
    const categoryColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.OTHER;
    const categoryIcon = CATEGORY_ICONS[item.category] || CATEGORY_ICONS.OTHER;

    return (
      <TouchableOpacity style={styles.expenseCard} onPress={() => openModal(item)}>
        <View style={[styles.categoryIcon, { backgroundColor: categoryColor + '20' }]}>
          <Ionicons name={categoryIcon} size={22} color={categoryColor} />
        </View>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseDescription}>{item.description}</Text>
          <View style={styles.expenseDetails}>
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
              <Text style={[styles.categoryText, { color: categoryColor }]}>
                {CATEGORY_LABELS[item.category]}
              </Text>
            </View>
            <Text style={styles.expenseDate}>
              {new Date(item.date).toLocaleDateString('fr-FR')}
            </Text>
          </View>
        </View>
        <View style={styles.expenseRight}>
          <Text style={styles.expenseAmount}>{Number(item.amount || 0).toFixed(2)}</Text>
          <Text style={styles.expenseCurrency}>TND</Text>
        </View>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={18} color={colors.error[500]} />
        </TouchableOpacity>
      </TouchableOpacity>
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingView}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dépenses</Text>
          <Text style={styles.subtitle}>{expenses.length} dépense(s)</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Total Card */}
      <View style={styles.totalCard}>
        <Ionicons name="trending-down" size={24} color="#ef4444" />
        <View style={styles.totalInfo}>
          <Text style={styles.totalLabel}>Total des dépenses</Text>
          <Text style={styles.totalValue}>{totalExpenses.toFixed(2)} TND</Text>
        </View>
      </View>

      <FlatList
        data={expenses}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[500]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={64} color={colors.text.muted} />
            <Text style={styles.emptyText}>Aucune dépense</Text>
          </View>
        }
      />

      {/* Form Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingExpense ? 'Modifier la dépense' : 'Nouvelle dépense'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Description de la dépense"
                  placeholderTextColor={colors.text.muted}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Montant (TND) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="decimal-pad"
                  value={formData.amount ? String(formData.amount) : ''}
                  onChangeText={(text) => setFormData({ ...formData, amount: parseFloat(text) || 0 })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Catégorie</Text>
                <View style={styles.categoriesGrid}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = formData.category === cat;
                    const catColor = CATEGORY_COLORS[cat];
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryOption,
                          isSelected && { backgroundColor: catColor, borderColor: catColor },
                        ]}
                        onPress={() => setFormData({ ...formData, category: cat })}
                      >
                        <Ionicons
                          name={CATEGORY_ICONS[cat]}
                          size={18}
                          color={isSelected ? '#fff' : catColor}
                        />
                        <Text
                          style={[
                            styles.categoryOptionText,
                            isSelected && { color: '#fff' },
                          ]}
                        >
                          {CATEGORY_LABELS[cat]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.text.muted}
                  value={formData.date}
                  onChangeText={(text) => setFormData({ ...formData, date: text })}
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
  subtitle: { fontSize: 14, color: colors.text.muted, marginTop: 4 },
  addButton: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary[500],
    justifyContent: 'center', alignItems: 'center',
  },
  totalCard: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 16,
    padding: 16, backgroundColor: '#ef444410', borderRadius: 12, gap: 14,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  totalInfo: { flex: 1 },
  totalLabel: { fontSize: 14, color: colors.text.muted },
  totalValue: { fontSize: 24, fontWeight: '700', color: '#ef4444', marginTop: 4 },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  expenseCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background.surface,
    padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border.subtle,
  },
  categoryIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  expenseInfo: { flex: 1 },
  expenseDescription: { fontSize: 15, fontWeight: '600', color: colors.text.primary, marginBottom: 6 },
  expenseDetails: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  categoryText: { fontSize: 11, fontWeight: '600' },
  expenseDate: { fontSize: 12, color: colors.text.muted },
  expenseRight: { alignItems: 'flex-end', marginRight: 10 },
  expenseAmount: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  expenseCurrency: { fontSize: 11, color: colors.text.muted },
  deleteButton: { padding: 8 },
  emptyState: { alignItems: 'center', paddingTop: 64 },
  emptyText: { fontSize: 16, color: colors.text.muted, marginTop: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.background.base, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%',
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
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryOption: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, backgroundColor: colors.background.elevated, borderWidth: 2, borderColor: colors.border.default,
  },
  categoryOptionText: { fontSize: 13, fontWeight: '500', color: colors.text.secondary },
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
});
