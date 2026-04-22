import React, { useState, useEffect } from 'react';
import { ZorliBrandKit } from '../theme/zorli-brand-kit';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createCheckoutSession, getSubscriptionStatus } from '../lib/api';

interface Plan {
  id: string;
  name: string;
  displayName: string;
  price: number;
  stripePriceId: string | null;
  maxFiles: number;
  maxPrompts: number;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    displayName: 'Free Plan',
    price: 0,
    stripePriceId: null,
    maxFiles: 10,
    maxPrompts: 20,
    features: [
      '10 file uploads',
      '20 AI analyses per month',
      'Basic file management',
      'Password vault',
    ],
  },
  {
    id: 'basic',
    name: 'Basic',
    displayName: 'Basic',
    price: 9.97,
    stripePriceId: 'price_1SLQXvP7PiwxdBzDzLndco8H',
    maxFiles: 100,
    maxPrompts: 500,
    features: [
      '100 file uploads',
      '500 AI analyses per month',
      'Unlimited password vault',
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    displayName: 'Plus',
    price: 19.97,
    stripePriceId: 'price_1SLQZaP7PiwxdBzDquOM273o',
    maxFiles: -1,
    maxPrompts: -1,
    features: [
      'Unlimited file uploads',
      'Unlimited AI analyses',
      'Unlimited password vault',
    ],
  },
];

export default function UpgradeScreen() {
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState(false);

  useEffect(() => {
    loadCurrentSubscription();
  }, []);

  const loadCurrentSubscription = async () => {
    try {
      const response = await getSubscriptionStatus();
      if (response.success && response.data) {
        setCurrentSubscription(response.data);
        setSubscriptionError(false);
      } else {
        console.error('Failed to load subscription:', response.error);
        setSubscriptionError(true);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
      setSubscriptionError(true);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const handleUpgrade = async (plan: Plan) => {
    if (plan.id === 'free') {
      Alert.alert('Info', 'You are already on the free plan');
      return;
    }

    if (!plan.stripePriceId) {
      Alert.alert('Error', 'This plan is not available yet');
      return;
    }

    setLoading(true);
    try {
      const response = await createCheckoutSession(plan.stripePriceId, plan.name);
      
      if (response.success && response.data?.url) {
        const canOpen = await Linking.canOpenURL(response.data.url);
        if (canOpen) {
          await Linking.openURL(response.data.url);
        } else {
          Alert.alert('Error', 'Unable to open checkout page. Please try again.');
        }
      } else {
        const errorMessage = response.error || 'Unable to create checkout session. Please try again.';
        Alert.alert('Error', errorMessage);
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      Alert.alert('Error', error.message || 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  // Determine current plan name (case-insensitive comparison)
  // Only identify current plan if subscription loaded successfully
  const currentPlanName = currentSubscription?.plan?.name?.toLowerCase();
  const isCurrentPlan = (planId: string) => {
    // Don't mark any plan as current if subscription failed to load
    if (subscriptionError || !currentPlanName) {
      return false;
    }
    return planId.toLowerCase() === currentPlanName;
  };

  if (loadingSubscription) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ZorliBrandKit.colors.vaultBlue} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>Upgrade to unlock more features</Text>
      </View>

      {PLANS.map((plan) => {
        const isCurrent = isCurrentPlan(plan.id);
        
        return (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.planCard,
              selectedPlan === plan.id && styles.planCardSelected,
              isCurrent && styles.currentPlanCard,
            ]}
            onPress={() => setSelectedPlan(plan.id)}
            disabled={loading || isCurrent}
          >
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planName}>{plan.displayName}</Text>
                <Text style={styles.planPrice}>
                  {plan.price === 0 ? 'Free' : `$${plan.price}/month`}
                </Text>
              </View>
              {isCurrent ? (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Current Plan</Text>
                </View>
              ) : selectedPlan === plan.id ? (
                <Ionicons name="checkmark-circle" size={32} color={ZorliBrandKit.colors.vaultBlue} />
              ) : null}
            </View>

          <View style={styles.planLimits}>
            <View style={styles.limitItem}>
              <Ionicons name="folder-outline" size={16} color="#666" />
              <Text style={styles.limitText}>
                {plan.maxFiles === -1 ? 'Unlimited' : plan.maxFiles} files
              </Text>
            </View>
            <View style={styles.limitItem}>
              <Ionicons name="chatbubbles-outline" size={16} color="#666" />
              <Text style={styles.limitText}>
                {plan.maxPrompts === -1 ? 'Unlimited' : plan.maxPrompts} AI analyses
              </Text>
            </View>
          </View>

          <View style={styles.features}>
            {plan.features.map((feature, index) => (
              <View key={index} style={styles.feature}>
                <Ionicons name="checkmark" size={16} color={ZorliBrandKit.colors.successGreen} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          {isCurrent ? (
            <View style={styles.currentPlanButton}>
              <Text style={styles.currentPlanButtonText}>Your Active Plan</Text>
            </View>
          ) : plan.id !== 'free' ? (
            <TouchableOpacity
              style={[styles.selectButton, loading && styles.selectButtonDisabled]}
              onPress={() => handleUpgrade(plan)}
              disabled={loading}
            >
              {loading && selectedPlan === plan.id ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.selectButtonText}>
                  Get {plan.displayName}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>
      );
      })}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          All plans include secure file storage, password vault, and AI assistance
        </Text>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  planCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: ZorliBrandKit.colors.vaultBlue,
  },
  currentPlanCard: {
    borderColor: ZorliBrandKit.colors.successGreen,
    backgroundColor: '#F0FFF4',
  },
  currentBadge: {
    backgroundColor: ZorliBrandKit.colors.successGreen,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  planPrice: {
    fontSize: 16,
    color: ZorliBrandKit.colors.vaultBlue,
    marginTop: 4,
  },
  planLimits: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  limitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  limitText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  features: {
    marginBottom: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    marginLeft: 8,
  },
  selectButton: {
    backgroundColor: ZorliBrandKit.colors.vaultBlue,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButtonDisabled: {
    opacity: 0.5,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  currentPlanButton: {
    backgroundColor: '#E8F5E9',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  currentPlanButtonText: {
    color: ZorliBrandKit.colors.successGreen,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
