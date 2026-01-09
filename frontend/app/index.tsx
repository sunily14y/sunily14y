import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const [playerName, setPlayerName] = useState<string | null>(null);
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    loadPlayerName();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadPlayerName = async () => {
    const name = await AsyncStorage.getItem('playerName');
    setPlayerName(name);
  };

  const handlePlayNow = () => {
    if (playerName) {
      router.push('/game-mode');
    } else {
      router.push('/enter-name');
    }
  };

  return (
    <LinearGradient
      colors={['#8B4513', '#5D2E0C', '#3D1E08', '#1a0f00']}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>U</Text>
          </View>
          <Text style={styles.titleText}>UNO!</Text>
        </View>

        {/* Tagline */}
        <View style={styles.taglineContainer}>
          <View style={styles.taglineBadge}>
            <Ionicons name="game-controller" size={16} color="#FFD700" />
            <Text style={styles.taglineText}>Play the Classic Card Game</Text>
          </View>
        </View>

        {/* Main Heading */}
        <Text style={styles.mainHeading}>Experience UNO</Text>
        <Text style={styles.mainHeadingAccent}>Like Never Before</Text>

        {/* Description */}
        <Text style={styles.description}>
          Challenge AI opponents or play with friends. Fast-paced matches with
          all the classic UNO rules you love.
        </Text>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.playButton} onPress={handlePlayNow}>
            <Ionicons name="play" size={20} color="#fff" />
            <Text style={styles.playButtonText}>Play Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.leaderboardButton}
            onPress={() => router.push('/leaderboard')}
          >
            <Text style={styles.leaderboardButtonText}>Leaderboard</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="people" size={18} color="#B8860B" />
            <Text style={styles.statText}>vs AI</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="flash" size={18} color="#B8860B" />
            <Text style={styles.statText}>Fast Gameplay</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="shield-checkmark" size={18} color="#B8860B" />
            <Text style={styles.statText}>Classic Rules</Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Ionicons name="dice" size={24} color="#FFD700" />
            <Text style={styles.featureText}>Smart AI</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="trophy" size={24} color="#FFD700" />
            <Text style={styles.featureText}>Leaderboards</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="color-palette" size={24} color="#FFD700" />
            <Text style={styles.featureText}>Classic Cards</Text>
          </View>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  logoCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#DC143C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  titleText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#F5DEB3',
  },
  taglineContainer: {
    marginBottom: 10,
  },
  taglineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 69, 19, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#B8860B',
  },
  taglineText: {
    color: '#FFD700',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  mainHeading: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#F5DEB3',
    textAlign: 'center',
  },
  mainHeadingAccent: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#F5DEB3',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#D2B48C',
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 500,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC143C',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    marginRight: 15,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  leaderboardButton: {
    backgroundColor: '#B8860B',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  leaderboardButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  statText: {
    color: '#D2B48C',
    fontSize: 13,
    marginLeft: 6,
  },
  featuresContainer: {
    flexDirection: 'row',
  },
  featureItem: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  featureText: {
    color: '#F5DEB3',
    fontSize: 12,
    marginTop: 5,
  },
});
