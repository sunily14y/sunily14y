import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function MultiplayerGameScreen() {
  const { roomCode } = useLocalSearchParams<{ roomCode: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const handleBackToLobby = () => {
    Alert.alert(
      'Leave Game',
      'Are you sure you want to leave this game?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => router.replace('/game-mode') },
      ]
    );
  };

  return (
    <LinearGradient
      colors={['#8B4513', '#5D2E0C', '#3D1E08', '#1a0f00']}
      style={styles.container}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleBackToLobby} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#F5DEB3" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Multiplayer Game</Text>
        <View style={styles.roomBadge}>
          <Text style={styles.roomBadgeText}>Room: {roomCode}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.comingSoonCard}>
          <Ionicons name="construct" size={60} color="#FFD700" />
          <Text style={styles.comingSoonTitle}>Coming Soon!</Text>
          <Text style={styles.comingSoonText}>
            Multiplayer gameplay is under development.{'\n'}
            The room system is working - players can join and wait together.{'\n'}
            Full multiplayer UNO game will be available soon!
          </Text>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Room creation & joining</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Real-time player updates</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Shareable invite links</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="time" size={20} color="#FF9800" />
              <Text style={styles.featureText}>Multiplayer gameplay (in progress)</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.backToLobbyButton}
            onPress={() => router.replace('/game-mode')}
          >
            <Ionicons name="home" size={20} color="#fff" />
            <Text style={styles.backToLobbyText}>Back to Lobby</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingBottom: 15 },
  backButton: { padding: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#F5DEB3' },
  roomBadge: { backgroundColor: 'rgba(255, 215, 0, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#FFD700' },
  roomBadgeText: { color: '#FFD700', fontWeight: '600', fontSize: 12 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  comingSoonCard: { backgroundColor: 'rgba(93, 46, 12, 0.9)', borderRadius: 20, padding: 30, alignItems: 'center', maxWidth: 400, width: '100%', borderWidth: 2, borderColor: '#B8860B' },
  comingSoonTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFD700', marginTop: 15, marginBottom: 10 },
  comingSoonText: { fontSize: 14, color: '#D2B48C', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  featuresList: { width: '100%', marginBottom: 20 },
  featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  featureText: { color: '#F5DEB3', fontSize: 14 },
  backToLobbyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#8B4513', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 12, gap: 10 },
  backToLobbyText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
