import { StudentApplicant, Consultant, AllocationLog } from '../types';
import { INITIAL_CONSULTANTS, generateInitialApplicants } from '../data/initialData';

const APPLICANTS_STORAGE_KEY = 'sn_admissions_applicants_v5_450_full';
const CONSULTANTS_STORAGE_KEY = 'sn_admissions_consultants_v6_30list';
const LOGS_STORAGE_KEY = 'sn_admissions_logs_v5';

export function loadApplicants(): StudentApplicant[] {
  try {
    const raw = localStorage.getItem(APPLICANTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 450) {
        const hasTopics = parsed.some((p: StudentApplicant) => Boolean(p.consultationTopic));
        if (!hasTopics) {
          const fresh = generateInitialApplicants();
          const merged = parsed.map((p: StudentApplicant, idx: number) => ({
            ...p,
            consultationTopic: p.consultationTopic || fresh[idx]?.consultationTopic
          }));
          saveApplicants(merged);
          return merged;
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load applicants from localStorage', e);
  }
  const initial = generateInitialApplicants();
  saveApplicants(initial);
  return initial;
}

export function saveApplicants(applicants: StudentApplicant[]): void {
  try {
    localStorage.setItem(APPLICANTS_STORAGE_KEY, JSON.stringify(applicants));
  } catch (e) {
    console.error('Failed to save applicants to localStorage', e);
  }
}

export function loadConsultants(): Consultant[] {
  try {
    const raw = localStorage.getItem(CONSULTANTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 30) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load consultants from localStorage', e);
  }
  saveConsultants(INITIAL_CONSULTANTS);
  return INITIAL_CONSULTANTS;
}

export function resetConsultantsOnly(): Consultant[] {
  saveConsultants(INITIAL_CONSULTANTS);
  return INITIAL_CONSULTANTS;
}

export function saveConsultants(consultants: Consultant[]): void {
  try {
    localStorage.setItem(CONSULTANTS_STORAGE_KEY, JSON.stringify(consultants));
  } catch (e) {
    console.error('Failed to save consultants to localStorage', e);
  }
}

export function loadLogs(): AllocationLog[] {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load logs', e);
  }
  return [];
}

export function saveLogs(logs: AllocationLog[]): void {
  try {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save logs', e);
  }
}

export function resetAllData(): { applicants: StudentApplicant[]; consultants: Consultant[]; logs: AllocationLog[] } {
  localStorage.removeItem(APPLICANTS_STORAGE_KEY);
  localStorage.removeItem(CONSULTANTS_STORAGE_KEY);
  localStorage.removeItem(LOGS_STORAGE_KEY);

  const applicants = generateInitialApplicants();
  saveApplicants(applicants);
  saveConsultants(INITIAL_CONSULTANTS);

  return {
    applicants,
    consultants: INITIAL_CONSULTANTS,
    logs: []
  };
}
