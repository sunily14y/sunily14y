import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function GameModeScreen() {
  const [playerName, setPlayerName] = useState('');

  useEffect(() => {
    loadPlayerName();
  }, []);

  const loadPlayerName = async () => {
    const name = await AsyncStorage.getItem('playerName');
    setPlayerName(name || 'Player');
  };

  const gameModes = [
    {
      id: 'ai-easy',
      title: 'vs AI (Easy)',
      description: 'Play against a beginner AI opponent',
      icon: 'happy',
      color: '#4CAF50',
      difficulty: 'easy',
    },
    {
      id: 'ai-medium',
      title: 'vs AI (Medium)',
      description: 'Challenge a smarter AI opponent',
      icon: 'flash',
      color: '#FF9800',
      difficulty: 'medium',
    },
    {
      id: 'ai-hard',
      title: 'vs AI (Hard)',
      description: 'Face the ultimate AI challenge',
      icon: 'skull',
      color: '#F44336',
      difficulty: 'hard',
    },
    {
      id: 'local-2p',
      title: 'Local 2 Players',
      description: 'Pass and play with a friend',
      icon: 'people',
      color: '#2196F3',
      difficulty: 'local',
    },
  ];

  const handleModeSelect = (mode: typeof gameModes[0]) => {
    router.push({
      pathname: '/game',
      params: { difficulty: mode.difficulty },
    });
  };

  return (
    <LinearGradient
      colors={['#8B4513', '#5D2E0C', '#3D1E08', '#1a0f00']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#F5DEB3" />
        </TouchableOpacity>

        <View style={styles.playerInfo}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={20} color="#FFD700" />
          </View>
          <Text style={styles.playerName}>{playerName}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Select Game Mode</Text>
        <Text style={styles.subtitle}>Choose how you want to play</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modesContainer}
        >
          {gameModes.map((mode) => (
            <TouchableOpacity
              key={mode.id}
              style={styles.modeCard}
              onPress={() => handleModeSelect(mode)}
              activeOpacity={0.8}
            >
              <View
                style={[styles.modeIconContainer, { backgroundColor: mode.color }]}
              >
                <Ionicons name={mode.icon as any} size={36} color="#fff" />
              </View>
              <Text style={styles.modeTitle}>{mode.title}</Text>
              <Text style={styles.modeDescription}>{mode.description}</Text>
              <View style={styles.playBadge}>
                <Ionicons name="play" size={14} color="#fff" />
                <Text style={styles.playText}>Play</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  backButton: {
    padding: 10,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(93, 46, 12, 0.8)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#B8860B',
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(139, 69, 19, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  playerName: {
    color: '#F5DEB3',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F5DEB3',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#D2B48C',
    marginBottom: 25,
  },
  modesContainer: {
    paddingHorizontal: 20,
  },
  modeCard: {
    backgroundColor: 'rgba(93, 46, 12, 0.9)',
    borderRadius: 16,
    padding: 20,
    width: 180,
    marginHorizontal: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#B8860B',
  },
  modeIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F5DEB3',
    marginBottom: 8,
    textAlign: 'center',
  },
  modeDescription: {
    fontSize: 12,
    color: '#D2B48C',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 16,
  },
  playBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC143C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 15,
  },
  playText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
});
