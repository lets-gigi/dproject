import React from 'react';
import { ArrowRight, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import { ExamSession } from '../types/simulation';

interface ExamResultModalProps {
  session: ExamSession;
  onClose: () => void;
  onStartNextExam: () => void;
  onOpenLaterInspection: () => void;
}

export const ExamResultModal: React.FC<ExamResultModalProps> = ({
  session,
  onClose,
  onStartNextExam,
  onOpenLaterInspection,
}) => {
  const ourStudents = session.students.filter((s) => s.room === 'our_room');
  const cheaters = ourStudents.filter((s) => s.scenario === 'cheater');
  const caughtCheaters = cheaters.filter((s) => s.status === 'expelled');
  const missedCheaters = cheaters.filter((s) => s.status !== 'expelled');
  const falseExpulsions = ourStudents.filter(
    (s) => s.status === 'expelled' && s.scenario !== 'cheater'
  );
  const stillHeld = ourStudents.filter((s) => s.status === 'held');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exam-result-title"
    >
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <p className="text-xs text-slate-500">
              {session.periodNumber}교시 {session.subjectName} 감독 결산
            </p>
            <h2
              id="exam-result-title"
              className="text-lg font-semibold text-slate-900 mt-0.5"
            >
              시험 감독 결과 및 부정행위 검출 리포트
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="창 닫기"
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Summary KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-slate-200 p-3.5">
              <p className="text-xs text-slate-500">실제 부정행위자</p>
              <p className="text-xl font-semibold text-slate-900 font-mono tabular-nums mt-1">
                {cheaters.length}명
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5">
              <p className="text-xs text-emerald-700">적발 퇴실 성공</p>
              <p className="text-xl font-semibold text-emerald-900 font-mono tabular-nums mt-1">
                {caughtCheaters.length}명
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3.5">
              <p className="text-xs text-amber-800">미적발 인원</p>
              <p className="text-xl font-semibold text-amber-900 font-mono tabular-nums mt-1">
                {missedCheaters.length}명
              </p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-3.5">
              <p className="text-xs text-red-700">오인 퇴실</p>
              <p className="text-xl font-semibold text-red-900 font-mono tabular-nums mt-1">
                {falseExpulsions.length}명
              </p>
            </div>
          </div>

          {stillHeld.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-3">
              <span>
                현재 <span className="font-semibold">보류(추후 검사)</span> 상태인 학생이{' '}
                {stillHeld.length}명 있습니다. 추후 정밀 검사를 먼저 진행할 수 있습니다.
              </span>
              <button
                type="button"
                onClick={onOpenLaterInspection}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                보류 학생 추후 검사하기
              </button>
            </div>
          )}

          {/* Ground Truth Breakdown of Cheaters */}
          <div className="space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-900">
              제1시험실 전자기기 부정행위자 실제 내역
            </h3>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {cheaters.map((c) => {
                const caught = c.status === 'expelled';
                return (
                  <div
                    key={c.id}
                    className="px-4 py-3 flex items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <span>{c.name}</span>
                        <span className="font-normal font-mono tabular-nums text-slate-500">
                          {c.seatLabel}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-0.5">
                        {c.deviceType} ({c.rfBand}) · {c.behaviorLabel}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 font-semibold shrink-0 ${
                        caught ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {caught ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          적발 완료
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="h-3.5 w-3.5" />
                          미적발 ({c.status === 'held' ? '보류 중' : '응시 완료'})
                        </>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {falseExpulsions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-red-700">
                오인 퇴실 내역
              </h3>
              <div className="divide-y divide-red-100 rounded-lg border border-red-200 bg-red-50/30">
                {falseExpulsions.map((f) => (
                  <div
                    key={f.id}
                    className="px-4 py-2.5 flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-slate-900">
                      {f.name} ({f.seatLabel})
                    </span>
                    <span className="text-slate-600">
                      {f.deviceType ?? f.behaviorLabel ?? '특이사항 없음 (일반 응시자)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            계속 감독하기
          </button>
          <button
            type="button"
            onClick={onStartNextExam}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {session.periodNumber + 1}교시 다음 시험 시작
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
