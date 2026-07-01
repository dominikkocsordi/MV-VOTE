export interface VoteSession {
  id: string;
  title: string;
  options: string[];
  status: 'open' | 'closed';
  groupIds: string[]; // empty = open for everyone
  allowDelegation: boolean;
  createdAt: string;
}

export interface SpeakerRequest {
  id: string;
  firstName: string;
  lastName: string;
  department: string | null;
  role: string | null;
  type: 'normal' | 'go';
  status: 'queued' | 'speaking' | 'done';
  completed?: boolean;
  createdAt: string;
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
