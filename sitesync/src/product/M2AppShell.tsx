import React from 'react';
import { M2LiveAppShell } from './M2LiveAppShell';
import type { M2OperationalSnapshot } from './m2OperationalSnapshot';

export type M2Tab = 'TODAY' | 'MAP' | 'PEOPLE' | 'MORE';

/** Compatibility wrapper retained for isolated M2 component tests. Production entry uses M2LiveAppShell. */
export function M2AppShell({ snapshot }: { snapshot: M2OperationalSnapshot }) {
  return <M2LiveAppShell snapshot={snapshot} />;
}
