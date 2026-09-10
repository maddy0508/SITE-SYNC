import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { encodeWorkerQrPayload } from './qrPayload';
import type { WorkerQrPayload } from './qrPayload';

export interface WorkerQrCardProps {
  payload: WorkerQrPayload;
  displayName: string;
  companyName?: string;
  projectName?: string;
}

export function WorkerQrCard({
  payload,
  displayName,
  companyName,
  projectName,
}: WorkerQrCardProps) {
  const encodedPayload = useMemo(() => encodeWorkerQrPayload(payload), [payload]);

  return (
    <View style={styles.card} testID="worker-qr-card">
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>SITE-SYNC</Text>
          <Text style={styles.title}>WORKER ID</Text>
        </View>
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>QR V1</Text>
        </View>
      </View>

      <View style={styles.qrFrame}>
        <QRCode
          value={encodedPayload}
          size={244}
          color="#0D1733"
          backgroundColor="#FFFFFF"
          quietZone={12}
          ecl="H"
        />
      </View>

      <View style={styles.identity}>
        <Text style={styles.name}>{displayName.toUpperCase()}</Text>
        {companyName ? <Text style={styles.meta}>{companyName}</Text> : null}
        {projectName ? <Text style={styles.meta}>{projectName}</Text> : null}
      </View>

      <Text style={styles.instruction}>Present this code to an authorised SITE-SYNC scanner.</Text>
      <Text style={styles.security}>The QR code identifies the worker only. Server/trusted roster validation remains authoritative.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    borderRadius: 24,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE2EF',
    shadowColor: '#0D1733',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  eyebrow: {
    color: '#5A6680',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  title: {
    marginTop: 3,
    color: '#0D1733',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  versionBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F3B33D',
  },
  versionText: {
    color: '#0D1733',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  qrFrame: {
    borderRadius: 20,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E8F1',
  },
  identity: {
    width: '100%',
    alignItems: 'center',
    marginTop: 18,
  },
  name: {
    color: '#0D1733',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  meta: {
    marginTop: 4,
    color: '#5A6680',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  instruction: {
    marginTop: 18,
    color: '#283553',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    textAlign: 'center',
  },
  security: {
    marginTop: 8,
    color: '#7A8499',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
