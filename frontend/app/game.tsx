import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStore, CardColor, Card } from '../src/store/gameStore';
import { UnoCard } from '../src/components/UnoCard';
import { ColorPicker } from '../src/components/ColorPicker';

const { width, height } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function GameScreen() {
  const { difficulty } = useLocalSearchParams<{ difficulty: string }>();
  const [playerName, setPlayerName] = useState('Player');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingWildCard, setPendingWildCard] = useState<Card | null>(null);

  const {
    players,
    currentPlayerIndex,
    discardPile,
    deck,
    direction,
    gameStarted,
    gameOver,
    winner,
    selectedColor,
    initGame,
    playCard,
    drawCard,
    sayUno,
    nextTurn,
    aiTurn,
    canPlayCard,
    getPlayableCards,
    resetGame,
  } = useGameStore();

  useEffect(() => {
    loadAndStartGame();
    return () => resetGame();
  }, []);

  useEffect(() => {
    // AI turn logic
    if (gameStarted && !gameOver) {
      const currentPlayer = players[currentPlayerIndex];
      if (currentPlayer?.isAI) {
        aiTurn();
      }
    }
  }, [currentPlayerIndex, gameStarted, gameOver]);

  useEffect(() => {
    // Save game result when game ends
    if (gameOver && winner) {
      saveGameResult();
    }
  }, [gameOver, winner]);

  const loadAndStartGame = async () => {
    const name = await AsyncStorage.getItem('playerName');
    setPlayerName(name || 'Player');
    const isLocal = difficulty === 'local';
    initGame(name || 'Player', difficulty || 'medium', isLocal);
  };

  const saveGameResult = async () => {
    if (!winner) return;
    try {
      const name = await AsyncStorage.getItem('playerName');
      const playerWon = winner.id === 'player1';
      
      await fetch(`${BACKEND_URL}/api/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_name: name || 'Player',
          won: playerWon,
          difficulty: difficulty || 'medium',
          opponent_type: difficulty === 'local' ? 'human' : 'ai',
        }),
      });
    } catch (error) {
      console.error('Failed to save game result:', error);
    }
  };

  const humanPlayer = players.find((p) => p.id === 'player1');
  const opponentPlayer = players.find((p) => p.id !== 'player1');
  const topCard = discardPile[discardPile.length - 1];
  const isMyTurn = players[currentPlayerIndex]?.id === 'player1';
  const playableCards = humanPlayer ? getPlayableCards(humanPlayer.id) : [];

  const handleCardPress = (card: Card) => {
    if (!isMyTurn || !humanPlayer) return;
    if (!canPlayCard(card)) {
      Alert.alert('Invalid Move', 'You cannot play this card');
      return;
    }

    if (card.type === 'wild' || card.type === 'wild4') {
      setPendingWildCard(card);
      setShowColorPicker(true);
    } else {
      const success = playCard(humanPlayer.id, card.id);
      if (!success) {
        Alert.alert('Error', 'Could not play card');
      }
    }
  };

  const handleColorSelect = (color: CardColor) => {
    if (pendingWildCard && humanPlayer) {
      playCard(humanPlayer.id, pendingWildCard.id, color);
      setPendingWildCard(null);
      setShowColorPicker(false);
    }
  };

  const handleDraw = () => {
    if (!isMyTurn || !humanPlayer) return;
    const drawnCard = drawCard(humanPlayer.id);
    if (drawnCard) {
      if (canPlayCard(drawnCard)) {
        Alert.alert(
          'Drawn Card',
          'You drew a playable card. Would you like to play it?',
          [
            { text: 'Keep', onPress: () => nextTurn() },
            {
              text: 'Play',
              onPress: () => {
                if (drawnCard.type === 'wild' || drawnCard.type === 'wild4') {
                  setPendingWildCard(drawnCard);
                  setShowColorPicker(true);
                } else {
                  playCard(humanPlayer.id, drawnCard.id);
                }
              },
            },
          ]
        );
      } else {
        nextTurn();
      }
    }
  };

  const handleUno = () => {
    if (humanPlayer && humanPlayer.cards.length === 2) {
      sayUno(humanPlayer.id);
      Alert.alert('UNO!', 'You called UNO!');
    }
  };

  const handlePlayAgain = () => {
    const isLocal = difficulty === 'local';
    initGame(playerName, difficulty || 'medium', isLocal);
  };

  const handleExit = () => {
    resetGame();
    router.replace('/');
  };

  const getColorIndicator = (color: CardColor | null) => {
    const colorMap: Record<string, string> = {
      red: '#DC143C',
      yellow: '#FFD700',
      green: '#228B22',
      blue: '#1E90FF',
    };
    return color ? colorMap[color] || '#666' : '#666';
  };

  if (!gameStarted) {
    return (
      <LinearGradient
        colors={['#8B4513', '#5D2E0C', '#3D1E08', '#1a0f00']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Starting game...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (gameOver && winner) {
    return (
      <LinearGradient
        colors={['#8B4513', '#5D2E0C', '#3D1E08', '#1a0f00']}
        style={styles.container}
      >
        <View style={styles.gameOverContainer}>
          <Ionicons
            name={winner.id === 'player1' ? 'trophy' : 'sad'}
            size={80}
            color={winner.id === 'player1' ? '#FFD700' : '#888'}
          />
          <Text style={styles.gameOverTitle}>
            {winner.id === 'player1' ? 'You Win!' : 'You Lose!'}
          </Text>
          <Text style={styles.gameOverSubtitle}>
            {winner.name} won the game
          </Text>
          <View style={styles.gameOverButtons}>
            <TouchableOpacity
              style={styles.playAgainButton}
              onPress={handlePlayAgain}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.playAgainText}>Play Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
              <Ionicons name="home" size={20} color="#fff" />
              <Text style={styles.exitText}>Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#8B4513', '#5D2E0C', '#3D1E08', '#1a0f00']}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleExit} style={styles.exitIconButton}>
          <Ionicons name="close" size={24} color="#F5DEB3" />
        </TouchableOpacity>
        <View style={styles.turnIndicator}>
          <Text style={styles.turnText}>
            {isMyTurn ? 'Your Turn' : `${opponentPlayer?.name}'s Turn`}
          </Text>
        </View>
        <View style={styles.deckInfo}>
          <Text style={styles.deckCount}>{deck.length} cards</Text>
        </View>
      </View>

      {/* Opponent Area */}
      <View style={styles.opponentArea}>
        <View style={styles.opponentInfo}>
          <View style={styles.avatarSmall}>
            <Ionicons
              name={opponentPlayer?.isAI ? 'hardware-chip' : 'person'}
              size={16}
              color="#FFD700"
            />
          </View>
          <Text style={styles.opponentName}>{opponentPlayer?.name}</Text>
          <View style={styles.cardCount}>
            <Text style={styles.cardCountText}>
              {opponentPlayer?.cards.length || 0} cards
            </Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.opponentCards}>
            {opponentPlayer?.cards.map((card, index) => (
              <View key={card.id} style={[styles.opponentCardWrapper, { marginLeft: index > 0 ? -20 : 0 }]}>
                <UnoCard card={card} small faceDown />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Game Area */}
      <View style={styles.gameArea}>
        {/* Draw Pile */}
        <TouchableOpacity
          style={styles.drawPile}
          onPress={handleDraw}
          disabled={!isMyTurn}
        >
          <View style={styles.drawPileCard}>
            <Text style={styles.drawPileText}>UNO</Text>
          </View>
          <Text style={styles.drawLabel}>Draw</Text>
        </TouchableOpacity>

        {/* Discard Pile */}
        <View style={styles.discardPile}>
          {topCard && <UnoCard card={topCard} disabled />}
          {selectedColor && (
            <View
              style={[
                styles.colorIndicator,
                { backgroundColor: getColorIndicator(selectedColor) },
              ]}
            />
          )}
        </View>

        {/* Direction Indicator */}
        <View style={styles.directionIndicator}>
          <Ionicons
            name={direction === 1 ? 'arrow-forward' : 'arrow-back'}
            size={24}
            color="#B8860B"
          />
        </View>

        {/* UNO Button */}
        {humanPlayer && humanPlayer.cards.length === 2 && (
          <TouchableOpacity style={styles.unoButton} onPress={handleUno}>
            <Text style={styles.unoButtonText}>UNO!</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Player Area */}
      <View style={styles.playerArea}>
        <View style={styles.playerInfo}>
          <View style={styles.avatarSmall}>
            <Ionicons name="person" size={16} color="#FFD700" />
          </View>
          <Text style={styles.playerName}>{playerName}</Text>
          {isMyTurn && <View style={styles.yourTurnBadge}><Text style={styles.yourTurnText}>Your Turn</Text></View>}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.playerCardsContainer}
        >
          {humanPlayer?.cards.map((card, index) => {
            const isPlayable = playableCards.some((c) => c.id === card.id);
            return (
              <View
                key={card.id}
                style={[
                  styles.playerCardWrapper,
                  { marginLeft: index > 0 ? -15 : 0 },
                  isPlayable && isMyTurn && styles.playableCard,
                ]}
              >
                <UnoCard
                  card={card}
                  onPress={() => handleCardPress(card)}
                  disabled={!isMyTurn || !isPlayable}
                />
              </View>
            );
          })}
        </ScrollView>
      </View>

      <ColorPicker
        visible={showColorPicker}
        onSelectColor={handleColorSelect}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#F5DEB3',
    fontSize: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  exitIconButton: {
    padding: 8,
  },
  turnIndicator: {
    backgroundColor: 'rgba(220, 20, 60, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 15,
  },
  turnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  deckInfo: {
    backgroundColor: 'rgba(93, 46, 12, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  deckCount: {
    color: '#D2B48C',
    fontSize: 12,
  },
  opponentArea: {
    alignItems: 'center',
    paddingVertical: 5,
  },
  opponentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 69, 19, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  opponentName: {
    color: '#F5DEB3',
    fontSize: 14,
    fontWeight: '600',
  },
  cardCount: {
    backgroundColor: 'rgba(220, 20, 60, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 10,
  },
  cardCountText: {
    color: '#fff',
    fontSize: 11,
  },
  opponentCards: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  opponentCardWrapper: {
    marginTop: -5,
  },
  gameArea: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  drawPile: {
    alignItems: 'center',
  },
  drawPileCard: {
    width: 70,
    height: 105,
    backgroundColor: '#1a0f00',
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#B8860B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawPileText: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 16,
    transform: [{ rotate: '-20deg' }],
  },
  drawLabel: {
    color: '#D2B48C',
    fontSize: 12,
    marginTop: 5,
  },
  discardPile: {
    alignItems: 'center',
    position: 'relative',
  },
  colorIndicator: {
    position: 'absolute',
    bottom: -15,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#fff',
  },
  directionIndicator: {
    position: 'absolute',
    right: 80,
    backgroundColor: 'rgba(93, 46, 12, 0.8)',
    padding: 10,
    borderRadius: 20,
  },
  unoButton: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#DC143C',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  unoButtonText: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 18,
  },
  playerArea: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerName: {
    color: '#F5DEB3',
    fontSize: 14,
    fontWeight: '600',
  },
  yourTurnBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 10,
  },
  yourTurnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  playerCardsContainer: {
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },
  playerCardWrapper: {
    marginBottom: 5,
  },
  playableCard: {
    marginTop: -10,
  },
  gameOverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#F5DEB3',
    marginTop: 20,
  },
  gameOverSubtitle: {
    fontSize: 18,
    color: '#D2B48C',
    marginTop: 10,
    marginBottom: 30,
  },
  gameOverButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  playAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 25,
    paddingVertical: 14,
    borderRadius: 12,
  },
  playAgainText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#666',
    paddingHorizontal: 25,
    paddingVertical: 14,
    borderRadius: 12,
  },
  exitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
