import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface M17QaCredentials {
  email: string;
  password: string;
}

interface Props {
  client: SupabaseClient;
  onBack: () => void;
  onContinue: (credentials: M17QaCredentials) => void;
}

export const QA_BOOTSTRAP_TOKEN = 'M17-PHYSICAL-QA-ONLY-2026';
export const QA_EMAIL_DOMAIN = 'sitesync.app';

export function makeCredentials(): M17QaCredentials {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  return { email: `m17-qa-${suffix}@${QA_EMAIL_DOMAIN}`, password: `M17-QA-${suffix}-Aa9!` };
}

export function M17QaAccountProvisionScreen({ client, onBack, onContinue }: Props) {
  const [credentials, setCredentials] = useState<M17QaCredentials | null>(null);
  const [status, setStatus] = useState('Ready to create a fresh isolated QA identity.');
  const [busy, setBusy] = useState(false);

  const createAccount = async () => {
    if (busy) return;
    setBusy(true);
    setCredentials(null);
    setStatus('Creating isolated Supabase account…');
    try {
      const next = makeCredentials();
      const { data: provisioned, error: provisionError } = await client.functions.invoke('m17-qa-provision-account', {
        body: { email: next.email, password: next.password },
        headers: { 'x-m17-qa-bootstrap': QA_BOOTSTRAP_TOKEN },
      });
      if (provisionError) throw new Error(`QA account provisioning failed: ${provisionError.message}`);
      if (!provisioned?.ok || provisioned.email !== next.email) throw new Error('QA account provisioning returned an unexpected result.');

      const { data: signedIn, error: signInError } = await client.auth.signInWithPassword({
        email: next.email,
        password: next.password,
      });
      if (signInError) throw new Error(`QA account sign-in failed: ${signInError.message}`);
      if (!signedIn.user || !signedIn.session) throw new Error('QA account was created but no authenticated session was issued.');

      const { data: bootstrap, error: bootstrapError } = await client.rpc('m17_qa_bootstrap_current_user', {
        p_display_name: 'M17 QA WORKER',
        p_role: 'WORKER',
      });
      if (bootstrapError) throw new Error(`Test identity provisioning failed: ${bootstrapError.message}`);
      if (!bootstrap) throw new Error('Test identity provisioning returned no result.');

      setCredentials(next);
      setStatus('ACCOUNT CREATED · TEST IDENTITY PROVISIONED · READY FOR M1.7');
      onContinue(next);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}><Text style={styles.back}>‹ BACK</Text></Pressable>
        <Text style={styles.label}>M1.7 PHYSICAL QA</Text>
      </View>
      <Text style={styles.eyebrow}>SITE-SYNC</Text>
      <Text style={styles.title}>M1.7 QA ACCOUNT</Text>
      <Text style={styles.subtitle}>Create the physical-test identity before entering the real runtime harness.</Text>
      <View style={styles.warning}>
        <Text style={styles.warningTitle}>ISOLATED TEST PROJECT ONLY</Text>
        <Text style={styles.warningBody}>A fresh QA identity is generated automatically in SITE-SYNC-M17-TEST only. No production account can be created from this flow.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>TEST IDENTITY</Text>
        <Text style={styles.identity}>M17 QA WORKER</Text>
        <Text style={styles.detail}>The application generates the email and password, creates the Auth user, confirms it, signs in, and provisions the isolated company/project identity automatically.</Text>
        <Pressable style={styles.primary} disabled={busy} onPress={() => void createAccount()}>
          <Text style={styles.primaryText}>{busy ? 'CREATING…' : 'CREATE NEW QA ACCOUNT'}</Text>
        </Pressable>
        <Text style={styles.status}>{status}</Text>
      </View>
      {credentials && (
        <View style={styles.credentials}>
          <Text style={styles.credentialsTitle}>GENERATED CREDENTIALS — AUDIT RECORD</Text>
          <Text style={styles.credentialsText}>Email: {credentials.email}</Text>
          <Text style={styles.credentialsText}>Password: {credentials.password}</Text>
          <Text style={styles.credentialsHint}>No re-entry is required. The authenticated session has already been handed to the M1.7 runtime.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 48, backgroundColor: '#F4F6FA', minHeight: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  back: { color: '#0D1733', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  label: { color: '#65718A', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  eyebrow: { color: '#65718A', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  title: { marginTop: 4, color: '#0D1733', fontSize: 30, fontWeight: '900' },
  subtitle: { marginTop: 6, color: '#59657D', fontSize: 14, lineHeight: 20 },
  warning: { marginTop: 22, padding: 16, borderRadius: 16, backgroundColor: '#FFF4D8', borderWidth: 1, borderColor: '#E9C46A' },
  warningTitle: { color: '#6B4C00', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  warningBody: { marginTop: 6, color: '#735B1C', fontSize: 12, lineHeight: 18 },
  card: { marginTop: 16, padding: 18, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE2EF' },
  cardTitle: { color: '#0D1733', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  identity: { marginTop: 10, color: '#0D1733', fontSize: 20, fontWeight: '900' },
  detail: { marginTop: 6, color: '#65718A', fontSize: 12, lineHeight: 18 },
  primary: { marginTop: 16, borderRadius: 14, paddingVertical: 15, alignItems: 'center', backgroundColor: '#0D1733' },
  primaryText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  status: { marginTop: 10, color: '#65718A', fontSize: 11, lineHeight: 16 },
  credentials: { marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: '#EEF7F1', borderWidth: 1, borderColor: '#B7DEC5' },
  credentialsTitle: { color: '#245E3A', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  credentialsText: { marginTop: 7, color: '#245E3A', fontSize: 12, fontWeight: '800' },
  credentialsHint: { marginTop: 9, color: '#3D6C4C', fontSize: 10, lineHeight: 15 },
});
