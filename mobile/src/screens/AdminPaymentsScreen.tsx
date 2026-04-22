import React, { useState, useEffect } from 'react';
import { ZorliBrandKit } from '../theme/zorli-brand-kit';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAdminPayments } from '../lib/api';

export default function AdminPaymentsScreen() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const data = await getAdminPayments();
      setPayments(data);
    } catch (error) {
      console.error('Error loading payments:', error);
      Alert.alert('Error', 'Failed to load payment data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPayments();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return ZorliBrandKit.colors.successGreen;
      case 'canceled':
      case 'past_due':
        return ZorliBrandKit.colors.errorRed;
      default:
        return '#8E8E93';
    }
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ZorliBrandKit.colors.vaultBlue} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ZorliBrandKit.colors.vaultBlue} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="cash-outline" size={28} color={ZorliBrandKit.colors.vaultBlue} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Payment Management</Text>
            <Text style={styles.subtitle}>View and manage all payment transactions</Text>
          </View>
        </View>
      </View>

      {payments.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color="#C7C7CC" />
          <Text style={styles.emptyText}>No payments found</Text>
        </View>
      ) : (
        <View style={styles.paymentsList}>
          {payments.map((payment) => (
            <View key={payment.id} style={styles.paymentCard}>
              {/* User Info */}
              <View style={styles.paymentHeader}>
                <View style={styles.userSection}>
                  <Ionicons name="person-circle-outline" size={40} color={ZorliBrandKit.colors.vaultBlue} />
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{payment.username || 'N/A'}</Text>
                    <Text style={styles.userEmail}>{payment.userEmail}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(payment.status) }]}>
                  <Text style={styles.statusText}>{formatStatus(payment.status)}</Text>
                </View>
              </View>

              {/* Payment Details */}
              <View style={styles.paymentDetails}>
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Plan</Text>
                    <View style={styles.planBadge}>
                      <Text style={styles.planText}>
                        {payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Amount Paid</Text>
                    <Text style={styles.amountText}>${payment.amountUSD}</Text>
                  </View>
                </View>

                {payment.periodStart && payment.periodEnd && (
                  <View style={styles.periodSection}>
                    <Text style={styles.detailLabel}>Billing Period</Text>
                    <View style={styles.periodDates}>
                      <Text style={styles.periodDate}>{formatDate(payment.periodStart)}</Text>
                      <Ionicons name="arrow-forward" size={16} color="#8E8E93" />
                      <Text style={styles.periodDate}>{formatDate(payment.periodEnd)}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Payment Date</Text>
                    <Text style={styles.detailValue}>{formatDate(payment.createdAt)}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  paymentsList: {
    padding: 16,
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  userEmail: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  paymentDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  planBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  planText: {
    fontSize: 13,
    fontWeight: '600',
    color: ZorliBrandKit.colors.vaultBlue,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: ZorliBrandKit.colors.successGreen,
  },
  periodSection: {
    marginTop: 4,
  },
  periodDates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  periodDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
});
