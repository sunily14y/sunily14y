import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../src/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Player {
  user_id: string;
  name: string;
  is_creator: boolean;
  joined_at: string;
}

interface RoomData {
  room_code: string;
  creator_id: string;
  creator_name: string;
  players: Player[];
  status: string;
  max_players: number;
}

export default function WaitingRoomScreen() {
  const { roomCode } = useLocalSearchParams<{ roomCode: string }>();
  const { user } = useAuth();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const insets = useSafeAreaInsets();

  const inviteLink = `https://uno-cards-4.preview.emergentagent.com/join?code=${roomCode}`;

  useEffect(() => {
    if (roomCode) {
      fetchRoom();
      // Poll for updates every 2 seconds
      const interval = setInterval(fetchRoom, 2000);
      return () => clearInterval(interval);
    }
  }, [roomCode]);

  useEffect(() => {
    // Check if game started
    if (room?.status === 'playing') {
      router.replace({
        pathname: '/multiplayer-game',
        params: { roomCode: room.room_code },
      });
    }
  }, [room?.status]);

  const fetchRoom = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/rooms/${roomCode}`);
      if (response.ok) {
        const data = await response.json();
        setRoom(data);
      } else if (response.status === 404) {
        Alert.alert('Room Closed', 'This room no longer exists', [
          { text: 'OK', onPress: () => router.replace('/game-mode') }
        ]);
      }
    } catch (error) {
      console.error('Error fetching room:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(roomCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my UNO game!\n\nRoom Code: ${roomCode}\n\nOr click: ${inviteLink}`,
        title: 'Join my UNO game!',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleStartGame = async () => {
    if (!room || room.players.length < 2) {
      Alert.alert('Cannot Start', 'Need at least 2 players to start the game');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/rooms/${roomCode}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.user_id }),
      });

      if (response.ok) {
        router.replace({
          pathname: '/multiplayer-game',
          params: { roomCode },
        });
      } else {
        const data = await response.json();
        Alert.alert('Error', data.detail || 'Failed to start game');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start game');
    }
  };

  const handleLeaveRoom = async () => {
    Alert.alert(
      'Leave Room',
      room?.creator_id === user?.user_id 
        ? 'You are the host. Leaving will close the room for everyone.' 
        : 'Are you sure you want to leave?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${BACKEND_URL}/api/rooms/${roomCode}/leave`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user?.user_id }),
              });
              router.replace('/game-mode');
            } catch (error) {
              router.replace('/game-mode');
            }
          },
        },
      ]
    );
  };

  const isCreator = room?.creator_id === user?.user_id;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B4513" />
        <Text style={styles.loadingText}>Loading room...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleLeaveRoom} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Waiting Room</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.divider} />

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {/* Room Code Card */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>ROOM CODE</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{roomCode}</Text>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
              <Ionicons name={copied ? "checkmark" : "copy-outline"} size={24} color="#8B4513" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Share Link Card */}
        <View style={styles.shareCard}>
          <Text style={styles.shareLinkLabel}>INVITATION LINK</Text>
          <View style={styles.linkContainer}>
            <Text style={styles.linkText} numberOfLines={1}>{inviteLink}</Text>
          </View>
          <View style={styles.shareButtons}>
            <TouchableOpacity style={styles.copyLinkButton} onPress={handleCopyLink}>
              <Ionicons name="copy-outline" size={20} color="#fff" />
              <Text style={styles.copyLinkText}>Copy Link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Ionicons name="share-social" size={20} color="#fff" />
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Players List */}
        <View style={styles.playersCard}>
          <View style={styles.playersHeader}>
            <Text style={styles.playersTitle}>Players</Text>
            <Text style={styles.playersCount}>{room?.players.length || 0}/{room?.max_players || 4}</Text>
          </View>

          {room?.players.map((player, index) => (
            <View key={player.user_id} style={styles.playerItem}>
              <View style={styles.playerAvatar}>
                <Ionicons name="person" size={24} color="#FFD700" />
              </View>
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>
                  {player.name}
                  {player.user_id === user?.user_id && ' (You)'}
                </Text>
                {player.is_creator && (
                  <View style={styles.hostBadge}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.hostBadgeText}>Host</Text>
                  </View>
                )}
              </View>
              <View style={[styles.readyIndicator, { backgroundColor: '#4CAF50' }]}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </View>
            </View>
          ))}

          {/* Empty slots */}
          {Array.from({ length: (room?.max_players || 4) - (room?.players.length || 0) }).map((_, index) => (
            <View key={`empty-${index}`} style={[styles.playerItem, styles.emptySlot]}>
              <View style={[styles.playerAvatar, styles.emptyAvatar]}>
                <Ionicons name="person-add-outline" size={24} color="#ccc" />
              </View>
              <Text style={styles.emptyText}>Waiting for player...</Text>
            </View>
          ))}
        </View>

        {/* Waiting indicator */}
        {!isCreator && (
          <View style={styles.waitingIndicator}>
            <ActivityIndicator size="small" color="#8B4513" />
            <Text style={styles.waitingText}>Waiting for host to start the game...</Text>
          </View>
        )}

        {/* Start Game Button (Only for creator) */}
        {isCreator && (
          <TouchableOpacity
            style={[
              styles.startButton,
              (room?.players.length || 0) < 2 && styles.startButtonDisabled
            ]}
            onPress={handleStartGame}
            disabled={(room?.players.length || 0) < 2}
          >
            <Ionicons name="play" size={24} color="#fff" />
            <Text style={styles.startButtonText}>Start Game</Text>
          </TouchableOpacity>
        )}

        {isCreator && (room?.players.length || 0) < 2 && (
          <Text style={styles.minPlayersText}>Need at least 2 players to start</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  loadingText: { marginTop: 15, fontSize: 16, color: '#666' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingBottom: 15, backgroundColor: '#C4A574' },
  backButton: { padding: 10 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  divider: { height: 4, backgroundColor: '#8B4513' },
  content: { flex: 1, padding: 16 },
  codeCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  codeLabel: { fontSize: 14, color: '#888', fontWeight: '600', marginBottom: 10 },
  codeContainer: { flexDirection: 'row', alignItems: 'center' },
  codeText: { fontSize: 48, fontWeight: 'bold', color: '#8B4513', letterSpacing: 10 },
  copyButton: { marginLeft: 15, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 10 },
  shareCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 4 },
  shareLinkLabel: { fontSize: 14, color: '#888', fontWeight: '600', marginBottom: 10 },
  linkContainer: { backgroundColor: '#f5f5f5', borderRadius: 10, padding: 12, marginBottom: 15 },
  linkText: { fontSize: 14, color: '#666' },
  shareButtons: { flexDirection: 'row', gap: 10 },
  copyLinkButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#8B4513', paddingVertical: 12, borderRadius: 10, gap: 8 },
  copyLinkText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  shareButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3498DB', paddingVertical: 12, borderRadius: 10, gap: 8 },
  shareButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  playersCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 4 },
  playersHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  playersTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  playersCount: { fontSize: 16, color: '#8B4513', fontWeight: '600' },
  playerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  playerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#8B4513', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  playerInfo: { flex: 1 },
  playerName: { fontSize: 16, fontWeight: '600', color: '#333' },
  hostBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8B4513', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-start', marginTop: 4, gap: 4 },
  hostBadgeText: { fontSize: 11, color: '#FFD700', fontWeight: '600' },
  readyIndicator: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  emptySlot: { opacity: 0.5 },
  emptyAvatar: { backgroundColor: '#e0e0e0' },
  emptyText: { color: '#999', fontStyle: 'italic' },
  waitingIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, gap: 10 },
  waitingText: { color: '#666', fontSize: 14 },
  startButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4CAF50', paddingVertical: 16, borderRadius: 12, gap: 10, marginTop: 10 },
  startButtonDisabled: { backgroundColor: '#ccc' },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  minPlayersText: { textAlign: 'center', color: '#888', marginTop: 10, fontSize: 14 },
});
