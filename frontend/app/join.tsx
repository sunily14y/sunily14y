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

export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { user, isAuthenticated, isLoading: authLoading, loginAsGuest } = useAuth();
  const [joining, setJoining] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // If authenticated and has code, try to join
    if (isAuthenticated && code && !joining) {
      handleJoin();
    }
  }, [isAuthenticated, code]);

  const handleJoin = async () => {
    if (!code || !user) return;
    
    setJoining(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_code: code,
          user_id: user.user_id,
          user_name: user.name,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.replace({
          pathname: '/waiting-room',
          params: { roomCode: code },
        });
      } else {
        Alert.alert('Cannot Join', data.detail || 'Failed to join room', [
          { text: 'OK', onPress: () => router.replace('/game-mode') }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to join room', [
        { text: 'OK', onPress: () => router.replace('/game-mode') }
      ]);
    } finally {
      setJoining(false);
    }
  };

  const handlePlayAsGuest = async () => {
    await loginAsGuest();
    // After guest login, useEffect will trigger handleJoin
  };

  if (authLoading || joining) {
    return (
      <LinearGradient
        colors={['#8B4513', '#5D2E0C', '#3D1E08', '#1a0f00']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>
            {joining ? 'Joining room...' : 'Loading...'}
          </Text>
        </View>
      </LinearGradient>
    );
  }

  if (!isAuthenticated) {
    return (
      <LinearGradient
        colors={['#8B4513', '#5D2E0C', '#3D1E08', '#1a0f00']}
        style={styles.container}
      >
        <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>U</Text>
            </View>
            <Text style={styles.titleText}>UNO!</Text>
          </View>

          <View style={styles.inviteCard}>
            <Ionicons name="people" size={50} color="#FFD700" />
            <Text style={styles.inviteTitle}>You're Invited!</Text>
            <Text style={styles.inviteSubtitle}>
              Join room <Text style={styles.codeHighlight}>{code}</Text>
            </Text>
            <Text style={styles.inviteText}>Sign in to join your friend's game</Text>
          </View>

          <TouchableOpacity style={styles.guestButton} onPress={handlePlayAsGuest}>
            <Ionicons name="person-outline" size={22} color="#8B4513" />
            <Text style={styles.guestButtonText}>Play as Guest</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.goBackButton} 
            onPress={() => router.replace('/')}
          >
            <Text style={styles.goBackText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#8B4513', '#5D2E0C', '#3D1E08', '#1a0f00']}
      style={styles.container}
    >
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Joining room {code}...</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#F5DEB3', fontSize: 18, marginTop: 15 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  logoCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#DC143C', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  logoText: { fontSize: 28, fontWeight: 'bold', color: '#FFD700' },
  titleText: { fontSize: 36, fontWeight: 'bold', color: '#F5DEB3' },
  inviteCard: { backgroundColor: 'rgba(93, 46, 12, 0.8)', borderRadius: 20, padding: 30, alignItems: 'center', marginBottom: 30, borderWidth: 2, borderColor: '#B8860B', width: '100%', maxWidth: 350 },
  inviteTitle: { fontSize: 28, fontWeight: 'bold', color: '#F5DEB3', marginTop: 15, marginBottom: 10 },
  inviteSubtitle: { fontSize: 18, color: '#D2B48C', marginBottom: 10 },
  codeHighlight: { color: '#FFD700', fontWeight: 'bold', fontSize: 22 },
  inviteText: { fontSize: 14, color: '#D2B48C', textAlign: 'center' },
  guestButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5DEB3', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 12, width: '100%', maxWidth: 350, borderWidth: 2, borderColor: '#B8860B', marginBottom: 15 },
  guestButtonText: { color: '#8B4513', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  goBackButton: { padding: 15 },
  goBackText: { color: '#D2B48C', fontSize: 16 },
});
