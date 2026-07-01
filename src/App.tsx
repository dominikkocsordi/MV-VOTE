import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VoteSession, SpeakerRequest, VoterGroup, VoterCode, Vote } from './types';
import { VotingSection } from './components/VotingSection';
import { SpeakerSection } from './components/SpeakerSection';
import { AdminSection } from './components/AdminSection';
import { HelpCircle, Vote as VoteIcon, MessageSquare, Settings2, Sparkles } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabase';

// Helper to generate local fallback codes
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 5; i++) {
    c += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return c;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'vote' | 'speakers' | 'admin'>('vote');

  // Core Data States
  const [sessions, setSessions] = useState<VoteSession[]>([]);
  const [speakerRequests, setSpeakerRequests] = useState<SpeakerRequest[]>([]);
  const [voterGroups, setVoterGroups] = useState<VoterGroup[]>([]);
  const [voterCodes, setVoterCodes] = useState<VoterCode[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [votedSessionIds, setVotedSessionIds] = useState<string[]>([]);

  // Hidden admin unlock state
  const [badgeClickCount, setBadgeClickCount] = useState(0);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Trigger auto-dismissing notification
  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // --- Supabase Data Syncing ---

  // 1. Fetch Active Sessions
  const fetchActiveSession = async () => {
    if (!supabase) return;
    try {
      // Try 'sessions' table, fallback to 'vote_sessions'
      let { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('status', 'open');

      if (error || !data) {
        const res = await supabase
          .from('vote_sessions')
          .select('*')
          .eq('status', 'open');
        data = res.data;
        error = res.error;
      }

      if (data && data.length > 0) {
        const active = data[0];
        const formattedSession: VoteSession = {
          id: active.id.toString(),
          title: active.title,
          options: Array.isArray(active.options) ? active.options : JSON.parse(active.options || '[]'),
          status: active.status as 'open' | 'closed',
          groupIds: Array.isArray(active.group_ids || active.groupIds) 
            ? (active.group_ids || active.groupIds) 
            : JSON.parse(active.group_ids || active.groupIds || '[]'),
          allowDelegation: active.allow_delegation ?? active.allowDelegation ?? true,
          createdAt: active.created_at || active.createdAt || new Date().toISOString()
        };
        setSessions([formattedSession]);
      } else {
        // No active session found
        setSessions([]);
      }
    } catch (err) {
      console.error("Error fetching sessions from Supabase:", err);
    }
  };

  // 2. Fetch Voter Codes
  const fetchVoterCodes = async () => {
    if (!supabase) return;
    try {
      let { data, error } = await supabase.from('voter_codes').select('*');
      if (error || !data) {
        const res = await supabase.from('codes').select('*');
        data = res.data;
        error = res.error;
      }
      if (data) {
        const formattedCodes: VoterCode[] = data.map((item: any) => ({
          code: item.code,
          groupId: item.group_id || item.groupId || 'default-group'
        }));
        setVoterCodes(formattedCodes);
      }
    } catch (err) {
      console.error("Error fetching voter codes from Supabase:", err);
    }
  };

  // 3. Fetch Speaker Requests (Live Redeliste)
  const fetchSpeakerRequests = async () => {
    if (!supabase) return;
    try {
      let { data, error } = await supabase
        .from('speaker_requests')
        .select('*')
        .order('created_at', { ascending: true });

      if (error || !data) {
        const res = await supabase
          .from('speakers')
          .select('*')
          .order('created_at', { ascending: true });
        data = res.data;
        error = res.error;
      }

      if (data) {
        // Filter out done speakers from the general user view, or let them see all
        const formatted: SpeakerRequest[] = data.map((item: any) => ({
          id: item.id.toString(),
          firstName: item.first_name || item.firstName,
          lastName: item.last_name || item.lastName,
          department: item.department || '',
          role: item.role || '',
          type: (item.type || 'normal') as 'normal' | 'go',
          status: (item.status || 'queued') as 'queued' | 'speaking' | 'done',
          createdAt: item.created_at || item.createdAt || new Date().toISOString()
        }));
        setSpeakerRequests(formatted);
      }
    } catch (err) {
      console.error("Error fetching speaker requests from Supabase:", err);
    }
  };

  // 4. Submit Vote to Supabase
  const submitVoteToSupabase = async (vote: Vote) => {
    if (!supabase) return false;
    try {
      const payload = {
        id: vote.id,
        session_id: vote.sessionId,
        option_index: vote.optionIndex,
        voter_code: vote.voterCode,
        voter_token: vote.voterToken,
        weight: vote.weight,
        delegation_names: vote.delegationNames,
        created_at: vote.createdAt
      };

      let { error } = await supabase.from('votes').insert([payload]);
      if (error) {
        const payloadAlt = {
          id: vote.id,
          sessionId: vote.sessionId,
          optionIndex: vote.optionIndex,
          voterCode: vote.voterCode,
          voterToken: vote.voterToken,
          weight: vote.weight,
          delegationNames: vote.delegationNames,
          createdAt: vote.createdAt
        };
        const res = await supabase.from('voted').insert([payloadAlt]);
        error = res.error;
      }
      return !error;
    } catch (err) {
      console.error("Error submitting vote to Supabase:", err);
      return false;
    }
  };

  // 5. Submit Speaker Request to Supabase
  const submitSpeakerToSupabase = async (speaker: SpeakerRequest) => {
    if (!supabase) return false;
    try {
      const payload = {
        id: speaker.id,
        first_name: speaker.firstName,
        last_name: speaker.lastName,
        department: speaker.department,
        role: speaker.role,
        type: speaker.type,
        status: speaker.status,
        created_at: speaker.createdAt
      };

      let { error } = await supabase.from('speaker_requests').insert([payload]);
      if (error) {
        const payloadAlt = {
          id: speaker.id,
          firstName: speaker.firstName,
          lastName: speaker.lastName,
          department: speaker.department,
          role: speaker.role,
          type: speaker.type,
          status: speaker.status,
          createdAt: speaker.createdAt
        };
        const res = await supabase.from('speakers').insert([payloadAlt]);
        error = res.error;
      }
      return !error;
    } catch (err) {
      console.error("Error submitting speaker request to Supabase:", err);
      return false;
    }
  };

  // --- Admin Supabase Sync Helper Functions ---

  const submitSessionToSupabase = async (session: VoteSession) => {
    if (!supabase) return false;
    try {
      const payload = {
        id: session.id,
        title: session.title,
        options: JSON.stringify(session.options),
        status: session.status,
        group_ids: JSON.stringify(session.groupIds),
        allow_delegation: session.allowDelegation,
        created_at: session.createdAt
      };
      
      let { error } = await supabase.from('sessions').insert([payload]);
      if (error) {
        const payloadAlt = {
          id: session.id,
          title: session.title,
          options: JSON.stringify(session.options),
          status: session.status,
          groupIds: JSON.stringify(session.groupIds),
          allowDelegation: session.allowDelegation,
          createdAt: session.createdAt
        };
        const res = await supabase.from('vote_sessions').insert([payloadAlt]);
        error = res.error;
      }
      return !error;
    } catch (err) {
      console.error("Error submitting session to Supabase:", err);
      return false;
    }
  };

  const closeSessionInSupabase = async (id: string) => {
    if (!supabase) return false;
    try {
      let { error } = await supabase.from('sessions').update({ status: 'closed' }).eq('id', id);
      if (error) {
        const res = await supabase.from('vote_sessions').update({ status: 'closed' }).eq('id', id);
        error = res.error;
      }
      return !error;
    } catch (err) {
      console.error("Error closing session in Supabase:", err);
      return false;
    }
  };

  const deleteSessionInSupabase = async (id: string) => {
    if (!supabase) return false;
    try {
      let { error } = await supabase.from('sessions').delete().eq('id', id);
      if (error) {
        const res = await supabase.from('vote_sessions').delete().eq('id', id);
        error = res.error;
      }
      return !error;
    } catch (err) {
      console.error("Error deleting session in Supabase:", err);
      return false;
    }
  };

  const updateSpeakerStatusInSupabase = async (id: string, status: 'queued' | 'speaking' | 'done') => {
    if (!supabase) return false;
    try {
      let { error } = await supabase.from('speaker_requests').update({ status }).eq('id', id);
      if (error) {
        const res = await supabase.from('speakers').update({ status }).eq('id', id);
        error = res.error;
      }
      return !error;
    } catch (err) {
      console.error("Error updating speaker status in Supabase:", err);
      return false;
    }
  };

  const deleteSpeakerInSupabase = async (id: string) => {
    if (!supabase) return false;
    try {
      let { error } = await supabase.from('speaker_requests').delete().eq('id', id);
      if (error) {
        const res = await supabase.from('speakers').delete().eq('id', id);
        error = res.error;
      }
      return !error;
    } catch (err) {
      console.error("Error deleting speaker in Supabase:", err);
      return false;
    }
  };

  const clearSpeakersInSupabase = async () => {
    if (!supabase) return false;
    try {
      let { error } = await supabase.from('speaker_requests').delete().neq('id', '0');
      if (error) {
        const res = await supabase.from('speakers').delete().neq('id', '0');
        error = res.error;
      }
      return !error;
    } catch (err) {
      console.error("Error clearing speakers in Supabase:", err);
      return false;
    }
  };

  const submitVoterGroupToSupabase = async (group: VoterGroup, codes: VoterCode[]) => {
    if (!supabase) return false;
    try {
      const groupPayload = {
        id: group.id,
        name: group.name,
        created_at: group.createdAt
      };
      let { error: groupError } = await supabase.from('voter_groups').insert([groupPayload]);
      if (groupError) {
        const groupPayloadAlt = {
          id: group.id,
          name: group.name,
          createdAt: group.createdAt
        };
        await supabase.from('groups').insert([groupPayloadAlt]);
      }

      const codePayloads = codes.map(c => ({
        code: c.code,
        group_id: c.groupId
      }));
      let { error: codesError } = await supabase.from('voter_codes').insert(codePayloads);
      if (codesError) {
        const codePayloadsAlt = codes.map(c => ({
          code: c.code,
          groupId: c.groupId
        }));
        await supabase.from('codes').insert(codePayloadsAlt);
      }
      return true;
    } catch (err) {
      console.error("Error submitting groups/codes to Supabase:", err);
      return false;
    }
  };

  const fetchVotes = async () => {
    if (!supabase) return;
    try {
      let { data, error } = await supabase.from('votes').select('*');
      if (error || !data) {
        const res = await supabase.from('voted').select('*');
        data = res.data;
        error = res.error;
      }
      if (data) {
        const formatted: Vote[] = data.map((item: any) => ({
          id: item.id.toString(),
          sessionId: item.session_id || item.sessionId,
          optionIndex: item.option_index ?? item.optionIndex,
          voterCode: item.voter_code || item.voterCode || '',
          voterToken: item.voter_token || item.voterToken || '',
          weight: item.weight ?? 1,
          delegationNames: Array.isArray(item.delegation_names || item.delegationNames)
            ? (item.delegation_names || item.delegationNames)
            : JSON.parse(item.delegation_names || item.delegationNames || 'null'),
          createdAt: item.created_at || item.createdAt || new Date().toISOString()
        }));
        setVotes(formatted);
      }
    } catch (err) {
      console.error("Error fetching votes from Supabase:", err);
    }
  };

  // Load and Subscribe on Mount
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      fetchActiveSession();
      fetchVoterCodes();
      fetchSpeakerRequests();
      fetchVotes();

      // Subscribe to real-time changes
      const sessionsChannel = supabase
        .channel('realtime:sessions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
          fetchActiveSession();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vote_sessions' }, () => {
          fetchActiveSession();
        })
        .subscribe();

      const speakersChannel = supabase
        .channel('realtime:speakers')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'speaker_requests' }, () => {
          fetchSpeakerRequests();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'speakers' }, () => {
          fetchSpeakerRequests();
        })
        .subscribe();

      const votesChannel = supabase
        .channel('realtime:votes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => {
          fetchVotes();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'voted' }, () => {
          fetchVotes();
        })
        .subscribe();

      const codesChannel = supabase
        .channel('realtime:codes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'voter_codes' }, () => {
          fetchVoterCodes();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'codes' }, () => {
          fetchVoterCodes();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(sessionsChannel);
        supabase.removeChannel(speakersChannel);
        supabase.removeChannel(votesChannel);
        supabase.removeChannel(codesChannel);
      };
    } else {
      // Local fallback initial mock data if Supabase is not configured
      const savedSessions = localStorage.getItem('fsbs_sessions');
      if (savedSessions) {
        setSessions(JSON.parse(savedSessions));
      } else {
        const defaultSessions: VoteSession[] = [
          {
            id: 'session-1',
            title: 'Satzungsänderung § 4 (Ressortstruktur)',
            options: ['Ja (Zustimmung)', 'Nein (Ablehnung)', 'Enthaltung'],
            status: 'closed',
            groupIds: [],
            allowDelegation: false,
            createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
          {
            id: 'session-2',
            title: 'Wahl des Kassenwarts (VV 2026)',
            options: ['Lukas Lindner (Ressort Sponsoring)', 'Sina Schmitt (Ressort Events)', 'Enthaltung'],
            status: 'open',
            groupIds: ['group-1'],
            allowDelegation: true,
            createdAt: new Date().toISOString(),
          }
        ];
        setSessions(defaultSessions);
        localStorage.setItem('fsbs_sessions', JSON.stringify(defaultSessions));
      }

      const savedSpeakers = localStorage.getItem('fsbs_speakers');
      if (savedSpeakers) {
        setSpeakerRequests(JSON.parse(savedSpeakers));
      } else {
        const defaultSpeakers: SpeakerRequest[] = [
          {
            id: 'speak-1',
            firstName: 'Marie',
            lastName: 'Weber',
            department: 'Kommunikation',
            role: 'Vorstand',
            type: 'normal',
            status: 'speaking',
            createdAt: new Date(Date.now() - 1200000).toISOString(),
          },
          {
            id: 'speak-2',
            firstName: 'Christian',
            lastName: 'Müller',
            department: 'Merchandise',
            role: 'Ressortleiter',
            type: 'go',
            status: 'queued',
            createdAt: new Date(Date.now() - 600000).toISOString(),
          },
          {
            id: 'speak-3',
            firstName: 'Lena',
            lastName: 'Meyer',
            department: 'Interne Events',
            role: 'Ombudsperson',
            type: 'normal',
            status: 'queued',
            createdAt: new Date(Date.now() - 300000).toISOString(),
          }
        ];
        setSpeakerRequests(defaultSpeakers);
        localStorage.setItem('fsbs_speakers', JSON.stringify(defaultSpeakers));
      }

      const savedGroups = localStorage.getItem('fsbs_groups');
      const savedCodes = localStorage.getItem('fsbs_codes');
      if (savedGroups && savedCodes) {
        setVoterGroups(JSON.parse(savedGroups));
        setVoterCodes(JSON.parse(savedCodes));
      } else {
        const defaultGroups: VoterGroup[] = [
          { id: 'group-1', name: 'VV 2026 (Mitglieder)', createdAt: new Date().toISOString() },
          { id: 'group-2', name: 'Vorstand & Beirat', createdAt: new Date().toISOString() }
        ];

        const defaultCodes: VoterCode[] = [];
        for (let i = 0; i < 15; i++) {
          defaultCodes.push({ code: i === 0 ? 'FSB25' : generateCode(), groupId: 'group-1' });
        }
        for (let i = 0; i < 5; i++) {
          defaultCodes.push({ code: generateCode(), groupId: 'group-2' });
        }

        setVoterGroups(defaultGroups);
        setVoterCodes(defaultCodes);
        localStorage.setItem('fsbs_groups', JSON.stringify(defaultGroups));
        localStorage.setItem('fsbs_codes', JSON.stringify(defaultCodes));
      }

      const savedVotes = localStorage.getItem('fsbs_votes');
      if (savedVotes) {
        setVotes(JSON.parse(savedVotes));
      } else {
        const mockVotes: Vote[] = [
          { id: 'v-1', sessionId: 'session-1', optionIndex: 0, voterCode: 'XYZ12', voterToken: 't1', weight: 1, delegationNames: null, createdAt: new Date().toISOString() },
          { id: 'v-2', sessionId: 'session-1', optionIndex: 0, voterCode: 'ABC44', voterToken: 't2', weight: 1, delegationNames: null, createdAt: new Date().toISOString() },
          { id: 'v-3', sessionId: 'session-1', optionIndex: 1, voterCode: 'QWE33', voterToken: 't3', weight: 1, delegationNames: null, createdAt: new Date().toISOString() },
          { id: 'v-4', sessionId: 'session-1', optionIndex: 2, voterCode: 'LKN22', voterToken: 't4', weight: 1, delegationNames: null, createdAt: new Date().toISOString() },
        ];
        setVotes(mockVotes);
        localStorage.setItem('fsbs_votes', JSON.stringify(mockVotes));
      }

      const savedVotedIds = localStorage.getItem('fsbs_voted_session_ids');
      if (savedVotedIds) {
        setVotedSessionIds(JSON.parse(savedVotedIds));
      }
    }
  }, []);

  // Save changes utility for local state & storage (acts as fallback or local admin tool)
  const saveSessionsToStorage = (updated: VoteSession[]) => {
    setSessions(updated);
    localStorage.setItem('fsbs_sessions', JSON.stringify(updated));
  };

  const saveSpeakersToStorage = (updated: SpeakerRequest[]) => {
    setSpeakerRequests(updated);
    localStorage.setItem('fsbs_speakers', JSON.stringify(updated));
  };

  const saveGroupsAndCodesToStorage = (updatedGroups: VoterGroup[], updatedCodes: VoterCode[]) => {
    setVoterGroups(updatedGroups);
    setVoterCodes(updatedCodes);
    localStorage.setItem('fsbs_groups', JSON.stringify(updatedGroups));
    localStorage.setItem('fsbs_codes', JSON.stringify(updatedCodes));
  };

  const saveVotesToStorage = (updatedVotes: Vote[], updatedVotedIds: string[]) => {
    setVotes(updatedVotes);
    setVotedSessionIds(updatedVotedIds);
    localStorage.setItem('fsbs_votes', JSON.stringify(updatedVotes));
    localStorage.setItem('fsbs_voted_session_ids', JSON.stringify(updatedVotedIds));
  };

  // Badge click hidden unlock mechanic
  const handleBadgeClick = () => {
    setBadgeClickCount(prev => {
      const next = prev + 1;
      if (next >= 5) {
        setAdminUnlocked(true);
        triggerNotification('Entwickler-Sitzungseinstellungen freigeschaltet!');
        return 0;
      }
      return next;
    });
  };

  // --- Core Handlers ---

  const handleCreateSession = async (title: string, options: string[], groupIds: string[], allowDelegation: boolean) => {
    const closedPrevious = sessions.map(s => s.status === 'open' ? { ...s, status: 'closed' as const } : s);
    const newSession: VoteSession = {
      id: `session-${Date.now()}`,
      title,
      options,
      status: 'open',
      groupIds,
      allowDelegation,
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const openSessions = sessions.filter(s => s.status === 'open');
      for (const s of openSessions) {
        await closeSessionInSupabase(s.id);
      }
      await submitSessionToSupabase(newSession);
      fetchActiveSession();
    } else {
      saveSessionsToStorage([newSession, ...closedPrevious]);
    }
  };

  const handleCloseSession = async (id: string) => {
    if (isSupabaseConfigured && supabase) {
      await closeSessionInSupabase(id);
      fetchActiveSession();
    } else {
      const updated = sessions.map(s => s.id === id ? { ...s, status: 'closed' as const } : s);
      saveSessionsToStorage(updated);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (isSupabaseConfigured && supabase) {
      await deleteSessionInSupabase(id);
      fetchActiveSession();
    } else {
      const updated = sessions.filter(s => s.id !== id);
      saveSessionsToStorage(updated);
      const remainingVotes = votes.filter(v => v.sessionId !== id);
      const remainingVotedIds = votedSessionIds.filter(vId => vId !== id);
      saveVotesToStorage(remainingVotes, remainingVotedIds);
    }
  };

  const handleAddSpeakerRequest = async (
    firstName: string,
    lastName: string,
    department: string | null,
    role: string | null,
    type: 'normal' | 'go'
  ) => {
    const newRequest: SpeakerRequest = {
      id: `speak-${Date.now()}`,
      firstName,
      lastName,
      department,
      role,
      type,
      status: 'queued',
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const success = await submitSpeakerToSupabase(newRequest);
      if (!success) {
        console.warn("Failed to submit speaker to Supabase, saving locally");
      }
      fetchSpeakerRequests();
    } else {
      saveSpeakersToStorage([...speakerRequests, newRequest]);
    }
  };

  const handleUpdateSpeakerStatus = async (id: string, status: 'queued' | 'speaking' | 'done') => {
    if (isSupabaseConfigured && supabase) {
      if (status === 'speaking') {
        const speakingRequests = speakerRequests.filter(r => r.status === 'speaking');
        for (const r of speakingRequests) {
          await updateSpeakerStatusInSupabase(r.id, 'done');
        }
      }
      await updateSpeakerStatusInSupabase(id, status);
      fetchSpeakerRequests();
    } else {
      let updated = [...speakerRequests];
      if (status === 'speaking') {
        updated = updated.map(r => r.status === 'speaking' ? { ...r, status: 'done' as const } : r);
      }
      updated = updated.map(r => r.id === id ? { ...r, status } : r);
      saveSpeakersToStorage(updated);
    }
  };

  const handleDeleteSpeaker = async (id: string) => {
    if (isSupabaseConfigured && supabase) {
      await deleteSpeakerInSupabase(id);
      fetchSpeakerRequests();
    } else {
      const updated = speakerRequests.filter(r => r.id !== id);
      saveSpeakersToStorage(updated);
    }
  };

  const handleClearSpeakers = async () => {
    if (isSupabaseConfigured && supabase) {
      await clearSpeakersInSupabase();
      fetchSpeakerRequests();
    } else {
      saveSpeakersToStorage([]);
    }
  };

  const handleCreateGroup = async (name: string, count: number) => {
    const newGroup: VoterGroup = {
      id: `group-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
    };

    const newCodes: VoterCode[] = [];
    for (let i = 0; i < count; i++) {
      newCodes.push({
        code: generateCode(),
        groupId: newGroup.id,
      });
    }

    if (isSupabaseConfigured && supabase) {
      await submitVoterGroupToSupabase(newGroup, newCodes);
      fetchVoterCodes();
    } else {
      saveGroupsAndCodesToStorage([...voterGroups, newGroup], [...voterCodes, ...newCodes]);
    }
  };

  const handleVoteSubmitted = async (
    sessionId: string,
    optionIndex: number,
    code: string | null,
    weight: number,
    delegationNames: string[] | null
  ) => {
    const newVote: Vote = {
      id: `vote-${Date.now()}`,
      sessionId,
      optionIndex,
      voterCode: code,
      voterToken: `token-${Math.random().toString(36).substr(2, 9)}`,
      weight,
      delegationNames,
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const success = await submitVoteToSupabase(newVote);
      if (!success) {
        console.warn("Failed to submit vote to Supabase, saving locally");
      }
    }

    const updatedVotes = [...votes, newVote];
    const updatedVotedIds = [...votedSessionIds, sessionId];
    saveVotesToStorage(updatedVotes, updatedVotedIds);
  };

  const handleSelectVoterCode = (code: string) => {
    setActiveTab('vote');
    const newUrl = `${window.location.origin}${window.location.pathname}?code=${code}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  };

  const activeSession = sessions.find(s => s.status === 'open') || null;

  return (
    <div className="min-h-screen relative overflow-x-hidden flex flex-col justify-between pb-8 bg-slate-50 text-slate-900 selection:bg-indigo-100">
      {/* Texture noise background */}
      <div className="grainy-overlay" />

      {/* Bento Grid layout backdrop lights */}
      <div className="absolute top-[-200px] right-[-100px] w-[600px] h-[600px] rounded-full bg-indigo-600/5 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-100px] left-[-200px] w-[600px] h-[600px] rounded-full bg-amber-400/5 blur-[120px] pointer-events-none" />

      {/* Dynamic Notification Banner */}
      <AnimatePresence>
        {notification && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4 bg-indigo-950 border border-indigo-900 text-indigo-100 rounded-2xl text-xs font-bold flex items-center justify-between shadow-2xl"
            >
              <span className="flex items-center gap-2">
                <Sparkles size={14} className="text-amber-400" />
                {notification}
              </span>
              <button onClick={() => setNotification(null)} className="text-indigo-300 hover:text-white font-extrabold text-sm ml-4">
                ✕
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header & Logo Section */}
      <header className="w-full max-w-5xl mx-auto px-4 pt-6 sm:pt-10 pb-4 flex flex-col items-center">
        {/* Modern Logo Area with .png image instead of SVG & Heart */}
        <motion.div 
          className="mb-6 flex flex-col items-center cursor-pointer select-none"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          onClick={handleBadgeClick}
          title="FSBS MV Portal (Tippe 5x für Einstellungen)"
        >
          <div className="flex justify-center items-center py-4 mb-1">
            {logoError ? (
              <div className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 text-slate-400 max-w-sm transition-all hover:bg-slate-100/80">
                <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-slate-400">[ logo.png Platzhalter ]</span>
                <div className="text-3xl font-black text-slate-900 tracking-tighter mt-1">
                  FSBS <span className="text-indigo-600 font-light">Business School</span>
                </div>
              </div>
            ) : (
              <img 
                src="logo.png" 
                alt="FSBS Logo" 
                className="h-20 sm:h-24 w-auto object-contain" 
                onError={() => setLogoError(true)} 
              />
            )}
          </div>
        </motion.div>
      </header>

      {/* Main navigation tabs - Bento Pill layout */}
      <nav className="w-full max-w-md mx-auto px-4 mb-8">
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setActiveTab('vote')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
              activeTab === 'vote'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            id="tab_voting"
          >
            <VoteIcon size={14} />
            Wählen
          </button>
          
          <button
            onClick={() => setActiveTab('speakers')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
              activeTab === 'speakers'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            id="tab_speakers"
          >
            <MessageSquare size={14} />
            Redeliste
          </button>

          {adminUnlocked && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'admin'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              id="tab_admin"
            >
              <Settings2 size={14} />
              Sitzung
            </button>
          )}
        </div>
      </nav>

      {/* Main content display section with transition */}
      <main className="flex-grow px-4 w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'vote' && (
            <motion.div
              key="vote-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <VotingSection
                session={activeSession}
                voterCodes={voterCodes}
                onVoteSubmitted={handleVoteSubmitted}
                onNavigateToSpeakers={() => setActiveTab('speakers')}
                votedSessionIds={votedSessionIds}
              />
            </motion.div>
          )}

          {activeTab === 'speakers' && (
            <motion.div
              key="speakers-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <SpeakerSection
                speakerRequests={speakerRequests}
                onAddRequest={handleAddSpeakerRequest}
              />
            </motion.div>
          )}

          {activeTab === 'admin' && adminUnlocked && (
            <motion.div
              key="admin-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <AdminSection
                sessions={sessions}
                voterGroups={voterGroups}
                voterCodes={voterCodes}
                speakerRequests={speakerRequests}
                votes={votes}
                onCreateSession={handleCreateSession}
                onCloseSession={handleCloseSession}
                onDeleteSession={handleDeleteSession}
                onCreateGroup={handleCreateGroup}
                onUpdateSpeakerStatus={handleUpdateSpeakerStatus}
                onDeleteSpeaker={handleDeleteSpeaker}
                onClearSpeakers={handleClearSpeakers}
                onSelectVoterCode={handleSelectVoterCode}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Info */}
      <footer className="w-full max-w-5xl mx-auto px-4 mt-12 pt-6 border-t border-slate-200 text-center space-y-2">
        <p className="text-xs font-bold text-slate-500">
          Fachschaft Business School e.V.
        </p>
        <div className="flex items-center justify-center text-xs text-slate-400">
          <a 
            href="https://fsbs-hm.de/privacy-policy/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-indigo-600 font-semibold transition-colors underline"
          >
            Impressum &amp; Datenschutz
          </a>
        </div>
      </footer>
    </div>
  );
}
