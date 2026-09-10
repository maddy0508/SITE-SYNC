import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ApplicationContext } from '../identity/projectContext';
import { createWorkerQrPayload } from './workerQrIdentity';
import { WorkerQrCard } from './WorkerQrCard';

export interface WorkerQrIdentityScreenProps {
  context: ApplicationContext;
  projectId: string;
  projectName?: string;
}

export function WorkerQrIdentityScreen({ context, projectId, projectName }: WorkerQrIdentityScreenProps) {
  const payload = useMemo(() => createWorkerQrPayload(context, projectId), [context, projectId]);
  const assignment = context.activeProjectAssignments.find((candidate) => candidate.projectId === projectId);

  if (!assignment) {
    return (
      <View style={styles.errorScreen} testID="worker-qr-error">
        <Text style={styles.errorTitle}>QR ID unavailable</Text>
        <Text style={styles.errorBody}>There is no active project assignment for this worker in the selected project.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <WorkerQrCard
        payload={payload}
        displayName={context.person.displayName}
        companyName={assignment.companyId}
        projectName={projectName ?? projectId}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F4F6FA',
  },
  errorScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F4F6FA',
  },
  errorTitle: {
    color: '#0D1733',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  errorBody: {
    maxWidth: 360,
    marginTop: 8,
    color: '#59657D',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
