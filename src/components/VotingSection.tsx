import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ChevronRight, Users, Plus, Minus, ArrowRight } from 'lucide-react';
import { VoteSession, VoterCode } from '../types';

interface VotingSectionProps {
  session: VoteSession | null;
  voterCodes: VoterCode[];
  onVoteSubmitted: (sessionId: string, optionIndex: number, code: string | null, weight: number, delegationNames: string[] | null) => void;
  onNavigateToSpeakers: () => void;
  votedSessionIds: string[];
}

export const VotingSection: React.FC<VotingSectionProps> = ({
  session,
  voterCodes = [],
  onVoteSubmitted,
  onNavigateToSpeakers,
  votedSessionIds,
}) => {
  const [step, setStep] = useState<'welcome' | 'auth' | 'options' | 'success'>('welcome');
  const [voterCode, setVoterCode] = useState<string>('');
  const [codeInputs, setCodeInputs] = useState<string[]>(['', '', '', '', '']);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  
  // Delegation
  const [delegationCount, setDelegationCount] = useState<number>(0);
  const [delegationNames, setDelegationNames] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Check if session changed or was voted
  useEffect(() => {
    if (session) {
      const alreadyVoted = votedSessionIds.includes(session.id);
      if (alreadyVoted) {
        setStep('success');
      } else {
        setStep('welcome');
        setSelectedOption(null);
        setVoterCode('');
        setCodeInputs(['', '', '', '', '']);
        setDelegationCount(0);
        setDelegationNames([]);
        setErrorMessage('');
      }
    } else {
      setStep('welcome');
    }
  }, [session, votedSessionIds]);

  // Read code from URL search param if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get('code');
    if (urlCode && urlCode.length === 5) {
      const cleaned = urlCode.toUpperCase();
      setVoterCode(cleaned);
      setCodeInputs(cleaned.split(''));
    }
  }, []);

  if (!session) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="premium-card p-8 text-center max-w-md mx-auto"
        id="no_session_container"
      >
        <span className="inline-block px-4 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold tracking-widest uppercase mb-6">
          Warten auf Sitzung
        </span>
        <h2 className="font-sans font-black tracking-tighter text-2xl text-slate-900 mb-4">
          Keine aktive Wahl
        </h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          Aktuell ist keine Abstimmung freigegeben. Bitte trage dich in die Redeliste ein oder warte auf die Freischaltung durch die Sitzungsleitung.
        </p>
        <div className="space-y-3">
          <button
            onClick={onNavigateToSpeakers}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs tracking-wider uppercase transition-all duration-300 shadow-sm"
            id="go_to_speakers_btn"
          >
            📝 Zur Redeliste
            <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>
    );
  }

  const alreadyVoted = votedSessionIds.includes(session.id);

  if (alreadyVoted && step !== 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="premium-card p-8 text-center max-w-md mx-auto"
        id="already_voted_container"
      >
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-6">
          <Check className="text-indigo-600" size={32} />
        </div>
        <h2 className="font-sans font-black tracking-tighter text-2xl text-slate-900 mb-2">
          Bereits abgestimmt
        </h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          Du hast an dieser Abstimmung ("{session.title}") bereits erfolgreich teilgenommen. Jedes Mitglied besitzt eine Stimme.
        </p>
        <button
          onClick={onNavigateToSpeakers}
          className="w-full py-4 px-6 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs uppercase tracking-wider transition-all duration-300"
          id="btn_speakers_redirect"
        >
          📝 Zur Redeliste
        </button>
      </motion.div>
    );
  }

  const handleStartVote = () => {
    // If no group requirement is specified, go straight to options
    if (!session.groupIds || session.groupIds.length === 0) {
      setStep('options');
    } else {
      setStep('auth');
    }
  };

  const handleCodeInput = (value: string, index: number) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const newInputs = [...codeInputs];
    newInputs[index] = cleaned;
    setCodeInputs(newInputs);

    // Auto-focus next input
    if (cleaned && index < 4) {
      const nextInput = document.getElementById(`code-char-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !codeInputs[index] && index > 0) {
      const prevInput = document.getElementById(`code-char-${index - 1}`);
      prevInput?.focus();
    }
  };

  const verifyEnteredCode = (): boolean => {
    const fullCode = codeInputs.join('');
    if (fullCode.length !== 5) {
      setErrorMessage('Bitte gib einen vollständigen 5-stelligen Code ein.');
      return false;
    }

    // Check if code is in the allowed groups for this session
    const match = voterCodes.find(
      c => c.code === fullCode && session.groupIds.includes(c.groupId)
    );

    if (!match) {
      setErrorMessage('Dieser Zugangscode ist ungültig oder gehört keiner berechtigten Wählergruppe an.');
      return false;
    }

    setVoterCode(fullCode);
    setErrorMessage('');
    return true;
  };

  const handleManualAuthSubmit = () => {
    if (verifyEnteredCode()) {
      setStep('options');
    }
  };

  const handleDelegationChange = (increment: boolean) => {
    setDelegationCount(prev => {
      const newVal = increment ? Math.min(prev + 1, 9) : Math.max(prev - 1, 0);
      
      // Sync names array size
      if (newVal > prev) {
        setDelegationNames(n => [...n, '']);
      } else {
        setDelegationNames(n => n.slice(0, newVal));
      }
      return newVal;
    });
  };

  const handleDelegationNameChange = (val: string, index: number) => {
    const updated = [...delegationNames];
    updated[index] = val;
    setDelegationNames(updated);
  };

  const handleVoteSubmit = () => {
    if (selectedOption === null) return;

    // Validate that all delegation names are filled if applicable
    if (session.allowDelegation && delegationCount > 0) {
      const hasEmptyName = delegationNames.some(name => !name.trim());
      if (hasEmptyName) {
        setErrorMessage('Bitte trage die Namen aller Personen ein, deren Stimmen du übertragen hast.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage('');

    // Simulate database delay for a theatrical premium response
    setTimeout(() => {
      const totalWeight = 1 + delegationCount;
      onVoteSubmitted(
        session.id,
        selectedOption,
        voterCode || null,
        totalWeight,
        session.allowDelegation && delegationCount > 0 ? delegationNames : null
      );
      setIsSubmitting(false);
      setStep('success');
    }, 1200);
  };

  return (
    <div className="w-full max-w-md mx-auto" id="voting_section_root">
      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            className="premium-card p-8 text-center"
            id="step_welcome"
          >
            <span className="inline-block px-4 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold tracking-widest uppercase mb-6">
              Abstimmung geöffnet
            </span>
            <h2 className="font-sans font-black tracking-tighter text-3xl text-slate-900 mb-3 leading-tight">
              {session.title}
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              Diese Abstimmung ist jetzt aktiv geschaltet. Bitte halte deinen 5-stelligen Wählercode bereit.
            </p>
            <button
              onClick={handleStartVote}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs tracking-wider uppercase transition-all duration-300 shadow-md shadow-indigo-100"
              id="start_voter_flow_btn"
            >
              Jetzt wählen
              <ChevronRight size={18} />
            </button>
            <button
              onClick={onNavigateToSpeakers}
              className="w-full mt-4 py-3 px-6 rounded-2xl text-slate-500 hover:text-slate-850 font-bold text-xs tracking-wider uppercase transition-colors"
              id="welcome_speakers_link"
            >
              📝 Zur Redeliste wechseln
            </button>
          </motion.div>
        )}

        {step === 'auth' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="premium-card p-8"
            id="step_auth"
          >
            <h2 className="font-sans font-black tracking-tighter text-2xl text-slate-900 text-center mb-2">
              Wahl-Zugang
            </h2>
            <p className="text-slate-500 text-xs text-center mb-6 leading-relaxed">
              Verifiziere deine Stimmberechtigung durch Eingabe deines Wählercodes.
            </p>

            {/* Manual Code Input */}
            <div className="space-y-4">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 text-center mb-2">
                Bitte 5-stelligen Code eingeben
              </label>
              <div className="flex gap-2 justify-center" id="code_inputs_row">
                {codeInputs.map((char, index) => (
                  <input
                    key={index}
                    id={`code-char-${index}`}
                    type="text"
                    maxLength={1}
                    value={char}
                    onChange={(e) => handleCodeInput(e.target.value, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="w-12 h-14 text-center text-xl font-mono font-bold uppercase bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all duration-200"
                    placeholder="-"
                  />
                ))}
              </div>

              {errorMessage && (
                <p className="text-red-600 text-xs text-center font-bold mt-3" id="auth_error">
                  {errorMessage}
                </p>
              )}

              <button
                onClick={handleManualAuthSubmit}
                className="w-full py-4 mt-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs tracking-wider uppercase transition-all duration-300"
                id="submit_manual_code_btn"
              >
                Bestätigen
              </button>

              <button
                onClick={() => setStep('welcome')}
                className="w-full py-2.5 text-slate-500 hover:text-slate-850 font-bold text-xs tracking-wider uppercase transition-colors"
                id="back_to_welcome_btn"
              >
                Zurück
              </button>
            </div>
          </motion.div>
        )}

        {step === 'options' && (
          <motion.div
            key="options"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="premium-card p-8"
            id="step_options"
          >
            <h2 className="font-sans font-black tracking-tighter text-2xl text-slate-900 mb-1 leading-tight text-center">
              {session.title}
            </h2>
            <p className="text-slate-500 text-xs text-center mb-6">
              Bitte wähle eine Option für deine Stimmabgabe aus.
            </p>

            {/* Options list */}
            <div className="space-y-3 mb-6" id="voting_options_list">
              {session.options.map((opt, i) => {
                const isSelected = selectedOption === i;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedOption(i);
                      setErrorMessage('');
                    }}
                    className={`w-full p-4 rounded-2xl border text-left flex items-center gap-4 transition-all duration-200 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="font-bold text-slate-900 text-sm sm:text-base">
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Stimmübertragung section */}
            {session.allowDelegation && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Users size={14} className="text-indigo-600" />
                    Stimmübertragungen
                  </span>
                  <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => handleDelegationChange(false)}
                      disabled={delegationCount === 0}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 hover:border-indigo-600 text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="font-mono font-bold text-sm min-w-4 text-center">
                      {delegationCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelegationChange(true)}
                      disabled={delegationCount >= 9}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 hover:border-indigo-600 text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {delegationCount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <p className="text-[10px] text-slate-400 mb-2">
                        Trage die Namen der abwesenden Mitglieder ein, deren schriftliche Vollmachten dir vorliegen:
                      </p>
                      {delegationNames.map((name, idx) => (
                        <input
                          key={idx}
                          type="text"
                          placeholder={`Vollmacht Name ${idx + 1}`}
                          value={name}
                          onChange={(e) => handleDelegationNameChange(e.target.value, idx)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-600 transition-colors"
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {errorMessage && (
              <p className="text-red-600 text-xs text-center font-bold mb-4" id="options_error">
                {errorMessage}
              </p>
            )}

            <button
              onClick={handleVoteSubmit}
              disabled={selectedOption === null || isSubmitting}
              className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs tracking-wider uppercase disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 shadow-md shadow-indigo-100"
              id="submit_vote_action_btn"
            >
              {isSubmitting
                ? 'Wird gespeichert...'
                : delegationCount > 0
                ? `Abstimmen (${1 + delegationCount} Stimmen)`
                : 'Abstimmen'}
            </button>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="premium-card p-8 text-center"
            id="step_success"
          >
            {/* Theatrical Success Tick Animation */}
            <div className="relative w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-150">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15, delay: 0.1 }}
              >
                <Check className="text-white" size={36} strokeWidth={2.5} />
              </motion.div>
              <motion.div
                className="absolute inset-0 rounded-2xl border-4 border-indigo-600"
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: 1.4, opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              />
            </div>

            <h2 className="font-sans font-black tracking-tighter text-2xl text-slate-900 mb-2">
              Stimme erfasst
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              Vielen Dank für deine Teilnahme. Deine Stimme wurde sicher und verschlüsselt in das Abstimmungssystem übertragen.
            </p>

            <button
              onClick={onNavigateToSpeakers}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs tracking-wider uppercase transition-all duration-300"
              id="after_vote_speakers_btn"
            >
              📝 Zur Redeliste
              <ArrowRight size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
