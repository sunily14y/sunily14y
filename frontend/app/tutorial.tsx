import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TutorialScreen() {
  const insets = useSafeAreaInsets();

  const rules = [
    {
      title: 'Objective',
      icon: 'flag',
      content: 'Be the first player to get rid of all your cards!',
    },
    {
      title: 'Starting the Game',
      icon: 'play',
      content: 'Each player starts with 7 cards. One card is placed face-up to start the discard pile.',
    },
    {
      title: 'Matching Cards',
      icon: 'git-compare',
      content: 'On your turn, play a card that matches the top card by COLOR or NUMBER. For example, if a red 5 is on top, you can play any red card OR any 5.',
    },
    {
      title: 'Drawing Cards',
      icon: 'add-circle',
      content: "If you can't play a card, you must draw from the deck. If the drawn card is playable, you may play it immediately.",
    },
    {
      title: 'Skip Card',
      icon: 'ban',
      content: 'When played, the next player loses their turn.',
    },
    {
      title: 'Reverse Card',
      icon: 'refresh',
      content: 'Reverses the direction of play. In a 2-player game, acts like Skip.',
    },
    {
      title: 'Draw Two (+2)',
      icon: 'add',
      content: 'Next player must draw 2 cards AND lose their turn.',
    },
    {
      title: 'Wild Card',
      icon: 'color-palette',
      content: 'Can be played on any card. When played, you choose the next color.',
    },
    {
      title: 'Wild Draw Four (+4)',
      icon: 'flame',
      content: 'The most powerful card! Next player draws 4 cards and loses their turn. You also choose the next color.',
    },
    {
      title: 'Saying UNO!',
      icon: 'megaphone',
      content: 'When you have only ONE card left, you must press the UNO button! If you forget, you might have to draw penalty cards.',
    },
    {
      title: 'Winning',
      icon: 'trophy',
      content: 'The first player to play all their cards wins the game!',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>How to Play</Text>
        <View style={{ width: 44 }} />
      </View>
      
      <View style={styles.divider} />
      
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {/* Intro Card */}
        <View style={styles.introCard}>
          <View style={styles.unoLogo}>
            <Text style={styles.unoText}>UNO</Text>
          </View>
          <Text style={styles.introTitle}>Welcome to UNO!</Text>
          <Text style={styles.introText}>
            UNO is the classic card game that's easy to learn and fun to play. 
            Match cards by color or number to be the first to empty your hand!
          </Text>
        </View>
        
        {/* Rules */}
        {rules.map((rule, index) => (
          <View key={index} style={styles.ruleCard}>
            <View style={styles.ruleHeader}>
              <View style={styles.ruleIcon}>
                <Ionicons name={rule.icon as any} size={24} color="#FFD700" />
              </View>
              <Text style={styles.ruleTitle}>{rule.title}</Text>
            </View>
            <Text style={styles.ruleContent}>{rule.content}</Text>
          </View>
        ))}
        
        {/* Tips Card */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Pro Tips</Text>
          <View style={styles.tipItem}>
            <Ionicons name="bulb" size={20} color="#FFD700" />
            <Text style={styles.tipText}>Save your Wild and +4 cards for when you really need them!</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="bulb" size={20} color="#FFD700" />
            <Text style={styles.tipText}>Pay attention to what colors your opponents need.</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="bulb" size={20} color="#FFD700" />
            <Text style={styles.tipText}>Don't forget to press UNO when you have one card!</Text>
          </View>
        </View>
        
        {/* Start Playing Button */}
        <TouchableOpacity style={styles.playButton} onPress={() => router.push('/game-mode')}>
          <Ionicons name="play" size={22} color="#fff" />
          <Text style={styles.playButtonText}>Start Playing</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingBottom: 15, backgroundColor: '#C4A574' },
  backButton: { padding: 10 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  divider: { height: 4, backgroundColor: '#8B4513' },
  content: { flex: 1, padding: 16 },
  introCard: { backgroundColor: '#8B4513', borderRadius: 16, padding: 25, alignItems: 'center', marginBottom: 16 },
  unoLogo: { backgroundColor: '#DC143C', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginBottom: 15, transform: [{ rotate: '-5deg' }] },
  unoText: { color: '#FFD700', fontSize: 28, fontWeight: 'bold' },
  introTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  introText: { color: '#F5DEB3', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  ruleCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, elevation: 2 },
  ruleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  ruleIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#8B4513', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  ruleTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  ruleContent: { fontSize: 14, color: '#666', lineHeight: 20 },
  tipsCard: { backgroundColor: '#FFF8E1', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#FFD700' },
  tipsTitle: { fontSize: 18, fontWeight: 'bold', color: '#8B4513', marginBottom: 12 },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  tipText: { flex: 1, fontSize: 14, color: '#666', lineHeight: 20 },
  playButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4CAF50', paddingVertical: 16, borderRadius: 12, gap: 10 },
  playButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
