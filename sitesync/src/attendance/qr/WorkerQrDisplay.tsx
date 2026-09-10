import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { WorkerQrPayload } from '../../qr/qrPayload';
import { encodeWorkerQrPayload } from '../../qr/qrPayload';
import { buildQrMatrix } from '../../qr/qrCodeMatrix';

const QR_CELL_SIZE = 5;
const QR_QUIET_ZONE_MODULES = 4;

export type WorkerQrDisplayProps = {
  displayName: string;
  workerPayload: WorkerQrPayload;
};

export function WorkerQrDisplay({ displayName, workerPayload }: WorkerQrDisplayProps) {
  const payload = useMemo(() => encodeWorkerQrPayload(workerPayload), [workerPayload]);
  const matrix = useMemo(() => buildQrMatrix(payload), [payload]);

  return (
    <View accessible accessibilityLabel={`Worker QR code for ${displayName}`} style={styles.card}>
      <Text style={styles.eyebrow}>WORKER QR</Text>
      <Text style={styles.name}>{displayName.toUpperCase()}</Text>
      <View style={styles.qrFrame}>
        <View style={styles.qrMatrix}>
          {matrix.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.qrRow}>
              {row.map((dark, columnIndex) => (
                <View
                  key={`cell-${rowIndex}-${columnIndex}`}
                  style={[styles.qrCell, dark ? styles.qrDark : styles.qrLight]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
      <Text style={styles.instruction}>Present this code to a registered SITE-SYNC scanner.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#46506A',
  },
  name: {
    marginTop: 6,
    color: '#10182B',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  qrFrame: {
    marginTop: 18,
    padding: QR_CELL_SIZE * QR_QUIET_ZONE_MODULES,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8DDE8',
  },
  qrMatrix: {
    alignSelf: 'center',
  },
  qrRow: {
    flexDirection: 'row',
  },
  qrCell: {
    width: QR_CELL_SIZE,
    height: QR_CELL_SIZE,
  },
  qrDark: {
    backgroundColor: '#10182B',
  },
  qrLight: {
    backgroundColor: '#FFFFFF',
  },
  instruction: {
    marginTop: 14,
    color: '#5F687B',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
