import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Power, Key, ListChecks, Users, Mic, Check, Trash, UserX, Sparkles, Trophy } from 'lucide-react';
import { VoteSession, VoterGroup, VoterCode, SpeakerRequest, Vote } from '../types';

interface AdminSectionProps {
  sessions: VoteSession[];
  voterGroups: VoterGroup[];
  voterCodes: VoterCode[];
  speakerRequests: SpeakerRequest[];
  votes: Vote[];
  onCreateSession: (title: string, options: string[], groupIds: string[], allowDelegation: boolean) => void;
  onCloseSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onCreateGroup: (name: string, count: number) => void;
  onUpdateSpeakerStatus: (id: string, status: 'queued' | 'speaking' | 'done') => void;
  onDeleteSpeaker: (id: string) => void;
  onClearSpeakers: () => void;
  onSelectVoterCode: (code: string) => void;
}

export const AdminSection: React.FC<AdminSectionProps> = ({
  sessions,
  voterGroups,
  voterCodes,
  speakerRequests,
  votes,
  onCreateSession,
  onCloseSession,
  onDeleteSession,
  onCreateGroup,
  onUpdateSpeakerStatus,
  onDeleteSpeaker,
  onClearSpeakers,
  onSelectVoterCode,
}) => {
  // Local admin tab
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'sessions' | 'codes' | 'speakers'>('sessions');

  // Success Notification state
  const [notification, setNotification] = useState<string | null>(null);

  // New session form
  const [newTitle, setNewTitle] = useState('');
  const [newOptionsText, setNewOptionsText] = useState('Ja\nNein\nEnthaltung');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [allowDelegation, setAllowDelegation] = useState(true);

  // New group form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCount, setNewGroupCount] = useState(15);
  const [viewGroupSelect, setViewGroupSelect] = useState('');

  // Show a custom auto-dimissing notification
  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Calculate results for a session
  const getSessionResults = (sessionId: string) => {
    const sessionVotes = votes.filter(v => v.sessionId === sessionId);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return { totalVotes: 0, results: [] };

    const totalVotes = sessionVotes.reduce((sum, v) => sum + v.weight, 0);
    
    const optionCounts = session.options.map((opt, idx) => {
      const optionWeight = sessionVotes
        .filter(v => v.optionIndex === idx)
        .reduce((sum, v) => sum + v.weight, 0);
      return {
        option: opt,
        votes: optionWeight,
        percentage: totalVotes > 0 ? Math.round((optionWeight / totalVotes) * 100) : 0,
      };
    });

    return {
      totalVotes,
      results: optionCounts,
    };
  };

  const handleCreateSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const opts = newOptionsText
      .split('\n')
      .map(o => o.trim())
      .filter(o => o.length > 0);

    if (!newTitle.trim() || opts.length < 2) {
      triggerNotification('Bitte gib einen Titel und mindestens 2 Optionen ein.');
      return;
    }

    onCreateSession(newTitle.trim(), opts, selectedGroupIds, allowDelegation);
    
    // reset form
    setNewTitle('');
    setNewOptionsText('Ja\nNein\nEnthaltung');
    setSelectedGroupIds([]);
    setAllowDelegation(true);
    triggerNotification('Sitzung erfolgreich erstellt!');
  };

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroupIds(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || newGroupCount < 1) {
      triggerNotification('Bitte fülle den Gruppennamen und eine gültige Anzahl aus.');
      return;
    }

    onCreateGroup(newGroupName.trim(), newGroupCount);
    const generatedName = newGroupName;
    setNewGroupName('');
    setNewGroupCount(15);
    triggerNotification(`Gruppe "${generatedName}" mit Codes erfolgreich erstellt!`);
  };

  const currentGroupCodes = voterCodes.filter(c => c.groupId === viewGroupSelect);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6" id="admin_section_root">
      
      {/* Dynamic Styled Notification banner instead of native alerts */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-indigo-900 border border-indigo-950 text-indigo-100 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg"
          >
            <span className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-400" />
              {notification}
            </span>
            <button onClick={() => setNotification(null)} className="text-indigo-300 hover:text-white font-extrabold text-sm ml-4">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top pill selector for admin sub-panels */}
      <div className="flex border-b border-slate-200 pb-1 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveAdminSubTab('sessions')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeAdminSubTab === 'sessions'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
          id="admin_tab_sessions"
        >
          <ListChecks size={14} />
          Wahlgänge verwalten
        </button>
        <button
          onClick={() => setActiveAdminSubTab('codes')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeAdminSubTab === 'codes'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
          id="admin_tab_codes"
        >
          <Key size={14} />
          Wählergruppen &amp; Codes
        </button>
        <button
          onClick={() => setActiveAdminSubTab('speakers')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeAdminSubTab === 'speakers'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
          id="admin_tab_speakers"
        >
          <Users size={14} />
          Redeleitung Live
        </button>
      </div>

      {/* SUB-PANEL 1: Vote sessions */}
      {activeAdminSubTab === 'sessions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Create new Session Form */}
          <div className="lg:col-span-5">
            <div className="premium-card p-6">
              <h3 className="font-sans font-black tracking-tighter text-2xl text-slate-900 mb-4">
                Neuer Wahlgang
              </h3>
              
              <form onSubmit={handleCreateSessionSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Titel der Abstimmung
                  </label>
                  <input
                    type="text"
                    placeholder="z.B. Entlastung des Vorstands"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white transition-all duration-200"
                    id="new_session_title"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Antwort-Optionen (Eine pro Zeile)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Ja&#10;Nein&#10;Enthaltung"
                    value={newOptionsText}
                    onChange={(e) => setNewOptionsText(e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none focus:border-indigo-600 focus:bg-white transition-all duration-200 resize-none"
                    id="new_session_options"
                  />
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Wählergruppen einschränken
                  </span>
                  
                  {voterGroups.length === 0 ? (
                    <p className="text-xs text-slate-400 font-semibold">
                      Keine Gruppen definiert. Die Wahl ist für jeden offen.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {voterGroups.map(g => {
                        const isChecked = selectedGroupIds.includes(g.id);
                        return (
                          <label key={g.id} className="flex items-center gap-2 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleGroupToggle(g.id)}
                              className="rounded border-slate-200 text-indigo-600 focus:ring-indigo-100"
                            />
                            <span className="text-slate-800 font-bold">{g.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Stimmübertragungen zulassen</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Mitglieder können Vollmachten erfassen</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowDelegation}
                      onChange={(e) => setAllowDelegation(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 mt-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 shadow-sm"
                  id="submit_create_session"
                >
                  <Plus size={14} />
                  Wahlgang freigeben
                </button>
              </form>
            </div>
          </div>

          {/* List of Sessions & live results */}
          <div className="lg:col-span-7 space-y-6">
            <h3 className="font-sans font-black tracking-tighter text-2xl text-slate-900 px-1">
              Aktuelle Wahlgänge
            </h3>

            {sessions.length === 0 ? (
              <div className="premium-card p-12 text-center border-dashed border-slate-200 bg-slate-50">
                <p className="text-slate-400 text-sm font-semibold">Keine Wahlgänge vorhanden.</p>
                <p className="text-slate-400 text-xs mt-1">Erstelle links deinen ersten Wahlgang.</p>
              </div>
            ) : (
              <div className="space-y-4" id="sessions_admin_list">
                {sessions.map(s => {
                  const isOpen = s.status === 'open';
                  const { totalVotes, results } = getSessionResults(s.id);

                  return (
                    <div key={s.id} className="premium-card p-6 space-y-4 relative overflow-hidden">
                      {/* Status indicator border */}
                      <div className={`absolute top-0 left-0 right-0 h-1.5 ${isOpen ? 'bg-indigo-600' : 'bg-slate-300'}`} />

                      <div className="flex items-start justify-between gap-4 pt-1">
                        <div>
                          <h4 className="font-bold text-lg text-slate-900 leading-tight">
                            {s.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase ${
                              isOpen ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {isOpen ? 'Aktiv' : 'Geschlossen'}
                            </span>
                            <span className="text-xs text-slate-400 font-bold">
                              • {totalVotes} {totalVotes === 1 ? 'Stimme' : 'Stimmen'} erfasst
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {isOpen && (
                            <button
                              onClick={() => {
                                onCloseSession(s.id);
                                triggerNotification('Sitzung geschlossen.');
                              }}
                              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-800 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1 bg-white"
                              id={`close_session_btn_${s.id}`}
                            >
                              <Power size={11} className="text-indigo-600" />
                              Schließen
                            </button>
                          )}
                          <button
                            onClick={() => {
                              onDeleteSession(s.id);
                              triggerNotification('Sitzung gelöscht.');
                            }}
                            className="p-1.5 rounded-xl border border-slate-200 hover:border-red-600 hover:text-red-600 text-slate-400 bg-white transition-colors"
                            id={`delete_session_btn_${s.id}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Display live results */}
                      <div className="space-y-2.5 pt-2 border-t border-slate-100">
                        {results.map((res, idx) => {
                          const isWinner = results.length > 1 && res.votes > 0 && res.votes === Math.max(...results.map(r => r.votes));
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs font-bold">
                                <span className="text-slate-800 flex items-center gap-1.5">
                                  {res.option}
                                  {isWinner && !isOpen && <Trophy size={11} className="text-indigo-600 inline animate-bounce" />}
                                </span>
                                <span className="text-slate-500 font-mono">
                                  {res.votes} Stimmen ({res.percentage}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${res.percentage}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                  className={`h-full rounded-full ${
                                    isWinner && !isOpen ? 'bg-indigo-600' : 'bg-slate-400'
                                  }`}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-PANEL 2: Voter Groups & Codes */}
      {activeAdminSubTab === 'codes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Create new Group Form */}
          <div className="lg:col-span-5">
            <div className="premium-card p-6">
              <h3 className="font-sans font-black tracking-tighter text-2xl text-slate-900 mb-4">
                Wählergruppe anlegen
              </h3>

              <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Name der Wählergruppe
                  </label>
                  <input
                    type="text"
                    placeholder="z.B. VV 2026, Vorstand..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white transition-all duration-200"
                    id="new_group_name"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Anzahl benötigter Codes (1-200)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={newGroupCount}
                    onChange={(e) => setNewGroupCount(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white transition-all duration-200"
                    id="new_group_count"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 mt-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 shadow-sm"
                  id="submit_create_group"
                >
                  <Sparkles size={13} />
                  Gruppe &amp; Codes generieren
                </button>
              </form>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="lg:col-span-7">
            <div className="premium-card p-6 space-y-4">
              <h3 className="font-sans font-black tracking-tighter text-2xl text-slate-900">
                Code-Verzeichnis
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed font-semibold">
                Wähle eine Wählergruppe aus, um deren automatisch generierten Codes anzuzeigen. 
                <strong className="text-slate-900 block mt-1">💡 Komfort-Feature für Präsentationen:</strong> 
                Klicke auf einen Code, um dich sofort als dieser Wähler anzumelden und abzustimmen!
              </p>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Wählergruppe auswählen
                </label>
                <select
                  value={viewGroupSelect}
                  onChange={(e) => setViewGroupSelect(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl cursor-pointer text-slate-800 font-bold"
                  id="admin_view_group_select"
                >
                  <option value="">-- Gruppe auswählen --</option>
                  {voterGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {viewGroupSelect && (
                <div className="space-y-3 pt-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                    <span>Generierte Codes:</span>
                    <span className="font-black text-indigo-600">{currentGroupCodes.length} Codes</span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-60 overflow-y-auto p-2 border border-slate-200 rounded-2xl bg-slate-50" id="codes_badge_grid">
                    {currentGroupCodes.map(c => (
                      <button
                        key={c.code}
                        onClick={() => {
                          onSelectVoterCode(c.code);
                          triggerNotification(`Zugangscode "${c.code}" hinterlegt!`);
                        }}
                        className="py-2 px-1.5 text-center font-mono font-bold text-sm bg-white border border-slate-200 rounded-xl hover:border-indigo-600 hover:bg-indigo-50/50 text-slate-900 shadow-sm transition-all"
                      >
                        {c.code}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-PANEL 3: Speaker Requests Live panel */}
      {activeAdminSubTab === 'speakers' && (
        <div className="premium-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-sans font-black tracking-tighter text-2xl text-slate-900">
                Sitzungs-Redeleitung Live
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Steuere die Wortmeldungen der Versammlung in Echtzeit. GO-Anträge müssen vorrangig behandelt werden.
              </p>
            </div>

            <button
              onClick={() => {
                if (confirm('Möchtest du die gesamte Redeliste wirklich leeren?')) {
                  onClearSpeakers();
                  triggerNotification('Redeliste geleert.');
                }
              }}
              className="py-2 px-4 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 font-bold text-xs tracking-wider uppercase transition-colors flex items-center gap-1.5"
              id="clear_speakers_list_btn"
            >
              <Trash2 size={13} />
              Liste leeren
            </button>
          </div>

          <div className="space-y-3" id="admin_speakers_live_list">
            {speakerRequests.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-3xl bg-slate-50">
                <p className="text-slate-500 text-sm font-semibold">Keine Wortmeldungen registriert.</p>
              </div>
            ) : (
              speakerRequests.map((req, idx) => {
                const isSpeaking = req.status === 'speaking';
                const isDone = req.status === 'done';
                const isGo = req.type === 'go';

                return (
                  <div
                    key={req.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                      isSpeaking
                        ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600 shadow-sm'
                        : isDone
                        ? 'border-slate-100 bg-slate-50/30 opacity-60'
                        : isGo
                        ? 'border-red-200 bg-red-50/40'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isSpeaking ? (
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center animate-pulse shadow-md shadow-indigo-150">
                          <Mic size={16} />
                        </div>
                      ) : isGo ? (
                        <div className="w-10 h-10 rounded-2xl bg-red-100 border border-red-200 text-red-700 flex items-center justify-center font-black text-xs">
                          GO
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center font-mono font-black text-sm">
                          {idx + 1}
                        </div>
                      )}

                      <div>
                        <h4 className={`font-bold text-sm sm:text-base flex items-center gap-2 flex-wrap ${
                          isDone ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}>
                          {req.firstName} {req.lastName}
                          {isSpeaking && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-600 text-white font-black uppercase tracking-widest animate-pulse">
                              Spricht
                            </span>
                          )}
                          {!isSpeaking && !isDone && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 font-bold uppercase tracking-wider">
                              Wartend
                            </span>
                          )}
                          {isGo && !isSpeaking && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-600 text-white font-black uppercase tracking-wider">
                              GO-Antrag
                            </span>
                          )}
                          {isDone && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 font-black uppercase tracking-wider">
                              Beendet
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-500 font-semibold mt-0.5">
                          {req.department || 'Kein Ressort'} • {req.role || 'Mitglied'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!isSpeaking && !isDone && (
                        <button
                          onClick={() => {
                            onUpdateSpeakerStatus(req.id, 'speaking');
                            triggerNotification(`${req.firstName} ist jetzt aktiv am Rednerpult.`);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1 shadow-sm shadow-indigo-100"
                          id={`start_speaking_btn_${req.id}`}
                        >
                          <Mic size={12} />
                          Aufrufen
                        </button>
                      )}
                      
                      {isSpeaking && (
                        <button
                          onClick={() => {
                            onUpdateSpeakerStatus(req.id, 'done');
                            triggerNotification('Wortmeldung beendet.');
                          }}
                          className="px-3 py-1.5 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                          id={`done_speaking_btn_${req.id}`}
                        >
                          <Check size={12} />
                          Beenden
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onDeleteSpeaker(req.id);
                          triggerNotification('Wortmeldung entfernt.');
                        }}
                        className="p-2 rounded-xl border border-slate-200 hover:border-red-600 hover:text-red-600 text-slate-400 bg-white transition-colors"
                        id={`delete_speaker_btn_${req.id}`}
                      >
                        <UserX size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
