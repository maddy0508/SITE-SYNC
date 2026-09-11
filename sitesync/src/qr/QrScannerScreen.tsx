import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useBarcodeScannerOutput } from 'react-native-vision-camera-barcode-scanner';
import { reduceQrCameraState } from './qrCameraState';
import type { QrCameraState } from './qrCameraState';
import { QrCameraFrameAdapter } from './qrCameraFrameAdapter';
import { QrScanController } from './qrScanController';
import { parseWorkerQrPayload, QrParseError } from './qrPayload';
import type { ProjectContextRecord } from '../domain/localPersistence';
import { QrValidationService } from './qrValidation';
import type { QrRosterResolver, QrValidationResult } from './qrValidation';

export interface QrScannerScreenProps {
  context: ProjectContextRecord;
  resolver: QrRosterResolver;
  online: boolean;
  isFocused?: boolean;
  onScanAccepted?: (result: QrValidationResult) => void;
}

type ScanMessage = {
  title: string;
  body: string;
};

const BLOCK_REASON_MESSAGES: Record<string, string> = {
  ORG_MISMATCH: 'The QR code belongs to another organisation.',
  COMPANY_MISMATCH: 'The worker belongs to another company in this organisation.',
  PERSON_UNASSIGNED: 'The worker is not assigned to the selected project.',
  MEMBERSHIP_INVALID: 'The worker membership is inactive or could not be trusted.',
  PROJECT_UNASSIGNED: 'The QR code is not valid for the selected project.',
  ACTOR_NOT_PERMITTED: 'Your project role does not permit scanning another worker.',
  ROSTER_UNVERIFIABLE: 'Trusted roster data is unavailable while offline.',
};

function getMessage(state: QrCameraState, error: Error | null, result: QrValidationResult | null): ScanMessage {
  switch (state) {
    case 'permission_denied':
      return { title: 'Camera access denied', body: 'Allow camera access in the app settings to scan worker QR codes.' };
    case 'permission_blocked':
      return { title: 'Camera access blocked', body: 'Camera access can no longer be requested here. Open system settings and allow SITE-SYNC to use the camera.' };
    case 'processing':
      return { title: 'Validating QR', body: 'Checking the code against the selected project and trusted membership data.' };
    case 'valid':
      return { title: 'Worker verified', body: result?.displayName ? `${result.displayName} is valid for this project.` : 'The worker QR code is valid.' };
    case 'provisional':
      return { title: 'Offline — provisional', body: result?.displayName ? `${result.displayName} was matched against trusted cached data. Do not treat this as server-verified.` : 'The QR code was matched against trusted cached data only.' };
    case 'blocked':
      return { title: 'Scan blocked', body: result?.reason ? BLOCK_REASON_MESSAGES[result.reason] ?? 'The QR code failed validation.' : error instanceof QrParseError ? `Invalid QR code: ${error.message}.` : error?.message || 'The QR code failed validation. No attendance action was created.' };
    case 'error':
      return { title: 'Scanner error', body: error?.message || 'The camera scanner encountered an error.' };
    default:
      return { title: 'Scan worker QR', body: 'Align the worker QR code inside the camera view.' };
  }
}

