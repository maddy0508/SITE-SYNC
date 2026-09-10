import React, { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { QrScannerScreen, type QrScanOutcomeState } from './src/attendance/qr/QrScannerScreen';

export type AppProps = {
  onQrValue?: (value: string) => void | QrScanOutcomeState | Promise<void | QrScanOutcomeState>;
};

function App({ onQrValue }: AppProps) {
  const [mode, setMode] = useState<'home' | 'scanner'>('home');

  if (mode === 'scanner') {
    return (
      <View style={styles.scannerRoot}>
        <StatusBar barStyle="light-content" />
        <QrScannerScreen
          onQrValue={async (value) => {
            if (!onQrValue) {
              throw new Error('QR validation context is unavailable; no scan result was accepted.');
            }

            const outcome = await onQrValue(value);
            if (outcome) setMode('home');
            return outcome;
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close QR scanner"
          onPress={() => setMode('home')}
          style={styles.closeButton}
        >
          <Text style={styles.closeButtonText}>CLOSE</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#10182B" />
      <View style={styles.container}>
        <View style={styles.brandBlock}>
          <Text style={styles.eyebrow}>SITE-SYNC</Text>
          <Text style={styles.title}>QR ATTENDANCE</Text>
          <Text style={styles.subtitle}>
            Worker identity scanning for site attendance.
          </Text>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusDot} />
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>SCANNER READY</Text>
            <Text style={styles.statusBody}>
              QR capture is isolated from attendance acceptance and cannot be accepted without trusted validation context.
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan worker QR"
          onPress={() => setMode('scanner')}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonText}>SCAN WORKER QR</Text>
        </Pressable>

        <Text style={styles.footer}>
          Untrusted QR data is never displayed or accepted as an attendance result.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#10182B',
  },
  scannerRoot: {
    flex: 1,
    backgroundColor: '#10182B',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  brandBlock: {
    marginBottom: 28,
  },
  eyebrow: {
    color: '#7D8AA7',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 10,
    maxWidth: 320,
    color: '#AAB4C9',
    fontSize: 15,
    lineHeight: 21,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#18233B',
    borderWidth: 1,
    borderColor: '#263452',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#5CCB91',
  },
  statusCopy: {
    flex: 1,
    marginLeft: 13,
  },
  statusTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  statusBody: {
    marginTop: 5,
    color: '#9EAAC0',
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    marginTop: 28,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  pressed: {
    opacity: 0.78,
  },
  primaryButtonText: {
    color: '#10182B',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: 20,
    color: '#6F7C96',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 52,
    right: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(16,24,43,0.82)',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

export default App;
