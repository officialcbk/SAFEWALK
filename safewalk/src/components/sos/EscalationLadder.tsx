import { CheckCircle2, Loader2 } from 'lucide-react';

type StageState = 'done' | 'active' | 'pending';

interface Stage {
  label: string;
  duration: string;
}

const STAGES: Stage[] = [
  { label: 'Check-in prompt',   duration: '30 sec' },
  { label: 'Alert contacts',    duration: 'Ongoing' },
  { label: 'Voice call',        duration: 'Ongoing' },
  { label: '911 option shown',  duration: 'Until resolved' },
  { label: 'Monitoring',        duration: 'Ongoing' },
];

interface EscalationLadderProps {
  /** 0 = not started, 1–5 = current active stage */
  activeStage: 0 | 1 | 2 | 3 | 4 | 5;
}

export function EscalationLadder({ activeStage }: EscalationLadderProps) {
  const stageState = (i: number): StageState => {
    if (i + 1 < activeStage) return 'done';
    if (i + 1 === activeStage) return 'active';
    return 'pending';
  };

  return (
    <div className="flex flex-col gap-2">
      {STAGES.map((stage, i) => {
        const state = stageState(i);
        return (
          <div
            key={i}
            className="flex items-center gap-3"
            style={{
              animation: state === 'active' ? `escalation-row-in 200ms ${i * 100}ms ease-out both` : undefined,
            }}
          >
            {/* Dot / icon */}
            <div className="flex-shrink-0 w-3 h-3 flex items-center justify-center">
              {state === 'done'   && <CheckCircle2 size={12} className="text-[#3B6D11]" />}
              {state === 'active' && <Loader2 size={12} className="text-[#7F77DD] animate-spin" />}
              {state === 'pending' && <div className="w-2.5 h-2.5 rounded-full bg-[#E0E0E8]" />}
            </div>

            {/* Label */}
            <span className={`text-[9px] flex-1 ${
              state === 'active' ? 'font-bold text-[#7F77DD]' :
              state === 'done'   ? 'text-[#888899]' :
              'text-[#888899]'
            }`}>
              {stage.label}
            </span>

            {/* Badge */}
            {state === 'done' && (
              <span className="text-[7px] font-bold text-[#3B6D11] bg-[#EAF3DE] px-1.5 py-0.5 rounded-full">Done</span>
            )}
            {state === 'active' && (
              <span className="text-[7px] font-bold text-[#854F0B] bg-[#FAEEDA] px-1.5 py-0.5 rounded-full">{stage.duration}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
