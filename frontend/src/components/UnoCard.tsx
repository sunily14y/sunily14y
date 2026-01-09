import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Card } from '../store/gameStore';

interface UnoCardProps {
  card: Card;
  onPress?: () => void;
  disabled?: boolean;
  small?: boolean;
  faceDown?: boolean;
}

const getCardColor = (color: string): string => {
  switch (color) {
    case 'red':
      return '#DC143C';
    case 'yellow':
      return '#FFD700';
    case 'green':
      return '#228B22';
    case 'blue':
      return '#1E90FF';
    case 'wild':
      return '#333';
    default:
      return '#333';
  }
};

const getCardContent = (card: Card): { text: string; icon?: string } => {
  switch (card.type) {
    case 'number':
      return { text: card.value?.toString() || '0' };
    case 'skip':
      return { text: '', icon: 'ban' };
    case 'reverse':
      return { text: '', icon: 'refresh' };
    case 'draw2':
      return { text: '+2' };
    case 'wild':
      return { text: 'W' };
    case 'wild4':
      return { text: '+4' };
    default:
      return { text: '?' };
  }
};

export const UnoCard: React.FC<UnoCardProps> = ({
  card,
  onPress,
  disabled = false,
  small = false,
  faceDown = false,
}) => {
  const cardColor = getCardColor(card.color);
  const content = getCardContent(card);
  const cardWidth = small ? 45 : 70;
  const cardHeight = small ? 68 : 105;

  if (faceDown) {
    return (
      <View
        style={[
          styles.card,
          styles.faceDown,
          { width: cardWidth, height: cardHeight },
        ]}
      >
        <View style={styles.faceDownInner}>
          <Text style={styles.faceDownText}>UNO</Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.card,
        { backgroundColor: cardColor, width: cardWidth, height: cardHeight },
        disabled && styles.cardDisabled,
      ]}
      activeOpacity={0.8}
    >
      <View style={styles.cardInner}>
        {/* Top left corner */}
        <View style={styles.cornerTop}>
          {content.icon ? (
            <Ionicons
              name={content.icon as any}
              size={small ? 10 : 14}
              color="#fff"
            />
          ) : (
            <Text style={[styles.cornerText, small && styles.cornerTextSmall]}>
              {content.text}
            </Text>
          )}
        </View>

        {/* Center */}
        <View
          style={[
            styles.centerOval,
            small && styles.centerOvalSmall,
            card.type === 'wild' || card.type === 'wild4'
              ? styles.wildOval
              : null,
          ]}
        >
          {card.type === 'wild' || card.type === 'wild4' ? (
            <View style={styles.wildColors}>
              <View style={[styles.wildQuarter, { backgroundColor: '#DC143C' }]} />
              <View style={[styles.wildQuarter, { backgroundColor: '#FFD700' }]} />
              <View style={[styles.wildQuarter, { backgroundColor: '#228B22' }]} />
              <View style={[styles.wildQuarter, { backgroundColor: '#1E90FF' }]} />
            </View>
          ) : null}
          {content.icon ? (
            <Ionicons
              name={content.icon as any}
              size={small ? 18 : 28}
              color={card.type === 'wild' || card.type === 'wild4' ? '#fff' : cardColor}
            />
          ) : (
            <Text
              style={[
                styles.centerText,
                small && styles.centerTextSmall,
                (card.type === 'wild' || card.type === 'wild4') && styles.wildText,
              ]}
            >
              {content.text}
            </Text>
          )}
        </View>

        {/* Bottom right corner */}
        <View style={styles.cornerBottom}>
          {content.icon ? (
            <Ionicons
              name={content.icon as any}
              size={small ? 10 : 14}
              color="#fff"
            />
          ) : (
            <Text style={[styles.cornerText, small && styles.cornerTextSmall]}>
              {content.text}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardInner: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 4,
  },
  cornerTop: {
    alignSelf: 'flex-start',
  },
  cornerBottom: {
    alignSelf: 'flex-end',
    transform: [{ rotate: '180deg' }],
  },
  cornerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  cornerTextSmall: {
    fontSize: 10,
  },
  centerOval: {
    position: 'absolute',
    top: '25%',
    left: '15%',
    right: '15%',
    bottom: '25%',
    backgroundColor: '#fff',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-20deg' }],
    overflow: 'hidden',
  },
  centerOvalSmall: {
    top: '28%',
    bottom: '28%',
  },
  centerText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  centerTextSmall: {
    fontSize: 18,
  },
  wildOval: {
    backgroundColor: '#333',
  },
  wildColors: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  wildQuarter: {
    width: '50%',
    height: '50%',
  },
  wildText: {
    color: '#fff',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  faceDown: {
    backgroundColor: '#1a0f00',
    borderColor: '#B8860B',
  },
  faceDownInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#DC143C',
    margin: 3,
    borderRadius: 5,
  },
  faceDownText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
    transform: [{ rotate: '-20deg' }],
  },
});
