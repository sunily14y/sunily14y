import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface LeaderboardEntry {
  player_name: string;
  wins: number;
  total_games: number;
  win_rate: number;
}

export default function LeaderboardScreen() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/leaderboard`);
      const data = await response.json();
      setLeaderboard(data);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (index: number) => {
    switch (index) {
      case 0:
        return { name: 'medal', color: '#FFD700' };
      case 1:
        return { name: 'medal', color: '#C0C0C0' };
      case 2:
        return { name: 'medal', color: '#CD7F32' };
      default:
        return null;
    }
  };

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const medal = getMedalIcon(index);
    return (
      <View style={styles.leaderboardItem}>
        <View style={styles.rankContainer}>
          {medal ? (
            <Ionicons name={medal.name as any} size={28} color={medal.color} />
          ) : (
            <Text style={styles.rankText}>{index + 1}</Text>
          )}
        </View>
        <View style={styles.playerInfoContainer}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={20} color="#FFD700" />
          </View>
          <Text style={styles.playerNameText}>{item.player_name}</Text>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{item.wins}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{item.total_games}</Text>
            <Text style={styles.statLabel}>Games</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, styles.winRateText]}>
              {item.win_rate.toFixed(0)}%
            </Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
        </View>
      </View>
    );
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
        <View style={styles.titleContainer}>
          <Ionicons name="trophy" size={28} color="#FFD700" />
          <Text style={styles.title}>Leaderboard</Text>
        </View>
        <TouchableOpacity onPress={fetchLeaderboard} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#F5DEB3" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      ) : leaderboard.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="game-controller" size={60} color="#666" />
          <Text style={styles.emptyText}>No games played yet</Text>
          <Text style={styles.emptySubtext}>Play some games to see the leaderboard!</Text>
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          renderItem={renderItem}
          keyExtractor={(item) => item.player_name}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    paddingBottom: 10,
  },
  backButton: {
    padding: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F5DEB3',
    marginLeft: 10,
  },
  refreshButton: {
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#D2B48C',
    marginTop: 15,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#F5DEB3',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 15,
  },
  emptySubtext: {
    color: '#D2B48C',
    fontSize: 14,
    marginTop: 8,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(93, 46, 12, 0.8)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#B8860B',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    color: '#D2B48C',
    fontSize: 18,
    fontWeight: 'bold',
  },
  playerInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 69, 19, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  playerNameText: {
    color: '#F5DEB3',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    color: '#F5DEB3',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#D2B48C',
    fontSize: 11,
  },
  winRateText: {
    color: '#4CAF50',
  },
});
