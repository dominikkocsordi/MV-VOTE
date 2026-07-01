import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Layers, Shield, MessageSquare, AlertTriangle, ArrowRight, CheckCircle, Volume2, Users } from 'lucide-react';
import { SpeakerRequest } from '../types';

interface SpeakerSectionProps {
  speakerRequests: SpeakerRequest[];
  onAddRequest: (firstName: string, lastName: string, department: string | null, role: string | null, type: 'normal' | 'go') => void;
}

export const SpeakerSection: React.FC<SpeakerSectionProps> = ({
  speakerRequests,
  onAddRequest,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [requestType, setRequestType] = useState<'normal' | 'go'>('normal');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedName, setSubmittedName] = useState('');

  const activeRequests = speakerRequests.filter(r => r.status !== 'done');
  
  // Sorting: "speaking" first, then "go" (GO Anträge) sorted by createdAt, then "normal" queued requests sorted by createdAt.
  const sortedRequests = [...activeRequests].sort((a, b) => {
    if (a.status === 'speaking') return -1;
    if (b.status === 'speaking') return 1;
    if (a.type === 'go' && b.type !== 'go') return -1;
    if (a.type !== 'go' && b.type === 'go') return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg('Bitte gib sowohl Vorname als auch Nachname ein.');
      return;
    }

    setErrorMsg('');
    onAddRequest(
      firstName.trim(),
      lastName.trim(),
      department || null,
      role || null,
      requestType
    );

    setSubmittedName(firstName.trim());
    setIsSuccess(true);

    // Reset form
    setFirstName('');
    setLastName('');
    setDepartment('');
    setRole('');
    setRequestType('normal');

    // Auto close success message after 4 seconds
    setTimeout(() => {
      setIsSuccess(false);
    }, 4000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-5xl mx-auto" id="speaker_section_root">
      {/* Left: Register Speaker Form */}
      <div className="lg:col-span-5 space-y-6">
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="premium-card p-6 sm:p-8"
            >
              <h2 className="font-sans font-black tracking-tighter text-3xl text-slate-900 mb-2 text-center sm:text-left">
                Redeliste
              </h2>
              <p className="text-slate-500 text-xs mb-6 text-center sm:text-left leading-relaxed">
                Trage dich hier ein, wenn du auf der Versammlung eine Wortmeldung oder einen GO-Antrag einreichen möchtest.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4" id="speaker_register_form">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Vorname *
                    </label>
                    <input
                      type="text"
                      placeholder="z.B. Marie"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Nachname *
                    </label>
                    <input
                      type="text"
                      placeholder="z.B. Weber"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Ressort <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white transition-all duration-200 cursor-pointer text-slate-800 font-bold"
                  >
                    <option value="">Keines / Gast</option>
                    <option value="Interne Events">Interne Events</option>
                    <option value="Externe Events">Externe Events</option>
                    <option value="Merchandise">Merchandise</option>
                    <option value="Sponsoring">Sponsoring</option>
                    <option value="Kommunikation">Kommunikation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Rolle <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white transition-all duration-200 cursor-pointer text-slate-800 font-bold"
                  >
                    <option value="">Keine Angabe</option>
                    <option value="Vorstand">Vorstand</option>
                    <option value="Ressortleiter">Ressortleiter</option>
                    <option value="Ombudsperson">Ombudsperson</option>
                    <option value="Alumnus">Alumnus</option>
                  </select>
                </div>

                <div className="pt-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Art der Meldung
                  </label>
                  
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setRequestType('normal')}
                      className={`w-full p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        requestType === 'normal'
                          ? 'border-indigo-600 bg-indigo-50/50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                        requestType === 'normal' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'
                      }`}>
                        {requestType === 'normal' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900">Normale Wortmeldung</span>
                        <span className="text-[10px] text-slate-500">Einfacher Diskussionsbeitrag</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRequestType('go')}
                      className={`w-full p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        requestType === 'go'
                          ? 'border-red-500 bg-red-50/70'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                        requestType === 'go' ? 'border-red-600 bg-red-600' : 'border-slate-300 bg-white'
                      }`}>
                        {requestType === 'go' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-red-700 flex items-center gap-1">
                          <AlertTriangle size={12} className="inline text-red-600" />
                          Antrag zur Geschäftsordnung (GO)
                        </span>
                        <span className="text-[10px] text-slate-500">Wird bevorzugt aufgerufen</span>
                      </div>
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <p className="text-red-600 text-xs font-bold text-center pt-2">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-4 mt-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs tracking-wider uppercase transition-all duration-300 shadow-sm shadow-indigo-105"
                  id="submit_speaker_btn"
                >
                  Auf die Liste setzen
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="premium-card p-8 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-md shadow-indigo-150">
                <CheckCircle className="text-white" size={32} />
              </div>
              <h2 className="font-sans font-black tracking-tighter text-3xl text-slate-900 mb-2">
                Eingetragen!
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Vielen Dank, <strong>{submittedName}</strong>. Deine Wortmeldung wurde erfolgreich auf der Redeliste registriert.
              </p>
              <button
                onClick={() => setIsSuccess(false)}
                className="w-full py-3 px-6 rounded-2xl border border-slate-200 text-slate-800 hover:bg-slate-100 font-bold text-xs uppercase tracking-wider transition-colors"
                id="another_request_btn"
              >
                Weitere Meldung abgeben
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right: Active Speaker Queue display */}
      <div className="lg:col-span-7 space-y-6">
        <div className="premium-card p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-sans font-black tracking-tighter text-2xl text-slate-900">
              Aktive Redeliste
            </h2>
            <span className="px-3 py-1 rounded-full bg-slate-100 text-[10px] font-black tracking-wider text-slate-500 uppercase">
              {sortedRequests.length} Meldungen
            </span>
          </div>

          <div className="space-y-4" id="active_speakers_queue_list">
            {sortedRequests.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-3xl bg-slate-50">
                <p className="text-slate-500 text-sm font-semibold">Die Redeliste ist momentan leer.</p>
                <p className="text-slate-400 text-xs mt-1">Trage dich links ein, um das Wort zu erbitten.</p>
              </div>
            ) : (
              sortedRequests.map((req, idx) => {
                const isSpeaking = req.status === 'speaking';
                const isGo = req.type === 'go';

                return (
                  <motion.div
                    key={req.id}
                    layoutId={`req-card-${req.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl border transition-all ${
                      isSpeaking
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-sm ring-1 ring-indigo-600'
                        : isGo
                        ? 'border-red-200 bg-red-50/40'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {/* Status badge / Queue Indicator */}
                        {isSpeaking ? (
                          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center animate-pulse shadow-md shadow-indigo-150">
                            <Volume2 size={16} />
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
                          <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2 flex-wrap">
                            {req.firstName} {req.lastName}
                            {isSpeaking ? (
                              <span className="text-[9px] px-2 py-0.5 rounded bg-indigo-600 text-white font-black uppercase tracking-widest animate-pulse">
                                Spricht
                              </span>
                            ) : (
                              <span className="text-[9px] px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 font-bold uppercase tracking-wider">
                                Wartend
                              </span>
                            )}
                            {isGo && !isSpeaking && (
                              <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-600 text-white font-black uppercase tracking-wider">
                                GO-Antrag
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                            {req.department && (
                              <span className="flex items-center gap-1 font-semibold">
                                <Layers size={11} className="text-slate-400" />
                                {req.department}
                              </span>
                            )}
                            {req.role && (
                              <span className="flex items-center gap-1 font-semibold">
                                <Shield size={11} className="text-slate-400" />
                                {req.role}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Small visual priority badge on GO-Anträge */}
                      {isGo && !isSpeaking && (
                        <div className="hidden sm:block text-right">
                          <span className="text-[9px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-2 py-1 rounded-lg">
                            Priorität
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Informative Accordion card */}
        <div className="premium-card p-6 bg-slate-50 border border-slate-200">
          <h3 className="font-sans font-black text-lg text-slate-900 mb-2 flex items-center gap-2">
            <Users size={16} className="text-indigo-600" />
            Geschäftsordnungs-Regeln
          </h3>
          <p className="text-slate-500 text-xs leading-relaxed font-semibold">
            Ein <strong className="text-slate-800">Antrag zur Geschäftsordnung (GO-Antrag)</strong> betrifft den formalen Ablauf der Versammlung (z.B. Antrag auf Debattenende oder Redezeitbegrenzung). Er unterbricht die normale Redeliste und wird von der Sitzungsleitung sofort und bevorzugt behandelt.
          </p>
        </div>
      </div>
    </div>
  );
};
