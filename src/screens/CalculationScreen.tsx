import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { devisApi, materialsApi } from '../services';
import { colors, machineColors } from '../theme/colors';
import type { Material, MachineType } from '../types';
import type { NewDevisStackParamList } from '../navigation/MainNavigator';

type Props = {
  navigation: NativeStackNavigationProp<NewDevisStackParamList, 'Calculation'>;
  route: RouteProp<NewDevisStackParamList, 'Calculation'>;
};

export function CalculationScreen({ navigation, route }: Props) {
  const { devisId, machineType } = route.params;
  const [minutes, setMinutes] = useState('');
  const [meters, setMeters] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [materialId, setMaterialId] = useState<string | undefined>();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (machineType === 'LASER') {
      materialsApi.getAll().then(setMaterials).catch(console.error);
    }
  }, [machineType]);

  const handleAddLine = async () => {
    setLoading(true);
    try {
      await devisApi.addLine(devisId, {
        machineType: machineType as MachineType,
        description: description || undefined,
        minutes: minutes ? parseFloat(minutes) : undefined,
        meters: meters ? parseFloat(meters) : undefined,
        quantity: quantity ? parseInt(quantity) : undefined,
        materialId,
      });
      navigation.navigate('Services', { devisId });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const color = machineColors[machineType as MachineType];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.header, { borderColor: color }]}>
        <Text style={[styles.machineType, { color }]}>{machineType}</Text>
        <Text style={styles.headerSubtitle}>Entrez les données de calcul</Text>
      </View>

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

        {machineType === 'PANNEAUX' && (
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

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleAddLine}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Ajouter et continuer</Text>
        )}
      </TouchableOpacity>
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
  submitButton: {
    backgroundColor: colors.primary[500],
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
