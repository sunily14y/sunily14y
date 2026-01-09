import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import { View, StyleSheet, Platform } from 'react-native';

export default function RootLayout() {
  useEffect(() => {
    // Lock to landscape orientation - only on native platforms
    const lockOrientation = async () => {
      try {
        if (Platform.OS !== 'web') {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        }
      } catch (error) {
        // Orientation lock not supported (e.g., web in iframe)
        console.log('Orientation lock not supported:', error);
      }
    };
    lockOrientation();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: '#1a0f00' },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0f00',
  },
});
