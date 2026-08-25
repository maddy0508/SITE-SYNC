import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { QrValidationResult } from '../../qr/qrValidation';

export type QrScanResultPanelProps = {
  result: QrValidationResult | null;
  parseError?: string | null;
  cameraError?: string | null;
};

export function QrScanResultPanel({ result, parseError, cameraError }: QrScanResultPanelProps) {
  if (cameraError) {
    return <StatePanel title="CAMERA ERROR" body={cameraError} tone="error" />;
  }

  if (parseError) {
    return <StatePanel title="INVALID QR" body={parseError} tone="error" />;
  }

  if (!result) {
    return <StatePanel title="READY" body="Scan a registered worker QR code." tone="neutral" />;
  }

  if (result.status === 'VALID') {
    return (
      <StatePanel
        title="VALID WORKER"
        body={`${result.displayName ?? result.personId ?? 'Worker'} is assigned to this project.`}
        tone="success"
      />
    );
  }

  if (result.status === 'PROVISIONAL') {
    return (
      <StatePanel
        title="PROVISIONAL OFFLINE"
        body={`${result.displayName ?? result.personId ?? 'Worker'} was verified against trusted cached roster data. Server verification is still required.`}
        tone="warning"
      />
    );
  }

  return (
    <StatePanel
      title="SCAN BLOCKED"
      body={result.reason ? formatReason(result.reason) : 'The QR could not be trusted for this project.'}
      tone="error"
    />
  );
}

function formatReason(reason: string): string {
  return reason.replaceAll('_', ' ').toLowerCase().replace(/^./, (value) => value.toUpperCase());
}

function StatePanel({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: 'neutral' | 'success' | 'warning' | 'error';
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.eyebrow}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <View style={[styles.indicator, styles[tone]]} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  eyebrow: {
    color: '#46506A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  body: {
    marginTop: 6,
    color: '#10182B',
    fontSize: 14,
    lineHeight: 19,
  },
  indicator: {
    marginTop: 12,
    height: 3,
    borderRadius: 2,
  },
  neutral: { backgroundColor: '#7C879C' },
  success: { backgroundColor: '#2F7D55' },
  warning: { backgroundColor: '#B77A18' },
  error: { backgroundColor: '#B64040' },
});
