import React, { useState, useEffect, useCallback } from 'react';
import { ZorliBrandKit } from '../theme/zorli-brand-kit';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { signOut, getCurrentUser, refreshUser } from '../lib/auth';
import { getSubscriptionStatus, uploadProfilePicture, updateUsername, getSignedUrl, removeProfilePicture } from '../lib/api';

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

export default function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    loadProfileImage();
  }, [user?.profilePictureUrl]);

  // Refresh profile image on screen focus to handle URL expiry
  useFocusEffect(
    useCallback(() => {
      loadProfileImage();
    }, [user?.profilePictureUrl])
  );

  const loadUserData = async () => {
    try {
      // Use refreshUser() to fetch fresh data from server instead of cached data
      const userData = await refreshUser();
      const subData = await getSubscriptionStatus();
      setUser(userData);
      setSubscription(subData.success ? subData.data : subData);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfileImage = async () => {
    if (!user?.profilePictureUrl) {
      setProfileImageUrl(null);
      return;
    }

    // If it's a storage path (starts with users/), fetch signed URL
    if (user.profilePictureUrl.startsWith('users/')) {
      const signedUrl = await getSignedUrl(user.profilePictureUrl);
      if (signedUrl) {
        setProfileImageUrl(signedUrl);
      } else {
        // Retry once on failure
        const retryUrl = await getSignedUrl(user.profilePictureUrl);
        setProfileImageUrl(retryUrl);
      }
    } else {
      // Legacy format - use as-is
      setProfileImageUrl(`${API_URL}${user.profilePictureUrl}`);
    }
  };

  const handleProfilePictureChange = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to upload a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.uri;
      
      // Validate file size (max 5MB)
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Profile picture must be less than 5MB');
        return;
      }
      
      try {
        setUploading(true);
        await uploadProfilePicture(uri);
        
        // Refresh user data from server
        const updatedUser = await refreshUser();
        if (updatedUser) {
          setUser(updatedUser);
          Alert.alert('Success', 'Profile picture updated successfully');
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to upload profile picture');
      } finally {
        setUploading(false);
      }
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
              setUploading(true);
              await removeProfilePicture();
              
              // Refresh user data from server
              const updatedUser = await refreshUser();
              if (updatedUser) {
                setUser(updatedUser);
                Alert.alert('Success', 'Profile picture removed successfully');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove profile picture');
            } finally {
              setUploading(false);
            }
          },
        },
      ]
    );
  };

  const handleUsernameEdit = () => {
    setNewUsername(user?.username || '');
    setUsernameError('');
    setIsEditingUsername(true);
  };

  const handleUsernameSave = async () => {
    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(newUsername)) {
      setUsernameError('Username must be 3-20 characters long and contain only letters, numbers, and underscores');
      return;
    }

    try {
      setSavingUsername(true);
      await updateUsername(newUsername);
      
      // Refresh user data from server
      const updatedUser = await refreshUser();
      if (updatedUser) {
        setUser(updatedUser);
        setIsEditingUsername(false);
        setUsernameError('');
        Alert.alert('Success', 'Username updated successfully');
      }
    } catch (error: any) {
      setUsernameError(error.message);
      Alert.alert('Error', error.message || 'Failed to update username');
    } finally {
      setSavingUsername(false);
    }
  };

  const handleUsernameCancel = () => {
    setIsEditingUsername(false);
    setUsernameError('');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadUserData();
    } catch (error) {
      console.error('Error refreshing profile data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
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

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            {profileImageUrl ? (
              <Image 
                source={{ uri: profileImageUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {user?.username ? user.username.substring(0, 2).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.avatarButtons}>
            <TouchableOpacity 
              style={styles.avatarButton}
              onPress={handleProfilePictureChange}
              disabled={uploading}
            >
              <Ionicons name="camera" size={16} color={ZorliBrandKit.colors.vaultBlue} />
              <Text style={styles.avatarButtonText}>Change</Text>
            </TouchableOpacity>
            {profileImageUrl && (
              <TouchableOpacity 
                style={[styles.avatarButton, styles.removeButton]}
                onPress={handleRemoveProfilePicture}
                disabled={uploading}
              >
                <Ionicons name="trash-outline" size={16} color={ZorliBrandKit.colors.errorRed} />
                <Text style={[styles.avatarButtonText, styles.removeButtonText]}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity 
          style={styles.nameContainer}
          onPress={handleUsernameEdit}
        >
          <Text style={styles.name}>
            {user?.username || user?.email || 'User'}
          </Text>
          <Ionicons name="create-outline" size={18} color={ZorliBrandKit.colors.vaultBlue} style={styles.editIcon} />
        </TouchableOpacity>
        
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('Subscription')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="card-outline" size={24} color={ZorliBrandKit.colors.vaultBlue} />
            <View style={styles.menuItemText}>
              <Text style={styles.menuItemTitle}>
                {subscription?.plan?.displayName || 'Free Plan'}
              </Text>
              <Text style={styles.menuItemSubtitle}>
                {subscription?.status || 'active'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('Upgrade')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="rocket-outline" size={24} color={ZorliBrandKit.colors.successGreen} />
            <Text style={styles.menuItemTitle}>Upgrade Plan</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="mail-outline" size={24} color="#666" />
            <Text style={styles.menuItemTitle}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#666" />
            <Text style={styles.menuItemTitle}>
              Role: {user?.role || 'user'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity 
          style={[styles.menuItem, styles.signOutButton]}
          onPress={handleSignOut}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="log-out-outline" size={24} color={ZorliBrandKit.colors.errorRed} />
            <Text style={[styles.menuItemTitle, styles.signOutText]}>Sign Out</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.version}>Zorli AI Vault v1.0.0</Text>
      </View>

      {/* Username Edit Modal */}
      <Modal
        visible={isEditingUsername}
        animationType="slide"
        transparent={true}
        onRequestClose={handleUsernameCancel}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Username</Text>
              <TouchableOpacity onPress={handleUsernameCancel}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Username must be 3-20 characters long and contain only letters, numbers, and underscores
            </Text>

            <TextInput
              style={[styles.input, usernameError ? styles.inputError : null]}
              placeholder="Username"
              value={newUsername}
              onChangeText={(text) => {
                setNewUsername(text);
                setUsernameError('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {usernameError ? (
              <Text style={styles.errorText}>{usernameError}</Text>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleUsernameCancel}
                disabled={savingUsername}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.saveButton,
                  savingUsername && styles.saveButtonDisabled
                ]}
                onPress={handleUsernameSave}
                disabled={savingUsername}
              >
                {savingUsername ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ZorliBrandKit.colors.vaultBlue + '15',
  },
  avatarFallbackText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: ZorliBrandKit.colors.vaultBlue,
  },
  avatarButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f8ff',
  },
  avatarButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  removeButton: {
    backgroundColor: '#FFF3F3',
  },
  removeButtonText: {
    color: ZorliBrandKit.colors.errorRed,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  editIcon: {
    marginLeft: 8,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 20,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    marginLeft: 12,
  },
  menuItemTitle: {
    fontSize: 16,
    marginLeft: 12,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  signOutButton: {
    borderBottomWidth: 0,
  },
  signOutText: {
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  version: {
    fontSize: 12,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  inputError: {
    borderColor: ZorliBrandKit.colors.errorRed,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: ZorliBrandKit.colors.vaultBlue,
    marginLeft: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#A0C4E8',
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
