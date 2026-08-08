export interface VoteSession {
  id: string;
  title: string;
  options: string[];
  status: 'open' | 'closed';
  groupIds: string[]; // empty = open for everyone
  allowDelegation: boolean;
  createdAt: string;
}

export type SpeakerStatus = 'queued' | 'speaking' | 'done';

export const SPEAKER_STATUSES: SpeakerStatus[] = ['queued', 'speaking', 'done'];

export const SPEAKER_STATUS_LABELS: Record<SpeakerStatus, string> = {
  queued: 'Wartend',
  speaking: 'Spricht',
  done: 'Beendet',
};

export interface SpeakerRequest {
  id: string;
  firstName: string;
  lastName: string;
  department: string | null;
  role: string | null;
  type: 'normal' | 'go';
  status: SpeakerStatus;
  createdAt: string;
  // Werden vom Trigger 'speaker_requests_track_times' in der Datenbank gesetzt.
  startedAt?: string | null;
  endedAt?: string | null;
}

export interface VoterGroup {
  id: string;
  name: string;
  createdAt: string;
}

export interface VoterCode {
  code: string;
  groupId: string;
}

export interface Vote {
  id: string;
  sessionId: string;
  optionIndex: number;
  voterCode: string | null;
  voterToken: string;
  weight: number;
  delegationNames: string[] | null;
  createdAt: string;
}
