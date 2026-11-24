import React, { useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock,
  Footprints,
  Radio,
  ShieldAlert,
  UserCheck,
  UserX,
} from 'lucide-react';
import {
  ProctorPosture,
  Student,
  SubtitleEvent,
} from '../types/simulation';

interface InspectionPanelProps {
  students: Student[];
  selectedStudent: Student | null;
  subtitleLog: SubtitleEvent[];
  proctorPosture: ProctorPosture;
  onSelectStudent: (studentId: string) => void;
  onExpelStudent: (studentId: string) => void;
  onHoldStudent: (studentId: string) => void;
  onClearStudent: (studentId: string) => void;
  onWalkNearStudent: (student: Student) => void;
  onOpenLaterInspection: (studentId?: string) => void;
}

type LogTab = 'subtitles' | 'held' | 'actions';

export const InspectionPanel: React.FC<InspectionPanelProps> = ({
  students,
  selectedStudent,
  subtitleLog,
  proctorPosture,
  onSelectStudent,
  onExpelStudent,
  onHoldStudent,
  onClearStudent,
  onWalkNearStudent,
  onOpenLaterInspection,
}) => {
  const [activeTab, setActiveTab] = useState<LogTab>('subtitles');

  const ourStudents = students.filter((s) => s.room === 'our_room');
  const heldStudents = ourStudents.filter((s) => s.status === 'held');
  const actionedStudents = ourStudents.filter(
    (s) => s.status === 'expelled' || s.status === 'cleared'
  );
  const suspectedStudents = ourStudents.filter(
    (s) => s.suspectedCheating && s.status !== 'expelled' && s.status !== 'cleared'
  );

  const statusLabel = (s: Student) => {
    switch (s.status) {
      case 'expelled':
        return '퇴실 조치 완료';
      case 'held':
        return '보류 (추후 검사 대상)';
      case 'cleared':
        return '정상 판정 완료';
      default:
        return '시험 응시 중';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Selected Student Inspection Card */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        {selectedStudent ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                  <span>{selectedStudent.seatLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{statusLabel(selectedStudent)}</span>
                </div>
                <h2 className="text-lg font-semibold text-slate-900 mt-1">
                  {selectedStudent.name}
                </h2>
              </div>

              {proctorPosture === 'patrol' &&
                (selectedStudent.status === 'active' ||
                  selectedStudent.status === 'held') && (
                  <button
                    type="button"
                    onClick={() => onWalkNearStudent(selectedStudent)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <Footprints className="h-3.5 w-3.5" />
                    근처 이동
                  </button>
                )}
            </div>

            {/* Evidence Matrix: RF + CCTV */}
            <div className="space-y-2.5">
              {/* RF Detection Status */}
              <div
                className={`rounded-lg border p-3 ${
                  selectedStudent.rfDetected
                    ? 'border-sky-200 bg-sky-50/70'
                    : 'border-slate-200 bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="inline-flex items-center gap-1.5 text-slate-800">
                    <Radio
                      className={`h-3.5 w-3.5 ${
                        selectedStudent.rfDetected
                          ? 'text-sky-600'
                          : 'text-slate-400'
                      }`}
                    />
                    전파 감지 (감독관 시점)
                  </span>
                  <span
                    className={
                      selectedStudent.rfDetected
                        ? 'text-sky-700'
                        : 'text-slate-500'
                    }
                  >
                    {selectedStudent.rfDetected ? '감지됨' : '미감지'}
                  </span>
                </div>
                {selectedStudent.rfLastInfo ? (
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    {selectedStudent.rfLastInfo.directionText} ·{' '}
                    {selectedStudent.rfLastInfo.band} (
                    <span className="font-mono tabular-nums">
                      {selectedStudent.rfLastInfo.timestamp}
                    </span>
                    )
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-slate-500">
                    시야 55° 또는 반경 2m 접근 시 전파가 포착되지 않았습니다.
                  </p>
                )}
              </div>

              {/* CCTV Behavior Status */}
              <div
                className={`rounded-lg border p-3 ${
                  selectedStudent.cctvDetected
                    ? 'border-amber-200 bg-amber-50/70'
                    : 'border-slate-200 bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="inline-flex items-center gap-1.5 text-slate-800">
                    <Camera
                      className={`h-3.5 w-3.5 ${
                        selectedStudent.cctvDetected
                          ? 'text-amber-600'
                          : 'text-slate-400'
                      }`}
                    />
                    특이 행동 (CCTV 시점)
                  </span>
                  <span
                    className={
                      selectedStudent.cctvDetected
                        ? 'text-amber-700'
                        : 'text-slate-500'
                    }
                  >
                    {selectedStudent.cctvDetected ? '포착됨' : '이상 없음'}
                  </span>
                </div>
                {selectedStudent.cctvLastInfo ? (
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    {selectedStudent.cctvLastInfo.behaviorText} (
                    <span className="font-mono tabular-nums">
                      {selectedStudent.cctvLastInfo.timestamp}
                    </span>
                    )
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-slate-500">
                    CCTV 시점에서 특이 행동이 아직 포착되지 않았습니다.
                  </p>
                )}
              </div>
            </div>

            {/* Combined Suspicion Callout */}
            {selectedStudent.suspectedCheating &&
              selectedStudent.status !== 'expelled' &&
              selectedStudent.status !== 'cleared' && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2.5">
                  <ShieldAlert className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-900 leading-relaxed">
                    <p className="font-semibold">
                      부정행위 의심 (전파 + 특이행동 동시 포착)
                    </p>
                    <p className="text-red-700 mt-0.5">
                      전자기기 전파와 CCTV 행동 이상이 모두 확인되었습니다. 즉시 퇴실 또는 보류 검사를 진행하세요.
                    </p>
                  </div>
                </div>
              )}

            {!selectedStudent.suspectedCheating &&
              (selectedStudent.rfDetected || selectedStudent.cctvDetected) &&
              selectedStudent.status === 'active' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 leading-relaxed">
                    단일 단서만 감지되었습니다. 무해 기기나 단순 긴장일 수 있으므로{' '}
                    <span className="font-semibold">보류(추후 검사)</span> 후 순찰 및 CCTV 교차 확인을 권장합니다.
                  </p>
                </div>
              )}

            {/* Action Buttons or Final Result */}
            {selectedStudent.status === 'active' ||
            selectedStudent.status === 'held' ? (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => onExpelStudent(selectedStudent.id)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <UserX className="h-4 w-4" />
                    즉시 퇴실
                  </button>

                  {selectedStudent.status === 'active' ? (
                    <button
                      type="button"
                      onClick={() => onHoldStudent(selectedStudent.id)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <Clock className="h-4 w-4" />
                      보류 (추후 검사)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onClearStudent(selectedStudent.id)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <UserCheck className="h-4 w-4" />
                      정상 판정
                    </button>
                  )}
                </div>

                {selectedStudent.status === 'held' && (
                  <button
                    type="button"
                    onClick={() => onOpenLaterInspection(selectedStudent.id)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                  >
                    추후 정밀 검사 진행 (0.5m 스캔 · 소지품 확인)
                  </button>
                )}
              </div>
            ) : (
              <div
                className={`rounded-lg border p-3 text-xs ${
                  selectedStudent.status === 'expelled'
                    ? selectedStudent.scenario === 'cheater'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : 'border-red-200 bg-red-50 text-red-900'
                    : 'border-slate-200 bg-slate-50 text-slate-800'
                }`}
              >
                {selectedStudent.status === 'expelled' ? (
                  selectedStudent.scenario === 'cheater' ? (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">부정행위자 적발 성공</p>
                        <p className="mt-0.5">
                          소지 기기: {selectedStudent.deviceType} ({selectedStudent.rfBand})
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">오인 퇴실 조치됨</p>
                        <p className="mt-0.5">
                          {selectedStudent.deviceType
                            ? `사유: ${selectedStudent.deviceType} (부정행위 아님)`
                            : '소지한 부정 전자기기가 없었습니다.'}
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p>
                      보류 해제 및 정상 응시자로 판정되었습니다.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="py-4 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-900">
              검사할 학생을 선택하세요
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              교실 좌석 또는 하단 자막 알림의 학생을 클릭하면 전파 및 CCTV 기록을 대조하여 퇴실·보류 조치를 할 수 있습니다.
            </p>
            {suspectedStudents.length > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onSelectStudent(suspectedStudents[0].id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  부정행위 의심 학생 {suspectedStudents.length}명 확인
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Tabs: Subtitle History / Held Queue / Action History */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col">
        <div className="p-1.5 bg-slate-100 border-b border-slate-200 grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('subtitles')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'subtitles'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            자막 기록 ({subtitleLog.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('held')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'held'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            보류 명단 ({heldStudents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('actions')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'actions'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            조치 내역 ({actionedStudents.length})
          </button>
        </div>

        <div className="max-h-[290px] overflow-y-auto divide-y divide-slate-100">
          {activeTab === 'subtitles' &&
            (subtitleLog.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                아직 감지된 자막 기록이 없습니다.
              </div>
            ) : (
              subtitleLog.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => item.studentId && onSelectStudent(item.studentId)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span
                      className={`font-semibold ${
                        item.severity === 'critical'
                          ? 'text-red-600'
                          : item.severity === 'warning'
                          ? 'text-amber-700'
                          : 'text-sky-700'
                      }`}
                    >
                      {item.source === 'RF'
                        ? '전파 감지'
                        : item.source === 'CCTV'
                        ? 'CCTV 행동'
                        : item.source === 'COMBINED'
                        ? '부정행위 의심'
                        : '감독관 조치'}
                    </span>
                    <span className="font-mono tabular-nums text-slate-400">
                      {item.timestamp}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-900 leading-snug">
                    {item.headline}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {item.detail}
                  </p>
                </button>
              ))
            ))}

          {activeTab === 'held' &&
            (heldStudents.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                보류(추후 검사) 중인 학생이 없습니다.
              </div>
            ) : (
              <div>
                <div className="px-4 py-2.5 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-amber-900">
                    보류 인원 {heldStudents.length}명
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenLaterInspection(heldStudents[0].id)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors whitespace-nowrap"
                  >
                    추후 정밀 검사 열기
                  </button>
                </div>
                {heldStudents.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => onSelectStudent(s.id)}
                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-3 border-b border-slate-100 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                        <span>{s.name}</span>
                        <span className="text-slate-400 font-normal font-mono tabular-nums">
                          {s.seatLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        전파 {s.rfDetected ? '감지' : '없음'} · CCTV{' '}
                        {s.cctvDetected ? '특이행동' : '정상'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenLaterInspection(s.id);
                        }}
                        className="px-2.5 py-1 text-[11px] font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                      >
                        정밀 검사
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {activeTab === 'actions' &&
            (actionedStudents.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                퇴실 또는 정상 판정 처리된 학생이 없습니다.
              </div>
            ) : (
              actionedStudents.map((s) => {
                const correctAction =
                  (s.status === 'expelled' && s.scenario === 'cheater') ||
                  (s.status === 'cleared' && s.scenario !== 'cheater');
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSelectStudent(s.id)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                        <span>{s.name}</span>
                        <span className="text-slate-400 font-normal font-mono tabular-nums">
                          {s.seatLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {s.status === 'expelled' ? '퇴실 조치' : '정상 판정'}
                        {s.deviceType ? ` · ${s.deviceType}` : ''}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-semibold shrink-0 ${
                        correctAction ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {correctAction ? '정확한 판정' : '오판'}
                    </span>
                  </button>
                );
              })
            ))}
        </div>
      </section>
    </div>
  );
};
