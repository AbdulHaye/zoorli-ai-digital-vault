import React, { useState, useEffect } from 'react';
import { ZorliBrandKit } from '../theme/zorli-brand-kit';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { getCredentials, saveCredential, deleteCredential } from '../lib/api';
import type { AccountCredential } from '../types';

export default function PasswordsScreen() {
  const [credentials, setCredentials] = useState<AccountCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Partial<AccountCredential>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCredentials, setSelectedCredentials] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const data = await getCredentials();
      setCredentials(data);
    } catch (error) {
      console.error('Error loading credentials:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCredentials();
  };

  const handleSave = async () => {
    if (!editingCredential.serviceName || !editingCredential.username || 
        (!isEditing && !editingCredential.password)) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      // Normalize optional fields: convert empty strings to null
      const dataToSave: any = {
        ...editingCredential,
        website: editingCredential.website?.trim() || null,
        notes: editingCredential.notes?.trim() || null,
        category: editingCredential.category?.trim() || null,
      };
      
      // If editing and password is empty, don't include it
      if (isEditing && !editingCredential.password) {
        delete dataToSave.password;
      }

      await saveCredential(dataToSave);
      setModalVisible(false);
      setEditingCredential({});
      setIsEditing(false);
      loadCredentials();
      Alert.alert('Success', isEditing ? 'Password updated successfully' : 'Password saved successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (credential: AccountCredential) => {
    setEditingCredential({
      id: credential.id,
      serviceName: credential.serviceName,
      username: credential.username,
      password: '', // Don't pre-fill for security
      website: credential.website || '',
      notes: credential.notes || '',
      category: credential.category || '',
    });
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Password',
      'Are you sure you want to delete this password?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteCredential(id);
              loadCredentials();
              Alert.alert('Success', 'Password deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', `${label} copied to clipboard`);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const handleLongPress = (id: string) => {
    setSelectionMode(true);
    setSelectedCredentials([id]);
  };

  const toggleCredentialSelection = (id: string) => {
    if (selectedCredentials.includes(id)) {
      const newSelection = selectedCredentials.filter(cId => cId !== id);
      setSelectedCredentials(newSelection);
      if (newSelection.length === 0) {
        setSelectionMode(false);
      }
    } else {
      setSelectedCredentials([...selectedCredentials, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedCredentials.length === filteredCredentials.length) {
      setSelectedCredentials([]);
      setSelectionMode(false);
    } else {
      setSelectedCredentials(filteredCredentials.map(c => c.id));
      setSelectionMode(true);
    }
  };

  const handleDeleteSelected = async () => {
    Alert.alert(
      'Delete Passwords',
      `Are you sure you want to delete ${selectedCredentials.length} password(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            const failedDeletions: string[] = [];
            let successCount = 0;

            for (const id of selectedCredentials) {
              try {
                await deleteCredential(id);
                successCount++;
              } catch (error) {
                console.error(`Failed to delete credential ${id}:`, error);
                failedDeletions.push(id);
              }
            }
            
            loadCredentials();

            if (failedDeletions.length === 0) {
              Alert.alert('Success', `${successCount} password(s) deleted successfully`);
              setSelectedCredentials([]);
              setSelectionMode(false);
            } else {
              Alert.alert(
                'Partial Deletion',
                `${successCount} password(s) deleted, but ${failedDeletions.length} failed. The failed items remain selected for retry.`
              );
              // Keep only the failed items selected for retry
              setSelectedCredentials(failedDeletions);
            }
            
            setIsDeleting(false);
          },
        },
      ]
    );
  };

  const renderCredential = ({ item }: { item: AccountCredential }) => {
    const isSelected = selectedCredentials.includes(item.id);
    
    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(item.id)}
        onPress={() => {
          if (selectionMode) {
            toggleCredentialSelection(item.id);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.credentialCard, isSelected && styles.credentialCardSelected]}>
          <View style={styles.cardHeader}>
            <View style={styles.credentialInfo}>
              {selectionMode && (
                <Ionicons 
                  name={isSelected ? "checkbox" : "square-outline"} 
                  size={24} 
                  color={ZorliBrandKit.colors.vaultBlue} 
                  style={styles.checkbox}
                />
              )}
              <Ionicons name="key-outline" size={32} color={ZorliBrandKit.colors.vaultBlue} />
              <View style={styles.credentialDetails}>
                <Text style={styles.serviceName}>{item.serviceName}</Text>
                <Text style={styles.username}>{item.username}</Text>
                {item.category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{item.category}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

      {item.website && (
        <View style={styles.websiteContainer}>
          <Text style={styles.websiteLabel}>Website:</Text>
          <Text style={styles.websiteUrl} numberOfLines={1}>{item.website}</Text>
        </View>
      )}

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          value={visiblePasswords[item.id] ? item.password : '••••••••••••'}
          editable={false}
          secureTextEntry={false}
        />
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => togglePasswordVisibility(item.id)}
        >
          <Ionicons
            name={visiblePasswords[item.id] ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#666"
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => copyToClipboard(item.password, 'Password')}
        >
          <Ionicons name="copy-outline" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {item.notes && (
        <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>
      )}

          {!selectionMode && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEdit(item)}
              >
                <Ionicons name="create-outline" size={16} color={ZorliBrandKit.colors.vaultBlue} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item.id)}
              >
                <Ionicons name="trash-outline" size={16} color={ZorliBrandKit.colors.errorRed} />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Filter credentials based on search query
  const filteredCredentials = credentials.filter((credential) => {
    const query = searchQuery.toLowerCase();
    return (
      credential.serviceName.toLowerCase().includes(query) ||
      credential.username.toLowerCase().includes(query) ||
      (credential.website?.toLowerCase() || '').includes(query) ||
      (credential.category?.toLowerCase() || '').includes(query)
    );
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ZorliBrandKit.colors.vaultBlue} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Full-Screen Loading Overlay */}
      {isDeleting && (
        <Modal
          transparent={true}
          visible={isDeleting}
          animationType="fade"
        >
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={ZorliBrandKit.colors.vaultBlue} />
              <Text style={styles.loadingText}>Deleting password(s), please wait...</Text>
            </View>
          </View>
        </Modal>
      )}
      
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search passwords..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Password Vault</Text>
        <Text style={styles.headerSubtitle}>
          Securely manage your account credentials with AES-256-GCM encryption
        </Text>
      </View>

      {selectionMode && (
        <View style={styles.selectionControls}>
          <TouchableOpacity 
            style={styles.selectAllButton}
            onPress={toggleSelectAll}
          >
            <Ionicons 
              name={selectedCredentials.length === filteredCredentials.length ? "checkbox" : "square-outline"} 
              size={24} 
              color={ZorliBrandKit.colors.vaultBlue} 
            />
            <Text style={styles.selectAllText}>
              {selectedCredentials.length === filteredCredentials.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.deleteSelectedButton}
            onPress={handleDeleteSelected}
            disabled={selectedCredentials.length === 0}
          >
            <Ionicons name="trash-outline" size={24} color={selectedCredentials.length > 0 ? ZorliBrandKit.colors.errorRed : "#999"} />
            <Text style={[styles.deleteSelectedText, selectedCredentials.length === 0 && styles.disabledText]}>
              Delete ({selectedCredentials.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredCredentials}
        renderItem={renderCredential}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons 
              name={searchQuery ? "search-outline" : "lock-closed-outline"} 
              size={64} 
              color="#ccc" 
            />
            <Text style={styles.emptyText}>
              {searchQuery ? "No passwords found" : "No passwords saved"}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? "Try a different search term" : "Add your first password to get started"}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setEditingCredential({});
          setIsEditing(false);
          setModalVisible(true);
        }}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          setEditingCredential({});
          setIsEditing(false);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Edit Password' : 'Add Password'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setEditingCredential({});
                  setIsEditing(false);
                }}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <TextInput
                style={styles.input}
                placeholder="Service Name *"
                value={editingCredential.serviceName || ''}
                onChangeText={(text) => setEditingCredential({ ...editingCredential, serviceName: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="Username *"
                value={editingCredential.username || ''}
                onChangeText={(text) => setEditingCredential({ ...editingCredential, username: text })}
              />

              <TextInput
                style={styles.input}
                placeholder={isEditing ? "Password (leave empty to keep current)" : "Password *"}
                value={editingCredential.password || ''}
                onChangeText={(text) => setEditingCredential({ ...editingCredential, password: text })}
                secureTextEntry
              />

              <TextInput
                style={styles.input}
                placeholder="Website (optional)"
                value={editingCredential.website || ''}
                onChangeText={(text) => setEditingCredential({ ...editingCredential, website: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="Category (optional)"
                value={editingCredential.category || ''}
                onChangeText={(text) => setEditingCredential({ ...editingCredential, category: text })}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Notes (optional)"
                value={editingCredential.notes || ''}
                onChangeText={(text) => setEditingCredential({ ...editingCredential, notes: text })}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity 
                style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {isEditing ? 'Update Password' : 'Save Password'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    padding: 0,
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  list: {
    padding: 16,
  },
  credentialCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  credentialCardSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: ZorliBrandKit.colors.vaultBlue,
  },
  checkbox: {
    marginRight: 12,
  },
  cardHeader: {
    marginBottom: 12,
  },
  credentialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  credentialDetails: {
    marginLeft: 12,
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  username: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  categoryBadge: {
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#000',
  },
  websiteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  websiteLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  websiteUrl: {
    fontSize: 14,
    color: ZorliBrandKit.colors.vaultBlue,
    flex: 1,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  iconButton: {
    padding: 8,
    marginLeft: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  notes: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: ZorliBrandKit.colors.errorRed,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: ZorliBrandKit.colors.vaultBlue,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalScroll: {
    maxHeight: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#99C7FF',
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectionControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  deleteSelectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  deleteSelectedText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    color: '#fff',
  },
  disabledText: {
    color: '#999',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
});
