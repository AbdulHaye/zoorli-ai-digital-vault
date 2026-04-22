import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { getDashboardStats, getSubscriptionUsage, getSignedUrl } from '../lib/api';
import { refreshUser, getAuthHeaders } from '../lib/auth';
import { ZorliBrandKit } from '../theme/zorli-brand-kit';

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

export default function DashboardScreen({ navigation }: any) {
  const [stats, setStats] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const maxRecordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeRecordingRef = useRef<Audio.Recording | null>(null);

  const loadProfileImage = async (userData: any) => {
    if (!userData?.profilePictureUrl) {
      setProfileImageUrl(null);
      return;
    }

    // If it's a storage path (starts with users/), fetch signed URL
    if (userData.profilePictureUrl.startsWith('users/')) {
      const signedUrl = await getSignedUrl(userData.profilePictureUrl);
      if (signedUrl) {
        setProfileImageUrl(signedUrl);
      } else {
        // Retry once on failure
        const retryUrl = await getSignedUrl(userData.profilePictureUrl);
        setProfileImageUrl(retryUrl);
      }
    } else {
      // Legacy format - use as-is
      setProfileImageUrl(`${API_URL}${userData.profilePictureUrl}`);
    }
  };

  const loadData = async () => {
    try {
      const [statsData, usageData, userData] = await Promise.all([
        getDashboardStats(),
        getSubscriptionUsage(),
        refreshUser(),
      ]);
      setStats(statsData);
      setUsage(usageData);
      setUser(userData);
      
      // Load profile image with signed URL
      if (userData) {
        await loadProfileImage(userData);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    setupAudio();
    
    // Cleanup timers and recording on unmount
    return () => {
      if (activeRecordingRef.current) {
        try {
          activeRecordingRef.current.stopAndUnloadAsync().catch(err => 
            console.error('Error stopping recording on unmount:', err)
          );
        } catch (error) {
          console.error('Error stopping recording on unmount:', error);
        }
      }
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (maxRecordingTimeoutRef.current) {
        clearTimeout(maxRecordingTimeoutRef.current);
      }
    };
  }, []);
  
  const setupAudio = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    } catch (error) {
      console.error('Failed to setup audio:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      navigation.navigate('Smart Finder', { initialMessage: searchQuery.trim() });
      setSearchQuery('');
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Microphone access is required for voice input');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      activeRecordingRef.current = newRecording;
      setIsRecording(true);
      
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      maxRecordingTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 60000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      if (maxRecordingTimeoutRef.current) {
        clearTimeout(maxRecordingTimeoutRef.current);
        maxRecordingTimeoutRef.current = null;
      }

      setIsRecording(false);
      setRecordingTime(0);
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      setRecording(null);
      activeRecordingRef.current = null;
      
      if (uri) {
        setIsTranscribing(true);
        await transcribeAudio(uri);
        setIsTranscribing(false);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsTranscribing(false);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const transcribeAudio = async (audioUri: string) => {
    try {
      const formData = new FormData();
      
      const audioFile = {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any;
      
      formData.append('audio', audioFile);

      const authHeaders = await getAuthHeaders();
      const { 'Content-Type': _, ...headersWithoutContentType } = authHeaders;

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/ai/transcribe`, {
        method: 'POST',
        headers: headersWithoutContentType,
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      setSearchQuery(data.text || '');
    } catch (error) {
      console.error('Transcription error:', error);
      setIsTranscribing(false);
      Alert.alert('Error', 'Failed to transcribe audio. Please try typing your message.');
    }
  };

  const handleVoiceInput = () => {
    if (isRecording) {
      stopRecording();
    } else if (!isTranscribing) {
      startRecording();
    }
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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.logoTitleContainer}>
              <Image 
                source={require('../../assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.title}>Zorli</Text>
            </View>
            <Text style={styles.subtitle}>Welcome back, {user?.username || 'User'}!</Text>
          </View>
          {profileImageUrl ? (
            <Image
              source={{ uri: profileImageUrl }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Ionicons name="person" size={24} color={ZorliBrandKit.colors.vaultBlue} />
            </View>
          )}
        </View>
      </View>

      {/* AI Search Field */}
      <View style={styles.searchSection}>
        <Text style={styles.sectionTitle}>Search your files</Text>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="What are you looking for?"
            value={isTranscribing ? 'Transcribing...' : searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="send"
            editable={!isTranscribing}
          />
          <TouchableOpacity 
            onPress={handleVoiceInput}
            disabled={isTranscribing}
            style={styles.micButton}
          >
            {isTranscribing ? (
              <ActivityIndicator size="small" color={ZorliBrandKit.colors.vaultBlue} />
            ) : isRecording ? (
              <View style={styles.recordingIndicator}>
                <Ionicons name="mic" size={20} color={ZorliBrandKit.colors.errorRed} />
                <Text style={styles.recordingTime}>{recordingTime}s</Text>
              </View>
            ) : (
              <Ionicons 
                name="mic" 
                size={20} 
                color={ZorliBrandKit.colors.vaultBlue}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleSearchSubmit}
            disabled={!searchQuery.trim()}
            style={styles.sendButton}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={searchQuery.trim() ? ZorliBrandKit.colors.vaultBlue : "#ccc"} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Usage Stats</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="folder-outline" size={32} color={ZorliBrandKit.colors.vaultBlue} />
            <Text style={styles.statValue}>{usage?.filesCount || 0}</Text>
            <Text style={styles.statLabel}>Files Uploaded</Text>
          </View>

        <View style={styles.statCard}>
          <Ionicons name="chatbubbles-outline" size={32} color={ZorliBrandKit.colors.successGreen} />
          <Text style={styles.statValue}>{usage?.aiPromptsCount || 0}</Text>
          <Text style={styles.statLabel}>AI Analyses</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="archive-outline" size={32} color={ZorliBrandKit.colors.vaultBlue} />
          <Text style={styles.statValue}>
            {((usage?.storageUsedBytes || 0) / (1024 * 1024)).toFixed(1)} MB
          </Text>
          <Text style={styles.statLabel}>Storage Used</Text>
        </View>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Vault')}
        >
          <Ionicons name="cloud-upload-outline" size={24} color={ZorliBrandKit.colors.vaultBlue} />
          <Text style={styles.actionText}>Upload Files</Text>
          <Ionicons name="chevron-forward" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Smart Finder')}
        >
          <Ionicons name="chatbubbles-outline" size={24} color={ZorliBrandKit.colors.successGreen} />
          <Text style={styles.actionText}>Chat with AI</Text>
          <Ionicons name="chevron-forward" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Subscription')}
        >
          <Ionicons name="card-outline" size={24} color={ZorliBrandKit.colors.vaultBlue} />
          <Text style={styles.actionText}>View Subscription</Text>
          <Ionicons name="chevron-forward" size={24} color="#ccc" />
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
  header: {
    padding: 20,
    backgroundColor: '#fff',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  logoTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 32,
    height: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: ZorliBrandKit.colors.vaultBlue,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
  },
  profilePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: '1%',
    marginBottom: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  micButton: {
    marginLeft: 12,
    padding: 4,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recordingTime: {
    fontSize: 12,
    color: ZorliBrandKit.colors.errorRed,
    fontWeight: '600',
  },
  sendButton: {
    marginLeft: 12,
    padding: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
});
