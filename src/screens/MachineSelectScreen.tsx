import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useAuthStore } from '../store/auth.store';
import { colors, machineColors } from '../theme/colors';
import type { MachineType } from '../types';
import type { NewDevisStackParamList } from '../navigation/MainNavigator';

const MACHINE_INFO: Record<MachineType, { icon: string; label: string; description: string }> = {
  CNC: { icon: 'hardware-chip', label: 'CNC', description: 'Gravure CNC - par minute' },
  LASER: { icon: 'flash', label: 'Laser', description: 'Gravure Laser - par minute + matériau' },
  CHAMPS: { icon: 'layers', label: 'Champs', description: 'Gravure Champs - par mètre' },
  PANNEAUX: { icon: 'grid', label: 'Panneaux', description: 'Panneaux - par unité' },
};

type Props = {
  navigation: NativeStackNavigationProp<NewDevisStackParamList, 'MachineSelect'>;
  route: RouteProp<NewDevisStackParamList, 'MachineSelect'>;
};

export function MachineSelectScreen({ navigation, route }: Props) {
  const { devisId } = route.params;
  const { allowedMachines } = useAuthStore();

  const handleSelectMachine = (machineType: MachineType) => {
    navigation.navigate('Calculation', { devisId: devisId!, machineType });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Choisissez une machine</Text>
      <Text style={styles.subtitle}>Sélectionnez le type de gravure à effectuer</Text>

      <View style={styles.machinesGrid}>
        {allowedMachines.map((machineType) => {
          const info = MACHINE_INFO[machineType];
          const color = machineColors[machineType];
          return (
            <TouchableOpacity
              key={machineType}
              style={[styles.machineCard, { borderColor: color }]}
              onPress={() => handleSelectMachine(machineType)}
            >
              <View style={[styles.machineIcon, { backgroundColor: color + '20' }]}>
                <Ionicons name={info.icon as any} size={32} color={color} />
              </View>
              <Text style={styles.machineLabel}>{info.label}</Text>
              <Text style={styles.machineDescription}>{info.description}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.muted,
    marginBottom: 24,
  },
  machinesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  machineCard: {
    width: '47%',
    backgroundColor: colors.background.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    alignItems: 'center',
  },
  machineIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  machineLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  machineDescription: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'center',
  },
});
