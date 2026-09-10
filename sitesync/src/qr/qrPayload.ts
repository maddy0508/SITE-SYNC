export const QR_PREFIX = 'SITE-SYNC';
export const QR_VERSION = 1;

export type WorkerQrPayload = {
  version: 1;
  organisationId: string;
  companyId: string;
  personId: string;
  membershipId: string;
  projectId?: string;
};

export type QrParseErrorCode =
  | 'EMPTY'
  | 'INVALID_PREFIX'
  | 'MALFORMED'
  | 'UNSUPPORTED_VERSION'
  | 'MISSING_FIELD'
  | 'INVALID_VALUE'
  | 'DUPLICATE_FIELD';

export class QrParseError extends Error {
  readonly code: QrParseErrorCode;

  constructor(code: QrParseErrorCode, message: string) {
    super(message);
    this.name = 'QrParseError';
    this.code = code;
  }
}

const FIELD_ORDER = ['org', 'company', 'person', 'membership', 'project'] as const;
const REQUIRED_FIELDS = ['org', 'company', 'person', 'membership'] as const;
type FieldName = (typeof FIELD_ORDER)[number];

function assertSafeValue(field: string, value: string): void {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new QrParseError('INVALID_VALUE', `Invalid ${field} value`);
  }
}

/**
 * Canonical v1 encoding. The payload is only a set of untrusted lookup hints.
 * It never carries or grants authorization.
 *
 * SITE-SYNC:1|org=...|company=...|person=...|membership=...|project=...
 */
export function encodeWorkerQrPayload(payload: WorkerQrPayload): string {
  const fields: Array<[FieldName, string | undefined]> = [
    ['org', payload.organisationId],
    ['company', payload.companyId],
    ['person', payload.personId],
    ['membership', payload.membershipId],
    ['project', payload.projectId],
  ];

  const encoded = fields
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      assertSafeValue(key, value!);
      return `${key}=${value}`;
    });

  return `${QR_PREFIX}:${payload.version}|${encoded.join('|')}`;
}

export function parseWorkerQrPayload(raw: string): WorkerQrPayload {
  if (!raw || raw.trim().length === 0) {
    throw new QrParseError('EMPTY', 'QR payload is empty');
  }

  const parts = raw.trim().split('|');
  const header = parts.shift();
  const match = header?.match(/^SITE-SYNC:(\d+)$/);
  if (!match) {
    throw new QrParseError('INVALID_PREFIX', 'QR payload has an invalid header');
  }

  const version = Number(match[1]);
  if (version !== QR_VERSION) {
    throw new QrParseError('UNSUPPORTED_VERSION', `Unsupported QR version ${version}`);
  }

  const values: Partial<Record<FieldName, string>> = {};
  for (const part of parts) {
    const separator = part.indexOf('=');
    if (separator <= 0 || separator === part.length - 1) {
      throw new QrParseError('MALFORMED', 'QR payload contains a malformed field');
    }

    const key = part.slice(0, separator) as FieldName;
    const value = part.slice(separator + 1);
    if (!FIELD_ORDER.includes(key)) {
      throw new QrParseError('MALFORMED', `Unknown QR field ${key}`);
    }
    if (values[key] !== undefined) {
      throw new QrParseError('DUPLICATE_FIELD', `Duplicate QR field ${key}`);
    }
    assertSafeValue(key, value);
    values[key] = value;
  }

  for (const key of REQUIRED_FIELDS) {
    if (!values[key]) {
      throw new QrParseError('MISSING_FIELD', `Missing required QR field ${key}`);
    }
  }

  return {
    version: 1,
    organisationId: values.org!,
    companyId: values.company!,
    personId: values.person!,
    membershipId: values.membership!,
    ...(values.project ? { projectId: values.project } : {}),
  };
}
