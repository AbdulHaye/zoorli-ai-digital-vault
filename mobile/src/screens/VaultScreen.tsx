import React, { useState, useEffect } from 'react';
import { ZorliBrandKit } from '../theme/zorli-brand-kit';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  ScrollView,
  Dimensions,
  TextInput,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getFiles, uploadFile, deleteFile } from '../lib/api';
import { getAuthHeaders } from '../lib/auth';
import type { DocumentRecord } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';
const { width } = Dimensions.get('window');
const gridItemWidth = (width - 48) / 2;

interface FilePreviewProps {
  file: DocumentRecord;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file }) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadPreview = async () => {
      if (!isImageFile(file.fileType)) {
        setLoading(false);
        return;
      }

      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/api/files/${file.id}/preview`, {
          headers,
        });

        if (!response.ok) {
          throw new Error('Preview not found');
        }

        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageUri(reader.result as string);
          setLoading(false);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error('Error loading preview:', err);
        setError(true);
        setLoading(false);
      }
    };

    loadPreview();
  }, [file.id, file.fileType]);

  const isImageFile = (fileType: string) => {
    return fileType.includes('image');
  };

  if (!isImageFile(file.fileType)) {
    return (
      <View style={styles.iconPreview}>
        <Ionicons 
          name={getFileIcon(file.fileType)} 
          size={48} 
          color={ZorliBrandKit.colors.vaultBlue} 
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingPreview}>
        <ActivityIndicator size="small" color={ZorliBrandKit.colors.vaultBlue} />
      </View>
    );
  }

  if (error || !imageUri) {
    return (
      <View style={styles.errorPreview}>
        <Ionicons name="image-outline" size={48} color="#999" />
      </View>
    );
  }

  return (
    <Image 
      source={{ uri: imageUri }} 
      style={styles.imagePreview}
      resizeMode="cover"
    />
  );
};

const getFileIcon = (fileType: string): keyof typeof Ionicons.glyphMap => {
  if (fileType.includes('image')) return 'image-outline';
  if (fileType.includes('pdf')) return 'document-text-outline';
  if (fileType.includes('video')) return 'videocam-outline';
  return 'document-outline';
};

export default function VaultScreen() {
  const [files, setFiles] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [previewImageData, setPreviewImageData] = useState<{id: string, filename: string} | null>(null);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);

  useEffect(() => {
    requestPermissions();
    loadFiles();
  }, []);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Camera and media library permissions are needed to upload files.'
      );
    }
  };

  const loadFiles = async () => {
    try {
      const data = await getFiles();
      setFiles(data);
    } catch (error) {
      console.error('Error loading files:', error);
      Alert.alert('Error', 'Failed to load files');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFiles();
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.getCameraPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (newStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required');
        return;
      }
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const filename = asset.fileName || `camera-${Date.now()}.jpg`;
      const mimeType = asset.mimeType || 'image/jpeg';
      handleUpload(asset.uri, filename, mimeType);
    }
  };

  const handleGallery = async () => {
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (newStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Media library permission is required');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const filename = asset.fileName || `image-${Date.now()}.jpg`;
      const mimeType = asset.mimeType || 'image/jpeg';
      handleUpload(asset.uri, filename, mimeType);
    }
  };

  const handleDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const mimeType = asset.mimeType || 'application/octet-stream';
        handleUpload(asset.uri, asset.name, mimeType);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleUpload = async (uri: string, filename: string, fileType: string) => {
    setUploading(true);
    try {
      const response = await uploadFile(uri, filename, fileType);
      if (response.error) {
        throw new Error(response.error);
      }
      Alert.alert('Success', 'File uploaded successfully');
      loadFiles();
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      const headers = await getAuthHeaders();
      
      // Download the file
      const downloadUrl = `${API_URL}/api/files/${fileId}/download`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      const downloadResult = await FileSystem.downloadAsync(downloadUrl, fileUri, {
        headers,
      });

      if (downloadResult.status !== 200) {
        throw new Error('Download failed');
      }

      // Check if sharing is available
      const isSharingAvailable = await Sharing.isAvailableAsync();
      
      if (isSharingAvailable) {
        // Share the file (allows user to save/open it)
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/octet-stream',
          dialogTitle: filename,
          UTI: 'public.item',
        });
      } else {
        Alert.alert('Success', `File downloaded to: ${downloadResult.uri}`);
      }
    } catch (error: any) {
      console.error('Download error:', error);
      Alert.alert('Download Failed', error.message || 'Failed to download file');
    }
  };

  const toggleFileSelection = (fileId: string) => {
    if (isDeletingBatch || isDeletingSingle) return;
    
    if (selectedFiles.includes(fileId)) {
      setSelectedFiles(selectedFiles.filter(id => id !== fileId));
      if (selectedFiles.length === 1) {
        setSelectionMode(false);
      }
    } else {
      setSelectedFiles([...selectedFiles, fileId]);
      setSelectionMode(true);
    }
  };

  const toggleSelectAll = () => {
    if (isDeletingBatch || isDeletingSingle) return;
    
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([]);
      setSelectionMode(false);
    } else {
      setSelectedFiles(filteredFiles.map(f => f.id));
      setSelectionMode(true);
    }
  };

  const handleDeleteSelected = () => {
    if (isDeletingBatch) return;
    
    Alert.alert(
      'Delete Files',
      `Are you sure you want to delete ${selectedFiles.length} selected file(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingBatch(true);
            try {
              const count = selectedFiles.length;
              for (const fileId of selectedFiles) {
                const response = await deleteFile(fileId);
                if (response.error) {
                  throw new Error(response.error);
                }
              }
              setSelectedFiles([]);
              setSelectionMode(false);
              loadFiles();
              Alert.alert('Success', `Deleted ${count} file(s)`);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete files');
            } finally {
              setIsDeletingBatch(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (fileId: string, filename: string) => {
    if (isDeletingSingle) return;
    
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${filename}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingSingle(true);
            try {
              const response = await deleteFile(fileId);
              if (response.error) {
                throw new Error(response.error);
              }
              loadFiles();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete file');
            } finally {
              setIsDeletingSingle(false);
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImageFile = (fileType: string) => {
    return fileType.includes('image');
  };

  const handleImagePreview = (fileId: string, filename: string, fileType: string) => {
    if (isImageFile(fileType) && !selectionMode) {
      setPreviewImageData({ id: fileId, filename });
      setImagePreviewVisible(true);
    }
  };

  // Filter files based on search query
  const filteredFiles = files.filter((file) => {
    const query = searchQuery.toLowerCase();
    return file.filename.toLowerCase().includes(query);
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
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search files..."
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

      <View style={styles.uploadButtons}>
        {selectionMode ? (
          <>
            <TouchableOpacity 
              style={styles.selectAllButton}
              onPress={toggleSelectAll}
            >
              <Ionicons 
                name={selectedFiles.length === filteredFiles.length ? "checkbox" : "square-outline"} 
                size={24} 
                color={ZorliBrandKit.colors.vaultBlue} 
              />
              <Text style={styles.selectAllText}>
                {selectedFiles.length === filteredFiles.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.deleteSelectedButton}
              onPress={handleDeleteSelected}
              disabled={selectedFiles.length === 0 || isDeletingBatch || isDeletingSingle}
            >
              {isDeletingBatch ? (
                <ActivityIndicator size="small" color={ZorliBrandKit.colors.errorRed} />
              ) : (
                <Ionicons name="trash-outline" size={24} color={selectedFiles.length > 0 ? ZorliBrandKit.colors.errorRed : "#999"} />
              )}
              <Text style={[styles.deleteSelectedText, (selectedFiles.length === 0 || isDeletingBatch || isDeletingSingle) && styles.disabledText]}>
                {isDeletingBatch ? 'Deleting...' : `Delete (${selectedFiles.length})`}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity 
              style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
              onPress={handleCamera}
              disabled={uploading}
            >
              <Ionicons name="camera-outline" size={24} color={ZorliBrandKit.colors.vaultBlue} />
              <Text style={styles.uploadButtonText}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
              onPress={handleGallery}
              disabled={uploading}
            >
              <Ionicons name="images-outline" size={24} color={ZorliBrandKit.colors.vaultBlue} />
              <Text style={styles.uploadButtonText}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
              onPress={handleDocument}
              disabled={uploading}
            >
              <Ionicons name="document-outline" size={24} color={ZorliBrandKit.colors.vaultBlue} />
              <Text style={styles.uploadButtonText}>Document</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {uploading && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="small" color={ZorliBrandKit.colors.vaultBlue} />
          <Text style={styles.uploadingText}>Uploading...</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {files.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No files yet</Text>
            <Text style={styles.emptySubtext}>Upload your first file to get started</Text>
          </View>
        ) : filteredFiles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No files found</Text>
            <Text style={styles.emptySubtext}>Try a different search term</Text>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {filteredFiles.map((file) => (
              <TouchableOpacity 
                key={file.id} 
                style={styles.fileCard}
                onLongPress={() => toggleFileSelection(file.id)}
                onPress={() => {
                  if (isDeletingBatch) return;
                  if (selectionMode) {
                    toggleFileSelection(file.id);
                  } else if (isImageFile(file.fileType)) {
                    handleImagePreview(file.id, file.filename, file.fileType);
                  }
                }}
                activeOpacity={0.7}
                disabled={isDeletingBatch}
              >
                {selectionMode && (
                  <View style={styles.checkboxContainer}>
                    <Ionicons 
                      name={selectedFiles.includes(file.id) ? "checkbox" : "square-outline"} 
                      size={24} 
                      color={ZorliBrandKit.colors.vaultBlue} 
                    />
                  </View>
                )}

                <View style={styles.previewContainer}>
                  <FilePreview file={file} />
                </View>
                
                <View style={styles.fileInfo}>
                  <View style={styles.fileTextInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.filename}
                    </Text>
                    <Text style={styles.fileSize}>
                      {formatFileSize(file.fileSize)}
                    </Text>
                  </View>
                  
                  {!selectionMode && (
                    <View style={styles.fileActions}>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => handleDownload(file.id, file.filename)}
                      >
                        <Ionicons name="download-outline" size={20} color={ZorliBrandKit.colors.vaultBlue} />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => handleDelete(file.id, file.filename)}
                      >
                        <Ionicons name="trash-outline" size={20} color={ZorliBrandKit.colors.errorRed} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Deleting Files Loading Modal */}
      <Modal
        visible={isDeletingBatch || isDeletingSingle}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.deletingModalContainer}>
          <View style={styles.deletingModalContent}>
            <ActivityIndicator size="large" color={ZorliBrandKit.colors.vaultBlue} />
            <Text style={styles.deletingModalText}>
              {isDeletingBatch ? 'Deleting files...' : 'Deleting file...'}
            </Text>
            <Text style={styles.deletingModalSubtext}>Please wait</Text>
          </View>
        </View>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        visible={imagePreviewVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImagePreviewVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => setImagePreviewVisible(false)}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.modalContent}>
            {previewImageData && (
              <ImagePreviewModal 
                fileId={previewImageData.id}
                filename={previewImageData.filename}
              />
            )}
          </View>
          
          {previewImageData && (
            <View style={styles.modalFooter}>
              <Text style={styles.modalFilename}>{previewImageData.filename}</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

// Component to load and display full-size image in modal
const ImagePreviewModal: React.FC<{fileId: string, filename: string}> = ({ fileId, filename }) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadFullImage = async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/api/files/${fileId}/preview`, {
          headers,
        });

        if (!response.ok) {
          throw new Error('Failed to load image');
        }

        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageUri(reader.result as string);
          setLoading(false);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error('Error loading full image:', err);
        setError(true);
        setLoading(false);
      }
    };

    loadFullImage();
  }, [fileId]);

  if (loading) {
    return (
      <View style={styles.modalLoading}>
        <Text style={styles.modalLoadingText}>Loading image...</Text>
      </View>
    );
  }

  if (error || !imageUri) {
    return (
      <View style={styles.modalError}>
        <Ionicons name="alert-circle-outline" size={64} color={ZorliBrandKit.colors.errorRed} />
        <Text style={styles.modalErrorText}>Failed to load image</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.modalImageContainer}
      maximumZoomScale={3}
      minimumZoomScale={1}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    >
      <Image 
        source={{ uri: imageUri }} 
        style={styles.modalImage}
        resizeMode="contain"
      />
    </ScrollView>
  );
};

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
  uploadButtons: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 4,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    marginLeft: 8,
    color: ZorliBrandKit.colors.vaultBlue,
    fontWeight: '600',
  },
  selectAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginRight: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  selectAllText: {
    marginLeft: 8,
    fontWeight: '600',
  },
  deleteSelectedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#fee',
    borderRadius: 8,
  },
  deleteSelectedText: {
    marginLeft: 8,
    color: ZorliBrandKit.colors.errorRed,
    fontWeight: '600',
  },
  disabledText: {
    color: '#999',
  },
  checkboxContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 4,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#fff3cd',
  },
  uploadingText: {
    marginLeft: 8,
    color: '#856404',
  },
  scrollContent: {
    padding: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  fileCard: {
    width: gridItemWidth,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  previewContainer: {
    width: '100%',
    height: gridItemWidth,
    backgroundColor: '#f5f5f5',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  iconPreview: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
  },
  loadingPreview: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorPreview: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fee',
  },
  fileInfo: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fileTextInfo: {
    flex: 1,
    marginRight: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
  },
  fileActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    padding: 8,
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
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  modalContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFooter: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
  },
  modalFilename: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLoadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  modalError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalErrorText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: width,
    height: width,
  },
  deletingModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deletingModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
  },
  deletingModalText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  deletingModalSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});
