import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface GameHistoryItem {
  id: string;
  opponent_name: string;
  opponent_type: string;
  difficulty: string;
  won: boolean;
  timestamp: string;
}

export default function HistoryScreen() {
  const { isAuthenticated } = useAuth();
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (isAuthenticated) {
      loadHistory();
    }
  }, [isAuthenticated]);

  const getToken = async () => {
    return await AsyncStorage.getItem('session_token');
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/games/history`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        setHistory(await response.json());
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'hard': return '#F44336';
      default: return '#8B4513';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Game History</Text>
        <TouchableOpacity onPress={loadHistory} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#8B4513" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.divider} />
      
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#8B4513" style={{ marginTop: 40 }} />
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="game-controller-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No games played yet</Text>
            <Text style={styles.emptySubtext}>Start playing to see your history!</Text>
          </View>
        ) : (
          history.map((game) => (
            <View key={game.id} style={styles.gameCard}>
              <View style={styles.gameHeader}>
                <View style={[styles.resultBadge, { backgroundColor: game.won ? '#4CAF50' : '#F44336' }]}>
                  <Text style={styles.resultText}>{game.won ? 'WIN' : 'LOSS'}</Text>
                </View>
                <Text style={styles.gameDate}>{formatDate(game.timestamp)}</Text>
              </View>
              
              <View style={styles.gameDetails}>
                <View style={styles.opponentInfo}>
                  <Ionicons
                    name={game.opponent_type === 'ai' ? 'hardware-chip' : 'person'}
                    size={20}
                    color="#8B4513"
                  />
                  <Text style={styles.opponentName}>{game.opponent_name}</Text>
                </View>
                
                <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(game.difficulty) }]}>
                  <Text style={styles.difficultyText}>
                    {game.difficulty.charAt(0).toUpperCase() + game.difficulty.slice(1)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingBottom: 15, backgroundColor: '#C4A574' },
  backButton: { padding: 10 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  refreshButton: { width: 45, height: 45, borderRadius: 10, backgroundColor: '#FFD700', justifyContent: 'center', alignItems: 'center' },
  divider: { height: 4, backgroundColor: '#8B4513' },
  content: { flex: 1, padding: 16 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, color: '#666', marginTop: 15 },
  emptySubtext: { fontSize: 14, color: '#999', marginTop: 5 },
  gameCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 10, elevation: 2 },
  gameHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  resultBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  resultText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  gameDate: { fontSize: 12, color: '#888' },
  gameDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  opponentInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  opponentName: { fontSize: 16, color: '#333', fontWeight: '500' },
  difficultyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  difficultyText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
