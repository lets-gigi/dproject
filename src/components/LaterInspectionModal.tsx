import React, { useEffect, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Radio,
  Search,
  ShieldAlert,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { Student } from '../types/simulation';

interface LaterInspectionModalProps {
  students: Student[];
  initialStudentId?: string | null;
  onClose: () => void;
  onPerformHoldRfCheck: (studentId: string) => void;
  onPerformHoldPhysicalCheck: (studentId: string) => void;
  onExpelStudent: (studentId: string) => void;
  onClearStudent: (studentId: string) => void;
}

export const LaterInspectionModal: React.FC<LaterInspectionModalProps> = ({
  students,
  initialStudentId,
  onClose,
  onPerformHoldRfCheck,
  onPerformHoldPhysicalCheck,
  onExpelStudent,
  onClearStudent,
}) => {
  const heldStudents = students.filter(
    (s) => s.room === 'our_room' && s.status === 'held'
  );

  const [activeId, setActiveId] = useState<string | null>(() => {
    if (
      initialStudentId &&
      heldStudents.some((s) => s.id === initialStudentId)
    ) {
      return initialStudentId;
    }
    return heldStudents[0]?.id ?? null;
  });

  useEffect(() => {
    if (activeId && heldStudents.some((s) => s.id === activeId)) {
      return;
    }
    setActiveId(heldStudents[0]?.id ?? null);
  }, [heldStudents, activeId]);

  const activeStudent =
    heldStudents.find((s) => s.id === activeId) ?? heldStudents[0] ?? null;

  const getRfCheckResult = (s: Student) => {
    if (s.scenario === 'cheater') {
      return {
        detected: true,
        text: `0.5m 초근접 스캔: 비인가 ${s.rfBand} 활성 전파 강하게 탐지됨`,
      };
    }
    if (s.scenario === 'rf_innocent') {
      return {
        detected: true,
        text: `0.5m 초근접 스캔: ${s.rfBand} 저전력 신호 탐지 (${s.deviceType} 가능성 · 물리 확인 필요)`,
      };
    }
    return {
      detected: false,
      text: '0.5m 초근접 스캔: 전자기기 전파 신호가 전혀 검출되지 않았습니다.',
    };
  };

  const getPhysicalCheckResult = (s: Student) => {
    if (s.scenario === 'cheater') {
      return {
        violation: true,
        text: `소지품·착석 확인: ${s.deviceType} 은닉 사용 현행 적발`,
      };
    }
    if (s.scenario === 'rf_innocent') {
      return {
        violation: false,
        text: `소지품·착석 확인: ${s.deviceType} 확인 완료 (부정행위 아님)`,
      };
    }
    if (s.scenario === 'behavior_innocent') {
      return {
        violation: false,
        text: `소지품·착석 확인: 전자기기 없음 (${s.behaviorLabel ?? '단순 행동'})`,
      };
    }
    return {
      violation: false,
      text: '소지품·착석 확인: 전자기기 및 부정행위 정황 없음',
    };
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="later-inspection-title"
    >
      <div className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div>
            <p className="text-xs text-amber-700 font-semibold">
              보류 인원 전담 검증 · 대기 중 {heldStudents.length}명
            </p>
            <h2
              id="later-inspection-title"
              className="text-lg font-semibold text-slate-900 mt-0.5"
            >
              보류 학생 추후 정밀 검사
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="추후 검사 창 닫기"
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        {heldStudents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
            <h3 className="text-base font-semibold text-slate-900">
              검사 대기 중인 보류 학생이 없습니다
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              감독 중 의심되지만 즉시 퇴실 여부가 불확실한 학생을 &lsquo;보류 (추후 검사)&rsquo;로 지정하면 이곳에서 근접 전파 스캔과 소지품 정밀 검사를 진행할 수 있습니다.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
              >
                시험장으로 돌아가기
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-0 overflow-hidden">
            {/* Left Queue List */}
            <aside className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/50 overflow-y-auto divide-y divide-slate-200/80">
              {heldStudents.map((s) => {
                const isSelected = activeStudent?.id === s.id;
                const progressCount =
                  (s.holdRfChecked ? 1 : 0) + (s.holdPhysicalChecked ? 1 : 0);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveId(s.id)}
                    className={`w-full text-left px-4 py-3.5 transition-colors ${
                      isSelected
                        ? 'bg-white text-slate-900'
                        : 'hover:bg-white/70 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{s.name}</span>
                      <span className="text-xs font-mono tabular-nums text-slate-500">
                        {s.seatLabel}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        전파 {s.rfDetected ? '감지' : '없음'} · CCTV{' '}
                        {s.cctvDetected ? '포착' : '없음'}
                      </span>
                      <span className="font-mono tabular-nums">
                        검사 {progressCount}/2
                      </span>
                    </div>
                  </button>
                );
              })}
            </aside>

            {/* Right Active Student Post-Hold Inspection */}
            {activeStudent && (
              <div className="md:col-span-8 p-6 overflow-y-auto space-y-5">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">
                      {activeStudent.seatLabel} · 보류 (추후 검사 대상)
                    </p>
                    <h3 className="text-xl font-semibold text-slate-900 mt-1">
                      {activeStudent.name}
                    </h3>
                  </div>

                  {activeStudent.suspectedCheating && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      전파+행동 동시 의심
                    </span>
                  )}
                </div>

                {/* Prior Classroom Evidence Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-200 p-3 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <Radio className="h-3.5 w-3.5 text-sky-600" />
                      기존 교실 전파 기록
                    </div>
                    <p className="mt-1 text-slate-600 leading-relaxed">
                      {activeStudent.rfLastInfo
                        ? `${activeStudent.rfLastInfo.directionText} · ${activeStudent.rfLastInfo.band}`
                        : '교실 감시 중 전파 미감지'}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-3 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <Camera className="h-3.5 w-3.5 text-amber-600" />
                      기존 CCTV 행동 기록
                    </div>
                    <p className="mt-1 text-slate-600 leading-relaxed">
                      {activeStudent.cctvLastInfo
                        ? activeStudent.cctvLastInfo.behaviorText
                        : 'CCTV 특이 행동 미포착'}
                    </p>
                  </div>
                </div>

                {/* Step-by-Step Post-Hold Verification Tools */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-700">
                    정밀 검사 절차 (실제 전자기기 소지 여부 확인)
                  </h4>

                  {/* Step 1: 0.5m Close RF Check */}
                  <div className="rounded-lg border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">
                        1. 휴대용 스캐너 초근접(0.5m) 전파 검사
                      </p>
                      {activeStudent.holdRfChecked ? (
                        <p
                          className={`text-xs font-medium ${
                            getRfCheckResult(activeStudent).detected
                              ? 'text-sky-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {getRfCheckResult(activeStudent).text}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500">
                          학생 신체 및 책상 주변 0.5m 이내 정밀 전파 계측을 실행합니다.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onPerformHoldRfCheck(activeStudent.id)}
                      disabled={Boolean(activeStudent.holdRfChecked)}
                      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        activeStudent.holdRfChecked
                          ? 'bg-slate-100 text-slate-500 cursor-default'
                          : 'bg-sky-600 hover:bg-sky-700 text-white'
                      }`}
                    >
                      <Search className="h-3.5 w-3.5" />
                      {activeStudent.holdRfChecked ? '스캔 완료' : '근접 스캔 실행'}
                    </button>
                  </div>

                  {/* Step 2: Physical & Belongings Inspection */}
                  <div className="rounded-lg border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">
                        2. 소지품 · 착용물 대면 물리 검사
                      </p>
                      {activeStudent.holdPhysicalChecked ? (
                        <p
                          className={`text-xs font-medium ${
                            getPhysicalCheckResult(activeStudent).violation
                              ? 'text-red-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {getPhysicalCheckResult(activeStudent).text}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500">
                          귀·손목·필통·가방 및 의료기기 인가 여부를 직접 대면 확인합니다.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onPerformHoldPhysicalCheck(activeStudent.id)}
                      disabled={Boolean(activeStudent.holdPhysicalChecked)}
                      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        activeStudent.holdPhysicalChecked
                          ? 'bg-slate-100 text-slate-500 cursor-default'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      {activeStudent.holdPhysicalChecked ? '확인 완료' : '소지품 검사'}
                    </button>
                  </div>
                </div>

                {/* Final Verdict Buttons */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    검사 결과를 바탕으로 최종 감독관 판정을 내리세요.
                  </p>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => onClearStudent(activeStudent.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <UserCheck className="h-4 w-4" />
                      정상 판정 (보류 해제)
                    </button>
                    <button
                      type="button"
                      onClick={() => onExpelStudent(activeStudent.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <UserX className="h-4 w-4" />
                      최종 퇴실 조치
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
