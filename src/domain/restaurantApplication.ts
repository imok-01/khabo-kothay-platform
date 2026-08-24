import type { ApplicationStatus } from '../integrations/supabase/database.types';

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

/** Tailwind-ish status badge class used by the admin + applicant views. */
export function applicationStatusClass(status: ApplicationStatus): string {
  switch (status) {
    case 'PENDING':
      return 'admin-status--pending';
    case 'APPROVED':
      return 'admin-status--approved';
    case 'REJECTED':
      return 'admin-status--rejected';
    case 'CONTACTED':
      return 'admin-status--published';
  }
}
