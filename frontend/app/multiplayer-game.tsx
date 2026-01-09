import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { UnoCard } from '../src/components/UnoCard';
import { ColorPicker } from '../src/components/ColorPicker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

interface Player {
  user_id: string;
  name: string;
  card_count: number;
  is_current: boolean;
  is_creator: boolean;
}

interface Card {
  id: string;
  color: string;
  type: string;
  value?: number;
}

interface GameState {
  room_code: string;
  status: string;
  players: Player[];
  my_hand: Card[];
  discard_pile: Card | null;
  deck_count: number;
  current_player_id: string;
  direction: number;
  selected_color: string | null;
  winner: { user_id: string; name: string } | null;
  last_action: string | null;
  updated_at: string;
}

export default function MultiplayerGameScreen() {
  const { roomCode } = useLocalSearchParams<{ roomCode: string }>();
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingWildCard, setPendingWildCard] = useState<Card | null>(null);
  const [drawnCard, setDrawnCard] = useState<Card | null>(null);
  const [showDrawnCardModal, setShowDrawnCardModal] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (roomCode && user) {
      fetchGameState();
      const interval = setInterval(fetchGameState, 1500);
      return () => clearInterval(interval);
    }
  }, [roomCode, user]);

  const fetchGameState = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/rooms/${roomCode}/game-state?user_id=${user?.user_id}`
      );
      if (response.ok) {
        const data = await response.json();
        setGameState(data);
      }
    } catch (error) {
      console.error('Error fetching game state:', error);
    } finally {
      setLoading(false);
    }
  };

  const isMyTurn = gameState?.current_player_id === user?.user_id;

  const canPlayCard = (card: Card) => {
    if (!gameState?.discard_pile) return true;
    
    const topCard = gameState.discard_pile;
    const currentColor = gameState.selected_color || topCard.color;
    
    // Wild cards can always be played
    if (card.type === 'wild' || card.type === 'wild4') return true;
    
    // Match color
    if (card.color === currentColor) return true;
    
    // Match number
    if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) return true;
    
    // Match action type
    if (card.type === topCard.type && card.type !== 'number') return true;
    
    return false;
  };

  const handlePlayCard = async (card: Card) => {
    if (!isMyTurn) {
      Alert.alert('Not Your Turn', 'Please wait for your turn');
      return;
    }

    if (!canPlayCard(card)) {
      Alert.alert('Invalid Move', 'You cannot play this card');
      return;
    }

    if (card.type === 'wild' || card.type === 'wild4') {
      setPendingWildCard(card);
      setShowColorPicker(true);
      return;
    }

    await playCard(card.id);
  };

  const playCard = async (cardId: string, chosenColor?: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/rooms/${roomCode}/play-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.user_id,
          card_id: cardId,
          chosen_color: chosenColor,
        }),
      });

      if (response.ok) {
        // Check if player has 1 card left - prompt for UNO
        const currentHand = gameState?.my_hand.filter(c => c.id !== cardId);
        if (currentHand?.length === 1) {
          handleCallUno();
        }
        fetchGameState();
      } else {
        const data = await response.json();
        Alert.alert('Error', data.detail || 'Failed to play card');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to play card');
    }
  };

  const handleColorSelect = (color: string) => {
    if (pendingWildCard) {
      playCard(pendingWildCard.id, color);
      setPendingWildCard(null);
      setShowColorPicker(false);
    }
  };

  const handleDrawCard = async () => {
    if (!isMyTurn) {
      Alert.alert('Not Your Turn', 'Please wait for your turn');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/rooms/${roomCode}/draw-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.user_id }),
      });

      if (response.ok) {
        const data = await response.json();
        setDrawnCard(data.drawn_card);
        setShowDrawnCardModal(true);
      } else {
        const data = await response.json();
        Alert.alert('Error', data.detail || 'Failed to draw card');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to draw card');
    }
  };

  const handlePlayDrawnCard = async () => {
    if (!drawnCard) return;

    if (drawnCard.type === 'wild' || drawnCard.type === 'wild4') {
      setShowDrawnCardModal(false);
      setPendingWildCard(drawnCard);
      setShowColorPicker(true);
      setDrawnCard(null);
    } else {
      await playCard(drawnCard.id);
      setShowDrawnCardModal(false);
      setDrawnCard(null);
    }
  };

  const handleKeepDrawnCard = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/rooms/${roomCode}/pass-turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.user_id }),
      });
      setShowDrawnCardModal(false);
      setDrawnCard(null);
      fetchGameState();
    } catch (error) {
      console.error('Error passing turn:', error);
    }
  };

  const handleCallUno = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/rooms/${roomCode}/call-uno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.user_id }),
      });
    } catch (error) {
      console.error('Error calling UNO:', error);
    }
  };

  const handleLeaveGame = () => {
    Alert.alert('Leave Game', 'Are you sure you want to leave?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => router.replace('/game-mode') },
    ]);
  };

  const getColorIndicator = (color: string | null) => {
    const colorMap: Record<string, string> = {
      red: '#DC143C',
      yellow: '#FFD700',
      green: '#228B22',
      blue: '#1E90FF',
    };
    return color ? colorMap[color] || '#666' : '#666';
  };

  if (loading || !gameState) {
    return (
      <LinearGradient colors={['#8B4513', '#5D2E0C', '#3D1E08', '#1a0f00']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading game...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Game over screen
  if (gameState.status === 'finished' && gameState.winner) {
    const isWinner = gameState.winner.user_id === user?.user_id;
    return (
      <LinearGradient colors={['#8B4513', '#5D2E0C', '#3D1E08', '#1a0f00']} style={styles.container}>
        <View style={styles.gameOverContainer}>
          <Ionicons name={isWinner ? 'trophy' : 'sad'} size={80} color={isWinner ? '#FFD700' : '#888'} />
          <Text style={styles.gameOverTitle}>{isWinner ? 'You Win!' : 'Game Over'}</Text>
          <Text style={styles.gameOverSubtitle}>{gameState.winner.name} won the game!</Text>
          <TouchableOpacity style={styles.backToLobbyButton} onPress={() => router.replace('/game-mode')}>
            <Ionicons name="home" size={20} color="#fff" />
            <Text style={styles.backToLobbyText}>Back to Lobby</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const playableCards = gameState.my_hand.filter(card => canPlayCard(card));

  return (
    <LinearGradient colors={['#8B4513', '#5D2E0C', '#3D1E08', '#1a0f00']} style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 5 }]}>
        <TouchableOpacity onPress={handleLeaveGame} style={styles.exitButton}>
          <Ionicons name="close" size={24} color="#F5DEB3" />
        </TouchableOpacity>
        <View style={styles.turnIndicator}>
          <Text style={styles.turnText}>
            {isMyTurn ? 'Your Turn!' : `${gameState.players.find(p => p.is_current)?.name}'s Turn`}
          </Text>
        </View>
        <View style={styles.deckInfo}>
          <Text style={styles.deckCount}>{gameState.deck_count} cards</Text>
        </View>
      </View>

      {/* Opponents Area */}
      <View style={styles.opponentsArea}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.opponentsScroll}>
          {gameState.players
            .filter(p => p.user_id !== user?.user_id)
            .map((player) => (
              <View key={player.user_id} style={[styles.opponentCard, player.is_current && styles.currentPlayerCard]}>
                <View style={styles.opponentAvatar}>
                  <Ionicons name="person" size={20} color="#FFD700" />
                </View>
                <Text style={styles.opponentName} numberOfLines={1}>{player.name}</Text>
                <View style={styles.cardCountBadge}>
                  <Text style={styles.cardCountText}>{player.card_count}</Text>
                </View>
                {player.is_current && <View style={styles.currentIndicator} />}
              </View>
            ))}
        </ScrollView>
      </View>

      {/* Game Area */}
      <View style={styles.gameArea}>
        {/* Draw Pile */}
        <TouchableOpacity style={styles.drawPile} onPress={handleDrawCard} disabled={!isMyTurn}>
          <View style={[styles.drawPileCard, !isMyTurn && styles.disabledPile]}>
            <Text style={styles.drawPileText}>UNO</Text>
          </View>
          <Text style={styles.drawLabel}>Draw</Text>
        </TouchableOpacity>

        {/* Discard Pile */}
        <View style={styles.discardPile}>
          {gameState.discard_pile && (
            <UnoCard card={gameState.discard_pile as any} disabled />
          )}
          {gameState.selected_color && (
            <View style={[styles.colorIndicator, { backgroundColor: getColorIndicator(gameState.selected_color) }]} />
          )}
        </View>

        {/* Direction Indicator */}
        <View style={styles.directionIndicator}>
          <Ionicons name={gameState.direction === 1 ? 'arrow-forward' : 'arrow-back'} size={24} color="#B8860B" />
        </View>

        {/* UNO Button */}
        {gameState.my_hand.length === 2 && isMyTurn && (
          <TouchableOpacity style={styles.unoButton} onPress={handleCallUno}>
            <Text style={styles.unoButtonText}>UNO!</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Last Action */}
      {gameState.last_action && (
        <View style={styles.lastActionContainer}>
          <Text style={styles.lastActionText}>{gameState.last_action}</Text>
        </View>
      )}

      {/* Player Hand */}
      <View style={styles.playerArea}>
        <View style={styles.playerInfo}>
          <View style={styles.avatarSmall}>
            <Ionicons name="person" size={16} color="#FFD700" />
          </View>
          <Text style={styles.playerName}>{user?.name}</Text>
          {isMyTurn && <View style={styles.yourTurnBadge}><Text style={styles.yourTurnText}>Your Turn</Text></View>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.handContainer}>
          {gameState.my_hand.map((card, index) => {
            const isPlayable = playableCards.some(c => c.id === card.id);
            return (
              <View
                key={card.id}
                style={[
                  styles.cardWrapper,
                  { marginLeft: index > 0 ? -15 : 0 },
                  isPlayable && isMyTurn && styles.playableCard,
                ]}
              >
                <UnoCard
                  card={card as any}
                  onPress={() => handlePlayCard(card)}
                  disabled={!isMyTurn || !isPlayable}
                />
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Color Picker Modal */}
      <ColorPicker visible={showColorPicker} onSelectColor={handleColorSelect} />

      {/* Drawn Card Modal */}
      <Modal visible={showDrawnCardModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.drawnCardModal}>
            <Text style={styles.drawnCardTitle}>You drew a card!</Text>
            {drawnCard && (
              <View style={styles.drawnCardContainer}>
                <UnoCard card={drawnCard as any} disabled />
              </View>
            )}
            {drawnCard && canPlayCard(drawnCard) ? (
              <View style={styles.drawnCardButtons}>
                <TouchableOpacity style={styles.keepButton} onPress={handleKeepDrawnCard}>
                  <Text style={styles.keepButtonText}>Keep</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.playDrawnButton} onPress={handlePlayDrawnCard}>
                  <Text style={styles.playDrawnButtonText}>Play</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.okButton} onPress={handleKeepDrawnCard}>
                <Text style={styles.okButtonText}>OK</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#F5DEB3', fontSize: 18, marginTop: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15 },
  exitButton: { padding: 8 },
  turnIndicator: { backgroundColor: 'rgba(220, 20, 60, 0.8)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 15 },
  turnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  deckInfo: { backgroundColor: 'rgba(93, 46, 12, 0.8)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  deckCount: { color: '#D2B48C', fontSize: 12 },
  opponentsArea: { paddingVertical: 10 },
  opponentsScroll: { paddingHorizontal: 15 },
  opponentCard: { alignItems: 'center', marginRight: 15, backgroundColor: 'rgba(93, 46, 12, 0.8)', borderRadius: 12, padding: 10, minWidth: 80 },
  currentPlayerCard: { borderWidth: 2, borderColor: '#FFD700' },
  opponentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#8B4513', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  opponentName: { color: '#F5DEB3', fontSize: 12, fontWeight: '600', maxWidth: 70 },
  cardCountBadge: { backgroundColor: '#DC143C', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 5 },
  cardCountText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  currentIndicator: { position: 'absolute', top: -5, right: -5, width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50' },
  gameArea: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 30 },
  drawPile: { alignItems: 'center' },
  drawPileCard: { width: 70, height: 105, backgroundColor: '#1a0f00', borderRadius: 8, borderWidth: 3, borderColor: '#B8860B', justifyContent: 'center', alignItems: 'center' },
  disabledPile: { opacity: 0.5 },
  drawPileText: { color: '#FFD700', fontWeight: 'bold', fontSize: 16, transform: [{ rotate: '-20deg' }] },
  drawLabel: { color: '#D2B48C', fontSize: 12, marginTop: 5 },
  discardPile: { alignItems: 'center', position: 'relative' },
  colorIndicator: { position: 'absolute', bottom: -15, width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#fff' },
  directionIndicator: { position: 'absolute', right: 60, backgroundColor: 'rgba(93, 46, 12, 0.8)', padding: 10, borderRadius: 20 },
  unoButton: { position: 'absolute', right: 15, backgroundColor: '#DC143C', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, borderWidth: 3, borderColor: '#FFD700' },
  unoButtonText: { color: '#FFD700', fontWeight: 'bold', fontSize: 18 },
  lastActionContainer: { alignItems: 'center', paddingVertical: 5 },
  lastActionText: { color: '#D2B48C', fontSize: 13, fontStyle: 'italic' },
  playerArea: { alignItems: 'center', paddingBottom: 10 },
  playerInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(139, 69, 19, 0.8)', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  playerName: { color: '#F5DEB3', fontSize: 14, fontWeight: '600' },
  yourTurnBadge: { backgroundColor: '#4CAF50', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginLeft: 10 },
  yourTurnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  handContainer: { paddingHorizontal: 20, alignItems: 'flex-end' },
  cardWrapper: { marginBottom: 5 },
  playableCard: { marginTop: -10 },
  gameOverContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gameOverTitle: { fontSize: 42, fontWeight: 'bold', color: '#F5DEB3', marginTop: 20 },
  gameOverSubtitle: { fontSize: 18, color: '#D2B48C', marginTop: 10, marginBottom: 30 },
  backToLobbyButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8B4513', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 12, gap: 10 },
  backToLobbyText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center' },
  drawnCardModal: { backgroundColor: '#5D2E0C', borderRadius: 20, padding: 25, alignItems: 'center', borderWidth: 3, borderColor: '#B8860B' },
  drawnCardTitle: { fontSize: 20, fontWeight: 'bold', color: '#F5DEB3', marginBottom: 20 },
  drawnCardContainer: { marginBottom: 20 },
  drawnCardButtons: { flexDirection: 'row', gap: 15 },
  keepButton: { backgroundColor: '#666', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10 },
  keepButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  playDrawnButton: { backgroundColor: '#4CAF50', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10 },
  playDrawnButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  okButton: { backgroundColor: '#8B4513', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 10 },
  okButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
