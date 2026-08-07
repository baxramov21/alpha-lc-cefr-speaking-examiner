import { PasscodeEntry } from './types';

// ============================================================
// Mock passcode list for Phase 1 testing
// In Phase 3 this will be replaced by Supabase DB entries
// managed through the Admin Settings page.
// ============================================================

export const MOCK_PASSCODES: PasscodeEntry[] = [
  {
    id: 'pc-001',
    passcode: 'LC2024',
    groupName: 'Group A - Morning',
    teacherName: 'Ms. Sarah Johnson',
    isActive: true,
    createdAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'pc-002',
    passcode: 'ALPHA99',
    groupName: 'Group B - Afternoon',
    teacherName: 'Mr. James Karimov',
    isActive: true,
    createdAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'pc-003',
    passcode: 'CEFR2026',
    groupName: 'Group C - Evening',
    teacherName: 'Ms. Dilnoza Yusupova',
    isActive: true,
    createdAt: '2026-08-02T09:00:00Z',
  },
  {
    id: 'pc-004',
    passcode: 'SPEAK01',
    groupName: 'Group D - Weekend',
    teacherName: 'Mr. Timur Rakhimov',
    isActive: true,
    createdAt: '2026-08-03T10:00:00Z',
  },
  {
    id: 'pc-005',
    passcode: 'TEST2026',
    groupName: 'Demo Group',
    teacherName: 'Admin Demo',
    isActive: true,
    createdAt: '2026-08-04T10:00:00Z',
  },
];

/**
 * Verify a student passcode against the mock list.
 * Returns the matching entry or null if invalid/inactive.
 */
export function verifyPasscode(passcode: string): PasscodeEntry | null {
  const entry = MOCK_PASSCODES.find(
    (p) => p.passcode.toLowerCase() === passcode.trim().toLowerCase() && p.isActive
  );
  return entry ?? null;
}
