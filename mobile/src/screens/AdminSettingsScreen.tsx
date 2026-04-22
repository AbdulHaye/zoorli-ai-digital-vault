import React, { useState, useEffect } from 'react';
import { ZorliBrandKit } from '../theme/zorli-brand-kit';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getCurrentUser, refreshUser } from '../lib/auth';
import { updateUsername, uploadProfilePicture, getSignedUrl, removeProfilePicture } from '../lib/api';

export default function AdminSettingsScreen() {
  const [user, setUser] = useState<any>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Use refreshUser() to fetch fresh data from server instead of cached data
      const userData = await refreshUser();
      setUser(userData);
      setNewUsername(userData?.username || '');
      
      // Load profile picture if exists
      if (userData?.profilePictureUrl) {
        const signedUrl = await getSignedUrl(userData.profilePictureUrl);
        setProfilePictureUrl(signedUrl);
      } else {
        setProfilePictureUrl(null);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to update your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      await uploadProfilePicture(uri);
      await refreshUser();
      await loadUserData();
      Alert.alert('Success', 'Profile picture updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload profile picture');
    }
  };

  const handleRemoveProfilePicture = () => {
    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeProfilePicture();
              await refreshUser();
              await loadUserData();
              Alert.alert('Success', 'Profile picture removed successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove profile picture');
            }
          },
        },
      ]
    );
  };

  const handleSaveUsername = async () => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(newUsername)) {
      Alert.alert(
        'Invalid Username',
        'Username must be 3-20 characters long and contain only letters, numbers, and underscores'
      );
      return;
    }

    try {
      await updateUsername(newUsername);
      await refreshUser();
      await loadUserData();
      setIsEditingUsername(false);
      Alert.alert('Success', 'Username updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update username');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getInitials = () => {
    if (user?.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'AD';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ZorliBrandKit.colors.vaultBlue} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your account settings and preferences</Text>
      </View>

      {/* Profile Information Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile Information</Text>
        <Text style={styles.cardDescription}>Your personal account details</Text>

        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarContainer}>
              {profilePictureUrl ? (
                <Image source={{ uri: profilePictureUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{getInitials()}</Text>
                </View>
              )}
            </View>
            <View style={styles.avatarButtons}>
              <TouchableOpacity 
                style={styles.avatarButton}
                onPress={handlePickImage}
              >
                <Ionicons name="camera" size={14} color={ZorliBrandKit.colors.vaultBlue} />
                <Text style={styles.avatarButtonText}>Change</Text>
              </TouchableOpacity>
              {profilePictureUrl && (
                <TouchableOpacity 
                  style={[styles.avatarButton, styles.removeButton]}
                  onPress={handleRemoveProfilePicture}
                >
                  <Ionicons name="trash-outline" size={14} color={ZorliBrandKit.colors.errorRed} />
                  <Text style={[styles.avatarButtonText, styles.removeButtonText]}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.username || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.badges}>
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#FFF" />
                <Text style={styles.badgeText}>Administrator</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.separator} />

        {/* Username */}
        <View style={styles.infoRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="person" size={20} color={ZorliBrandKit.colors.vaultBlue} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Username</Text>
            {isEditingUsername ? (
              <View style={styles.editContainer}>
                <TextInput
                  value={newUsername}
                  onChangeText={setNewUsername}
                  style={styles.input}
                  placeholder="Enter new username"
                />
                <View style={styles.editButtons}>
                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveUsername}>
                    <Ionicons name="checkmark" size={20} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setIsEditingUsername(false);
                      setNewUsername(user?.username || '');
                    }}
                  >
                    <Ionicons name="close" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.valueRow}>
                <Text style={styles.infoValue}>{user?.username || 'N/A'}</Text>
                <TouchableOpacity onPress={() => setIsEditingUsername(true)}>
                  <Ionicons name="create-outline" size={20} color={ZorliBrandKit.colors.vaultBlue} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Email */}
        <View style={styles.infoRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail" size={20} color={ZorliBrandKit.colors.vaultBlue} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Email Address</Text>
            <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
          </View>
        </View>

        {/* Member Since */}
        <View style={styles.infoRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="calendar" size={20} color={ZorliBrandKit.colors.vaultBlue} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>{formatDate(user?.createdAt)}</Text>
          </View>
        </View>
      </View>
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
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: ZorliBrandKit.colors.vaultBlue,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarWrapper: {
    alignItems: 'center',
    marginRight: 16,
  },
  avatarContainer: {
    marginBottom: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
  },
  avatarButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f0f8ff',
  },
  avatarButtonText: {
    fontSize: 11,
    fontWeight: '500',
  },
  removeButton: {
    backgroundColor: '#FFF3F3',
  },
  removeButtonText: {
    color: ZorliBrandKit.colors.errorRed,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  userEmail: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ZorliBrandKit.colors.errorRed,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editContainer: {
    marginTop: 4,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    backgroundColor: ZorliBrandKit.colors.vaultBlue,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
