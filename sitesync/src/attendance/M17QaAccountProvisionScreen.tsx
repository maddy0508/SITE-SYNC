import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Props {
  client: SupabaseClient;
  onContinue: () => void;
}

function makeCredentials() {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  return { email: `m17-qa-${suffix}@example.test`, password: `M17-QA-${suffix}-Aa9!` };
}

export function M17QaAccountProvisionScreen({ client, onContinue }: Props) {
  const [displayName, setDisplayName] = useState('M17 QA WORKER');
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [status, setStatus] = useState('No QA account created yet.');
  const [busy, setBusy] = useState(false);

  const createAccount = async () => {
    setBusy(true);
    setCredentials(null);
    setStatus('Creating isolated Supabase account…');
    try {
      const next = makeCredentials();
      const { data, error } = await client.auth.signUp({ email: next.email, password: next.password });
      if (error) throw error;
      if (!data.user || !data.session) {
        throw new Error('Supabase created the account but did not issue a session. The isolated M1.7 project must have email confirmation disabled for this physical QA provisioning flow.');
      }
      const { data: bootstrap, error: bootstrapError } = await client.rpc('m17_qa_bootstrap_current_user', {
        p_display_name: displayName.trim() || 'M17 QA WORKER',
        p_role: 'WORKER',
      });
      if (bootstrapError) throw new Error(`Test identity provisioning failed: ${bootstrapError.message}`);
      if (!bootstrap) throw new Error('Test identity provisioning returned no result.');
      setCredentials(next);
      setStatus('ACCOUNT CREATED · TEST IDENTITY PROVISIONED · READY FOR M1.7');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>SITE-SYNC</Text>
      <Text style={styles.title}>M1.7 QA ACCOUNT</Text>
      <Text style={styles.subtitle}>Create the physical-test identity before entering the real runtime harness.</Text>
      <View style={styles.warning}>
        <Text style={styles.warningTitle}>ISOLATED TEST PROJECT ONLY</Text>
        <Text style={styles.warningBody}>This creates an @example.test account in SITE-SYNC-M17-TEST only. It cannot create a production account.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>TEST IDENTITY</Text>
        <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Display name" placeholderTextColor="#8A94A8" style={styles.input} />
        <Pressable style={styles.primary} disabled={busy} onPress={() => void createAccount()}>
          <Text style={styles.primaryText}>{busy ? 'CREATING…' : 'CREATE NEW QA ACCOUNT'}</Text>
        </Pressable>
        <Text style={styles.status}>{status}</Text>
      </View>
      {credentials && (
        <View style={styles.credentials}>
          <Text style={styles.credentialsTitle}>SAVE THESE CREDENTIALS</Text>
          <Text style={styles.credentialsText}>Email: {credentials.email}</Text>
          <Text style={styles.credentialsText}>Password: {credentials.password}</Text>
          <Text style={styles.credentialsHint}>These are generated for this isolated QA run. Enter them in the next screen.</Text>
          <Pressable style={styles.secondary} onPress={onContinue}>
            <Text style={styles.secondaryText}>CONTINUE TO REAL RUNTIME QA</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 48, backgroundColor: '#F4F6FA', minHeight: '100%' },
  eyebrow: { color: '#65718A', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  title: { marginTop: 4, color: '#0D1733', fontSize: 30, fontWeight: '900' },
  subtitle: { marginTop: 6, color: '#59657D', fontSize: 14, lineHeight: 20 },
  warning: { marginTop: 22, padding: 16, borderRadius: 16, backgroundColor: '#FFF4D8', borderWidth: 1, borderColor: '#E9C46A' },
  warningTitle: { color: '#6B4C00', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  warningBody: { marginTop: 6, color: '#735B1C', fontSize: 12, lineHeight: 18 },
  card: { marginTop: 16, padding: 18, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE2EF' },
  cardTitle: { color: '#0D1733', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  input: { marginTop: 12, borderWidth: 1, borderColor: '#CBD3E3', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: '#0D1733', backgroundColor: '#F8F9FC' },
  primary: { marginTop: 12, borderRadius: 14, paddingVertical: 15, alignItems: 'center', backgroundColor: '#0D1733' },
  primaryText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  status: { marginTop: 10, color: '#65718A', fontSize: 11, lineHeight: 16 },
  credentials: { marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: '#EEF7F1', borderWidth: 1, borderColor: '#B7DEC5' },
  credentialsTitle: { color: '#245E3A', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  credentialsText: { marginTop: 7, color: '#245E3A', fontSize: 12, fontWeight: '800' },
  credentialsHint: { marginTop: 9, color: '#3D6C4C', fontSize: 10, lineHeight: 15 },
  secondary: { marginTop: 14, borderRadius: 14, paddingVertical: 15, alignItems: 'center', backgroundColor: '#F3B33D' },
  secondaryText: { color: '#0D1733', fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textAlign: 'center' },
});
