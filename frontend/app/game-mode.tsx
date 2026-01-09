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
import { useAuth } from '../src/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface PlayerStats {
  player_name: string;
  wins: number;
  total_games: number;
  win_rate: number;
}

export default function GameModeScreen() {
  const { user, isAuthenticated, isLoading, isGuest, logout } = useAuth();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    } else if (isAuthenticated && !isGuest) {
      loadPlayerStats();
    }
  }, [isAuthenticated, isLoading, isGuest]);

  const loadPlayerStats = async () => {
    try {
      const token = await getSessionToken();
      const response = await fetch(`${BACKEND_URL}/api/stats/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const getSessionToken = async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return await AsyncStorage.getItem('session_token');
  };

  const handleCreateRoom = () => {
    setShowCreateRoomModal(true);
  };

  const handleConfirmCreateRoom = async () => {
    if (!user) return;
    
    setCreatingRoom(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/rooms/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          user_name: user.name,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowCreateRoomModal(false);
        router.push({
          pathname: '/waiting-room',
          params: { roomCode: data.room_code },
        });
      } else {
        Alert.alert('Error', data.detail || 'Failed to create room');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create room');
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleJoinGame = async () => {
    if (roomCode.trim().length !== 4) {
      Alert.alert('Invalid Code', 'Please enter a 4-digit room code');
      return;
    }

    if (!user) return;

    setJoiningRoom(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_code: roomCode.trim(),
          user_id: user.user_id,
          user_name: user.name,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowJoinModal(false);
        setRoomCode('');
        router.push({
          pathname: '/waiting-room',
          params: { roomCode: roomCode.trim() },
        });
      } else {
        Alert.alert('Cannot Join', data.detail || 'Failed to join room');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to join room');
    } finally {
      setJoiningRoom(false);
    }
  };

  const handleStartPractice = () => {
    setShowDifficultyModal(true);
  };

  const handleSelectDifficulty = (difficulty: string) => {
    setShowDifficultyModal(false);
    router.push({
      pathname: '/game',
      params: { difficulty },
    });
  };

  const handleLogout = async () => {
    await logout();
    setShowMenu(false);
    router.replace('/');
  };

  const navigateTo = (route: string) => {
    setShowMenu(false);
    router.push(route as any);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>U</Text>
          </View>
          <Text style={styles.headerTitle}>Game Lobby</Text>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowMenu(true)}
        >
          <Ionicons name="menu" size={28} color="#8B4513" />
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Your Stats Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="trophy-outline" size={24} color="#D4A574" />
            <Text style={styles.cardTitle}>Your Stats</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats?.total_games || 0}</Text>
              <Text style={styles.statLabel}>PLAYED</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats?.wins || 0}</Text>
              <Text style={styles.statLabel}>WINS</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, styles.rateNumber]}>
                {stats?.win_rate?.toFixed(0) || 0}%
              </Text>
              <Text style={styles.statLabel}>RATE</Text>
            </View>
          </View>
        </View>

        {/* Create Room Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="add" size={24} color="#9B59B6" />
            <Text style={styles.cardTitle}>Create Room</Text>
          </View>
          <Text style={styles.cardSubtitle}>Start a private game</Text>
          <TouchableOpacity style={styles.createRoomButton} onPress={handleCreateRoom}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.buttonText}>Create Room</Text>
          </TouchableOpacity>
        </View>

        {/* Join by Code Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="enter-outline" size={24} color="#3498DB" />
            <Text style={styles.cardTitle}>Join by Code</Text>
          </View>
          <Text style={styles.cardSubtitle}>Enter a friend's code</Text>
          <TouchableOpacity style={styles.joinGameButton} onPress={() => setShowJoinModal(true)}>
            <Ionicons name="enter-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Join Game</Text>
          </TouchableOpacity>
        </View>

        {/* Practice Mode Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.robotEmoji}>🤖</Text>
            <Text style={styles.cardTitle}>Practice Mode</Text>
          </View>
          <Text style={styles.cardSubtitle}>Play against AI</Text>
          <TouchableOpacity style={styles.practiceButton} onPress={handleStartPractice}>
            <Text style={styles.robotEmoji}>🤖</Text>
            <Text style={styles.buttonText}>Start Practice</Text>
          </TouchableOpacity>
        </View>

        {/* Local Multiplayer Card */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push({ pathname: '/game', params: { difficulty: 'local' } })}
        >
          <View style={styles.localMultiplayerContent}>
            <View style={styles.cardHeader}>
              <Ionicons name="people" size={24} color="#E74C3C" />
              <Text style={styles.cardTitle}>Local 2 Players</Text>
            </View>
            <View style={styles.localMultiplayerRow}>
              <Text style={styles.cardSubtitle}>Pass & play with a friend</Text>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={[styles.menuModal, { top: insets.top + 70 }]}>
            <View style={styles.menuHeader}>
              <View style={styles.menuAvatar}>
                <Ionicons name="person" size={24} color="#FFD700" />
              </View>
              <View>
                <Text style={styles.menuPlayerName}>{user?.name || 'Player'}</Text>
                {isGuest && <Text style={styles.guestBadge}>Guest Mode</Text>}
              </View>
            </View>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('/game-mode')}>
              <Ionicons name="home" size={22} color="#8B4513" />
              <Text style={styles.menuItemText}>Home</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('/friends')}>
              <Ionicons name="people" size={22} color="#8B4513" />
              <Text style={styles.menuItemText}>Friends</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('/profile')}>
              <Ionicons name="person" size={22} color="#8B4513" />
              <Text style={styles.menuItemText}>Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('/history')}>
              <Ionicons name="time" size={22} color="#8B4513" />
              <Text style={styles.menuItemText}>History</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('/leaderboard')}>
              <Ionicons name="trophy" size={22} color="#8B4513" />
              <Text style={styles.menuItemText}>Leaderboard</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('/tutorial')}>
              <Ionicons name="book" size={22} color="#8B4513" />
              <Text style={styles.menuItemText}>Tutorial</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={handleLogout}>
              <Ionicons name="log-out" size={22} color="#E74C3C" />
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Join Game Modal */}
      <Modal visible={showJoinModal} transparent animationType="fade" onRequestClose={() => setShowJoinModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.joinModal}>
            <Text style={styles.joinModalTitle}>Enter Room Code</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="XXXX"
              placeholderTextColor="#999"
              value={roomCode}
              onChangeText={setRoomCode}
              maxLength={6}
              autoCapitalize="characters"
            />
            <View style={styles.joinModalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowJoinModal(false); setRoomCode(''); }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmJoinButton} onPress={handleJoinGame}>
                <Text style={styles.confirmJoinButtonText}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Difficulty Selection Modal */}
      <Modal visible={showDifficultyModal} transparent animationType="fade" onRequestClose={() => setShowDifficultyModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.difficultyModal}>
            <Text style={styles.difficultyModalTitle}>Select Difficulty</Text>
            <TouchableOpacity style={[styles.difficultyOption, styles.easyOption]} onPress={() => handleSelectDifficulty('easy')}>
              <Ionicons name="happy" size={28} color="#fff" />
              <Text style={styles.difficultyText}>Easy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.difficultyOption, styles.mediumOption]} onPress={() => handleSelectDifficulty('medium')}>
              <Ionicons name="flash" size={28} color="#fff" />
              <Text style={styles.difficultyText}>Medium</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.difficultyOption, styles.hardOption]} onPress={() => handleSelectDifficulty('hard')}>
              <Ionicons name="skull" size={28} color="#fff" />
              <Text style={styles.difficultyText}>Hard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelDifficultyButton} onPress={() => setShowDifficultyModal(false)}>
              <Text style={styles.cancelDifficultyText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Room Modal */}
      <Modal visible={showCreateRoomModal} transparent animationType="fade" onRequestClose={() => setShowCreateRoomModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.createRoomModalContent}>
            <View style={styles.createRoomIcon}>
              <Ionicons name="add-circle" size={50} color="#9B59B6" />
            </View>
            <Text style={styles.createRoomModalTitle}>Create Game Room</Text>
            <Text style={styles.createRoomModalSubtitle}>Start a private room and invite your friends to play UNO together!</Text>
            
            <View style={styles.createRoomFeatures}>
              <View style={styles.featureRow}>
                <Ionicons name="people" size={20} color="#8B4513" />
                <Text style={styles.featureText}>Up to 4 players</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="share-social" size={20} color="#8B4513" />
                <Text style={styles.featureText}>Share room code or link</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="play-circle" size={20} color="#8B4513" />
                <Text style={styles.featureText}>Start anytime with 2+ players</Text>
              </View>
            </View>

            <View style={styles.createRoomButtons}>
              <TouchableOpacity 
                style={styles.cancelCreateButton} 
                onPress={() => setShowCreateRoomModal(false)}
                disabled={creatingRoom}
              >
                <Text style={styles.cancelCreateText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmCreateButton, creatingRoom && styles.buttonDisabled]} 
                onPress={handleConfirmCreateRoom}
                disabled={creatingRoom}
              >
                {creatingRoom ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.confirmCreateText}>Create</Text>
                  </>
                )}
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#C4A574' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoCircle: { width: 45, height: 45, borderRadius: 10, backgroundColor: '#FFD700', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  logoText: { fontSize: 26, fontWeight: 'bold', color: '#8B4513' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', fontStyle: 'italic' },
  menuButton: { width: 45, height: 45, borderRadius: 10, backgroundColor: '#FFD700', justifyContent: 'center', alignItems: 'center' },
  divider: { height: 4, backgroundColor: '#8B4513' },
  content: { flex: 1 },
  contentContainer: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 10 },
  cardSubtitle: { fontSize: 14, color: '#888', marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 5 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 36, fontWeight: 'bold', color: '#D4A574' },
  rateNumber: { color: '#D4A574' },
  statLabel: { fontSize: 12, color: '#888', fontWeight: '600', marginTop: 4 },
  robotEmoji: { fontSize: 22 },
  createRoomButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#9B59B6', paddingVertical: 14, borderRadius: 12 },
  joinGameButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3498DB', paddingVertical: 14, borderRadius: 12 },
  practiceButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2ECC71', paddingVertical: 14, borderRadius: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  localMultiplayerContent: { width: '100%' },
  localMultiplayerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  menuModal: { position: 'absolute', right: 20, backgroundColor: '#fff', borderRadius: 16, padding: 10, minWidth: 220, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  menuHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 5 },
  menuAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#8B4513', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuPlayerName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  guestBadge: { fontSize: 11, color: '#FF9800', fontWeight: '600' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 10 },
  menuItemText: { fontSize: 16, color: '#333', marginLeft: 12 },
  menuItemDanger: { marginTop: 5 },
  menuItemTextDanger: { color: '#E74C3C' },
  joinModal: { backgroundColor: '#fff', borderRadius: 20, padding: 25, width: '85%', maxWidth: 350, alignItems: 'center' },
  joinModalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  codeInput: { width: '100%', height: 55, borderWidth: 2, borderColor: '#ddd', borderRadius: 12, fontSize: 24, textAlign: 'center', letterSpacing: 8, color: '#333', marginBottom: 20 },
  joinModalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f0f0f0', alignItems: 'center' },
  cancelButtonText: { fontSize: 16, color: '#666', fontWeight: '600' },
  confirmJoinButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#3498DB', alignItems: 'center' },
  confirmJoinButtonText: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
  difficultyModal: { backgroundColor: '#fff', borderRadius: 20, padding: 25, width: '85%', maxWidth: 350, alignItems: 'center' },
  difficultyModalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  difficultyOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', paddingVertical: 16, borderRadius: 12, marginBottom: 12 },
  easyOption: { backgroundColor: '#4CAF50' },
  mediumOption: { backgroundColor: '#FF9800' },
  hardOption: { backgroundColor: '#F44336' },
  difficultyText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  cancelDifficultyButton: { marginTop: 8, paddingVertical: 12 },
  cancelDifficultyText: { fontSize: 16, color: '#888' },
});
