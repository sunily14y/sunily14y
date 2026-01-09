import { create } from 'zustand';

export type CardColor = 'red' | 'yellow' | 'green' | 'blue' | 'wild';
export type CardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

export interface Card {
  id: string;
  color: CardColor;
  type: CardType;
  value?: number; // 0-9 for number cards
}

export interface Player {
  id: string;
  name: string;
  cards: Card[];
  isAI: boolean;
  saidUno: boolean;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  deck: Card[];
  discardPile: Card[];
  direction: 1 | -1; // 1 = clockwise, -1 = counter-clockwise
  gameStarted: boolean;
  gameOver: boolean;
  winner: Player | null;
  selectedColor: CardColor | null;
  mustDrawCards: number;
  difficulty: string;
}

interface GameStore extends GameState {
  initGame: (playerName: string, difficulty: string, isLocal?: boolean) => void;
  playCard: (playerId: string, cardId: string, chosenColor?: CardColor) => boolean;
  drawCard: (playerId: string) => Card | null;
  sayUno: (playerId: string) => void;
  nextTurn: () => void;
  resetGame: () => void;
  aiTurn: () => void;
  canPlayCard: (card: Card) => boolean;
  getPlayableCards: (playerId: string) => Card[];
}

const createDeck = (): Card[] => {
  const cards: Card[] = [];
  const colors: CardColor[] = ['red', 'yellow', 'green', 'blue'];
  let cardId = 0;

  // Number cards (0-9), one 0, two of each 1-9 per color
  colors.forEach((color) => {
    // One 0
    cards.push({ id: `${cardId++}`, color, type: 'number', value: 0 });
    // Two of each 1-9
    for (let i = 1; i <= 9; i++) {
      cards.push({ id: `${cardId++}`, color, type: 'number', value: i });
      cards.push({ id: `${cardId++}`, color, type: 'number', value: i });
    }
    // Two of each action card per color
    for (let i = 0; i < 2; i++) {
      cards.push({ id: `${cardId++}`, color, type: 'skip' });
      cards.push({ id: `${cardId++}`, color, type: 'reverse' });
      cards.push({ id: `${cardId++}`, color, type: 'draw2' });
    }
  });

  // Wild cards (4 of each)
  for (let i = 0; i < 4; i++) {
    cards.push({ id: `${cardId++}`, color: 'wild', type: 'wild' });
    cards.push({ id: `${cardId++}`, color: 'wild', type: 'wild4' });
  }

  return cards;
};

