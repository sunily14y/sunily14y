import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EnterNameScreen() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    if (name.trim().length > 15) {
      setError('Name must be 15 characters or less');
      return;
    }
    await AsyncStorage.setItem('playerName', name.trim());
    router.push('/game-mode');
  };

  return (
    <LinearGradient
      colors={['#8B4513', '#5D2E0C', '#3D1E08', '#1a0f00']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#F5DEB3" />
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="person" size={40} color="#FFD700" />
          </View>

          <Text style={styles.title}>Enter Your Name</Text>
          <Text style={styles.subtitle}>
            This will be displayed during gameplay
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons
              name="person-outline"
              size={20}
              color="#B8860B"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor="#8B7355"
              value={name}
              onChangeText={(text) => {
                setName(text);
                setError('');
              }}
              maxLength={15}
              autoCapitalize="words"
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[
              styles.continueButton,
              !name.trim() && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!name.trim()}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
  },
  card: {
    backgroundColor: 'rgba(93, 46, 12, 0.8)',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#B8860B',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 69, 19, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F5DEB3',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#D2B48C',
    marginBottom: 25,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 15, 0, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B8860B',
    paddingHorizontal: 15,
    width: '100%',
    marginBottom: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#F5DEB3',
    fontSize: 16,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginBottom: 10,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC143C',
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 15,
    width: '100%',
  },
  continueButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
});
