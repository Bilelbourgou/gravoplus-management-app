import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { expenseCategoriesApi } from '../../services';
import { colors } from '../../theme/colors';
import type { ExpenseCategory } from '../../types';
import { getIoniconsName } from './AdminExpensesScreen';

export function ExpenseCategoryScreen({ navigation }: any) {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6c757d');

  const fetchCategories = async () => {
    try {
      const data = await expenseCategoriesApi.getAll();
      setCategories(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;

    setSaving(true);
    try {
      await expenseCategoriesApi.create({
        name: newName,
        color: selectedColor,
        icon: 'package',
      });
      setNewName('');
      fetchCategories();
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.error || 'Impossible de créer la catégorie');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (category: ExpenseCategory) => {
    Alert.alert(
      'Supprimer',
      `Voulez-vous supprimer "${category.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await expenseCategoriesApi.delete(category.id);
              fetchCategories();
            } catch (error: any) {
              Alert.alert('Erreur', error.response?.data?.error || 'Impossible de supprimer cette catégorie');
            }
          },
        },
      ]
    );
  };

  const PRESET_COLORS = [
    '#0066cc', '#28a745', '#856404', '#6f42c1', 
    '#17a2b8', '#fd7e14', '#d39e00', '#6c757d',
    '#e83e8c', '#20c997', '#007bff', '#dc3545'
  ];

  const renderItem = ({ item }: { item: ExpenseCategory }) => (
    <View style={styles.categoryCard}>
      <View style={styles.categoryInfo}>
        <View style={[styles.colorDot, { backgroundColor: item.color }]} />
        <Ionicons name={getIoniconsName(item.icon)} size={18} color={item.color} style={{ marginRight: 4 }} />
        <Text style={styles.categoryName}>{item.name}</Text>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item)}>
        <Ionicons name="trash-outline" size={20} color={colors.error[500]} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Gérer les catégories</Text>
      </View>

      <View style={styles.addSection}>
        <Text style={styles.label}>Nouvelle catégorie</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Nom de la catégorie"
            value={newName}
            onChangeText={setNewName}
          />
          <TouchableOpacity 
            style={[styles.addButton, (!newName.trim() || saving) && styles.disabledButton]} 
            onPress={handleAdd}
            disabled={!newName.trim() || saving}
          >
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="add" size={24} color="#fff" />}
          </TouchableOpacity>
        </View>

        <View style={styles.colorsGrid}>
          {PRESET_COLORS.map(color => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                selectedColor === color && styles.selectedColorOption
              ]}
              onPress={() => setSelectedColor(color)}
            />
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary[500]} />
      ) : (
        <FlatList
          data={categories}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucune catégorie</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  backButton: { marginRight: 16 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
  addSection: {
    padding: 20,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  label: { fontSize: 14, fontWeight: '600', color: colors.text.secondary, marginBottom: 8 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  input: {
    flex: 1,
    backgroundColor: colors.background.elevated,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: { opacity: 0.5 },
  colorsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorOption: {
    borderColor: colors.text.primary,
  },
  list: { padding: 20 },
  categoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.background.surface,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  categoryInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  categoryName: { fontSize: 16, fontWeight: '500', color: colors.text.primary },
  emptyText: { textAlign: 'center', color: colors.text.muted, marginTop: 40 },
});
