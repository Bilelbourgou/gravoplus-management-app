import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { financialApi, invoicesApi } from '../../services';
import type { FinancialStats, CaisseDevis, FinancialClosure } from '../../types';

const { width } = Dimensions.get('window');

type TabKey = 'devis' | 'recettes' | 'employees' | 'depenses' | 'historique';

const formatCurrency = (amount: number) => `${amount.toFixed(3)} TND`;

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const formatDateShort = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR');
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon', VALIDATED: 'Validé', INVOICED: 'Facturé', CANCELLED: 'Annulé',
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#f97316', VALIDATED: '#3b82f6', INVOICED: '#22c55e', CANCELLED: '#ef4444',
};

export function AdminFinanceScreen({ navigation }: any) {
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [caisseDevis, setCaisseDevis] = useState<CaisseDevis[]>([]);
  const [history, setHistory] = useState<FinancialClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('devis');
  const [expandedDevisId, setExpandedDevisId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Payment modal
  const [paymentDevis, setPaymentDevis] = useState<CaisseDevis | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Espèces');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // Closure modal
  const [closureModalVisible, setClosureModalVisible] = useState(false);
  const [closureNotes, setClosureNotes] = useState('');
  const [closureLoading, setClosureLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [devisData, statsData, historyData] = await Promise.all([
        financialApi.getCaisseDevis(),
        financialApi.getStats(),
        financialApi.getHistory(),
      ]);
      setCaisseDevis(devisData);
      setStats(statsData);
      setHistory(historyData);
    } catch (error) {
      console.error('Error fetching caisse data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const filteredDevis = useMemo(() => {
    let list = caisseDevis;
    if (statusFilter) list = list.filter(d => d.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d =>
        d.reference.toLowerCase().includes(q) ||
        d.client?.name?.toLowerCase().includes(q) ||
        `${d.createdBy?.firstName} ${d.createdBy?.lastName}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [caisseDevis, statusFilter, searchQuery]);

  const devisSummary = useMemo(() => {
    const total = caisseDevis.reduce((s, d) => s + Number(d.totalAmount), 0);
    return { total, count: caisseDevis.length };
  }, [caisseDevis]);

  const handleClosePeriod = async () => {
    setClosureLoading(true);
    try {
      await financialApi.createClosure(closureNotes || undefined);
      setClosureModalVisible(false);
      setClosureNotes('');
      Alert.alert('Succès', 'Caisse clôturée avec succès');
      await fetchData();
    } catch (error: any) {
      Alert.alert('Erreur', error?.response?.data?.message || 'Échec de la clôture');
    } finally {
      setClosureLoading(false);
    }
  };

  const handleCreatePayment = async () => {
    if (!paymentDevis) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) { Alert.alert('Erreur', 'Montant invalide'); return; }
    const totalPaid = (paymentDevis.payments || []).reduce((s, p) => s + Number(p.amount), 0);
    const remaining = Number(paymentDevis.totalAmount) - totalPaid;
    if (amount > remaining) { Alert.alert('Erreur', `Dépasse le reste (${remaining.toFixed(3)} TND)`); return; }
    setPaymentLoading(true);
    try {
      await financialApi.createCaissePayment({
        amount, devisId: paymentDevis.id, paymentMethod,
        description: `Paiement pour devis ${paymentDevis.reference} - ${paymentDevis.client?.name || ''}`,
      });
      setPaymentDevis(null); setPaymentAmount('');
      Alert.alert('Succès', 'Paiement enregistré');
      await fetchData();
    } catch (error: any) {
      Alert.alert('Erreur', error?.response?.data?.message || 'Impossible d\'enregistrer');
    } finally { setPaymentLoading(false); }
  };

  const handleInvoiceDevis = (devisId: string) => {
    Alert.alert('Facturer', 'Créer une facture pour ce devis ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Facturer', onPress: async () => {
        setInvoiceLoading(true);
        try {
          await invoicesApi.createFromDevis([devisId]);
          Alert.alert('Succès', 'Facture créée');
          await fetchData();
        } catch (e: any) {
          Alert.alert('Erreur', e?.response?.data?.message || 'Impossible de facturer');
        } finally { setInvoiceLoading(false); }
      }},
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Chargement de la caisse...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Caisse & Finances</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── Top Stats Cards (always visible) ── */}
        <View style={styles.topStatsRow}>
          <View style={[styles.topStatCard, { borderLeftColor: '#22c55e' }]}>
            <Text style={[styles.topStatValue, { fontSize: 16 }]}>{devisSummary.total.toFixed(3)}</Text>
            <Text style={styles.topStatLabel}>Montant Total</Text>
          </View>
          <View style={[styles.topStatCard, { borderLeftColor: '#ef4444' }]}>
            <Text style={[styles.topStatValue, { fontSize: 16, color: '#ef4444' }]}>{Number(stats?.totalExpense || 0).toFixed(3)}</Text>
            <Text style={styles.topStatLabel}>Dépenses</Text>
          </View>
          <View style={[styles.topStatCard, { borderLeftColor: (stats?.balance || 0) >= 0 ? '#22c55e' : '#ef4444' }]}>
            <Text style={[styles.topStatValue, { fontSize: 16, color: (stats?.balance || 0) >= 0 ? '#22c55e' : '#ef4444' }]}>{Number(stats?.balance || 0).toFixed(3)}</Text>
            <Text style={styles.topStatLabel}>Solde Caisse</Text>
          </View>
        </View>

        {/* ── Session Info + Closure Button ── */}
        <View style={styles.sessionRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sessionTitle}>
              Session: <Text style={{ color: colors.primary[500] }}>{stats?.scope === 'ADMIN_LEVEL' ? 'Caisse Admin' : 'Caisse Employés'}</Text>
            </Text>
            <Text style={styles.sessionDate}>
              Ouverture: {stats?.periodStart ? formatDate(stats.periodStart) : 'Première Session'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closureBtn}
            onPress={() => setClosureModalVisible(true)}
          >
            <Ionicons name="lock-closed" size={16} color="#fff" />
            <Text style={styles.closureBtnText}>Clôturer</Text>
          </TouchableOpacity>
        </View>

        {/* ── Tabs ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer} contentContainerStyle={styles.tabsContent}>
          {([
            { key: 'devis', label: 'Devis', icon: 'document-text' },
            { key: 'recettes', label: 'Recettes', icon: 'trending-up' },
            { key: 'employees', label: 'Par Employé', icon: 'people' },
            { key: 'depenses', label: 'Dépenses', icon: 'trending-down' },
            { key: 'historique', label: 'Historique', icon: 'time' },
          ] as { key: TabKey; label: string; icon: string }[]).map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, activeTab === t.key && styles.activeTab]}
              onPress={() => setActiveTab(t.key)}
            >
              <Ionicons name={t.icon as any} size={16} color={activeTab === t.key ? colors.primary[500] : colors.text.muted} />
              <Text style={[styles.tabText, activeTab === t.key && styles.activeTabText]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ===== DEVIS TAB ===== */}
        {activeTab === 'devis' && (
          <>
            {/* Search and filter */}
            <View style={styles.filterRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color={colors.text.muted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher..."
                  placeholderTextColor={colors.text.muted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            {/* Status filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <TouchableOpacity
                style={[styles.filterChip, !statusFilter && styles.filterChipActive]}
                onPress={() => setStatusFilter('')}
              >
                <Text style={[styles.filterChipText, !statusFilter && styles.filterChipTextActive]}>Tous</Text>
              </TouchableOpacity>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.filterChip, statusFilter === key && styles.filterChipActive]}
                  onPress={() => setStatusFilter(statusFilter === key ? '' : key)}
                >
                  <View style={[styles.filterDot, { backgroundColor: STATUS_COLORS[key] }]} />
                  <Text style={[styles.filterChipText, statusFilter === key && styles.filterChipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Devis list */}
            {filteredDevis.map((devis) => {
              const isExpanded = expandedDevisId === devis.id;
              const totalPaid = (devis.payments || []).reduce((s, p) => s + Number(p.amount), 0);
              const totalAmount = Number(devis.totalAmount);
              const remaining = totalAmount - totalPaid;
              const isFullyPaid = totalPaid >= totalAmount && totalAmount > 0;
              const pct = totalAmount > 0 ? Math.min(100, (totalPaid / totalAmount) * 100) : 0;
              const statusColor = STATUS_COLORS[devis.status] || colors.text.muted;

              return (
                <View key={devis.id} style={styles.devisCard}>
                  <TouchableOpacity
                    style={styles.devisCardHeader}
                    onPress={() => setExpandedDevisId(isExpanded ? null : devis.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.devisRef}>{devis.reference}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                          <Text style={[styles.statusBadgeText, { color: statusColor }]}>{STATUS_LABELS[devis.status]}</Text>
                        </View>
                      </View>
                      <Text style={styles.devisClient}>{devis.client?.name || 'N/A'}</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.devisCreatedBy}>
                          {devis.createdBy?.firstName} {devis.createdBy?.lastName}
                        </Text>
                        <Text style={styles.devisTotal}>{totalAmount.toFixed(3)} TND</Text>
                      </View>
                      {/* Progress bar */}
                      <View style={styles.progressRow}>
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, { width: `${pct}%` }]} />
                        </View>
                        <Text style={styles.progressLabel}>{totalPaid.toFixed(3)}/{totalAmount.toFixed(3)}</Text>
                      </View>
                    </View>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.text.muted} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.expandedPanel}>
                      {/* Lines */}
                      {(devis.lines || []).length > 0 && (
                        <View style={styles.expandedSection}>
                          <Text style={styles.expandedTitle}>Lignes</Text>
                          {(devis.lines || []).map((line) => (
                            <View key={line.id} style={styles.expandedRow}>
                              <Text style={styles.expandedRowText} numberOfLines={1}>
                                {line.description || line.machineType}{line.material ? ` (${line.material.name})` : ''}
                              </Text>
                              <Text style={styles.expandedRowAmount}>{Number(line.lineTotal).toFixed(3)}</Text>
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
                              <Text style={styles.expandedRowAmount}>{Number(svc.price).toFixed(3)}</Text>
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
                                {p.paymentMethod || 'Espèces'} - {formatDateShort(p.paymentDate)}
                              </Text>
                              {p.createdBy && (
                                <Text style={{ fontSize: 11, color: colors.text.muted }}>
                                  par {p.createdBy.firstName} {p.createdBy.lastName}
                                </Text>
                              )}
                            </View>
                            <Text style={[styles.expandedRowAmount, { color: '#22c55e' }]}>+{Number(p.amount).toFixed(3)}</Text>
                          </View>
                        )) : <Text style={{ fontSize: 13, color: colors.text.muted }}>Aucun paiement</Text>}
                      </View>
                      {devis.invoice && (
                        <View style={{ backgroundColor: '#22c55e10', borderRadius: 8, padding: 10, marginBottom: 10 }}>
                          <Text style={{ fontSize: 13, color: '#22c55e', fontWeight: '600' }}>
                            Facturé: {devis.invoice.reference}
                          </Text>
                        </View>
                      )}
                      {/* Actions */}
                      <View style={styles.devisActions}>
                        {!isFullyPaid && devis.status !== 'INVOICED' && devis.status !== 'CANCELLED' && (
                          <TouchableOpacity
                            style={styles.devisActionBtn}
                            onPress={() => { setPaymentDevis(devis); setPaymentAmount(String(remaining.toFixed(3))); }}
                          >
                            <Ionicons name="card" size={16} color="#fff" />
                            <Text style={styles.devisActionText}>Payer ({remaining.toFixed(3)})</Text>
                          </TouchableOpacity>
                        )}
                        {isFullyPaid && !devis.invoice && (
                          <TouchableOpacity
                            style={[styles.devisActionBtn, { backgroundColor: '#22c55e' }]}
                            onPress={() => handleInvoiceDevis(devis.id)}
                            disabled={invoiceLoading}
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

            {filteredDevis.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={colors.text.muted} />
                <Text style={styles.emptyStateText}>Aucun devis</Text>
              </View>
            )}
          </>
        )}

        {/* ===== RECETTES TAB ===== */}
        {activeTab === 'recettes' && (
          <View style={styles.listContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>Date</Text>
              <Text style={[styles.tableHeaderText, { flex: 3 }]}>Client / Devis</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Mode</Text>
              <Text style={[styles.tableHeaderText, { flex: 2, textAlign: 'right' }]}>Montant</Text>
            </View>
            {stats?.payments && stats.payments.length > 0 ? (
              stats.payments.map((p, index) => (
                <View key={p.id} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, { flex: 2, fontSize: 12 }]}>{formatDateShort(p.paymentDate)}</Text>
                  <View style={{ flex: 3 }}>
                    <Text style={[styles.tableCell, { fontWeight: '500' }]} numberOfLines={1}>
                      {p.devis?.client?.name || p.invoice?.client?.name || p.description || '-'}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.text.muted }} numberOfLines={1}>
                      {p.devis?.reference || p.invoice?.reference || '-'}
                    </Text>
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <View style={[styles.statusBadge, { backgroundColor: '#3b82f620', alignSelf: 'flex-start' }]}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: '#3b82f6' }}>{p.paymentMethod || 'Espèces'}</Text>
                    </View>
                  </View>
                  <Text style={[styles.tableCell, { flex: 2, textAlign: 'right', color: '#22c55e', fontWeight: '600' }]}>+{Number(p.amount).toFixed(3)}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="trending-up-outline" size={48} color={colors.text.muted} />
                <Text style={styles.emptyStateText}>Aucune recette pour cette session</Text>
              </View>
            )}
          </View>
        )}

        {/* ===== PAR EMPLOYÉ TAB ===== */}
        {activeTab === 'employees' && (
          <View style={styles.listContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>Employé</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Nbr</Text>
              <Text style={[styles.tableHeaderText, { flex: 2, textAlign: 'right' }]}>Total</Text>
            </View>
            {stats?.revenueByEmployee && stats.revenueByEmployee.length > 0 ? (
              stats.revenueByEmployee.map((item, index) => (
                <View key={item.employeeId} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, { flex: 2, fontWeight: '500' }]}>{item.employeeName}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{item.paymentCount}</Text>
                  <Text style={[styles.tableCell, { flex: 2, textAlign: 'right', color: '#22c55e', fontWeight: '600' }]}>{formatCurrency(item.totalAmount)}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={colors.text.muted} />
                <Text style={styles.emptyStateText}>Aucune recette par employé</Text>
              </View>
            )}
          </View>
        )}

        {/* ===== DÉPENSES TAB ===== */}
        {activeTab === 'depenses' && (
          <View style={styles.listContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>Date</Text>
              <Text style={[styles.tableHeaderText, { flex: 3 }]}>Description</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Catégorie</Text>
              <Text style={[styles.tableHeaderText, { flex: 2, textAlign: 'right' }]}>Montant</Text>
            </View>
            {stats?.expenses && stats.expenses.length > 0 ? (
              stats.expenses.map((e, index) => (
                <View key={e.id} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, { flex: 2, fontSize: 12 }]}>{formatDateShort(e.date)}</Text>
                  <View style={{ flex: 3 }}>
                    <Text style={[styles.tableCell, { fontWeight: '500' }]} numberOfLines={1}>{e.description}</Text>
                    <Text style={{ fontSize: 11, color: colors.text.muted }}>
                      {e.createdBy?.firstName} {e.createdBy?.lastName}
                    </Text>
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <View style={[styles.statusBadge, { backgroundColor: '#f9731620', alignSelf: 'flex-start' }]}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: '#f97316' }}>{e.category}</Text>
                    </View>
                  </View>
                  <Text style={[styles.tableCell, { flex: 2, textAlign: 'right', color: '#ef4444', fontWeight: '700' }]}>-{Number(e.amount).toFixed(3)}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="trending-down-outline" size={48} color={colors.text.muted} />
                <Text style={styles.emptyStateText}>Aucune dépense pour cette session</Text>
              </View>
            )}
          </View>
        )}

        {/* ===== HISTORIQUE TAB ===== */}
        {activeTab === 'historique' && (
          <View style={styles.listContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2.5 }]}>Date / Période</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Recettes</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Dépenses</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Solde</Text>
            </View>
            {history.length > 0 ? (
              history.map((item, index) => (
                <View key={item.id} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt, { flexDirection: 'column', gap: 4 }]}>

                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 2.5 }}>
                      <Text style={[styles.tableCell, { fontWeight: '500', fontSize: 13 }]}>{formatDate(item.closureDate)}</Text>
                      <Text style={{ fontSize: 11, color: colors.text.muted }}>
                        {formatDateShort(item.periodStart)} → {formatDateShort(item.periodEnd)}
                      </Text>
                      {item.notes ? <Text style={{ fontSize: 11, color: colors.text.muted, fontStyle: 'italic', marginTop: 2 }}>{item.notes}</Text> : null}
                    </View>
                    <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right', color: '#22c55e', fontWeight: '600' }]}>{Number(item.totalIncome).toFixed(3)}</Text>
                    <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right', color: '#ef4444', fontWeight: '600' }]}>{Number(item.totalExpense).toFixed(3)}</Text>
                    <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right', fontWeight: '700' }]}>{Number(item.balance || 0).toFixed(3)}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={48} color={colors.text.muted} />
                <Text style={styles.emptyStateText}>Aucune clôture effectuée</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={!!paymentDevis} animationType="slide" transparent>
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Paiement - {paymentDevis?.reference}</Text>
              <TouchableOpacity onPress={() => { setPaymentDevis(null); setPaymentAmount(''); }}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentInfoLabel}>Client</Text>
                <Text style={styles.paymentInfoValue}>{paymentDevis?.client?.name}</Text>
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentInfoLabel}>Reste à payer</Text>
                <Text style={[styles.paymentInfoValue, { color: '#ef4444' }]}>
                  {paymentDevis ? (Number(paymentDevis.totalAmount) - (paymentDevis.payments || []).reduce((s, p) => s + Number(p.amount), 0)).toFixed(3) : '0'} TND
                </Text>
              </View>
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.formLabel}>Montant (TND)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="0.000"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="decimal-pad"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                />
              </View>
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.formLabel}>Méthode de paiement</Text>
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
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setPaymentDevis(null); setPaymentAmount(''); }}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, paymentLoading && { opacity: 0.7 }]}
                onPress={handleCreatePayment}
                disabled={paymentLoading}
              >
                {paymentLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Enregistrer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Closure Modal */}
      <Modal visible={closureModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Clôturer la Caisse</Text>
              <TouchableOpacity onPress={() => setClosureModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <Text style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 16 }}>
                Vous êtes sur le point de clôturer la session de caisse.
              </Text>
              <View style={styles.closureSummary}>
                <View style={styles.closureSummaryRow}>
                  <Text style={styles.closureSummaryLabel}>Recettes Totales</Text>
                  <Text style={[styles.closureSummaryValue, { color: '#22c55e' }]}>{Number(stats?.totalIncome || 0).toFixed(3)} TND</Text>
                </View>
                <View style={styles.closureSummaryRow}>
                  <Text style={styles.closureSummaryLabel}>Dépenses Totales</Text>
                  <Text style={[styles.closureSummaryValue, { color: '#ef4444' }]}>{Number(stats?.totalExpense || 0).toFixed(3)} TND</Text>
                </View>
                <View style={[styles.closureSummaryRow, { borderTopWidth: 2, borderTopColor: colors.border.default, paddingTop: 12, marginTop: 4 }]}>

                  <Text style={[styles.closureSummaryLabel, { fontWeight: '700' }]}>Solde en Caisse</Text>
                  <Text style={[styles.closureSummaryValue, { fontWeight: '700', fontSize: 18 }]}>{Number(stats?.balance || 0).toFixed(3)} TND</Text>
                </View>
              </View>
              <View style={{ marginTop: 16 }}>
                <Text style={styles.formLabel}>Notes de Clôture</Text>
                <TextInput
                  style={[styles.formInput, { minHeight: 80, textAlignVertical: 'top' }]}
                  placeholder="Ex: Écart de caisse, Vérifié par..."
                  placeholderTextColor={colors.text.muted}
                  value={closureNotes}
                  onChangeText={setClosureNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setClosureModalVisible(false)} disabled={closureLoading}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, closureLoading && { opacity: 0.7 }]}
                onPress={handleClosePeriod}
                disabled={closureLoading}
              >
                {closureLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Confirmer</Text>}
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
  loadingText: { marginTop: 12, color: colors.text.muted },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: colors.background.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text.primary },
  tabsContainer: { backgroundColor: colors.background.surface, maxHeight: 52 },
  tabsContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 8, backgroundColor: colors.background.base,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  activeTab: { backgroundColor: colors.background.elevated, borderColor: colors.primary[500] },
  tabText: { marginLeft: 6, fontSize: 13, fontWeight: '500', color: colors.text.muted },
  activeTabText: { color: colors.primary[500], fontWeight: '600' },
  content: { padding: 16, paddingBottom: 40 },
  // Devis tab
  filterRow: { marginBottom: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background.elevated,
    borderRadius: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border.default,
  },
  searchInput: { flex: 1, paddingVertical: 12, paddingLeft: 10, fontSize: 15, color: colors.text.primary },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 20, backgroundColor: colors.background.elevated, marginRight: 8,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  filterChipActive: { backgroundColor: colors.primary[500] + '20', borderColor: colors.primary[500] },
  filterChipText: { fontSize: 12, fontWeight: '500', color: colors.text.muted },
  filterChipTextActive: { color: colors.primary[500], fontWeight: '600' },
  filterDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  // Devis card
  devisCard: {
    backgroundColor: colors.background.surface, borderRadius: 12, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border.subtle, overflow: 'hidden',
  },
  devisCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  devisRef: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  devisClient: { fontSize: 13, color: colors.text.secondary, marginTop: 4 },
  devisCreatedBy: { fontSize: 11, color: colors.text.muted, marginTop: 4 },
  devisTotal: { fontSize: 15, fontWeight: '700', color: colors.primary[500] },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  progressBar: { flex: 1, height: 5, backgroundColor: colors.background.elevated, borderRadius: 3 },
  progressFill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 3 },
  progressLabel: { fontSize: 11, color: colors.text.muted },
  // Expanded panel
  expandedPanel: { padding: 14, borderTopWidth: 1, borderTopColor: colors.border.subtle, backgroundColor: colors.background.elevated },
  expandedSection: { marginBottom: 14 },
  expandedTitle: { fontSize: 12, fontWeight: '600', color: colors.text.secondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  expandedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  expandedRowText: { fontSize: 13, color: colors.text.secondary, flex: 1 },
  expandedRowAmount: { fontSize: 13, fontWeight: '600', color: colors.text.primary, marginLeft: 8 },
  devisActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  devisActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.primary[500], padding: 10, borderRadius: 8,
  },
  devisActionText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  // Top stats
  topStatsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  topStatCard: {
    flex: 1, backgroundColor: colors.background.surface, padding: 14, borderRadius: 12,
    borderLeftWidth: 4, borderWidth: 1, borderColor: colors.border.subtle,
  },
  topStatValue: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
  topStatLabel: { fontSize: 11, color: colors.text.muted, marginTop: 4 },
  // Session row
  sessionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.background.surface, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border.subtle, marginBottom: 16,
  },
  sessionTitle: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  sessionDate: { fontSize: 12, color: colors.text.muted, marginTop: 4 },
  closureBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary[500], paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8,
  },
  closureBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  // Closure modal
  closureSummary: {
    backgroundColor: colors.background.elevated, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  closureSummaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
  },
  closureSummaryLabel: { fontSize: 14, color: colors.text.secondary },
  closureSummaryValue: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  // Table styles (shared)
  listContainer: {
    backgroundColor: colors.background.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border.subtle, overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row', padding: 12, backgroundColor: colors.background.elevated,
    borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
  },
  tableHeaderText: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
  tableRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border.subtle, alignItems: 'center' },
  tableRowAlt: { backgroundColor: colors.background.base },
  tableCell: { fontSize: 14, color: colors.text.primary },
  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyStateText: { marginTop: 12, color: colors.text.muted, fontSize: 14 },
  // Payment modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.background.base, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '60%', width: '100%', maxWidth: 600, alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: colors.text.primary },
  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: colors.border.subtle },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.background.elevated, alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: colors.text.secondary },
  confirmBtn: { flex: 2, padding: 14, borderRadius: 12, backgroundColor: colors.primary[500], alignItems: 'center' },
  confirmBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  paymentInfo: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
  },
  paymentInfoLabel: { fontSize: 14, color: colors.text.muted },
  paymentInfoValue: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  formLabel: { fontSize: 14, fontWeight: '500', color: colors.text.secondary, marginBottom: 8 },
  formInput: {
    backgroundColor: colors.background.elevated, borderRadius: 12, padding: 14, fontSize: 16,
    color: colors.text.primary, borderWidth: 1, borderColor: colors.border.default,
  },
  methodRow: { flexDirection: 'row', gap: 8 },
  methodChip: {
    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
    backgroundColor: colors.background.elevated, borderWidth: 1, borderColor: colors.border.default,
  },
  methodChipActive: { backgroundColor: colors.primary[500] + '20', borderColor: colors.primary[500] },
  methodChipText: { fontSize: 13, fontWeight: '500', color: colors.text.muted },
  methodChipTextActive: { color: colors.primary[500], fontWeight: '600' },
});
