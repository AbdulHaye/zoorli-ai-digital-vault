import React, { useState, useEffect, useRef } from 'react';
import { ZorliBrandKit } from '../theme/zorli-brand-kit';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Audio } from 'expo-av';
import { getChatHistory, sendChatMessage, deleteChatHistory, saveChatMessage, getSignedUrl } from '../lib/api';
import { getAuthHeaders, refreshUser } from '../lib/auth';
import type { ChatMessage } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

export default function ChatScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [user, setUser] = useState<any>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const initialMessageSent = useRef<string | false>(false);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const maxRecordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const activeRecordingRef = useRef<Audio.Recording | null>(null);
  const autoSendRef = useRef<boolean>(false);

  useEffect(() => {
    isMountedRef.current = true;
    loadHistory();
    setupAudio();
    loadUserProfile();
    
    // Cleanup timers and recording on unmount only
    return () => {
      isMountedRef.current = false;
      
      // Stop recording if active on unmount
      if (activeRecordingRef.current) {
        try {
          activeRecordingRef.current.stopAndUnloadAsync().catch(err => 
            console.error('Error stopping recording on unmount:', err)
          );
        } catch (error) {
          console.error('Error stopping recording on unmount:', error);
        }
      }
      
      // Clean up timers
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (maxRecordingTimeoutRef.current) {
        clearTimeout(maxRecordingTimeoutRef.current);
      }
    };
  }, []);

  // Handle initial message from navigation params
  useEffect(() => {
    const initialMessage = route?.params?.initialMessage;
    if (initialMessage && !loading) {
      // Check if this is a new message (different from what we've sent before)
      if (!initialMessageSent.current || initialMessageSent.current !== initialMessage) {
        initialMessageSent.current = initialMessage;
        setInputText(initialMessage);
        autoSendRef.current = true;
        // Clear the navigation param to prevent re-sending on re-render
        navigation.setParams({ initialMessage: undefined });
      }
    }
  }, [route?.params?.initialMessage, loading]);

  // Auto-send when input text is set from search field
  useEffect(() => {
    if (autoSendRef.current && inputText.trim() && !loading) {
      const timer = setTimeout(() => {
        handleSend();
        autoSendRef.current = false;
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [inputText, loading]);

  const loadUserProfile = async () => {
    try {
      const userData = await refreshUser();
      setUser(userData);
      
      // Load profile picture if exists
      if (userData?.profilePictureUrl) {
        if (userData.profilePictureUrl.startsWith('users/')) {
          const signedUrl = await getSignedUrl(userData.profilePictureUrl);
          if (signedUrl) {
            setProfileImageUrl(signedUrl);
          }
        } else if (userData.profilePictureUrl.startsWith('http://') || userData.profilePictureUrl.startsWith('https://')) {
          setProfileImageUrl(userData.profilePictureUrl);
        } else {
          setProfileImageUrl(`${API_URL}${userData.profilePictureUrl}`);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const setupAudio = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    } catch (error) {
      console.error('Error setting up audio:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const history = await getChatHistory();
      // Keep messages in chronological order (oldest first)
      setMessages(history);
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const history = await getChatHistory();
      setMessages(history);
    } catch (error) {
      console.error('Error refreshing chat history:', error);
      Alert.alert('Error', 'Failed to refresh chat history');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;

    const userMessage = inputText.trim();
    setInputText('');
    setSending(true);

    const tempUserMsg: ChatMessage = {
      id: Date.now().toString(),
      userId: 'temp',
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await sendChatMessage(userMessage);
      
      if (!response || response.error) {
        setMessages((prev) => prev.slice(0, -1));
        Alert.alert('Error', response?.error || 'Failed to get response from Smart Finder');
        return;
      }

      const messageContent = response.data?.message || response.data?.content || response.message;
      
      if (!messageContent) {
        setMessages((prev) => prev.slice(0, -1));
        Alert.alert('Error', 'Received empty response from Smart Finder');
        return;
      }
      
      // Save user message to database
      await saveChatMessage(tempUserMsg);
      
      const assistantMsg: ChatMessage = {
        id: Date.now().toString() + '_ai',
        userId: 'temp',
        role: 'assistant',
        content: messageContent,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      
      // Save assistant message to database
      await saveChatMessage(assistantMsg);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('Error sending message:', error);
      setMessages((prev) => prev.slice(0, -1));
      Alert.alert('Error', error.message || 'Sorry, I encountered an error. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleCopyMessage = async (content: string) => {
    await Clipboard.setStringAsync(content);
    Alert.alert('Copied', 'Message copied to clipboard');
  };

  const handleDeleteChat = () => {
    Alert.alert(
      'Delete Chat History',
      'Are you sure you want to delete all chat messages? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChatHistory();
              setMessages([]);
              Alert.alert('Success', 'Chat history deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete chat history');
            }
          },
        },
      ]
    );
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

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      activeRecordingRef.current = recording;
      setIsRecording(true);
      
      // Start recording timer
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Set maximum recording timeout (auto-stop after 60 seconds)
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
      // Stop timers
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
      setInputText(data.text || '');
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

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    
    return (
      <View style={[styles.messageWrapper, isUser && styles.messageWrapperUser]}>
        <View style={styles.messageRow}>
          {!isUser && (
            <View style={styles.aiAvatarContainer}>
              <Text style={styles.robotEmoji}>🤖</Text>
            </View>
          )}
          
          <TouchableOpacity
            onLongPress={() => handleCopyMessage(item.content)}
            style={[
              styles.messageBubble,
              isUser ? styles.userBubble : styles.assistantBubble,
            ]}
            activeOpacity={0.7}
          >
            <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
              {item.content}
            </Text>
          </TouchableOpacity>
          
          {isUser && (
            <View style={styles.avatarContainer}>
              {profileImageUrl ? (
                <Image
                  source={{ uri: profileImageUrl }}
                  style={styles.userAvatar}
                />
              ) : (
                <Ionicons name="person-circle" size={32} color="#fff" />
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitleText}>Smart Finder</Text>
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
        </View>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={handleDeleteChat} style={styles.headerButton}>
          <Ionicons name="trash-outline" size={24} color={ZorliBrandKit.colors.vaultBlue} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ZorliBrandKit.colors.vaultBlue} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      <FlatList
        style={styles.flatList}
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ZorliBrandKit.colors.vaultBlue}
            title="Pull to refresh chat"
            titleColor="#999"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={ZorliBrandKit.colors.vaultBlue} />
            </View>
            <Text style={styles.emptyText}>AI Chat Assistant</Text>
            <Text style={styles.emptySubtext}>Ask me anything about your documents</Text>
            <Text style={styles.emptySubtext}>I can analyze and answer questions</Text>
            <Text style={styles.emptyHint}>💡 Long-press messages to copy them</Text>
            <Text style={styles.emptyHint}>🔄 Pull down to refresh chat history</Text>
          </View>
        }
      />

      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={[styles.voiceButton, isRecording && styles.voiceButtonActive]}
            onPress={handleVoiceInput}
            disabled={isTranscribing}
          >
            {isTranscribing ? (
              <ActivityIndicator size="small" color={ZorliBrandKit.colors.vaultBlue} />
            ) : (
              <Ionicons 
                name={isRecording ? 'stop-circle' : 'mic'} 
                size={24} 
                color={isRecording ? ZorliBrandKit.colors.errorRed : ZorliBrandKit.colors.vaultBlue} 
              />
            )}
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={isTranscribing ? 'Processing...' : isRecording ? 'Recording...' : 'Type your message...'}
            placeholderTextColor="#888"
            multiline
            maxLength={500}
            editable={!isRecording && !isTranscribing}
          />
          
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flatList: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButton: {
    marginRight: 16,
  },
  messageList: {
    padding: 16,
    flexGrow: 1,
  },
  messageWrapper: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  messageWrapperUser: {
    alignItems: 'flex-end',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ZorliBrandKit.colors.vaultBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  aiAvatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  robotEmoji: {
    fontSize: 20,
  },
  messageBubble: {
    maxWidth: '70%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: ZorliBrandKit.colors.vaultBlue,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#E9ECEF',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: '#000000',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    alignItems: 'flex-end',
  },
  voiceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#F2F2F7',
  },
  voiceButtonActive: {
    backgroundColor: '#FFE5E5',
  },
  input: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    color: '#000000',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    backgroundColor: ZorliBrandKit.colors.vaultBlue,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 13,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  onlineText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});
