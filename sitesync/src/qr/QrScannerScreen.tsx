import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import type { Code } from 'react-native-vision-camera-barcode-scanner';
import { useIsFocused } from '@react-navigation/native';
import { QrScanController } from './qrScanController';
import { QrCameraFrameAdapter } from './qrCameraFrameAdapter';
import { reduceQrCameraState, type QrCameraState } from './qrCameraState';
import { parseWorkerQrPayload } from './qrPayload';
import { QrValidationService, type QrValidationResult } from './qrValidation';
import type { ProjectContextRecord } from '../domain/localPersistence';

export interface QrScannerScreenProps {
  context: ProjectContextRecord;
  online: boolean;
  resolver: ConstructorParameters<typeof QrValidationService>[0];
  isFocused?: boolean;
}

export function QrScannerScreen({ context, online, resolver, isFocused }: QrScannerScreenProps) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const navigationFocus = useIsFocused();
  const focused = isFocused ?? navigationFocus;
  const [cameraState, setCameraState] = useState<QrCameraState>('idle');
  const [validation, setValidation] = useState<QrValidationResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const appState = useRef(AppState.currentState);
  const validationService = useMemo(() => new QrValidationService(resolver), [resolver]);
  const controller = useMemo(() => new QrScanController(), []);
  const adapter = useMemo(() => new QrCameraFrameAdapter(controller), [controller]);

  const transition = useCallback((action: Parameters<typeof reduceQrCameraState>[1]) => {
    setCameraState((state) => reduceQrCameraState(state, action));
  }, []);

  const reset = useCallback(() => {
    controller.reset();
    adapter.reset();
    setValidation(null);
    setCameraError(null);
    transition({ type: 'RESET' });
  }, [adapter, controller, transition]);

  useEffect(() => {
    let mounted = true;
    if (!hasPermission) {
      transition({ type: 'REQUEST_PERMISSION' });
      requestPermission().then((granted) => {
        if (!mounted) return;
        transition(granted ? { type: 'PERMISSION_GRANTED' } : { type: 'PERMISSION_DENIED' });
      });
    } else {
      transition({ type: 'PERMISSION_GRANTED' });
    }
    return () => {
      mounted = false;
    };
  }, [hasPermission, requestPermission, transition]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      appState.current = nextState;
      if (nextState === 'active') {
        transition({ type: 'APPROACH_ACTIVE' });
      } else {
        transition({ type: 'APPROACH_INACTIVE' });
      }
    });
    return () => subscription.remove();
  }, [transition]);

  useEffect(() => {
    if (!focused) transition({ type: 'APPROACH_INACTIVE' });
    else if (appState.current === 'active' && hasPermission) transition({ type: 'APPROACH_ACTIVE' });
  }, [focused, hasPermission, transition]);

  const onCodes = useCallback(async (codes: Code[]) => {
    if (cameraState !== 'ready' || !focused || appState.current !== 'active') return;
    const code = codes.find((candidate) => candidate.format === 'qr-code' && (candidate.rawValue || candidate.displayValue));
    const value = code?.rawValue ?? code?.displayValue;
    if (!value) return;
    if (!adapter.accept(value)) return;

    transition({ type: 'QR_DETECTED' });
    try {
      const payload = parseWorkerQrPayload(value);
      const result = await validationService.validate(payload, context, { online });
      setValidation(result);
      transition(result.status === 'VALID' ? { type: 'VALID' } : result.status === 'PROVISIONAL' ? { type: 'PROVISIONAL' } : { type: 'BLOCKED' });
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : 'QR code could not be read.');
      transition({ type: 'ERROR' });
    }
  }, [adapter, cameraState, context, focused, online, transition, validationService]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: onCodes,
  });

  const active = hasPermission && focused && appState.current === 'active' && cameraState === 'ready';

  const title = validation?.status === 'VALID'
    ? 'QR VERIFIED'
    : validation?.status === 'PROVISIONAL'
      ? 'QR VERIFIED OFFLINE'
      : validation?.status === 'BLOCKED'
        ? 'QR BLOCKED'
        : cameraError
          ? 'QR SCAN ERROR'
          : cameraState === 'permission_denied'
            ? 'CAMERA PERMISSION REQUIRED'
            : 'SCAN WORKER QR';

  const body = validation?.status === 'VALID'
    ? `${validation.displayName ?? 'Worker'} is verified for this project.`
    : validation?.status === 'PROVISIONAL'
      ? `${validation.displayName ?? 'Worker'} matches trusted cached project data. Confirmation remains provisional until online.`
      : validation?.status === 'BLOCKED'
        ? `This QR cannot be accepted. ${validation.reason ?? 'The identity or project assignment is not authorised.'}`
        : cameraError ?? (cameraState === 'permission_denied' ? 'Allow camera access to scan a worker QR code.' : 'Align the worker QR code inside the scan frame.');

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.eyebrow}>SITE-SYNC / ATTENDANCE</Text>
          <Text style={styles.heading}>WORKER QR</Text>
        </View>
        <View style={[styles.networkBadge, online ? styles.online : styles.offline]}>
          <Text style={styles.networkText}>{online ? 'ONLINE' : 'OFFLINE'}</Text>
        </View>
      </View>

      <View style={styles.scannerFrame}>
        {hasPermission ? (
          <Camera style={StyleSheet.absoluteFill} device={'back' as never} isActive={active} codeScanner={codeScanner} onError={(error) => {
            setCameraError(error.message);
            transition({ type: 'ERROR' });
          }} />
        ) : (
          <View style={styles.cameraPlaceholder}>
            <Text style={styles.placeholderTitle}>CAMERA ACCESS NEEDED</Text>
            <Text style={styles.placeholderBody}>SITE-SYNC needs camera access to read the worker QR identity.</Text>
          </View>
        )}
        <View style={styles.scanTarget} pointerEvents="none">
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
          <Text style={styles.scanHint}>{cameraState === 'processing' ? 'VERIFYING…' : 'ALIGN QR INSIDE FRAME'}</Text>
        </View>
        {cameraState === 'processing' ? (
          <View style={styles.processingOverlay}>
            <Text style={styles.processingTitle}>VERIFYING QR</Text>
            <Text style={styles.processingBody}>Checking trusted project identity and membership.</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.statusPanel}>
        <Text style={styles.statusTitle}>{title}</Text>
        <Text style={styles.statusBody}>{body}</Text>
        {cameraState === 'permission_denied' ? (
          <Pressable style={styles.primaryButton} onPress={() => Linking.openSettings()}>
            <Text style={styles.primaryButtonText}>OPEN SETTINGS</Text>
          </Pressable>
        ) : null}
        {cameraState === 'valid' || cameraState === 'provisional' || cameraState === 'blocked' || cameraState === 'error' ? (
          <Pressable style={styles.secondaryButton} onPress={reset}>
            <Text style={styles.secondaryButtonText}>SCAN ANOTHER</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F6FA', padding: 20 },
  topBar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  eyebrow: { color: '#65718A', fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  heading: { marginTop: 3, color: '#0D1733', fontSize: 26, fontWeight: '900', letterSpacing: 0.5 },
  networkBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  online: { backgroundColor: '#DDF4E7' },
  offline: { backgroundColor: '#FFF0CC' },
  networkText: { color: '#0D1733', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  scannerFrame: { flex: 1, minHeight: 360, overflow: 'hidden', borderRadius: 24, backgroundColor: '#0B1124' },
  cameraPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  placeholderTitle: { color: '#FFFFFF', fontSize: 19, fontWeight: '900', textAlign: 'center' },
  placeholderBody: { marginTop: 8, color: '#C7CFDF', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  scanTarget: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: 44, height: 44, borderColor: '#F3B33D' },
  cornerTopLeft: { top: '28%', left: '12%', borderTopWidth: 4, borderLeftWidth: 4 },
  cornerTopRight: { top: '28%', right: '12%', borderTopWidth: 4, borderRightWidth: 4 },
  cornerBottomLeft: { bottom: '28%', left: '12%', borderBottomWidth: 4, borderLeftWidth: 4 },
  cornerBottomRight: { bottom: '28%', right: '12%', borderBottomWidth: 4, borderRightWidth: 4 },
  scanHint: { position: 'absolute', bottom: '21%', color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  processingOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(13, 23, 51, 0.82)' },
  processingTitle: { color: '#F3B33D', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  processingBody: { marginTop: 8, color: '#FFFFFF', fontSize: 13 },
  statusPanel: { marginTop: 14, borderRadius: 20, padding: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE2EF' },
  statusTitle: { color: '#0D1733', fontSize: 18, fontWeight: '900' },
  statusBody: { marginTop: 5, color: '#59657D', fontSize: 13, lineHeight: 19 },
  primaryButton: { marginTop: 14, borderRadius: 12, paddingVertical: 13, alignItems: 'center', backgroundColor: '#F3B33D' },
  primaryButtonText: { color: '#0D1733', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  secondaryButton: { marginTop: 14, borderRadius: 12, paddingVertical: 13, alignItems: 'center', backgroundColor: '#0D1733' },
  secondaryButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
});
