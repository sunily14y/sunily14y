import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import type { CardColor } from '../store/gameStore';

interface ColorPickerProps {
  visible: boolean;
  onSelectColor: (color: CardColor) => void;
}

const colors: { color: CardColor; hex: string }[] = [
  { color: 'red', hex: '#DC143C' },
  { color: 'yellow', hex: '#FFD700' },
  { color: 'green', hex: '#228B22' },
  { color: 'blue', hex: '#1E90FF' },
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  visible,
  onSelectColor,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Choose a Color</Text>
          <View style={styles.colorsContainer}>
            {colors.map((item) => (
              <TouchableOpacity
                key={item.color}
                style={[styles.colorButton, { backgroundColor: item.hex }]}
                onPress={() => onSelectColor(item.color)}
              >
                <Text style={styles.colorText}>{item.color.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#5D2E0C',
    borderRadius: 20,
    padding: 25,
    borderWidth: 3,
    borderColor: '#B8860B',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F5DEB3',
    marginBottom: 20,
  },
  colorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
  },
  colorButton: {
    width: 80,
    height: 80,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  colorText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
