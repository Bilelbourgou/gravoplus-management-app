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
import { usersApi } from '../../services';
import { colors, machineColors } from '../../theme/colors';
import type { User, MachineType, CreateUserInput } from '../../types';

const MACHINE_TYPES: MachineType[] = ['CNC', 'LASER', 'CHAMPS', 'PANNEAUX', 'SERVICE_MAINTENANCE', 'PLIAGE'];

export function AdminEmployeesScreen() {
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<CreateUserInput>({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'EMPLOYEE',
    machines: [],
  });

  const fetchEmployees = async () => {
    try {
      const data = await usersApi.getAll();
      setEmployees(data.filter((u) => u.role === 'EMPLOYEE'));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEmployees();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEmployees();
    setRefreshing(false);
  };

  const openModal = (employee?: User) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        username: employee.username,
        password: '',
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: 'EMPLOYEE',
        machines: employee.allowedMachines?.map((m) => m.machine) || [],
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        username: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'EMPLOYEE',
        machines: [],
      });
    }
    setModalVisible(true);
  };

  const toggleMachine = (machine: MachineType) => {
    const machines = formData.machines || [];
    if (machines.includes(machine)) {
      setFormData({ ...formData, machines: machines.filter((m) => m !== machine) });
    } else {
      setFormData({ ...formData, machines: [...machines, machine] });
    }
  };

  const handleSave = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.username.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!editingEmployee && !formData.password) {
      Alert.alert('Erreur', 'Le mot de passe est obligatoire');
      return;
    }

    setSaving(true);
    try {
      if (editingEmployee) {
        const updateData: Partial<CreateUserInput> = {
          firstName: formData.firstName,
          lastName: formData.lastName,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await usersApi.update(editingEmployee.id, updateData);
        if (formData.machines) {
          await usersApi.assignMachines(editingEmployee.id, formData.machines);
        }
      } else {
        await usersApi.create(formData);
      }
      setModalVisible(false);
      fetchEmployees();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'employé');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (employee: User) => {
    Alert.alert(
      'Supprimer l\'employé',
      `Voulez-vous vraiment supprimer "${employee.firstName} ${employee.lastName}" ?\nCette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await usersApi.delete(employee.id);
              fetchEmployees();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer l\'employé');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: User }) => (
    <TouchableOpacity style={styles.employeeCard} onPress={() => openModal(item)}>
      <View style={styles.employeeInfo}>
        <View style={[styles.avatar, !item.isActive && styles.avatarInactive]}>
          <Text style={styles.avatarText}>
            {item.firstName.charAt(0)}{item.lastName.charAt(0)}
          </Text>
        </View>
        <View style={styles.employeeDetails}>
          <View style={styles.nameRow}>
            <Text style={styles.employeeName}>
              {item.firstName} {item.lastName}
            </Text>
            {!item.isActive && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Inactif</Text>
              </View>
            )}
          </View>
          <Text style={styles.username}>@{item.username}</Text>
          {item.allowedMachines && item.allowedMachines.length > 0 && (
            <View style={styles.machinesRow}>
              {item.allowedMachines.map((m) => (
                <View
                  key={m.id}
                  style={[styles.machineBadge, { backgroundColor: machineColors[m.machine] + '20' }]}
                >
                  <Text style={[styles.machineBadgeText, { color: machineColors[m.machine] }]}>
                    {m.machine}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
        <Ionicons name="person-remove-outline" size={20} color={colors.error[500]} />
      </TouchableOpacity>
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
        <Text style={styles.title}>Employés</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={employees}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[500]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={colors.text.muted} />
            <Text style={styles.emptyText}>Aucun employé</Text>
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
                {editingEmployee ? 'Modifier l\'employé' : 'Nouvel employé'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Prénom *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Prénom"
                    placeholderTextColor={colors.text.muted}
                    value={formData.firstName}
                    onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Nom *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nom"
                    placeholderTextColor={colors.text.muted}
                    value={formData.lastName}
                    onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nom d'utilisateur *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="username"
                  placeholderTextColor={colors.text.muted}
                  autoCapitalize="none"
                  editable={!editingEmployee}
                  value={formData.username}
                  onChangeText={(text) => setFormData({ ...formData, username: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Mot de passe {editingEmployee ? '(laisser vide pour ne pas changer)' : '*'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.text.muted}
                  secureTextEntry
                  value={formData.password}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Machines autorisées</Text>
                <View style={styles.machinesGrid}>
                  {MACHINE_TYPES.map((machine) => {
                    const isSelected = formData.machines?.includes(machine);
                    return (
                      <TouchableOpacity
                        key={machine}
                        style={[
                          styles.machineOption,
                          isSelected && { backgroundColor: machineColors[machine], borderColor: machineColors[machine] },
                        ]}
                        onPress={() => toggleMachine(machine)}
                      >
                        <Text
                          style={[
                            styles.machineOptionText,
                            isSelected && { color: '#fff' },
                          ]}
                        >
                          {machine}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.base },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.base },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    width: '100%', maxWidth: 600, alignSelf: 'center',
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.text.primary },
  addButton: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary[500],
    justifyContent: 'center', alignItems: 'center',
  },
  list: { width: '100%', maxWidth: 600, alignSelf: 'center', flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  employeeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.background.surface, padding: 16, borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  employeeInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary[500],
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  avatarInactive: { backgroundColor: colors.text.muted },
  avatarText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  employeeDetails: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  employeeName: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  inactiveBadge: { backgroundColor: colors.error[500] + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  inactiveBadgeText: { fontSize: 10, fontWeight: '600', color: colors.error[500] },
  username: { fontSize: 13, color: colors.text.muted, marginTop: 2 },
  machinesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  machineBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  machineBadgeText: { fontSize: 10, fontWeight: '600' },
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
  row: { flexDirection: 'row', gap: 12 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: colors.text.secondary, marginBottom: 8 },
  input: {
    backgroundColor: colors.background.elevated, borderRadius: 12, padding: 16, fontSize: 16,
    color: colors.text.primary, borderWidth: 1, borderColor: colors.border.default,
  },
  machinesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  machineOption: {
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10,
    backgroundColor: colors.background.elevated, borderWidth: 2, borderColor: colors.border.default,
  },
  machineOptionText: { fontSize: 14, fontWeight: '600', color: colors.text.secondary },
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
