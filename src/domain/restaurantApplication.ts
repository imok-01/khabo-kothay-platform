import type { ApplicationStatus } from '../integrations/supabase/database.types';
import { statusPill } from '../lib/statusPill';

export type { ApplicationStatus };

export const APPLICATION_STATUSES: ApplicationStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CONTACTED'];

export function applicationStatusLabel(status: ApplicationStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Pending review';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    case 'CONTACTED':
      return 'Contacted';
  }
}

/**
 * The console's state-mark class for an application.
 *
 * Was `admin-status--*` — the retired 999px pill, and it mapped CONTACTED to
 * `--published`, i.e. an application someone had merely phoned looked settled.
 * Now it goes through the one state mark the console uses, and CONTACTED is
 * `info`: something happened, and it was neither a yes nor a no.
 */
export function applicationStatusClass(status: ApplicationStatus): string {
  switch (status) {
    case 'PENDING':
      return statusPill('pending');
    case 'APPROVED':
      return statusPill('approved');
    case 'REJECTED':
      return statusPill('rejected');
    case 'CONTACTED':
      return statusPill('contacted');
  }
}
