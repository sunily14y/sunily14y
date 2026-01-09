import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface PlayerStats {
  player_name: string;
  wins: number;
  losses: number;
  total_games: number;
  win_rate: number;
  games_vs_ai: number;
  games_vs_human: number;
}

export default function ProfileScreen() {
  const { user, refreshUser, logout } = useAuth();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadStats();
    if (user) setNewName(user.name);
  }, [user]);

  const getToken = async () => {
    return await AsyncStorage.getItem('session_token');
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/stats/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        setStats(await response.json());
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!newName.trim() || newName.trim().length < 2) {
      Alert.alert('Error', 'Name must be at least 2 characters');
      return;
    }
    
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName.trim() }),
      });
      
      if (response.ok) {
        await refreshUser();
        setEditing(false);
        Alert.alert('Success', 'Profile updated!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 44 }} />
      </View>
      
      <View style={styles.divider} />
      
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#8B4513" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Profile Card */}
            <View style={styles.profileCard}>
              <View style={styles.avatarLarge}>
                <Ionicons name="person" size={50} color="#FFD700" />
              </View>
              
              {editing ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={styles.nameInput}
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="Your name"
                    maxLength={20}
                  />
                  <View style={styles.editButtons}>
                    <TouchableOpacity
                      style={styles.cancelEditButton}
                      onPress={() => { setEditing(false); setNewName(user?.name || ''); }}
                    >
                      <Text style={styles.cancelEditText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={handleUpdateProfile}>
                      <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.nameContainer}>
                  <Text style={styles.userName}>{user?.name}</Text>
                  <TouchableOpacity onPress={() => setEditing(true)}>
                    <Ionicons name="pencil" size={18} color="#8B4513" />
                  </TouchableOpacity>
                </View>
              )}
              
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
            
            {/* Stats Card */}
            <View style={styles.statsCard}>
              <Text style={styles.sectionTitle}>Game Statistics</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats?.total_games || 0}</Text>
                  <Text style={styles.statLabel}>Games Played</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats?.wins || 0}</Text>
                  <Text style={styles.statLabel}>Wins</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: '#F44336' }]}>{stats?.losses || 0}</Text>
                  <Text style={styles.statLabel}>Losses</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats?.win_rate?.toFixed(0) || 0}%</Text>
                  <Text style={styles.statLabel}>Win Rate</Text>
                </View>
              </View>
              
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="hardware-chip" size={20} color="#8B4513" />
                  <Text style={styles.statItemText}>vs AI: {stats?.games_vs_ai || 0}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="people" size={20} color="#8B4513" />
                  <Text style={styles.statItemText}>vs Human: {stats?.games_vs_human || 0}</Text>
                </View>
              </View>
            </View>
            
            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out" size={22} color="#fff" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingBottom: 15, backgroundColor: '#C4A574' },
  backButton: { padding: 10 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  divider: { height: 4, backgroundColor: '#8B4513' },
  content: { flex: 1, padding: 16 },
  profileCard: { backgroundColor: '#fff', borderRadius: 16, padding: 25, alignItems: 'center', marginBottom: 16, elevation: 4 },
  avatarLarge: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#8B4513', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  nameContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  userEmail: { fontSize: 14, color: '#888' },
  editContainer: { width: '100%', alignItems: 'center' },
  nameInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 18, width: '80%', textAlign: 'center', marginBottom: 10 },
  editButtons: { flexDirection: 'row', gap: 10 },
  cancelEditButton: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#f0f0f0' },
  cancelEditText: { color: '#666', fontWeight: '600' },
  saveButton: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#8B4513' },
  saveButtonText: { color: '#fff', fontWeight: 'bold' },
  statsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statBox: { width: '48%', backgroundColor: '#f8f8f8', borderRadius: 12, padding: 15, alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#8B4513' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#eee' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statItemText: { fontSize: 14, color: '#666' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E74C3C', paddingVertical: 16, borderRadius: 12, gap: 10 },
  logoutText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
