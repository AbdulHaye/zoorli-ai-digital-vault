import React, { useState, useEffect } from 'react';
import { ZorliBrandKit } from '../theme/zorli-brand-kit';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAdminUsers, getAdminSubscriptionStats, getAdminUsageStats, getSignedUrl, deleteUser } from '../lib/api';
import { refreshUser, signOut } from '../lib/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

export default function AdminScreen({ navigation }: any) {
  const [users, setUsers] = useState<any[]>([]);
  const [subscriptionStats, setSubscriptionStats] = useState<any>(null);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

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
    } else if (userData.profilePictureUrl.startsWith('http://') || userData.profilePictureUrl.startsWith('https://')) {
      // Absolute URL - use as-is
      setProfileImageUrl(userData.profilePictureUrl);
    } else {
      // Relative path - prefix with API_URL
      setProfileImageUrl(`${API_URL}${userData.profilePictureUrl}`);
    }
  };

  const loadData = async () => {
    try {
      const [usersData, subStats, usage, userData] = await Promise.all([
        getAdminUsers(),
        getAdminSubscriptionStats(),
        getAdminUsageStats(),
        refreshUser(),
      ]);
      setUsers(usersData);
      setSubscriptionStats(subStats);
      setUsageStats(usage);
      setUser(userData);

      // Load profile image with signed URL
      if (userData) {
        await loadProfileImage(userData);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      Alert.alert(
        'Error Loading Data',
        'Failed to load admin dashboard data. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDeleteUser = (userId: string, username: string) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete user "${username}"? This action cannot be undone and will permanently remove all their data including files and jobs.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete User',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingSingle(true);
            try {
              const result = await deleteUser(userId);
              if (result.success) {
                Alert.alert('Success', result.message || 'User deleted successfully');
                loadData(); // Reload the user list
              } else {
                Alert.alert('Error', result.error || 'Failed to delete user');
              }
            } catch (error) {
              Alert.alert('Error', 'An error occurred while deleting the user');
            } finally {
              setIsDeletingSingle(false);
            }
          },
        },
      ]
    );
  };

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      (user.username?.toLowerCase() || '').includes(query) ||
      (user.email?.toLowerCase() || '').includes(query) ||
      (user.role?.toLowerCase() || '').includes(query) ||
      (user.subscription?.planName?.toLowerCase() || '').includes(query)
    );
  });

  // Calculate user stats
  const totalUsers = users.length;
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const regularUsers = users.filter(u => u.role === 'user' || !u.role).length;
  const recentUsers = users.filter(u => {
    const userDate = new Date(u.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return userDate >= weekAgo;
  }).length;

  const getRoleBadgeColor = (role: string) => {
    return role === 'admin' ? ZorliBrandKit.colors.errorRed : ZorliBrandKit.colors.vaultBlue;
  };

  const getPlanBadgeColor = (plan: string) => {
    if (plan === 'Plus') return ZorliBrandKit.colors.vaultBlue;
    if (plan === 'Business') return ZorliBrandKit.colors.vaultBlue;
    return '#8E8E93';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  // Get selectable users (not admin and not current user)
  const selectableUsers = filteredUsers.filter(
    (listUser) => listUser.role !== 'admin' && listUser.id !== user?.id
  );

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedUsers([]);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === selectableUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(selectableUsers.map((u) => u.id));
    }
  };

  const handleBatchDelete = () => {
    if (selectedUsers.length === 0) return;

    Alert.alert(
      'Delete Multiple Users',
      `Are you sure you want to delete ${selectedUsers.length} user(s)? This action cannot be undone and will permanently remove all their data including files and jobs.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Users',
          style: 'destructive',
          onPress: confirmBatchDelete,
        },
      ]
    );
  };

  const confirmBatchDelete = async () => {
    setIsBatchDeleting(true);
    let successCount = 0;
    let failureCount = 0;
    const failedUsers: string[] = [];

    try {
      for (const userId of selectedUsers) {
        try {
          const result = await deleteUser(userId);
          if (result.success) {
            successCount++;
          } else {
            failureCount++;
            failedUsers.push(userId);
          }
        } catch (error) {
          failureCount++;
          failedUsers.push(userId);
        }
      }

      // Update selected users to only include failed ones
      setSelectedUsers(failedUsers);

      // Show results
      if (failureCount === 0) {
        Alert.alert('Success', `Successfully deleted ${successCount} user(s)`);
        setSelectionMode(false);
        setSelectedUsers([]);
      } else if (successCount === 0) {
        Alert.alert('Error', `Failed to delete all ${failureCount} user(s). Please try again.`);
      } else {
        Alert.alert(
          'Partial Success',
          `Successfully deleted ${successCount} user(s). Failed to delete ${failureCount} user(s). The failed items remain selected.`
        );
      }

      // Reload data
      loadData();
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred during batch deletion');
    } finally {
      setIsBatchDeleting(false);
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
    <View style={{ flex: 1 }}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ZorliBrandKit.colors.vaultBlue} />
        }
      >
      {/* Welcome Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View>
              <View style={styles.logoTitleContainer}>
                <Image 
                  source={require('../../assets/images/logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
                <Text style={styles.title}>Zorli</Text>
              </View>
              <Text style={styles.subtitle}>Welcome back, {user?.username || 'Admin'}!</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
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
            <TouchableOpacity 
              style={styles.logoutIconButton}
              onPress={handleSignOut}
            >
              <Ionicons name="log-out-outline" size={24} color={ZorliBrandKit.colors.errorRed} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* User Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Total Users</Text>
              <Ionicons name="people-outline" size={20} color="#8E8E93" />
            </View>
            <Text style={styles.statValue}>{totalUsers}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Admin Users</Text>
              <Ionicons name="shield-outline" size={20} color="#8E8E93" />
            </View>
            <Text style={styles.statValue}>{adminUsers}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Regular Users</Text>
              <Ionicons name="person-outline" size={20} color="#8E8E93" />
            </View>
            <Text style={styles.statValue}>{regularUsers}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Recent Users</Text>
              <Ionicons name="people-outline" size={20} color="#8E8E93" />
            </View>
            <Text style={styles.statValue}>{recentUsers}</Text>
          </View>
        </View>
      </View>

      {/* Subscription Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Free Tier</Text>
              <Ionicons name="person-outline" size={20} color="#8E8E93" />
            </View>
            <Text style={styles.statValue}>{subscriptionStats?.freeUsers || 0}</Text>
            <Text style={styles.statHint}>10 files, 20 prompts</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Plus Subscribers</Text>
              <Ionicons name="card-outline" size={20} color="#8E8E93" />
            </View>
            <Text style={styles.statValue}>{subscriptionStats?.plusUsers || 0}</Text>
            <Text style={styles.statHint}>100 files, 500 prompts</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Business Subscribers</Text>
              <Ionicons name="shield-outline" size={20} color="#8E8E93" />
            </View>
            <Text style={styles.statValue}>{subscriptionStats?.businessUsers || 0}</Text>
            <Text style={styles.statHint}>Unlimited files & prompts</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Active Subscriptions</Text>
              <Ionicons name="cash-outline" size={20} color="#8E8E93" />
            </View>
            <Text style={styles.statValue}>{subscriptionStats?.activeSubscriptions || 0}</Text>
            <Text style={styles.statHint}>Paying customers</Text>
          </View>
        </View>
      </View>

      {/* Platform Usage */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Platform Usage</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCardWide}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Total Files Stored</Text>
              <Ionicons name="document-text-outline" size={20} color="#8E8E93" />
            </View>
            <Text style={styles.statValue}>{usageStats?.totalFiles || 0}</Text>
            <Text style={styles.statHint}>Across all users</Text>
          </View>
          <View style={styles.statCardWide}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Total Passwords Managed</Text>
              <Ionicons name="lock-closed-outline" size={20} color="#8E8E93" />
            </View>
            <Text style={styles.statValue}>{usageStats?.totalPasswords || 0}</Text>
            <Text style={styles.statHint}>Encrypted credentials</Text>
          </View>
        </View>
      </View>

      {/* User Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Management</Text>
        <Text style={styles.sectionSubtitle}>Manage user accounts and permissions</Text>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username, email, or role..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>

        {searchQuery !== '' && !selectionMode && (
          <Text style={styles.searchResults}>
            Showing {filteredUsers.length} of {users.length} users
          </Text>
        )}

        {/* Selection Controls */}
        <View style={styles.selectionControls}>
          {!selectionMode ? (
            <TouchableOpacity
              style={[styles.selectButton, selectableUsers.length === 0 && styles.buttonDisabled]}
              onPress={toggleSelectionMode}
              disabled={selectableUsers.length === 0}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color={selectableUsers.length === 0 ? '#C7C7CC' : ZorliBrandKit.colors.vaultBlue} />
              <Text style={[styles.selectButtonText, selectableUsers.length === 0 && styles.buttonTextDisabled]}>
                Select
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={toggleSelectAll}
              >
                <Ionicons 
                  name={selectedUsers.length === selectableUsers.length ? 'checkbox' : 'square-outline'} 
                  size={18} 
                  color={ZorliBrandKit.colors.vaultBlue} 
                />
                <Text style={styles.selectAllText}>
                  {selectedUsers.length === selectableUsers.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deleteSelectedButton,
                  (selectedUsers.length === 0 || isBatchDeleting) && styles.buttonDisabled
                ]}
                onPress={handleBatchDelete}
                disabled={selectedUsers.length === 0 || isBatchDeleting}
              >
                {isBatchDeleting ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.deleteSelectedText}>Deleting...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.deleteSelectedText}>
                      Delete Selected ({selectedUsers.length})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={toggleSelectionMode}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* User List */}
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#C7C7CC" />
            <Text style={styles.emptyText}>
              {searchQuery ? `No users found matching "${searchQuery}"` : 'No users found'}
            </Text>
          </View>
        ) : (
          <View style={styles.userList}>
            {filteredUsers.map((listUser) => {
              const isSelectable = listUser.role !== 'admin' && listUser.id !== user?.id;
              const isSelected = selectedUsers.includes(listUser.id);

              return (
              <TouchableOpacity
                key={listUser.id}
                style={styles.userCard}
                onPress={() => {
                  if (selectionMode && isSelectable) {
                    toggleUserSelection(listUser.id);
                  }
                }}
                disabled={!selectionMode || !isSelectable}
                activeOpacity={selectionMode && isSelectable ? 0.7 : 1}
              >
                <View style={styles.userHeader}>
                  {selectionMode && (
                    <View style={styles.checkboxContainer}>
                      {isSelectable ? (
                        <Ionicons
                          name={isSelected ? 'checkbox' : 'square-outline'}
                          size={24}
                          color={isSelected ? ZorliBrandKit.colors.vaultBlue : '#C7C7CC'}
                        />
                      ) : (
                        <View style={styles.checkboxPlaceholder} />
                      )}
                    </View>
                  )}
                  <View style={styles.userInfo}>
                    <Ionicons name="person-circle-outline" size={40} color={ZorliBrandKit.colors.vaultBlue} />
                    <View style={styles.userDetails}>
                      <Text style={styles.userName}>{listUser.username}</Text>
                      <Text style={styles.userEmail}>{listUser.email}</Text>
                    </View>
                  </View>
                  <View style={styles.userBadges}>
                    <View style={[styles.badge, { backgroundColor: getRoleBadgeColor(listUser.role) }]}>
                      <Text style={styles.badgeText}>{(listUser.role || 'user').charAt(0).toUpperCase() + (listUser.role || 'user').slice(1)}</Text>
                    </View>
                    {listUser.role !== 'admin' && (
                      <View style={[styles.badge, { backgroundColor: getPlanBadgeColor(listUser.subscription?.planName || 'Free') }]}>
                        <Text style={styles.badgeText}>
                          {listUser.subscription?.planName || 'Free'}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.badge, { backgroundColor: listUser.isEmailVerified ? '#0051D5' : '#D32F2F' }]}>
                      <Text style={styles.badgeText}>
                        {listUser.isEmailVerified ? 'Verified' : 'Not Verified'}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.userStats}>
                  <View style={styles.userStatItem}>
                    <Text style={styles.userStatLabel}>Files</Text>
                    <Text style={styles.userStatValue}>
                      {listUser.role === 'admin' ? '--' : (
                        <>
                          {listUser.usage?.filesCount || 0}
                          {listUser.limits?.maxFiles !== -1 ? `/${listUser.limits?.maxFiles || 10}` : '/∞'}
                        </>
                      )}
                    </Text>
                  </View>
                  <View style={styles.userStatItem}>
                    <Text style={styles.userStatLabel}>AI Prompts</Text>
                    <Text style={styles.userStatValue}>
                      {listUser.role === 'admin' ? '--' : (
                        <>
                          {listUser.usage?.aiPromptsCount || 0}
                          {listUser.limits?.maxAIPrompts !== -1 ? `/${listUser.limits?.maxAIPrompts || 20}` : '/∞'}
                        </>
                      )}
                    </Text>
                  </View>
                  <View style={styles.userStatItem}>
                    <Text style={styles.userStatLabel}>Sub. Start</Text>
                    <Text style={styles.userStatValue}>{listUser.role === 'admin' ? '--' : formatDate(listUser.subscription?.currentPeriodStart)}</Text>
                  </View>
                  <View style={styles.userStatItem}>
                    <Text style={styles.userStatLabel}>Sub. End</Text>
                    <Text style={styles.userStatValue}>{listUser.role === 'admin' ? '--' : formatDate(listUser.subscription?.currentPeriodEnd)}</Text>
                  </View>
                </View>
                
                {/* Delete Action - Hide in selection mode */}
                {user && !selectionMode && (
                  <View style={styles.userActions}>
                    {listUser.role === 'admin' || listUser.id === user.id ? (
                      <View style={styles.protectedBadge}>
                        <Ionicons name="shield-checkmark" size={14} color="#8E8E93" />
                        <Text style={styles.protectedText}>Protected</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteUser(listUser.id, listUser.username)}
                      >
                        <Ionicons name="trash-outline" size={18} color={ZorliBrandKit.colors.errorRed} />
                        <Text style={styles.deleteButtonText}>Delete User</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Logout Button */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <View style={styles.signOutContent}>
            <Ionicons name="log-out-outline" size={24} color={ZorliBrandKit.colors.errorRed} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Footer Padding */}
      <View style={styles.footerPadding} />
    </ScrollView>

      {/* Loading Overlay for User Deletion */}
      {(isBatchDeleting || isDeletingSingle) && (
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999,
          }}
        >
          <ActivityIndicator size="large" color={ZorliBrandKit.colors.vaultBlue} />
          <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '500', color: ZorliBrandKit.colors.deepSlate }}>
            {isBatchDeleting ? 'Deleting users...' : 'Deleting user...'}
          </Text>
        </View>
      )}
    </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoutIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
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
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: -6,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: '1%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statCardWide: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: '1%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#000',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginTop: 4,
  },
  statHint: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  searchResults: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 8,
  },
  selectionControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: ZorliBrandKit.colors.vaultBlue,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: ZorliBrandKit.colors.vaultBlue,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteSelectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ZorliBrandKit.colors.errorRed,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  deleteSelectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#8E8E93',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonTextDisabled: {
    color: '#C7C7CC',
  },
  checkboxContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  checkboxPlaceholder: {
    width: 24,
    height: 24,
  },
  userList: {
    marginTop: 12,
  },
  userCard: {
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
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
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
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  userBadges: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  userStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 12,
  },
  userStatItem: {
    width: '50%',
    marginBottom: 8,
  },
  userStatLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  userStatValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 12,
    textAlign: 'center',
  },
  userActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    alignItems: 'center',
  },
  protectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  protectedText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  deleteButtonText: {
    fontSize: 13,
    color: ZorliBrandKit.colors.errorRed,
    fontWeight: '500',
  },
  signOutButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  signOutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footerPadding: {
    height: 20,
  },
});
