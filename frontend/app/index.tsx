import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';

export default function HomeScreen() {
  const { user, isLoading, isAuthenticated, login } = useAuth();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // If already authenticated, go to game lobby
    if (isAuthenticated && !isLoading) {
      router.replace('/game-mode');
    }
  }, [isAuthenticated, isLoading]);

  const handleSignIn = async () => {
    await login();
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#8B4513', '#5D2E0C', '#3D1E08', '#1a0f00']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#8B4513', '#5D2E0C', '#3D1E08', '#1a0f00']}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
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

          {/* Sign In Buttons */}
          <View style={styles.authContainer}>
            <Text style={styles.authTitle}>Sign in to continue</Text>
            
            <TouchableOpacity style={styles.googleButton} onPress={handleSignIn}>
              <Ionicons name="logo-google" size={22} color="#fff" />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.appleButton} onPress={handleSignIn}>
              <Ionicons name="logo-apple" size={22} color="#fff" />
              <Text style={styles.appleButtonText}>Continue with Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.facebookButton} onPress={handleSignIn}>
              <Ionicons name="logo-facebook" size={22} color="#fff" />
              <Text style={styles.facebookButtonText}>Continue with Facebook</Text>
            </TouchableOpacity>
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
              <Ionicons name="people" size={24} color="#FFD700" />
              <Text style={styles.featureText}>Friends</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    minHeight: '100%',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#F5DEB3',
    fontSize: 16,
    marginTop: 15,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DC143C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  titleText: {
    fontSize: 42,
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F5DEB3',
    textAlign: 'center',
  },
  mainHeadingAccent: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F5DEB3',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#D2B48C',
    textAlign: 'center',
    marginBottom: 25,
    maxWidth: 500,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  authContainer: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    marginBottom: 25,
  },
  authTitle: {
    color: '#F5DEB3',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DB4437',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
    marginBottom: 10,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
    marginBottom: 10,
  },
  appleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  facebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1877F2',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
  },
  facebookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  featureItem: {
    alignItems: 'center',
    marginHorizontal: 15,
    marginVertical: 5,
  },
  featureText: {
    color: '#F5DEB3',
    fontSize: 12,
    marginTop: 5,
  },
});
