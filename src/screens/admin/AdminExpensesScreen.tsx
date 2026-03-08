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
import { expensesApi, expenseCategoriesApi } from '../../services';
import { colors } from '../../theme/colors';
import type { Expense, ExpenseCategory, CreateExpenseInput } from '../../types';

// Fallback constants for categories not yet loaded or missing
const FALLBACK_CATEGORY_COLOR = '#6c757d';
const FALLBACK_CATEGORY_ICON = 'ellipsis-horizontal';

// Map generic icon names (from backend/lucide) to Ionicons
export const getIoniconsName = (iconName?: string): keyof typeof Ionicons.glyphMap => {
  if (!iconName) return FALLBACK_CATEGORY_ICON as any;
  
  const mapping: Record<string, string> = {
    'package': 'cube',
    'receipt': 'receipt',
    'truck': 'car',
    'tool': 'build',
    'users': 'people',
    'home': 'home',
    'zap': 'flash',
    'morehorizontal': 'ellipsis-horizontal',
    'package-2': 'cube',
    'wrench': 'build',
    'user': 'person',
    'shopping-cart': 'cart',
    'credit-card': 'card',
    'activity': 'pulse',
    'archive': 'archive',
    'bar-chart': 'bar-chart',
    'bell': 'notifications',
    'book': 'book',
    'briefcase': 'briefcase',
    'calendar': 'calendar',
    'camera': 'camera',
    'clipboard': 'clipboard',
    'clock': 'time',
    'cog': 'settings',
    'database': 'database',
    'file': 'document',
    'folder': 'folder',
    'gift': 'gift',
    'globe': 'globe',
    'heart': 'heart',
    'image': 'image',
    'key': 'key',
    'layers': 'layers',
    'layout': 'grid',
    'link': 'link',
    'list': 'list',
    'lock': 'lock',
    'mail': 'mail',
    'map': 'map',
    'menu': 'menu',
    'message-circle': 'chatbubble',
    'mic': 'mic',
    'moon': 'moon',
    'music': 'musical-notes',
    'phone': 'call',
    'play': 'play',
    'power': 'power',
    'printer': 'print',
    'radio': 'radio',
    'save': 'save',
    'search': 'search',
    'send': 'send',
    'server': 'server',
    'share-2': 'share',
    'shield': 'shield',
    'shopping-bag': 'bag',
    'smartphone': 'smartphone',
    'speaker': 'volume-medium',
    'star': 'star',
    'sun': 'sun',
    'tablet': 'tablet-portrait',
    'tag': 'tag',
    'terminal': 'terminal',
    'thermometer': 'thermometer',
    'thumbs-up': 'thumbs-up',
    'trash-2': 'trash',
    'tv': 'tv',
    'video': 'videocam',
    'volume-2': 'volume-high',
    'wifi': 'wifi',
  };

  const name = iconName.toLowerCase().replace(/-/g, '');
  return (mapping[iconName.toLowerCase()] || mapping[name] || 'ellipsis-horizontal') as any;
};

export function AdminExpensesScreen({ navigation }: any) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [totalExpenses, setTotalExpenses] = useState(0);

  const [formData, setFormData] = useState<CreateExpenseInput>({
    description: '',
    amount: 0,
    category: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [amountText, setAmountText] = useState('');

  const fetchData = async () => {
    try {
      // Load categories independently so they're available even if expenses fail
      const [expensesResult, categoriesResult] = await Promise.allSettled([
        expensesApi.getAll(),
        expenseCategoriesApi.getAll(),
      ]);

      if (expensesResult.status === 'fulfilled') {
        setExpenses(expensesResult.value);
        const total = expensesResult.value.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        setTotalExpenses(total);
      } else {
        console.error('Failed to load expenses:', expensesResult.reason);
      }

      if (categoriesResult.status === 'fulfilled') {
        setCategories(categoriesResult.value);
        // Set default category if not set
        if (!formData.category && categoriesResult.value.length > 0) {
          setFormData(prev => ({ ...prev, category: categoriesResult.value[0].name }));
        }
      } else {
        console.error('Failed to load categories:', categoriesResult.reason);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const openModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        description: expense.description,
        amount: expense.amount,
        category: expense.categoryName || '',
        date: expense.date.split('T')[0],
        notes: expense.notes || '',
      });
      setAmountText(String(expense.amount));
    } else {
      setEditingExpense(null);
      setFormData({
        description: '',
        amount: 0,
        category: categories.length > 0 ? categories[0].name : '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setAmountText('');
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
    if (!formData.category) {
      Alert.alert('Erreur', 'La catégorie est obligatoire');
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
      fetchData();
    } catch (error: any) {
      const msg = error?.message || 'Impossible de sauvegarder la dépense';
      Alert.alert('Erreur', msg);
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
              fetchData();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la dépense');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Expense }) => {
    const categoryInfo = item.category || categories.find(c => c.name === item.categoryName);
    const categoryColor = categoryInfo?.color || FALLBACK_CATEGORY_COLOR;
    const iconName = getIoniconsName(categoryInfo?.icon);

    return (
      <TouchableOpacity style={styles.expenseCard} onPress={() => openModal(item)}>
        <View style={[styles.categoryIcon, { backgroundColor: categoryColor + '20' }]}>
          <Ionicons name={iconName} size={22} color={categoryColor} />
        </View>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseDescription}>{item.description}</Text>
          <View style={styles.expenseDetails}>
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
              <Text style={[styles.categoryText, { color: categoryColor }]}>
                {item.categoryName}
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
      behavior="padding"
      style={styles.keyboardAvoidingView}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dépenses</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AdminExpenseCategories')}>
            <Text style={styles.manageCategoriesLink}>Gérer les catégories</Text>
          </TouchableOpacity>
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
          behavior="padding"
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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
                  value={amountText}
                  onChangeText={(text) => {
                    setAmountText(text);
                    setFormData({ ...formData, amount: parseFloat(text.replace(',', '.')) || 0 });
                  }}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Catégorie</Text>
                <View style={styles.categoriesGrid}>
                  {categories.map((cat) => {
                    const isSelected = formData.category === cat.name;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryOption,
                          isSelected && { backgroundColor: cat.color, borderColor: cat.color },
                        ]}
                        onPress={() => setFormData({ ...formData, category: cat.name })}
                      >
                        <Ionicons
                          name={getIoniconsName(cat.icon)}
                          size={18}
                          color={isSelected ? '#fff' : cat.color}
                        />
                        <Text
                          style={[
                            styles.categoryOptionText,
                            isSelected && { color: '#fff' },
                          ]}
                        >
                          {cat.name}
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
  manageCategoriesLink: { fontSize: 13, color: colors.primary[500], fontWeight: '600', marginTop: 2 },
  subtitle: { fontSize: 13, color: colors.text.muted, marginTop: 2 },
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