export function QrScannerScreen({ context, resolver, online, isFocused = true, onScanAccepted }: QrScannerScreenProps) {
  const { hasPermission, canRequestPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const [cameraState, setCameraState] = useState<QrCameraState>('idle');
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [cameraInitialized, setCameraInitialized] = useState(false);
  const [scannerAttached, setScannerAttached] = useState(false);
  const [result, setResult] = useState<QrValidationResult | null>(null);
  const [scannerError, setScannerError] = useState<Error | null>(null);
  const controller = useMemo(() => new QrScanController(), []);
  const adapter = useMemo(() => new QrCameraFrameAdapter(controller), [controller]);
  const validation = useMemo(() => new QrValidationService(resolver), [resolver]);
  const requestingPermission = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const active = nextState === 'active';
      setAppActive(active);
      if (!active) {
        setScannerAttached(false);
        setCameraInitialized(false);
      }
      setCameraState((current) => reduceQrCameraState(current, { type: active ? 'APPROACH_ACTIVE' : 'APPROACH_INACTIVE' }));
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (hasPermission) {
      setCameraState((current) => reduceQrCameraState(current, { type: 'PERMISSION_GRANTED' }));
      return;
    }
    setCameraInitialized(false);
    setScannerAttached(false);
    if (!canRequestPermission) {
      setCameraState('permission_blocked');
      return;
    }
    if (requestingPermission.current) return;

    requestingPermission.current = true;
    setCameraState('requesting_permission');
    requestPermission()
      .then((granted) => {
        setCameraState(granted ? 'ready' : 'permission_denied');
      })
      .catch((error: unknown) => {
        setScannerError(error instanceof Error ? error : new Error(String(error)));
        setCameraState('error');
      })
      .finally(() => {
        requestingPermission.current = false;
      });
  }, [canRequestPermission, hasPermission, requestPermission]);

  const reset = useCallback(() => {
    controller.reset();
    setResult(null);
    setScannerError(null);
    setCameraInitialized(false);
    setScannerAttached(false);
    setCameraState(hasPermission ? 'ready' : canRequestPermission ? 'idle' : 'permission_blocked');
  }, [canRequestPermission, controller, hasPermission]);

  const handleBarcodeScanned = useCallback(async (barcodes: Array<{ rawValue?: string; displayValue?: string }>) => {
    if (cameraState !== 'ready' || !barcodes.length) return;
    if (!adapter.handle(barcodes[0])) return;

    setCameraState((current) => reduceQrCameraState(current, { type: 'QR_DETECTED' }));
    setScannerError(null);

    try {
      const rawValue = barcodes[0].rawValue ?? barcodes[0].displayValue;
      const payload = parseWorkerQrPayload(rawValue ?? '');
      const validationResult = await validation.validate(payload, context, { online });
      setResult(validationResult);
      setCameraState(validationResult.status === 'VALID' ? 'valid' : validationResult.status === 'PROVISIONAL' ? 'provisional' : 'blocked');
      if (validationResult.status !== 'BLOCKED') onScanAccepted?.(validationResult);
    } catch (error: unknown) {
      setScannerError(error instanceof Error ? error : new Error(String(error)));
      setCameraState('blocked');
      setResult(null);
    }
  }, [adapter, cameraState, context, onScanAccepted, online, validation]);

  const handleCameraError = useCallback((error: Error) => {
    setScannerError(error);
    setScannerAttached(false);
    setCameraInitialized(false);
    setCameraState('error');
  }, []);

  const handleCameraInitialized = useCallback(() => {
    setCameraInitialized(true);
    setScannerAttached(true);
  }, []);

  const barcodeOutput = useBarcodeScannerOutput({
    barcodeFormats: ['qr-code'],
    outputResolution: 'preview',
    onBarcodeScanned: handleBarcodeScanned,
    onError: handleCameraError,
  });

  const message = getMessage(cameraState, scannerError, result);
  const isCameraActive = hasPermission && appActive && isFocused && cameraState === 'ready';

  return (
    <View style={styles.screen} testID="qr-scanner-screen">
      <View style={styles.topBar}>
        <View>
          <Text style={styles.eyebrow}>SITE-SYNC</Text>
          <Text style={styles.heading}>SCAN WORKER</Text>
        </View>
        <View style={[styles.networkBadge, online ? styles.online : styles.offline]}>
          <Text style={styles.networkText}>{online ? 'ONLINE' : 'OFFLINE'}</Text>
        </View>
      </View>

      <View style={styles.scannerFrame}>
        {hasPermission && device ? (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={isCameraActive}
            outputs={scannerAttached ? [barcodeOutput] : []}
            onInitialized={handleCameraInitialized}
            onError={handleCameraError}
          />
        ) : (
          <View style={styles.cameraPlaceholder}>
            <Text style={styles.placeholderTitle}>Camera access required</Text>
            <Text style={styles.placeholderBody}>SITE-SYNC needs the camera to read worker QR codes.</Text>
          </View>
        )}

        {hasPermission && cameraInitialized && scannerAttached && isCameraActive ? (
          <View pointerEvents="none" style={styles.scanTarget}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
            <Text style={styles.scanHint}>ALIGN QR CODE</Text>
          </View>
        ) : null}

        {hasPermission && !cameraInitialized && isCameraActive ? (
          <View pointerEvents="none" style={styles.startingOverlay}>
            <Text style={styles.processingTitle}>STARTING CAMERA</Text>
          </View>
        ) : null}

        {cameraState === 'processing' ? (
          <View style={styles.processingOverlay}>
            <Text style={styles.processingTitle}>VALIDATING</Text>
            <Text style={styles.processingBody}>Checking trusted project context…</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.statusPanel}>
        <Text style={styles.statusTitle}>{message.title}</Text>
        <Text style={styles.statusBody}>{message.body}</Text>

        {cameraState === 'permission_blocked' || cameraState === 'permission_denied' ? (
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
  startingOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(13, 23, 51, 0.55)' },
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
