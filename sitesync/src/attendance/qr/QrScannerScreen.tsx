import React, { useEffect, useMemo, useState } from 'react';
import { AppState, Linking, StyleSheet, Text, View } from 'react-native';
import { useCameraPermission } from 'react-native-vision-camera';
import { CodeScanner } from 'react-native-vision-camera-barcode-scanner';
import { QrCameraFrameAdapter } from './QrCameraFrameAdapter';
import { QrScanController } from '../../qr/qrScanController';
import { resolveQrPermissionState } from '../../qr/qrCameraPermission';
import type { QrCameraState } from '../../qr/qrCameraState';

export type QrScannerScreenProps = {
  active?: boolean;
  onQrValue: (value: string) => void;
  statusMessage?: string;
};

export function QrScannerScreen({
  active = true,
  onQrValue,
  statusMessage = 'Align the worker QR inside the frame.',
}: QrScannerScreenProps) {
  const { hasPermission, requestPermission, status, canRequestPermission } = useCameraPermission();
  const [appIsActive, setAppIsActive] = useState(AppState.currentState === 'active');
  const [cameraState, setCameraState] = useState<QrCameraState>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const controller = useMemo(() => new QrScanController(), []);
  const adapter = useMemo(
    () => new QrCameraFrameAdapter(controller, onQrValue),
    [controller, onQrValue],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppIsActive(nextState === 'active');
      if (nextState !== 'active') {
        controller.reset();
      }
    });
    return () => subscription.remove();
  }, [controller]);

  useEffect(() => {
    setCameraState(resolveQrPermissionState(status, canRequestPermission));
  }, [status, canRequestPermission]);

  const isScanning = active && appIsActive && hasPermission;

  if (!hasPermission) {
    const blocked = cameraState === 'permission_blocked';
    return (
      <View style={styles.container}>
        <View style={styles.messageCard}>
          <Text style={styles.eyebrow}>QR SCANNER</Text>
          <Text style={styles.title}>Camera access required</Text>
          <Text style={styles.body}>
            {blocked
              ? 'Camera access is blocked. Open Android settings and allow SITE-SYNC to use the camera.'
              : 'SITE-SYNC needs camera access to scan worker QR identities.'}
          </Text>
          <Text
            accessibilityRole="button"
            onPress={() => {
              if (canRequestPermission) {
                setCameraState('requesting_permission');
                void requestPermission();
              } else {
                void Linking.openSettings();
              }
            }}
            style={styles.action}
          >
            {blocked ? 'OPEN SETTINGS' : 'ALLOW CAMERA'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CodeScanner
        style={StyleSheet.absoluteFill}
        isActive={isScanning}
        barcodeFormats={['qr-code']}
        onBarcodeScanned={(barcodes) => {
          setCameraError(null);
          setCameraState('processing');
          for (const barcode of barcodes) {
            if (barcode.rawValue) {
              adapter.onFrame({ value: barcode.rawValue });
              break;
            }
          }
        }}
        onError={(error) => {
          controller.reset();
          setCameraState('error');
          setCameraError(error.message);
        }}
      />
      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>SITE-SYNC</Text>
          <Text style={styles.titleLight}>Scan worker QR</Text>
          <Text style={styles.bodyLight}>{statusMessage}</Text>
        </View>
        <View style={styles.scanFrame} />
        <View style={styles.footer}>
          <Text style={styles.bodyLight}>
            {cameraError ?? (isScanning ? 'Camera active' : 'Scanner paused')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10182B',
  },
  messageCard: {
    margin: 24,
    marginTop: 72,
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 24,
  },
  header: {
    marginTop: 28,
    maxWidth: 330,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scanFrame: {
    alignSelf: 'center',
    width: 250,
    height: 250,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  eyebrow: {
    color: '#6E7890',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  title: {
    marginTop: 8,
    color: '#10182B',
    fontSize: 25,
    fontWeight: '800',
  },
  titleLight: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
  },
  body: {
    marginTop: 12,
    color: '#5F687B',
    fontSize: 15,
    lineHeight: 21,
  },
  bodyLight: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  action: {
    marginTop: 20,
    alignSelf: 'flex-start',
    color: '#2447A8',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
