import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ZorliBrandKit } from '../theme/zorli-brand-kit';
import AnimatedCounter from '../components/AnimatedCounter';

type LandingScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

export default function LandingScreen({ navigation }: LandingScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.logoTitle}>Zorli AI Vault</Text>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>
            Secure AI-Powered File Management
          </Text>
          <Text style={styles.heroDescription}>
            Upload, analyze, and manage your files with cutting-edge AI technology. 
            Get instant insights, smart categorization, and secure cloud storage.
          </Text>

          {/* CTA Buttons */}
          <View style={styles.ctaContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('SignUp')}
            >
              <Text style={styles.primaryButtonText}>Sign Up</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('SignIn')}
            >
              <Text style={styles.secondaryButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Feature Badges */}
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Ionicons name="bulb" size={16} color={ZorliBrandKit.colors.vaultBlue} />
              <Text style={styles.badgeText}>AI-Powered Analysis</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="shield-checkmark" size={16} color={ZorliBrandKit.colors.vaultBlue} />
              <Text style={styles.badgeText}>Bank-Level Security</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="cloud" size={16} color={ZorliBrandKit.colors.vaultBlue} />
              <Text style={styles.badgeText}>Cloud Storage</Text>
            </View>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: ZorliBrandKit.colors.vaultBlue }]}>
              <Ionicons name="bulb" size={32} color="#fff" />
            </View>
            <Text style={styles.featureTitle}>AI-Powered Analysis</Text>
            <Text style={styles.featureDescription}>
              Get instant insights from your files with advanced AI analysis. 
              Automatic categorization, sentiment analysis, and content extraction.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: ZorliBrandKit.colors.successGreen }]}>
              <Ionicons name="shield-checkmark" size={32} color="#fff" />
            </View>
            <Text style={styles.featureTitle}>Enterprise Security</Text>
            <Text style={styles.featureDescription}>
              Bank-level encryption and security protocols. Your files are protected with 
              industry-standard security measures and access controls.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: ZorliBrandKit.colors.vaultBlue }]}>
              <Ionicons name="flash" size={32} color="#fff" />
            </View>
            <Text style={styles.featureTitle}>Lightning Fast</Text>
            <Text style={styles.featureDescription}>
              Upload and process files at incredible speeds with our optimized infrastructure. 
              Real-time progress tracking and instant results.
            </Text>
          </View>
        </View>

        {/* How It Works Section */}
        <View style={styles.howItWorksSection}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <Text style={styles.sectionSubtitle}>Get started in three simple steps</Text>
          
          <View style={styles.stepsContainer}>
            <View style={styles.stepCard}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepTitle}>Upload Your Files</Text>
              <Text style={styles.stepDescription}>
                Simply drag and drop your files or click to upload. 
                Support for all major file types and formats.
              </Text>
            </View>
            
            <View style={styles.stepCard}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepTitle}>AI Analysis</Text>
              <Text style={styles.stepDescription}>
                Our AI automatically analyzes your files, extracting insights, 
                categorizing content, and generating summaries.
              </Text>
            </View>
            
            <View style={styles.stepCard}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepTitle}>Get Insights</Text>
              <Text style={styles.stepDescription}>
                View detailed analytics, search through content, and 
                discover patterns in your data with powerful visualizations.
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <AnimatedCounter
              end={10000}
              suffix="+"
              textStyle={styles.statNumber}
              duration={2500}
              delay={200}
              displayFormat="abbreviated"
            />
            <Text style={styles.statLabel}>Files Processed</Text>
          </View>
          <View style={styles.statItem}>
            <AnimatedCounter
              end={99.9}
              suffix="%"
              decimals={1}
              textStyle={styles.statNumber}
              duration={2500}
              delay={400}
            />
            <Text style={styles.statLabel}>Uptime</Text>
          </View>
          <View style={styles.statItem}>
            <AnimatedCounter
              end={500}
              suffix="+"
              textStyle={styles.statNumber}
              duration={2500}
              delay={600}
            />
            <Text style={styles.statLabel}>Happy Users</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>24/7</Text>
            <Text style={styles.statLabel}>Support</Text>
          </View>
        </View>

        {/* Password Vault Feature Highlight */}
        <View style={styles.passwordVaultSection}>
          <View style={styles.vaultCard}>
            <View style={styles.vaultIconContainer}>
              <Ionicons name="lock-closed" size={32} color="#fff" />
            </View>
            <Text style={styles.vaultTitle}>Secure Password Vault</Text>
            <Text style={styles.vaultDescription}>
              Never forget a password again. Store all your credentials in one secure, 
              encrypted vault with military-grade AES-256-GCM encryption.
            </Text>
            
            {/* Feature List */}
            <View style={styles.vaultFeaturesList}>
              <View style={styles.vaultFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color={ZorliBrandKit.colors.vaultBlue} />
                <Text style={styles.vaultFeatureText}>AES-256-GCM encryption for maximum security</Text>
              </View>
              <View style={styles.vaultFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color={ZorliBrandKit.colors.vaultBlue} />
                <Text style={styles.vaultFeatureText}>Store unlimited passwords and credentials</Text>
              </View>
              <View style={styles.vaultFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color={ZorliBrandKit.colors.vaultBlue} />
                <Text style={styles.vaultFeatureText}>Access from anywhere, anytime</Text>
              </View>
              <View style={styles.vaultFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color={ZorliBrandKit.colors.vaultBlue} />
                <Text style={styles.vaultFeatureText}>Batch management and secure deletion</Text>
              </View>
            </View>

            {/* Demo Cards */}
            <View style={styles.vaultDemoContainer}>
              <View style={[styles.vaultDemoCard, styles.vaultDemoCard1]}>
                <Ionicons name="key" size={20} color={ZorliBrandKit.colors.vaultBlue} />
                <View style={styles.vaultDemoText}>
                  <Text style={styles.vaultDemoTitle}>Email Account</Text>
                  <Text style={styles.vaultDemoSubtitle}>user@example.com</Text>
                </View>
                <Ionicons name="lock-closed" size={16} color={ZorliBrandKit.colors.successGreen} />
              </View>
              
              <View style={[styles.vaultDemoCard, styles.vaultDemoCard2]}>
                <Ionicons name="key" size={20} color={ZorliBrandKit.colors.vaultBlue} />
                <View style={styles.vaultDemoText}>
                  <Text style={styles.vaultDemoTitle}>Banking Portal</Text>
                  <Text style={styles.vaultDemoSubtitle}>secure-bank.com</Text>
                </View>
                <Ionicons name="lock-closed" size={16} color={ZorliBrandKit.colors.successGreen} />
              </View>
              
              <View style={[styles.vaultDemoCard, styles.vaultDemoCard3]}>
                <Ionicons name="key" size={20} color={ZorliBrandKit.colors.successGreen} />
                <View style={styles.vaultDemoText}>
                  <Text style={styles.vaultDemoTitle}>Social Media</Text>
                  <Text style={styles.vaultDemoSubtitle}>twitter.com</Text>
                </View>
                <Ionicons name="lock-closed" size={16} color={ZorliBrandKit.colors.successGreen} />
              </View>
            </View>

            <View style={styles.vaultEncryptionBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#8E8E93" />
              <Text style={styles.vaultEncryptionText}>Protected with AES-256-GCM Encryption</Text>
            </View>

            <TouchableOpacity
              style={styles.vaultButton}
              onPress={() => navigation.navigate('SignUp')}
            >
              <Ionicons name="key" size={20} color="#fff" />
              <Text style={styles.vaultButtonText}>Start Using Vault</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pricing Section */}
        <View style={styles.pricingSection}>
          <Text style={styles.pricingTitle}>Choose Your Plan</Text>
          
          {/* Free Plan */}
          <View style={styles.pricingCard}>
            <Text style={styles.planName}>Free</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.currency}>$</Text>
              <Text style={styles.price}>0</Text>
              <Text style={styles.period}>/ month</Text>
            </View>
            <TouchableOpacity
              style={styles.planButton}
              onPress={() => navigation.navigate('SignUp')}
            >
              <Text style={styles.planButtonText}>Get Started</Text>
            </TouchableOpacity>
            <View style={styles.featuresContainer}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark" size={20} color={ZorliBrandKit.colors.vaultBlue} />
                <Text style={styles.featureText}>Upload 10 files per month</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark" size={20} color={ZorliBrandKit.colors.vaultBlue} />
                <Text style={styles.featureText}>20 AI prompts per month</Text>
              </View>
            </View>
          </View>

          {/* Basic Plan */}
          <View style={[styles.pricingCard, styles.recommendedCard]}>
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>Recommended</Text>
            </View>
            <Text style={styles.planName}>Basic</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.currency}>$</Text>
              <Text style={styles.price}>9.97</Text>
              <Text style={styles.period}>/ month</Text>
            </View>
            <TouchableOpacity
              style={styles.planButton}
              onPress={() => navigation.navigate('SignUp')}
            >
              <Text style={styles.planButtonText}>Get Started</Text>
            </TouchableOpacity>
            <View style={styles.featuresContainer}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark" size={20} color={ZorliBrandKit.colors.vaultBlue} />
                <Text style={styles.featureText}>Upload 100 files per month</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark" size={20} color={ZorliBrandKit.colors.vaultBlue} />
                <Text style={styles.featureText}>500 AI prompts per month</Text>
              </View>
            </View>
          </View>

          {/* Plus Plan */}
          <View style={styles.pricingCard}>
            <Text style={styles.planName}>Plus</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.currency}>$</Text>
              <Text style={styles.price}>19.97</Text>
              <Text style={styles.period}>/ month</Text>
            </View>
            <TouchableOpacity
              style={styles.planButton}
              onPress={() => navigation.navigate('SignUp')}
            >
              <Text style={styles.planButtonText}>Get Started</Text>
            </TouchableOpacity>
            <View style={styles.featuresContainer}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark" size={20} color={ZorliBrandKit.colors.vaultBlue} />
                <Text style={styles.featureText}>Unlimited file uploads</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark" size={20} color={ZorliBrandKit.colors.vaultBlue} />
                <Text style={styles.featureText}>Unlimited AI prompts</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer CTA */}
        <View style={styles.footerCTA}>
          <Text style={styles.footerTitle}>Ready to Get Started?</Text>
          <TouchableOpacity
            style={styles.footerButton}
            onPress={() => navigation.navigate('SignUp')}
          >
            <Text style={styles.footerButtonText}>Create Your Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: ZorliBrandKit.colors.vaultBlue,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#1C1C1E',
    lineHeight: 40,
  },
  heroDescription: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  ctaContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: ZorliBrandKit.colors.vaultBlue,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  secondaryButtonText: {
    color: '#1C1C1E',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  featuresSection: {
    paddingHorizontal: 20,
    gap: 20,
    marginTop: 20,
  },
  featureCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1C1C1E',
  },
  featureDescription: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6B7280',
    lineHeight: 20,
  },
  howItWorksSection: {
    paddingHorizontal: 20,
    marginTop: 40,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1C1C1E',
  },
  sectionSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 32,
    lineHeight: 24,
  },
  stepsContainer: {
    gap: 20,
  },
  stepCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  stepNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ZorliBrandKit.colors.vaultBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumberText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1C1C1E',
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6B7280',
    lineHeight: 20,
  },
  statsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: 32,
    gap: 16,
  },
  statItem: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: ZorliBrandKit.colors.vaultBlue,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  passwordVaultSection: {
    paddingHorizontal: 20,
    marginTop: 40,
  },
  vaultCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E0E7FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  vaultIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: ZorliBrandKit.colors.vaultBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  vaultTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  vaultDescription: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  vaultFeaturesList: {
    marginBottom: 24,
  },
  vaultFeatureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  vaultFeatureText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  vaultDemoContainer: {
    marginBottom: 20,
  },
  vaultDemoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  vaultDemoCard1: {
    backgroundColor: '#FAF5FF',
  },
  vaultDemoCard2: {
    backgroundColor: '#EFF6FF',
  },
  vaultDemoCard3: {
    backgroundColor: '#F0FDF4',
  },
  vaultDemoText: {
    flex: 1,
  },
  vaultDemoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  vaultDemoSubtitle: {
    fontSize: 11,
    color: '#6B7280',
  },
  vaultEncryptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  vaultEncryptionText: {
    fontSize: 11,
    color: '#8E8E93',
  },
  vaultButton: {
    backgroundColor: ZorliBrandKit.colors.vaultBlue,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  vaultButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pricingSection: {
    paddingHorizontal: 20,
    marginTop: 40,
  },
  pricingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
    color: '#1C1C1E',
  },
  pricingCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  recommendedCard: {
    borderWidth: 2,
    borderColor: ZorliBrandKit.colors.vaultBlue,
  },
  recommendedBadge: {
    backgroundColor: ZorliBrandKit.colors.vaultBlue,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  recommendedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1C1C1E',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  currency: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  price: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  period: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  planButton: {
    backgroundColor: ZorliBrandKit.colors.vaultBlue,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 24,
  },
  planButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  featuresContainer: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  footerCTA: {
    paddingHorizontal: 20,
    marginTop: 40,
    alignItems: 'center',
  },
  footerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1C1C1E',
  },
  footerButton: {
    backgroundColor: ZorliBrandKit.colors.vaultBlue,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: '100%',
  },
  footerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});
