import type { ProjectContextRecord } from '../domain/localPersistence';
import { parseWorkerQrPayload, QrParseError } from './qrPayload';
import { QrValidationService, type QrValidationResult } from './qrValidation';

export type QrScanPipelineResult =
  | {
      kind: 'VALIDATION';
      result: QrValidationResult;
    }
  | {
      kind: 'PARSE_ERROR';
      code: string;
      message: string;
    };

/**
 * Converts an untrusted native QR string into a parser result and, only after
 * successful parsing, invokes trusted local validation.
 */
export class QrScanPipeline {
  constructor(private readonly validationService: QrValidationService) {}

  async process(
    raw: string,
    context: ProjectContextRecord,
    options: { online: boolean },
  ): Promise<QrScanPipelineResult> {
    try {
      const payload = parseWorkerQrPayload(raw);
      const result = await this.validationService.validate(payload, context, options);
      return { kind: 'VALIDATION', result };
    } catch (error) {
      if (error instanceof QrParseError) {
        return {
          kind: 'PARSE_ERROR',
          code: error.code,
          message: error.message,
        };
      }
      throw error;
    }
  }
}
