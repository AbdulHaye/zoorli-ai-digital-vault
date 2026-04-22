import React, { useState, useEffect } from 'react';
import { ZorliBrandKit } from '../theme/zorli-brand-kit';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSubscriptionStatus, getSubscriptionUsage, cancelSubscription } from '../lib/api';

export default function SubscriptionScreen({ navigation }: any) {
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [subData, usageData] = await Promise.all([
        getSubscriptionStatus(),
        getSubscriptionUsage(),
      ]);
      setSubscription(subData.success ? subData.data : subData);
      setUsage(usageData);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will lose access to premium features.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelSubscription();
              Alert.alert('Success', 'Subscription cancelled successfully');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ZorliBrandKit.colors.vaultBlue} />
      </View>
    );
  }

  const plan = subscription?.plan;
  const maxFiles = (usage?.maxFiles === -1 || plan?.maxFiles === -1) ? '∞' : (usage?.maxFiles || plan?.maxFiles || 10);
  const maxPrompts = (usage?.maxAIPrompts === -1 || plan?.maxAIPrompts === -1) ? '∞' : (usage?.maxAIPrompts || plan?.maxAIPrompts || 20);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.planCard}>
        <Text style={styles.currentPlanTitle}>Current Plan</Text>
        
        <View style={styles.planHeader}>
          <Ionicons name="card-outline" size={32} color={ZorliBrandKit.colors.vaultBlue} />
          <Text style={styles.planName}>{plan?.displayName || 'Free Plan'}</Text>
        </View>
        <Text style={styles.planPrice}>
          ${(plan?.priceMonthly / 100 || 0).toFixed(2)}/month
        </Text>
        <Text style={styles.planStatus}>Status: {subscription?.status || 'active'}</Text>
        
        {subscription?.stripeSubscriptionId && subscription?.currentPeriodStart && subscription?.currentPeriodEnd && (
          <View style={styles.billingPeriodContainer}>
            <View style={styles.billingPeriodRow}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.billingPeriodLabel}>Billing Period</Text>
            </View>
            <Text style={styles.billingPeriodText}>
              {new Date(subscription.currentPeriodStart).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })} - {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
          </View>
        )}
      </View>

      {subscription?.cancelAtPeriodEnd && subscription?.currentPeriodEnd && (
        <View style={styles.cancelWarning}>
          <Ionicons name="alert-circle" size={20} color={ZorliBrandKit.colors.errorRed} />
          <Text style={styles.cancelWarningText}>
            Your subscription will be canceled on{' '}
            {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="trending-up" size={20} color={ZorliBrandKit.colors.vaultBlue} />
          <Text style={styles.sectionTitle}>Usage Statistics</Text>
        </View>
        <View style={styles.usageCard}>
          <View style={styles.usageItem}>
            <Text style={styles.usageLabel}>Files</Text>
            <Text style={styles.usageValue}>
              {usage?.filesCount || 0} / {maxFiles}
            </Text>
          </View>
          <View style={styles.usageItem}>
            <Text style={styles.usageLabel}>AI Prompts</Text>
            <Text style={styles.usageValue}>
              {usage?.aiPromptsCount || 0} / {maxPrompts}
            </Text>
          </View>
          <View style={styles.usageItem}>
            <Text style={styles.usageLabel}>Storage</Text>
            <Text style={styles.usageValue}>
              {((usage?.storageUsedBytes || 0) / (1024 * 1024)).toFixed(1)} MB
            </Text>
          </View>
        </View>
      </View>

      {plan?.features && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featuresCard}>
            {plan.features.map((feature: string, index: number) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={ZorliBrandKit.colors.successGreen} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.actions}>
        {subscription?.status !== 'free' && subscription?.status !== 'canceled' && !subscription?.cancelAtPeriodEnd && (
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={handleCancelSubscription}
          >
            <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.upgradeButton}
          onPress={() => navigation.navigate('Upgrade')}
        >
          <Text style={styles.upgradeButtonText}>
            {subscription?.status === 'free' ? 'Upgrade Plan' : 'Change Plan'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planCard: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  currentPlanTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: ZorliBrandKit.colors.vaultBlue,
    marginTop: 8,
  },
  planStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  billingPeriodContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    width: '100%',
  },
  billingPeriodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  billingPeriodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  billingPeriodText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  cancelWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3F3',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    gap: 8,
  },
  cancelWarningText: {
    flex: 1,
    fontSize: 14,
    color: ZorliBrandKit.colors.errorRed,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  usageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  usageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  usageLabel: {
    fontSize: 16,
    color: '#666',
  },
  usageValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  featuresCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureText: {
    fontSize: 14,
    marginLeft: 12,
  },
  actions: {
    padding: 16,
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: ZorliBrandKit.colors.errorRed,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  upgradeButton: {
    backgroundColor: ZorliBrandKit.colors.vaultBlue,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
