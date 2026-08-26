import React, { useEffect, useMemo, useReducer, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useBarcodeScannerOutput } from 'react-native-vision-camera-barcode-scanner';
import { QrCameraFrameAdapter } from './QrCameraFrameAdapter';
import { QrScanController } from '../../qr/qrScanController';
import { resolveQrPermissionState } from '../../qr/qrCameraPermission';
import { reduceQrCameraState } from '../../qr/qrCameraState';
import type { QrCameraEvent, QrCameraState } from '../../qr/qrCameraState';

export type QrScanOutcomeState = Extract<QrCameraState, 'valid' | 'provisional' | 'blocked'>;

export type QrScannerScreenProps = {
  active?: boolean;
  onQrValue: (value: string) => void | QrScanOutcomeState | Promise<void | QrScanOutcomeState>;
  statusMessage?: string;
};

export function QrScannerScreen({
  active = true,
  onQrValue,
  statusMessage = 'Align the worker QR inside the frame.',
}: QrScannerScreenProps) {
  const { hasPermission, requestPermission, status, canRequestPermission } = useCameraPermission();
  const device = useCameraDevice('back', { physicalDevices: ['wide-angle-camera'] });
  const [appIsActive, setAppIsActive] = useState(AppState.currentState === 'active');
  const [cameraState, dispatch] = useReducer(
    (state: QrCameraState, event: QrCameraEvent) => reduceQrCameraState(state, event),
    'idle',
  );
  const [cameraError, setCameraError] = useState<string | null>(null);

  const controller = useMemo(() => new QrScanController(), []);
  const adapter = useMemo(() => new QrCameraFrameAdapter(controller), [controller]);

  useEffect(() => {
    const permissionState = resolveQrPermissionState(status, canRequestPermission);
    if (permissionState === 'permission_blocked') {
      dispatch({ type: 'PERMISSION_BLOCKED' });
    } else if (permissionState === 'requesting_permission') {
      dispatch({ type: 'REQUEST_PERMISSION' });
    } else if (hasPermission) {
      dispatch({ type: 'PERMISSION_GRANTED' });
    } else {
      dispatch({ type: 'PERMISSION_DENIED' });
    }
  }, [status, canRequestPermission, hasPermission]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const nextIsActive = nextState === 'active';
      setAppIsActive(nextIsActive);
      if (!nextIsActive) {
        adapter.reset();
        dispatch({ type: 'APPROACH_INACTIVE' });
      } else if (hasPermission) {
        dispatch({ type: 'APPROACH_ACTIVE' });
      }
    });
    return () => subscription.remove();
  }, [adapter, hasPermission]);

  const handleBarcodes = (barcodes: Array<{ rawValue?: string | null }>) => {
    const rawValue = barcodes.find((barcode) => barcode.rawValue)?.rawValue;
    if (!rawValue || !adapter.onFrame({ value: rawValue })) return;

    setCameraError(null);
    dispatch({ type: 'QR_DETECTED' });
    void Promise.resolve(onQrValue(rawValue.trim()))
      .then((outcome) => {
        if (outcome === 'valid') dispatch({ type: 'VALID' });
        else if (outcome === 'provisional') dispatch({ type: 'PROVISIONAL' });
        else if (outcome === 'blocked') dispatch({ type: 'BLOCKED' });
        else dispatch({ type: 'RESET' });
      })
      .catch((error: unknown) => {
        dispatch({ type: 'ERROR' });
        setCameraError(error instanceof Error ? error.message : 'QR processing failed');
      })
      .finally(() => {
        adapter.release();
      });
  };

  const barcodeOutput = useBarcodeScannerOutput({
    barcodeFormats: ['qr-code'],
    onBarcodeScanned: handleBarcodes,
    onError: (error) => {
      adapter.reset();
      dispatch({ type: 'ERROR' });
      setCameraError(error.message);
    },
  });

  const isScanning = active && appIsActive && hasPermission && cameraState === 'ready' && device != null;
  const hasResult = cameraState === 'valid' || cameraState === 'provisional' || cameraState === 'blocked';

  if (!hasPermission) {
    const blocked = cameraState === 'permission_blocked';
    return (
      <View style={styles.container}>
        <View style={styles.messageCard}>
          <Text style={styles.eyebrow}>QR SCANNER</Text>
          <Text style={styles.title}>Camera access required</Text>
          <Text style={styles.body}>{blocked ? 'Camera access is blocked. Open Android settings and allow SITE-SYNC to use the camera.' : 'SITE-SYNC needs camera access to scan worker QR identities.'}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (canRequestPermission) {
                dispatch({ type: 'REQUEST_PERMISSION' });
                void requestPermission();
              } else {
                void Linking.openSettings();
              }
            }}
            style={styles.actionButton}
          >
            <Text style={styles.action}>{blocked ? 'OPEN SETTINGS' : 'ALLOW CAMERA'}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <View style={styles.messageCard}>
          <Text style={styles.eyebrow}>QR SCANNER</Text>
          <Text style={styles.title}>Camera unavailable</Text>
          <Text style={styles.body}>SITE-SYNC could not find a rear camera on this device.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera style={StyleSheet.absoluteFill} device={device} isActive={isScanning} outputs={[barcodeOutput]} />
      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>SITE-SYNC</Text>
          <Text style={styles.titleLight}>Scan worker QR</Text>
          <Text style={styles.bodyLight}>{statusMessage}</Text>
        </View>
        <View style={styles.scanFrame} />
        <View style={styles.footer}>
          <Text style={styles.bodyLight}>{cameraError ?? (cameraState === 'processing' ? 'Validating QR identity…' : cameraState === 'valid' ? 'Worker verified.' : cameraState === 'provisional' ? 'Offline provisional verification.' : cameraState === 'blocked' ? 'Scan blocked.' : isScanning ? 'Camera active' : 'Scanner paused')}</Text>
        </View>
      </View>
      {(hasResult || cameraState === 'error') && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            adapter.reset();
            setCameraError(null);
            dispatch({ type: 'RESET' });
            if (hasPermission) dispatch({ type: 'PERMISSION_GRANTED' });
          }}
          style={styles.resetButton}
        >
          <Text style={styles.resetButtonText}>SCAN ANOTHER</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#10182B' },
  messageCard: { margin: 24, marginTop: 72, padding: 24, borderRadius: 20, backgroundColor: '#FFFFFF' },
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'space-between', padding: 24 },
  header: { marginTop: 28, maxWidth: 330 },
  footer: { alignItems: 'center', marginBottom: 24 },
  scanFrame: { alignSelf: 'center', width: 250, height: 250, borderRadius: 28, borderWidth: 3, borderColor: '#FFFFFF' },
  resetButton: { position: 'absolute', left: 24, right: 24, bottom: 26, alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#FFFFFF' },
  resetButtonText: { color: '#10182B', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  eyebrow: { color: '#6E7890', fontSize: 12, fontWeight: '800', letterSpacing: 1.6 },
  title: { marginTop: 8, color: '#10182B', fontSize: 25, fontWeight: '800' },
  titleLight: { marginTop: 6, color: '#FFFFFF', fontSize: 25, fontWeight: '800' },
  body: { marginTop: 12, color: '#5F687B', fontSize: 15, lineHeight: 21 },
  bodyLight: { marginTop: 10, color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
  actionButton: { marginTop: 20, alignSelf: 'flex-start' },
  action: { color: '#2447A8', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
});
