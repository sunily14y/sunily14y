import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Friend {
  user_id: string;
  name: string;
  email: string;
  picture?: string;
}

interface FriendRequest {
  id: string;
  from_user: {
    user_id: string;
    name: string;
    email: string;
    picture?: string;
  };
  created_at: string;
}

export default function FriendsScreen() {
  const { user, isAuthenticated } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const getToken = async () => {
    return await AsyncStorage.getItem('session_token');
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [friendsRes, requestsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/friends`, { headers }),
        fetch(`${BACKEND_URL}/api/friends/requests`, { headers }),
      ]);
      
      if (friendsRes.ok) setFriends(await friendsRes.json());
      if (requestsRes.ok) setRequests(await requestsRes.json());
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!friendEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }
    
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/friends/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: friendEmail.trim() }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        Alert.alert('Success', 'Friend request sent!');
        setShowAddModal(false);
        setFriendEmail('');
      } else {
        Alert.alert('Error', data.detail || 'Failed to send request');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/friends/accept/${requestId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        loadData();
        Alert.alert('Success', 'Friend request accepted!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/friends/reject/${requestId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        loadData();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reject request');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friends</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
          <Ionicons name="person-add" size={24} color="#8B4513" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.divider} />
      
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests ({requests.length})
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#8B4513" style={{ marginTop: 40 }} />
        ) : activeTab === 'friends' ? (
          friends.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No friends yet</Text>
              <Text style={styles.emptySubtext}>Add friends to play together!</Text>
            </View>
          ) : (
            friends.map((friend) => (
              <View key={friend.user_id} style={styles.friendCard}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={24} color="#FFD700" />
                </View>
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{friend.name}</Text>
                  <Text style={styles.friendEmail}>{friend.email}</Text>
                </View>
              </View>
            ))
          )
        ) : (
          requests.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="mail-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No pending requests</Text>
            </View>
          ) : (
            requests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={24} color="#FFD700" />
                </View>
                <View style={styles.requestInfo}>
                  <Text style={styles.friendName}>{request.from_user.name}</Text>
                  <Text style={styles.friendEmail}>{request.from_user.email}</Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptRequest(request.id)}
                  >
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleRejectRequest(request.id)}
                  >
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>
      
      {/* Add Friend Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.addModal}>
            <Text style={styles.modalTitle}>Add Friend</Text>
            <Text style={styles.modalSubtitle}>Enter your friend's email address</Text>
            <TextInput
              style={styles.emailInput}
              placeholder="friend@example.com"
              placeholderTextColor="#999"
              value={friendEmail}
              onChangeText={setFriendEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { setShowAddModal(false); setFriendEmail(''); }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendButton} onPress={handleAddFriend}>
                <Text style={styles.sendButtonText}>Send Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingBottom: 15, backgroundColor: '#C4A574' },
  backButton: { padding: 10 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  addButton: { width: 45, height: 45, borderRadius: 10, backgroundColor: '#FFD700', justifyContent: 'center', alignItems: 'center' },
  divider: { height: 4, backgroundColor: '#8B4513' },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#8B4513' },
  tabText: { fontSize: 16, color: '#888' },
  activeTabText: { color: '#8B4513', fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, color: '#666', marginTop: 15 },
  emptySubtext: { fontSize: 14, color: '#999', marginTop: 5 },
  friendCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 },
  requestCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 10, elevation: 2 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#8B4513', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  friendInfo: { flex: 1 },
  requestInfo: { flex: 1 },
  friendName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  friendEmail: { fontSize: 13, color: '#888', marginTop: 2 },
  requestActions: { flexDirection: 'row', gap: 8 },
  acceptButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center' },
  rejectButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F44336', justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  addModal: { backgroundColor: '#fff', borderRadius: 20, padding: 25, width: '85%', maxWidth: 400 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#888', marginBottom: 20 },
  emailInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 15, fontSize: 16, color: '#333', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f0f0f0', alignItems: 'center' },
  cancelButtonText: { fontSize: 16, color: '#666', fontWeight: '600' },
  sendButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#8B4513', alignItems: 'center' },
  sendButtonText: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
});