const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const initialState: GameState = {
  players: [],
  currentPlayerIndex: 0,
  deck: [],
  discardPile: [],
  direction: 1,
  gameStarted: false,
  gameOver: false,
  winner: null,
  selectedColor: null,
  mustDrawCards: 0,
  difficulty: 'medium',
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  initGame: (playerName: string, difficulty: string, isLocal = false) => {
    let deck = shuffleDeck(createDeck());
    
    const players: Player[] = [];
    
    if (isLocal) {
      // Local 2-player mode
      players.push({
        id: 'player1',
        name: playerName,
        cards: [],
        isAI: false,
        saidUno: false,
      });
      players.push({
        id: 'player2',
        name: 'Player 2',
        cards: [],
        isAI: false,
        saidUno: false,
      });
    } else {
      // vs AI mode
      players.push({
        id: 'player1',
        name: playerName,
        cards: [],
        isAI: false,
        saidUno: false,
      });
      players.push({
        id: 'ai',
        name: 'AI Opponent',
        cards: [],
        isAI: true,
        saidUno: false,
      });
    }

    // Deal 7 cards to each player
    players.forEach((player) => {
      for (let i = 0; i < 7; i++) {
        const card = deck.pop();
        if (card) player.cards.push(card);
      }
    });

    // Find first non-wild card for discard pile
    let startCard: Card | undefined;
    while (!startCard) {
      const card = deck.pop();
      if (card && card.type === 'number') {
        startCard = card;
      } else if (card) {
        deck.unshift(card); // Put it back at the bottom
      }
    }

    set({
      ...initialState,
      players,
      deck,
      discardPile: [startCard],
      gameStarted: true,
      selectedColor: startCard.color !== 'wild' ? startCard.color : null,
      difficulty,
    });
  },

  canPlayCard: (card: Card) => {
    const { discardPile, selectedColor, mustDrawCards } = get();
    const topCard = discardPile[discardPile.length - 1];
    
    // If must draw cards, can only play if have draw card to stack (optional rule - not implementing stacking)
    if (mustDrawCards > 0) return false;
    
    // Wild cards can always be played
    if (card.type === 'wild' || card.type === 'wild4') return true;
    
    // Match color (use selectedColor for after wild cards)
    const currentColor = selectedColor || topCard.color;
    if (card.color === currentColor) return true;
    
    // Match type/value for number cards
    if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) return true;
    
    // Match action type
    if (card.type === topCard.type && card.type !== 'number') return true;
    
    return false;
  },

  getPlayableCards: (playerId: string) => {
    const { players, canPlayCard } = get();
    const player = players.find((p) => p.id === playerId);
    if (!player) return [];
    return player.cards.filter((card) => canPlayCard(card));
  },

  playCard: (playerId: string, cardId: string, chosenColor?: CardColor) => {
    const state = get();
    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return false;
    if (playerIndex !== state.currentPlayerIndex) return false;

    const player = state.players[playerIndex];
    const cardIndex = player.cards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return false;

    const card = player.cards[cardIndex];
    if (!state.canPlayCard(card)) return false;

    // Remove card from player's hand
    const newPlayers = [...state.players];
    newPlayers[playerIndex] = {
      ...player,
      cards: player.cards.filter((c) => c.id !== cardId),
      saidUno: player.cards.length === 2 ? player.saidUno : false,
    };

    // Add card to discard pile
    const newDiscardPile = [...state.discardPile, card];

    // Calculate next player and effects
    let newDirection = state.direction;
    let skipNext = false;
    let drawAmount = 0;
    let newSelectedColor: CardColor | null = card.color !== 'wild' ? card.color : null;

    switch (card.type) {
      case 'reverse':
        newDirection = (state.direction * -1) as 1 | -1;
        // In 2-player game, reverse acts as skip
        if (state.players.length === 2) skipNext = true;
        break;
      case 'skip':
        skipNext = true;
        break;
      case 'draw2':
        drawAmount = 2;
        skipNext = true;
        break;
      case 'wild':
        newSelectedColor = chosenColor || 'red';
        break;
      case 'wild4':
        newSelectedColor = chosenColor || 'red';
        drawAmount = 4;
        skipNext = true;
        break;
    }

    // Check for winner
    if (newPlayers[playerIndex].cards.length === 0) {
      set({
        players: newPlayers,
        discardPile: newDiscardPile,
        gameOver: true,
        winner: newPlayers[playerIndex],
        direction: newDirection,
        selectedColor: newSelectedColor,
      });
      return true;
    }

    // Calculate next player index
    let nextPlayerIndex = (state.currentPlayerIndex + newDirection + state.players.length) % state.players.length;
    
    // Handle draw cards for next player
    if (drawAmount > 0) {
      const nextPlayer = newPlayers[nextPlayerIndex];
      let newDeck = [...state.deck];
      for (let i = 0; i < drawAmount; i++) {
        if (newDeck.length === 0) {
          // Reshuffle discard pile if deck is empty
          const topCard = newDiscardPile.pop();
          newDeck = shuffleDeck(newDiscardPile);
          if (topCard) newDiscardPile.push(topCard);
        }
        const drawnCard = newDeck.pop();
        if (drawnCard) nextPlayer.cards.push(drawnCard);
      }
      newPlayers[nextPlayerIndex] = { ...nextPlayer, saidUno: false };
      set({ deck: newDeck });
    }

    if (skipNext) {
      nextPlayerIndex = (nextPlayerIndex + newDirection + state.players.length) % state.players.length;
    }

    set({
      players: newPlayers,
      currentPlayerIndex: nextPlayerIndex,
      discardPile: newDiscardPile,
      direction: newDirection,
      selectedColor: newSelectedColor,
    });

    return true;
  },

  drawCard: (playerId: string) => {
    const state = get();
    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return null;
    if (playerIndex !== state.currentPlayerIndex) return null;

    let newDeck = [...state.deck];
    let newDiscardPile = [...state.discardPile];

    // Reshuffle if deck is empty
    if (newDeck.length === 0) {
      const topCard = newDiscardPile.pop();
      newDeck = shuffleDeck(newDiscardPile);
      newDiscardPile = topCard ? [topCard] : [];
    }

    const drawnCard = newDeck.pop();
    if (!drawnCard) return null;

    const newPlayers = [...state.players];
    newPlayers[playerIndex] = {
      ...state.players[playerIndex],
      cards: [...state.players[playerIndex].cards, drawnCard],
      saidUno: false,
    };

    set({
      players: newPlayers,
      deck: newDeck,
      discardPile: newDiscardPile,
    });

    return drawnCard;
  },

  sayUno: (playerId: string) => {
    const state = get();
    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return;

    const newPlayers = [...state.players];
    newPlayers[playerIndex] = {
      ...state.players[playerIndex],
      saidUno: true,
    };

    set({ players: newPlayers });
  },

  nextTurn: () => {
    const state = get();
    const nextIndex = (state.currentPlayerIndex + state.direction + state.players.length) % state.players.length;
    set({ currentPlayerIndex: nextIndex });
  },

  aiTurn: () => {
    const state = get();
    const aiPlayer = state.players[state.currentPlayerIndex];
    if (!aiPlayer || !aiPlayer.isAI) return;

    const playableCards = state.getPlayableCards(aiPlayer.id);
    const { difficulty } = state;

    setTimeout(() => {
      if (playableCards.length > 0) {
        let cardToPlay: Card;

        if (difficulty === 'easy') {
          // Easy: Random card
          cardToPlay = playableCards[Math.floor(Math.random() * playableCards.length)];
        } else if (difficulty === 'hard') {
          // Hard: Prioritize action cards, then match color
          const actionCards = playableCards.filter((c) => c.type !== 'number' && c.type !== 'wild' && c.type !== 'wild4');
          const wildCards = playableCards.filter((c) => c.type === 'wild' || c.type === 'wild4');
          const numberCards = playableCards.filter((c) => c.type === 'number');
          
          if (actionCards.length > 0) {
            cardToPlay = actionCards[0];
          } else if (numberCards.length > 0) {
            // Play highest number
            cardToPlay = numberCards.sort((a, b) => (b.value || 0) - (a.value || 0))[0];
          } else {
            cardToPlay = wildCards[0] || playableCards[0];
          }
        } else {
          // Medium: Prefer action cards but some randomness
          const actionCards = playableCards.filter((c) => c.type !== 'number');
          if (actionCards.length > 0 && Math.random() > 0.3) {
            cardToPlay = actionCards[Math.floor(Math.random() * actionCards.length)];
          } else {
            cardToPlay = playableCards[Math.floor(Math.random() * playableCards.length)];
          }
        }

        // Choose color for wild cards
        let chosenColor: CardColor | undefined;
        if (cardToPlay.type === 'wild' || cardToPlay.type === 'wild4') {
          // Count colors in hand
          const colorCounts: Record<string, number> = { red: 0, yellow: 0, green: 0, blue: 0 };
          aiPlayer.cards.forEach((c) => {
            if (c.color !== 'wild') colorCounts[c.color]++;
          });
          const maxColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0][0] as CardColor;
          chosenColor = maxColor;
        }

        // Say UNO if 2 cards left
        if (aiPlayer.cards.length === 2) {
          get().sayUno(aiPlayer.id);
        }

        get().playCard(aiPlayer.id, cardToPlay.id, chosenColor);
      } else {
        // Must draw
        const drawnCard = get().drawCard(aiPlayer.id);
        if (drawnCard && get().canPlayCard(drawnCard)) {
          // Can play drawn card
          let chosenColor: CardColor | undefined;
          if (drawnCard.type === 'wild' || drawnCard.type === 'wild4') {
            chosenColor = 'red';
          }
          setTimeout(() => {
            get().playCard(aiPlayer.id, drawnCard.id, chosenColor);
          }, 500);
        } else {
          // End turn
          get().nextTurn();
        }
      }
    }, 1000);
  },

  resetGame: () => {
    set(initialState);
  },
}));
