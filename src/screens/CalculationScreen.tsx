import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { devisApi, materialsApi } from '../services';
import { useAuthStore } from '../store/auth.store';
import { colors, machineColors } from '../theme/colors';
import type { Material, MachineType, DevisLine } from '../types';
import type { NewDevisStackParamList } from '../navigation/MainNavigator';

type Props = {
  navigation: NativeStackNavigationProp<NewDevisStackParamList, 'Calculation'>;
  route: RouteProp<NewDevisStackParamList, 'Calculation'>;
};

export function CalculationScreen({ navigation, route }: Props) {
  const { devisId, machineType } = route.params;
  const { user } = useAuthStore();
  const [minutes, setMinutes] = useState('');
  const [meters, setMeters] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');

  const [description, setDescription] = useState('');
  const [materialId, setMaterialId] = useState<string | undefined>();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [lines, setLines] = useState<DevisLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLines, setLoadingLines] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (machineType === 'LASER') {
          const mats = await materialsApi.getAll();
          setMaterials(mats);
        }
        const devis = await devisApi.getById(devisId);
        setLines(devis.lines || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingLines(false);
      }
    };
    loadData();
  }, [machineType, devisId]);

  const resetForm = () => {
    setMinutes('');
    setMeters('');
    setQuantity('');
    setUnitPrice('');
    setDescription('');
    setMaterialId(undefined);
  };

  const handleAddLine = async () => {
    setLoading(true);
    try {
      await devisApi.addLine(devisId, {
        machineType: machineType as MachineType,
        description: description || undefined,
        minutes: minutes ? parseFloat(minutes) : undefined,
        meters: meters ? parseFloat(meters) : undefined,
        quantity: quantity ? parseInt(quantity) : undefined,
        unitPrice: unitPrice ? parseFloat(unitPrice) : undefined,
        materialId,
      });
      const updatedDevis = await devisApi.getById(devisId);
      setLines(updatedDevis.lines || []);
      resetForm();
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible d\'ajouter la ligne');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLine = async (lineId: string) => {
    Alert.alert(
      'Confirmer',
      'Voulez-vous supprimer cette ligne ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await devisApi.removeLine(devisId, lineId);
              setLines(lines.filter(l => l.id !== lineId));
            } catch (error) {
              console.error(error);
              Alert.alert('Erreur', 'Impossible de supprimer la ligne');
            }
          },
        },
      ]
    );
  };

  const handleContinue = () => {
    if (lines.length === 0) {
      Alert.alert('Attention', 'Veuillez ajouter au moins une ligne avant de continuer');
      return;
    }
    navigation.navigate('Services', { devisId });
  };

  const color = machineColors[machineType as MachineType];

  if (loadingLines) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={[styles.label, { marginTop: 12 }]}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.header, { borderColor: color }]}>
        <Text style={[styles.machineType, { color }]}>{machineType}</Text>
        <Text style={styles.headerSubtitle}>Entrez les données de calcul</Text>
      </View>

      {/* Added Lines List */}
      {lines.length > 0 && (
        <View style={styles.linesContainer}>
          <Text style={styles.linesTitle}>Lignes ajoutées ({lines.length})</Text>
          {lines.map((line) => (
            <View key={line.id} style={styles.lineItem}>
              <View style={styles.lineInfo}>
                <Text style={styles.lineDescription}>
                  {line.description || 'Sans description'}
                </Text>
                <View style={styles.lineDetails}>
                  {line.minutes && <Text style={styles.lineDetailText}>{line.minutes} min</Text>}
                  {line.meters && <Text style={styles.lineDetailText}>{line.meters} m</Text>}
                  {line.quantity && <Text style={styles.lineDetailText}>{line.quantity} unités</Text>}
                </View>
                {user?.role !== 'EMPLOYEE' && (
                  <Text style={styles.lineTotal}>{Number(line.lineTotal).toFixed(2)} TND</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveLine(line.id)}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error[500]} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description (optionnel)</Text>
          <TextInput
            style={styles.input}
            placeholder="Description du travail..."
            placeholderTextColor={colors.text.muted}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {(machineType === 'CNC' || machineType === 'LASER') && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Minutes *</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.text.muted}
              keyboardType="decimal-pad"
              value={minutes}
              onChangeText={setMinutes}
            />
          </View>
        )}

        {machineType === 'CHAMPS' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mètres *</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.text.muted}
              keyboardType="decimal-pad"
              value={meters}
              onChangeText={setMeters}
            />
          </View>
        )}

        {(machineType === 'PANNEAUX') && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quantité *</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.text.muted}
              keyboardType="number-pad"
              value={quantity}
              onChangeText={setQuantity}
            />
          </View>
        )}

        {machineType === 'SERVICE_MAINTENANCE' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Prix (TND) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={colors.text.muted}
              keyboardType="decimal-pad"
              value={unitPrice}
              onChangeText={setUnitPrice}
            />
          </View>
        )}

        {machineType === 'LASER' && materials.length > 0 && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Matériau (optionnel)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.materialsScroll}>
              {materials.filter(m => m.isActive).map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.materialChip, materialId === m.id && styles.materialChipSelected]}
                  onPress={() => setMaterialId(materialId === m.id ? undefined : m.id)}
                >
                  <Text style={[styles.materialChipText, materialId === m.id && styles.materialChipTextSelected]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.addButton, loading && styles.submitButtonDisabled]}
          onPress={handleAddLine}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Ajouter une ligne</Text>
            </>
          )}
        </TouchableOpacity>
        
        {lines.length > 0 && (
          <TouchableOpacity
            style={[styles.continueButton]}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continuer</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.primary[500]} />
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.base },
  content: { padding: 20 },
  header: { borderLeftWidth: 4, paddingLeft: 16, marginBottom: 24 },
  machineType: { fontSize: 24, fontWeight: '700' },
  headerSubtitle: { fontSize: 14, color: colors.text.muted, marginTop: 4 },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '500', color: colors.text.secondary },
  input: {
    backgroundColor: colors.background.elevated,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  materialsScroll: { marginTop: 8 },
  materialChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.background.elevated,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  materialChipSelected: { backgroundColor: colors.primary[500], borderColor: colors.primary[500] },
  materialChipText: { color: colors.text.secondary, fontSize: 14 },
  materialChipTextSelected: { color: '#fff' },
  linesContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  linesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.background.elevated,
    borderRadius: 8,
    marginBottom: 8,
  },
  lineInfo: { flex: 1, marginRight: 12 },
  lineDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  lineDetails: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  lineDetailText: {
    fontSize: 12,
    color: colors.text.muted,
  },
  lineTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  removeButton: {
    padding: 8,
  },
  actionsContainer: {
    gap: 12,
    marginTop: 32,
  },
  addButton: {
    backgroundColor: colors.primary[500],
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButton: {
    backgroundColor: colors.background.surface,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  continueButtonText: { color: colors.primary[500], fontSize: 16, fontWeight: '600' },
});
