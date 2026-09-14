import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export type ProductTab = 'TODAY' | 'MAP' | 'PEOPLE' | 'MORE';

export interface M2ProductContext {
  projectName: string;
  siteName: string;
  workerName: string;
  workerRole: string;
  companyName: string;
  attendanceState: 'CHECKED_IN' | 'CHECKED_OUT';
}

const DEFAULT_CONTEXT: M2ProductContext = {
  projectName: 'TEST PROJECT',
  siteName: 'SITE A',
  workerName: 'ORG A WORKER',
  workerRole: 'WORKER',
  companyName: 'COMPANY A',
  attendanceState: 'CHECKED_IN',
};

const actions = [
  { label: 'Attendance', state: 'DONE', tone: 'good' },
  { label: 'Pre-start', state: 'REQUIRED', tone: 'warn' },
  { label: 'SWMS', state: 'CURRENT', tone: 'good' },
  { label: 'Permit', state: 'REVIEW', tone: 'warn' },
];

export function M2AppShell({ context = DEFAULT_CONTEXT }: { context?: M2ProductContext }) {
  const [tab, setTab] = useState<ProductTab>('TODAY');
  const [selectedWorker, setSelectedWorker] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const dateLabel = useMemo(
    () => new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()),
    [],
  );

  const renderBody = () => {
    if (tab === 'MAP') return <MapPreview context={context} />;
    if (tab === 'PEOPLE') return <PeoplePreview context={context} onWorker={() => setSelectedWorker(true)} />;
    return (
      <TodayScreen
        context={context}
        dateLabel={dateLabel}
        onWorker={() => setSelectedWorker(true)}
        onMore={() => setShowMore(value => !value)}
        showMore={showMore}
      />
    );
  };

  if (selectedWorker) {
    return <WorkerPreview context={context} onBack={() => setSelectedWorker(false)} />;
  }

  return (
    <View style={styles.root}>
      <View style={styles.appHeader}>
        <View>
          <Text style={styles.brand}>SITE-SYNC</Text>
          <Text style={styles.context}>{context.projectName} · {context.siteName}</Text>
        </View>
        <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>ONLINE</Text></View>
      </View>
      <View style={styles.body}>{renderBody()}</View>
      <View style={styles.nav}>
        {(['TODAY', 'MAP', 'PEOPLE', 'MORE'] as ProductTab[]).map(item => (
          <Pressable key={item} style={styles.navItem} onPress={() => setTab(item)} accessibilityRole="button" accessibilityLabel={item}>
            <Text style={[styles.navLabel, tab === item && styles.navLabelActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function TodayScreen({ context, dateLabel, onWorker, onMore, showMore }: { context: M2ProductContext; dateLabel: string; onWorker: () => void; onMore: () => void; showMore: boolean }) {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.eyebrow}>TODAY</Text>
      <Text style={styles.title}>{dateLabel}</Text>
      <Text style={styles.subtitle}>Your operational picture for {context.siteName}.</Text>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroEyebrow}>SITE STATUS</Text>
            <Text style={styles.heroValue}>78%</Text>
            <Text style={styles.heroCaption}>PROJECT COMPLETE</Text>
          </View>
          <View style={styles.heroMetric}><Text style={styles.metricValue}>126</Text><Text style={styles.metricLabel}>WORKERS</Text></View>
          <View style={styles.heroMetric}><Text style={styles.metricValue}>14</Text><Text style={styles.metricLabel}>WORK FRONTS</Text></View>
        </View>
        <View style={styles.progressTrack}><View style={styles.progressFill} /></View>
      </View>

      <SectionTitle title="TODAY'S ACTIONS" />
      <View style={styles.card}>
        {actions.map((action, index) => (
          <View key={action.label} style={[styles.actionRow, index === actions.length - 1 && styles.lastRow]}>
            <View style={[styles.statusDot, action.tone === 'warn' ? styles.statusWarn : styles.statusGood]} />
            <Text style={styles.actionLabel}>{action.label}</Text>
            <Text style={[styles.actionState, action.tone === 'warn' ? styles.warnText : styles.goodText]}>{action.state}</Text>
          </View>
        ))}
      </View>

      <SectionTitle title="CREW" />
      <Pressable style={styles.card} onPress={onWorker} accessibilityRole="button" accessibilityLabel="Open worker profile">
        <View style={styles.workerRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{context.workerName.slice(0, 1)}</Text></View>
          <View style={styles.workerInfo}>
            <Text style={styles.workerName}>{context.workerName}</Text>
            <Text style={styles.workerMeta}>{context.workerRole} · {context.companyName}</Text>
            <Text style={styles.workerStatus}>{context.attendanceState === 'CHECKED_IN' ? 'CHECKED IN' : 'CHECKED OUT'}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      </Pressable>

      <SectionTitle title="WORK" />
      <View style={styles.grid}>
        <MetricCard value="8" label="SCHEDULED" />
        <MetricCard value="4" label="ACTIVE" />
        <MetricCard value="2" label="BLOCKED" warning />
      </View>

      <SectionTitle title="SITE CONDITIONS" />
      <View style={styles.card}>
        <View style={styles.conditionRow}><Text style={styles.conditionTitle}>WEATHER</Text><Text style={styles.conditionValue}>18°C · Partly cloudy</Text></View>
        <View style={styles.conditionRow}><Text style={styles.conditionTitle}>WIND</Text><Text style={styles.conditionValue}>12 km/h</Text></View>
        <View style={styles.conditionRow}><Text style={styles.conditionTitle}>WARNINGS</Text><Text style={styles.warnText}>1 REVIEW REQUIRED</Text></View>
      </View>

      <Pressable style={styles.secondaryButton} onPress={onMore} accessibilityRole="button" accessibilityLabel="Show additional actions">
        <Text style={styles.secondaryButtonText}>{showMore ? 'HIDE OPERATIONAL DETAIL' : 'VIEW OPERATIONAL DETAIL'}</Text>
      </Pressable>
      {showMore && <View style={styles.card}><Text style={styles.detailLine}>Hazards · 3 active</Text><Text style={styles.detailLine}>Restrictions · 1 active</Text><Text style={styles.detailLine}>Outstanding actions · 5</Text><Text style={styles.detailLine}>Permits · 2 requiring attention</Text></View>}
    </ScrollView>
  );
}

function PeoplePreview({ context, onWorker }: { context: M2ProductContext; onWorker: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.eyebrow}>PEOPLE</Text>
      <Text style={styles.title}>WORKERS</Text>
      <Text style={styles.subtitle}>Project personnel and attendance.</Text>
      <View style={styles.searchBox}><Text style={styles.searchText}>Search workers...</Text></View>
      <View style={styles.filterRow}>{['ALL', 'ON SITE', 'CREWS', 'CONTRACTORS'].map(filter => <View key={filter} style={styles.filter}><Text style={styles.filterText}>{filter}</Text></View>)}</View>
      <Pressable style={styles.card} onPress={onWorker} accessibilityRole="button" accessibilityLabel={`Open ${context.workerName} profile`}>
        <View style={styles.workerRow}><View style={styles.avatar}><Text style={styles.avatarText}>{context.workerName.slice(0, 1)}</Text></View><View style={styles.workerInfo}><Text style={styles.workerName}>{context.workerName}</Text><Text style={styles.workerMeta}>{context.workerRole} · {context.companyName}</Text><Text style={styles.workerStatus}>ON SITE</Text></View><Text style={styles.chevron}>›</Text></View>
      </Pressable>
    </ScrollView>
  );
}

function WorkerPreview({ context, onBack }: { context: M2ProductContext; onBack: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Pressable onPress={onBack}><Text style={styles.back}>‹ BACK TO PEOPLE</Text></Pressable>
      <View style={styles.profileBanner} />
      <View style={styles.profileHeader}><View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{context.workerName.slice(0, 1)}</Text></View><Text style={styles.profileName}>{context.workerName}</Text><Text style={styles.profileRole}>{context.workerRole} · {context.companyName}</Text></View>
      <View style={styles.profileActions}><ActionButton label="CALL" /><ActionButton label="WHATSAPP" /><ActionButton label="QR" /></View>
      <SectionTitle title="ATTENDANCE" /><View style={styles.card}><DetailPair label="STATUS" value={context.attendanceState === 'CHECKED_IN' ? 'CHECKED IN' : 'CHECKED OUT'} /><DetailPair label="TODAY" value="07:04 → Active" /><DetailPair label="RECENT" value="5 days · 41h 20m" /></View>
      <SectionTitle title="QUALIFICATIONS" /><View style={styles.card}><DetailPair label="WHITE CARD" value="VALID" /><DetailPair label="LICENCES" value="2 CURRENT" /><DetailPair label="COMPETENCIES" value="4 CURRENT" /></View>
      <SectionTitle title="SAFETY & ELIGIBILITY" /><View style={styles.card}><DetailPair label="INDUCTION" value="CURRENT" /><DetailPair label="SWMS" value="2 ASSIGNED" /><DetailPair label="PERMITS" value="1 ACTIVE" /></View>
    </ScrollView>
  );
}

function MapPreview({ context }: { context: M2ProductContext }) {
  return <ScrollView contentContainerStyle={styles.scroll}><Text style={styles.eyebrow}>PROJECT / SITE</Text><Text style={styles.title}>MAP</Text><Text style={styles.subtitle}>{context.projectName} · {context.siteName}</Text><View style={styles.map}><View style={[styles.mapZone, styles.zoneA]}><Text style={styles.mapLabel}>BLOCK A</Text><Text style={styles.mapProgress}>82%</Text></View><View style={[styles.mapZone, styles.zoneB]}><Text style={styles.mapLabel}>BLOCK B</Text><Text style={styles.mapProgress}>61%</Text></View><View style={[styles.mapZone, styles.zoneSub]}><Text style={styles.mapLabel}>SUBSTATION</Text></View><View style={styles.locationDot} /></View><View style={styles.card}><Text style={styles.cardTitle}>MAP FOUNDATION</Text><Text style={styles.cardBody}>Site boundary, work areas, work fronts and operational markers will resolve to shared project records.</Text></View></ScrollView>;
}

function SectionTitle({ title }: { title: string }) { return <Text style={styles.sectionTitle}>{title}</Text>; }
function MetricCard({ value, label, warning = false }: { value: string; label: string; warning?: boolean }) { return <View style={styles.metricCard}><Text style={[styles.metricCardValue, warning && styles.warnText]}>{value}</Text><Text style={styles.metricCardLabel}>{label}</Text></View>; }
function ActionButton({ label }: { label: string }) { return <Pressable style={styles.actionButton}><Text style={styles.actionButtonText}>{label}</Text></Pressable>; }
function DetailPair({ label, value }: { label: string; value: string }) { return <View style={styles.detailPair}><Text style={styles.conditionTitle}>{label}</Text><Text style={styles.conditionValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6FA' }, body: { flex: 1 },
  appHeader: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, backgroundColor: '#0D1733', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 2 }, context: { color: '#B8C1D4', fontSize: 11, marginTop: 3 },
  headerBadge: { borderWidth: 1, borderColor: '#65718A', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 }, headerBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  scroll: { padding: 20, paddingBottom: 30 }, eyebrow: { color: '#6B758B', fontSize: 10, fontWeight: '900', letterSpacing: 2 }, title: { color: '#0D1733', fontSize: 28, fontWeight: '900', marginTop: 4 }, subtitle: { color: '#65718A', fontSize: 13, marginTop: 4, lineHeight: 18 },
  heroCard: { marginTop: 22, padding: 18, backgroundColor: '#0D1733', borderRadius: 20 }, heroTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, heroEyebrow: { color: '#AEB8CD', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 }, heroValue: { color: '#FFFFFF', fontSize: 38, fontWeight: '900', marginTop: 2 }, heroCaption: { color: '#AEB8CD', fontSize: 8, fontWeight: '900', letterSpacing: 1 }, heroMetric: { alignItems: 'flex-end', marginLeft: 8 }, metricValue: { color: '#FFFFFF', fontSize: 21, fontWeight: '900' }, metricLabel: { color: '#AEB8CD', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 2 }, progressTrack: { height: 5, backgroundColor: '#34405B', borderRadius: 4, marginTop: 16, overflow: 'hidden' }, progressFill: { width: '78%', height: '100%', backgroundColor: '#F3B33D' },
  sectionTitle: { color: '#65718A', fontSize: 10, fontWeight: '900', letterSpacing: 1.6, marginTop: 22, marginBottom: 9 }, card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE2EF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4 }, cardTitle: { color: '#0D1733', fontSize: 13, fontWeight: '900', letterSpacing: 1 }, cardBody: { color: '#65718A', fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 12 },
  actionRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EDF0F5' }, lastRow: { borderBottomWidth: 0 }, statusDot: { width: 9, height: 9, borderRadius: 5, marginRight: 11 }, statusGood: { backgroundColor: '#2F7D5A' }, statusWarn: { backgroundColor: '#D89224' }, actionLabel: { flex: 1, color: '#18233D', fontSize: 13, fontWeight: '700' }, actionState: { fontSize: 9, fontWeight: '900', letterSpacing: 1 }, goodText: { color: '#2F7D5A' }, warnText: { color: '#B66C08' },
  workerRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center' }, avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DCE2EF', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#0D1733', fontSize: 16, fontWeight: '900' }, workerInfo: { flex: 1, marginLeft: 12 }, workerName: { color: '#0D1733', fontSize: 13, fontWeight: '900', letterSpacing: .5 }, workerMeta: { color: '#65718A', fontSize: 11, marginTop: 3 }, workerStatus: { color: '#2F7D5A', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 5 }, chevron: { color: '#7D879B', fontSize: 25 },
  grid: { flexDirection: 'row', gap: 9 }, metricCard: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE2EF', borderRadius: 15, padding: 14 }, metricCardValue: { color: '#0D1733', fontSize: 23, fontWeight: '900' }, metricCardLabel: { color: '#65718A', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  conditionRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EDF0F5' }, conditionRow:last-child: {}, conditionTitle: { color: '#65718A', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 }, conditionValue: { color: '#18233D', fontSize: 12, fontWeight: '700' }, secondaryButton: { marginTop: 16, borderWidth: 1, borderColor: '#BFC8D8', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }, secondaryButtonText: { color: '#0D1733', fontSize: 10, fontWeight: '900', letterSpacing: 1 }, detailLine: { color: '#34405B', fontSize: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#EDF0F5' },
  nav: { minHeight: 66, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#DCE2EF', flexDirection: 'row', paddingBottom: 6 }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' }, navLabel: { color: '#7A8499', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, navLabelActive: { color: '#0D1733' },
  searchBox: { marginTop: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE2EF', borderRadius: 14, padding: 14 }, searchText: { color: '#8A94A8', fontSize: 12 }, filterRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }, filter: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#E7EBF2' }, filterText: { color: '#34405B', fontSize: 8, fontWeight: '900', letterSpacing: .8 },
  back: { color: '#0D1733', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 12 }, profileBanner: { height: 92, backgroundColor: '#0D1733', borderRadius: 18 }, profileHeader: { alignItems: 'center', marginTop: -36 }, profileAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E7EBF2', borderWidth: 4, borderColor: '#F5F6FA', alignItems: 'center', justifyContent: 'center' }, profileAvatarText: { color: '#0D1733', fontSize: 24, fontWeight: '900' }, profileName: { color: '#0D1733', fontSize: 22, fontWeight: '900', marginTop: 8 }, profileRole: { color: '#65718A', fontSize: 11, marginTop: 3 }, profileActions: { flexDirection: 'row', gap: 8, marginTop: 16 }, actionButton: { flex: 1, borderWidth: 1, borderColor: '#CBD3E3', borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: '#FFFFFF' }, actionButtonText: { color: '#0D1733', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, detailPair: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EDF0F5' },
  map: { marginTop: 20, height: 390, borderRadius: 20, backgroundColor: '#E5E9E4', borderWidth: 1, borderColor: '#CDD4CB', overflow: 'hidden', position: 'relative' }, mapZone: { position: 'absolute', borderWidth: 2, borderColor: '#879782', backgroundColor: '#F0F2EA', padding: 10, borderRadius: 8 }, zoneA: { left: 22, top: 28, width: 210, height: 150 }, zoneB: { right: 18, top: 62, width: 150, height: 190 }, zoneSub: { left: 80, bottom: 30, width: 170, height: 70 }, mapLabel: { color: '#475645', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, mapProgress: { color: '#0D1733', fontSize: 28, fontWeight: '900', marginTop: 24 }, locationDot: { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: '#0D1733', borderWidth: 3, borderColor: '#FFFFFF', left: 160, top: 205 },
});
