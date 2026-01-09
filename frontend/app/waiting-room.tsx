import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [starting, setStarting] = useState(false);
  const insets = useSafeAreaInsets();

  const inviteLink = `https://uno-cards-4.preview.emergentagent.com/join?code=${roomCode}`;
  const maxPlayers = room?.max_players || 6;

  useEffect(() => {
    if (roomCode) {
      fetchRoom();
      const interval = setInterval(fetchRoom, 2000);
      return () => clearInterval(interval);
    }
  }, [roomCode]);

  useEffect(() => {
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
    setCopied('code');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(inviteLink);
    setCopied('link');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleInvite = async () => {
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

    setStarting(true);
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
    } finally {
      setStarting(false);
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

  const handleDeleteRoom = () => {
    Alert.alert(
      'Delete Room',
      'Are you sure you want to delete this room?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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
  const playerCount = room?.players.length || 0;
  const spotsLeft = maxPlayers - playerCount;

  if (loading) {
    return (
      <LinearGradient colors={['#8B5A2B', '#6B4423', '#4A2C17']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading room...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#8B5A2B', '#6B4423', '#4A2C17']} style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleLeaveRoom} style={styles.leaveButton}>
          <Ionicons name="arrow-back" size={18} color="#4A2C17" />
          <Text style={styles.leaveButtonText}>Leave</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>UNO! Game</Text>
        
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.inviteButton} onPress={handleInvite}>
            <Ionicons name="link" size={16} color="#4A2C17" />
            <Text style={styles.inviteButtonText}>Invite</Text>
          </TouchableOpacity>
          {isCreator && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteRoom}>
              <Ionicons name="trash" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {/* Waiting Title */}
        <Text style={styles.waitingTitle}>Waiting for Players...</Text>
        
        {/* Progress Dots */}
        <View style={styles.progressContainer}>
          <View style={styles.progressDots}>
            {Array.from({ length: maxPlayers }).map((_, index) => (
              <View 
                key={index} 
                style={[
                  styles.progressDot, 
                  index < playerCount && styles.progressDotFilled
                ]} 
              />
            ))}
          </View>
          <Text style={styles.progressText}>{playerCount}/{maxPlayers}</Text>
        </View>

        {/* Room Code Card */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>ROOM ACCESS CODE</Text>
          <Text style={styles.codeText}>{roomCode}</Text>
          
          <TouchableOpacity style={styles.copyCodeButton} onPress={handleCopyCode}>
            <Ionicons name={copied === 'code' ? "checkmark" : "copy-outline"} size={18} color="#4A2C17" />
            <Text style={styles.copyCodeText}>{copied === 'code' ? 'Copied!' : 'Copy Code'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.copyLinkButton} onPress={handleCopyLink}>
            <Ionicons name={copied === 'link' ? "checkmark" : "link"} size={18} color="#D4873F" />
            <Text style={styles.copyLinkText}>{copied === 'link' ? 'Copied!' : 'Copy Link'}</Text>
          </TouchableOpacity>
        </View>

        {/* Share Message */}
        <View style={styles.shareMessageCard}>
          <Text style={styles.shareMessageText}>
            <Text style={styles.sparkle}>✨</Text> Share this code with{' '}
            <Text style={styles.highlightText}>{spotsLeft}</Text> friends to join
          </Text>
        </View>

        {/* Players List */}
        <View style={styles.playersCard}>
          <View style={styles.playersHeader}>
            <View style={styles.onlineIndicator} />
            <Text style={styles.playersTitle}>Players in Lobby:</Text>
          </View>
          
          {room?.players.map((player, index) => (
            <View key={player.user_id} style={styles.playerItem}>
              <View style={styles.playerNumber}>
                <Text style={styles.playerNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.playerName}>
                {player.name}
                {player.user_id === user?.user_id && ' (You)'}
              </Text>
              {player.is_creator && (
                <View style={styles.creatorBadge}>
                  <Text style={styles.creatorBadgeText}>Creator</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Start Game Section (Only for creator) */}
        {isCreator && (
          <View style={styles.startGameCard}>
            <View style={styles.startGameMessage}>
              <Text style={styles.gamepadEmoji}>🎮</Text>
              <Text style={styles.startGameText}>
                {playerCount >= 2 
                  ? 'You can start the game now or wait for more players to join.'
                  : 'Waiting for at least 1 more player to join...'}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.startButton,
                playerCount < 2 && styles.startButtonDisabled
              ]}
              onPress={handleStartGame}
              disabled={playerCount < 2 || starting}
            >
              {starting ? (
                <ActivityIndicator size="small" color="#4A2C17" />
              ) : (
                <>
                  <Text style={styles.rocketEmoji}>🚀</Text>
                  <Text style={styles.startButtonText}>Start Game</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Waiting message for non-creators */}
        {!isCreator && (
          <View style={styles.waitingMessageCard}>
            <ActivityIndicator size="small" color="#FFD700" />
            <Text style={styles.waitingMessageText}>
              Waiting for the host to start the game...
            </Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, fontSize: 16, color: '#F5DEB3' },
  
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15, 
    paddingBottom: 15 
  },
  leaveButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFD700', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 20,
    gap: 4
  },
  leaveButtonText: { color: '#4A2C17', fontWeight: '600', fontSize: 14 },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#F5DEB3',
    fontStyle: 'italic'
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inviteButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFD700', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 20,
    gap: 4
  },
  inviteButtonText: { color: '#4A2C17', fontWeight: '600', fontSize: 14 },
  deleteButton: { 
    backgroundColor: '#DC3545', 
    padding: 10, 
    borderRadius: 8 
  },
  
  content: { flex: 1, paddingHorizontal: 20 },
  
  waitingTitle: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#F5DEB3', 
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 15,
    fontStyle: 'italic'
  },
  
  progressContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 90, 43, 0.8)',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginBottom: 20
  },
  progressDots: { flexDirection: 'row', gap: 8, marginRight: 15 },
  progressDot: { 
    width: 14, 
    height: 14, 
    borderRadius: 7, 
    backgroundColor: 'rgba(255, 255, 255, 0.3)' 
  },
  progressDotFilled: { backgroundColor: '#FFD700' },
  progressText: { 
    color: '#F5DEB3', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  
  codeCard: { 
    backgroundColor: 'rgba(180, 120, 60, 0.9)', 
    borderRadius: 16, 
    padding: 20, 
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)'
  },
  codeLabel: { 
    color: '#F5DEB3', 
    fontSize: 14, 
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 10 
  },
  codeText: { 
    fontSize: 56, 
    fontWeight: 'bold', 
    color: '#FFD700', 
    letterSpacing: 15,
    marginBottom: 15
  },
  copyCodeButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFD700', 
    paddingVertical: 12, 
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 10,
    gap: 8,
    width: '100%',
    justifyContent: 'center'
  },
  copyCodeText: { color: '#4A2C17', fontWeight: 'bold', fontSize: 16 },
  copyLinkButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'transparent', 
    paddingVertical: 12, 
    paddingHorizontal: 40,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#D4873F',
    gap: 8,
    width: '100%',
    justifyContent: 'center'
  },
  copyLinkText: { color: '#D4873F', fontWeight: 'bold', fontSize: 16 },
  
  shareMessageCard: {
    backgroundColor: 'rgba(139, 90, 43, 0.6)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center'
  },
  shareMessageText: { color: '#F5DEB3', fontSize: 15, textAlign: 'center' },
  sparkle: { fontSize: 16 },
  highlightText: { color: '#FFD700', fontWeight: 'bold', fontSize: 18 },
  
  playersCard: { 
    backgroundColor: 'rgba(139, 90, 43, 0.6)', 
    borderRadius: 16, 
    padding: 20,
    marginBottom: 15
  },
  playersHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 15 
  },
  onlineIndicator: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    backgroundColor: '#4CAF50',
    marginRight: 10
  },
  playersTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#F5DEB3',
    fontStyle: 'italic'
  },
  playerItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(180, 120, 60, 0.8)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8
  },
  playerNumber: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#FFD700', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 12
  },
  playerNumberText: { color: '#4A2C17', fontWeight: 'bold', fontSize: 16 },
  playerName: { flex: 1, color: '#F5DEB3', fontSize: 16, fontWeight: '600' },
  creatorBadge: { 
    backgroundColor: '#FFD700', 
    paddingHorizontal: 12, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  creatorBadgeText: { 
    color: '#4A2C17', 
    fontSize: 12, 
    fontWeight: 'bold',
    fontStyle: 'italic'
  },
  
  startGameCard: {
    backgroundColor: 'rgba(139, 90, 43, 0.6)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15
  },
  startGameMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15
  },
  gamepadEmoji: { fontSize: 24, marginRight: 10, marginTop: 2 },
  startGameText: { 
    flex: 1,
    color: '#F5DEB3', 
    fontSize: 16, 
    lineHeight: 24 
  },
  startButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#FFD700', 
    paddingVertical: 16, 
    borderRadius: 25,
    gap: 10
  },
  startButtonDisabled: { 
    backgroundColor: 'rgba(255, 215, 0, 0.4)' 
  },
  rocketEmoji: { fontSize: 20 },
  startButtonText: { 
    color: '#4A2C17', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  
  waitingMessageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 90, 43, 0.6)',
    borderRadius: 16,
    padding: 20,
    gap: 12
  },
  waitingMessageText: { color: '#F5DEB3', fontSize: 14 },
});
