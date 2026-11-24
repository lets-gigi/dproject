import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  ClipboardCheck,
  Footprints,
  Pause,
  Play,
  Radio,
  RotateCcw,
  RotateCw,
  Scan,
  SkipForward,
} from 'lucide-react';
import { ClassroomStage } from './components/ClassroomStage';
import { ExamResultModal } from './components/ExamResultModal';
import { InspectionPanel } from './components/InspectionPanel';
import { LaterInspectionModal } from './components/LaterInspectionModal';
import {
  ExamSession,
  ProctorPosture,
  Student,
  SubtitleEvent,
  ViewMode,
} from './types/simulation';
import { generateExamSession } from './utils/examGenerator';
import {
  OUR_ROOM,
  PROCTOR_DESK,
  describeDetectionDirection,
  formatClock,
  isPointInFixedFov,
  isPointInPatrolRadius,
  radToDeg,
} from './utils/geometry';

export default function App() {
  const [session, setSession] = useState<ExamSession>(() => generateExamSession(1));
  const [viewMode, setViewMode] = useState<ViewMode>('proctor');
  const [proctorPosture, setProctorPosture] = useState<ProctorPosture>('fixed');
  const [headOffsetDeg, setHeadOffsetDeg] = useState<number>(0);
  const [autoSweep, setAutoSweep] = useState<boolean>(false);
  const [proctorPos, setProctorPos] = useState<{ x: number; y: number }>({
    x: PROCTOR_DESK.x,
    y: PROCTOR_DESK.y,
  });
  const [patrolHeadingDeg, setPatrolHeadingDeg] = useState<number>(90);
  const [walkTarget, setWalkTarget] = useState<{ x: number; y: number } | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [subtitleLog, setSubtitleLog] = useState<SubtitleEvent[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<SubtitleEvent | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<1 | 2>(1);
  const [showResultModal, setShowResultModal] = useState<boolean>(false);
  const [laterInspectionOpen, setLaterInspectionOpen] = useState<boolean>(false);
  const [laterInspectionTargetId, setLaterInspectionTargetId] = useState<string | null>(null);

  // Refs for real-time loops without stale closures
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const sweepDirRef = useRef<1 | -1>(1);
  const lastRfSubtitleRef = useRef<Record<string, number>>({});
  const lastCctvSubtitleRef = useRef<Record<string, number>>({});
  const subtitleCounterRef = useRef<number>(0);

  const pushSubtitle = useCallback((event: Omit<SubtitleEvent, 'id'>) => {
    subtitleCounterRef.current += 1;
    const full: SubtitleEvent = {
      ...event,
      id: `sub-${Date.now()}-${subtitleCounterRef.current}`,
    };
    setActiveSubtitle(full);
    setSubtitleLog((prev) => [full, ...prev].slice(0, 60));
  }, []);

  // Keyboard bindings: WASD / Arrow keys for moving or turning head
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (
        ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(
          key
        )
      ) {
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
          e.preventDefault();
        }
        pressedKeysRef.current.add(key);
        if (proctorPosture === 'patrol') {
          setWalkTarget(null);
        }
        if (proctorPosture === 'fixed' && (key === 'a' || key === 'd' || key === 'arrowleft' || key === 'arrowright')) {
          setAutoSweep(false);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      pressedKeysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [proctorPosture]);

  // Smooth 50ms animation frame loop for proctor movement & head turning
  useEffect(() => {
    if (isPaused) return;
    const intervalMs = 40;
    const timer = window.setInterval(() => {
      const keys = pressedKeysRef.current;

      if (viewMode === 'proctor' && proctorPosture === 'fixed') {
        let delta = 0;
        if (keys.has('a') || keys.has('arrowleft')) delta += 2.4;
        if (keys.has('d') || keys.has('arrowright')) delta -= 2.4;

        if (delta !== 0) {
          setHeadOffsetDeg((prev) =>
            Math.max(-68, Math.min(68, Math.round((prev + delta) * 10) / 10))
          );
        } else if (autoSweep) {
          setHeadOffsetDeg((prev) => {
            const step = 1.2 * simSpeed * sweepDirRef.current;
            const next = prev + step;
            if (next >= 64) {
              sweepDirRef.current = -1;
              return 64;
            }
            if (next <= -64) {
              sweepDirRef.current = 1;
              return -64;
            }
            return next;
          });
        }
      }

      if (viewMode === 'proctor' && proctorPosture === 'patrol') {
        let vx = 0;
        let vy = 0;
        if (keys.has('w') || keys.has('arrowup')) vy -= 1;
        if (keys.has('s') || keys.has('arrowdown')) vy += 1;
        if (keys.has('a') || keys.has('arrowleft')) vx -= 1;
        if (keys.has('d') || keys.has('arrowright')) vx += 1;

        const speedPx = 7.5 * simSpeed;

        if (vx !== 0 || vy !== 0) {
          const len = Math.hypot(vx, vy);
          const nx = (vx / len) * speedPx;
          const ny = (vy / len) * speedPx;
          setPatrolHeadingDeg(radToDeg(Math.atan2(ny, nx)));
          setProctorPos((prev) => ({
            x: Math.max(OUR_ROOM.xMin + 24, Math.min(OUR_ROOM.xMax - 24, prev.x + nx)),
            y: Math.max(OUR_ROOM.yMin + 24, Math.min(OUR_ROOM.yMax - 24, prev.y + ny)),
          }));
        } else if (walkTarget) {
          setProctorPos((prev) => {
            const dx = walkTarget.x - prev.x;
            const dy = walkTarget.y - prev.y;
            const dist = Math.hypot(dx, dy);
            if (dist <= speedPx) {
              setWalkTarget(null);
              return walkTarget;
            }
            const nx = (dx / dist) * speedPx;
            const ny = (dy / dist) * speedPx;
            setPatrolHeadingDeg(radToDeg(Math.atan2(ny, nx)));
            return { x: prev.x + nx, y: prev.y + ny };
          });
        }
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [isPaused, viewMode, proctorPosture, autoSweep, walkTarget, simSpeed]);

  // Immediate RF scan whenever proctor angle/position/view changes
  const runRfScan = useCallback(
    (
      students: Student[],
      elapsedSeconds: number,
      currentView: ViewMode,
      posture: ProctorPosture,
      pos: { x: number; y: number },
      headDeg: number,
      patrolDirDeg: number
    ): { updatedStudents: Student[]; changed: boolean } => {
      if (currentView !== 'proctor') {
        return { updatedStudents: students, changed: false };
      }

      const originX = posture === 'fixed' ? PROCTOR_DESK.x : pos.x;
      const originY = posture === 'fixed' ? PROCTOR_DESK.y : pos.y;
      const heading = posture === 'fixed' ? 90 + headDeg : patrolDirDeg;
      const centerAngle = 90 + headDeg;
      const timestamp = formatClock(elapsedSeconds);
      let changed = false;

      const updatedStudents = students.map((student) => {
        // Strictly limit inspection to OUR_ROOM!
        if (student.room !== 'our_room') return student;
        if (student.status === 'expelled' || student.status === 'cleared') {
          return student;
        }
        if (!student.rfEmittingNow) return student;

        const inRange =
          posture === 'fixed'
            ? isPointInFixedFov(
                originX,
                originY,
                centerAngle,
                student.x,
                student.y
              )
            : isPointInPatrolRadius(originX, originY, student.x, student.y);

        if (!inRange) return student;

        const dirInfo = describeDetectionDirection(
          originX,
          originY,
          heading,
          student.x,
          student.y,
          student.seatLabel,
          student.col,
          student.row,
          posture
        );

        const nowMs = Date.now();
        const lastAlertAt = lastRfSubtitleRef.current[student.id] ?? 0;
        const shouldEmitSubtitle = !student.rfDetected || nowMs - lastAlertAt > 7500;

        const newlySuspected = !student.suspectedCheating && student.cctvDetected;
        const nextRfInfo = {
          directionText: dirInfo.directionText,
          locationText: dirInfo.locationText,
          distanceMeters: dirInfo.distanceMeters,
          angleDeg: dirInfo.angleDeg,
          band: student.rfBand ?? '2.4GHz RF',
          timestamp,
        };

        if (shouldEmitSubtitle) {
          lastRfSubtitleRef.current[student.id] = nowMs;
          if (newlySuspected) {
            pushSubtitle({
              source: 'COMBINED',
              studentId: student.id,
              seatLabel: student.seatLabel,
              headline: `부정행위 의심 · ${student.seatLabel} (${student.name})`,
              detail: `${dirInfo.locationText}에서 전파(${dirInfo.directionText})가 감지되었으며 CCTV 특이행동과 일치합니다.`,
              timestamp,
              severity: 'critical',
            });
          } else {
            pushSubtitle({
              source: 'RF',
              studentId: student.id,
              seatLabel: student.seatLabel,
              headline: `전파 감지 · ${dirInfo.locationText}`,
              detail: `${dirInfo.directionText} 방향에서 ${student.rfBand} 신호 포착 (${
                posture === 'fixed' ? '55° 시야 검사' : '반경 2m 순찰 검사'
              })`,
              timestamp,
              severity: student.cctvDetected ? 'critical' : 'info',
            });
          }
        }

        changed = true;
        return {
          ...student,
          rfDetected: true,
          rfLastInfo: nextRfInfo,
          suspectedCheating: student.cctvDetected,
        };
      });

      return { updatedStudents, changed };
    },
    [pushSubtitle]
  );

  // Trigger RF scan immediately when proctor turns head or walks
  useEffect(() => {
    if (isPaused || viewMode !== 'proctor') return;
    setSession((prev) => {
      const { updatedStudents, changed } = runRfScan(
        prev.students,
        prev.elapsedSeconds,
        viewMode,
        proctorPosture,
        proctorPos,
        headOffsetDeg,
        patrolHeadingDeg
      );
      if (!changed) return prev;
      return { ...prev, students: updatedStudents };
    });
  }, [
    headOffsetDeg,
    proctorPos,
    proctorPosture,
    viewMode,
    isPaused,
    patrolHeadingDeg,
    runRfScan,
  ]);

  // 1-second (or 500ms at 2x) simulation clock & student RF/behavior state machine
  useEffect(() => {
    if (isPaused) return;
    const tickMs = simSpeed === 2 ? 500 : 1000;

    const interval = window.setInterval(() => {
      setSession((prev) => {
        const nextElapsed = prev.elapsedSeconds + 1;
        const timestamp = formatClock(nextElapsed);

        const steppedStudents = prev.students.map((student) => {
          if (student.status === 'expelled' || student.status === 'cleared') {
            return {
              ...student,
              rfEmittingNow: false,
              behaviorActiveNow: false,
            };
          }

          let nextRfEmitting = student.rfEmittingNow;
          let nextRfTimer = student.rfTimer - 1;
          if (nextRfTimer <= 0) {
            if (student.scenario === 'cheater' || student.scenario === 'rf_innocent') {
              nextRfEmitting = !student.rfEmittingNow;
              nextRfTimer = nextRfEmitting ? 5 : 2;
            } else {
              nextRfEmitting = false;
              nextRfTimer = 99;
            }
          }

          let nextBehaviorActive = student.behaviorActiveNow;
          let nextBehaviorTimer = student.behaviorTimer - 1;
          let cctvDetected = student.cctvDetected;
          let cctvLastInfo = student.cctvLastInfo;
          let suspectedCheating = student.suspectedCheating;

          if (nextBehaviorTimer <= 0) {
            if (
              student.scenario === 'cheater' ||
              student.scenario === 'behavior_innocent'
            ) {
              nextBehaviorActive = !student.behaviorActiveNow;
              nextBehaviorTimer = nextBehaviorActive ? 4 : Math.floor(Math.random() * 3) + 3;

              // If CCTV view is currently active and behavior just started -> notify!
              if (
                nextBehaviorActive &&
                viewMode === 'cctv' &&
                student.room === 'our_room'
              ) {
                const nowMs = Date.now();
                const lastCctvAt = lastCctvSubtitleRef.current[student.id] ?? 0;
                const newlySuspected = !suspectedCheating && student.rfDetected;

                cctvDetected = true;
                cctvLastInfo = {
                  behaviorText: student.behaviorLabel ?? '이상 행동 포착',
                  timestamp,
                };
                suspectedCheating = student.rfDetected;

                if (!student.cctvDetected || nowMs - lastCctvAt > 6500) {
                  lastCctvSubtitleRef.current[student.id] = nowMs;
                  if (newlySuspected) {
                    pushSubtitle({
                      source: 'COMBINED',
                      studentId: student.id,
                      seatLabel: student.seatLabel,
                      headline: `부정행위 의심 · ${student.seatLabel} (${student.name})`,
                      detail: `CCTV 특이행동(${student.behaviorLabel})과 기존 전파 감지 기록이 동시에 확인되었습니다.`,
                      timestamp,
                      severity: 'critical',
                    });
                  } else {
                    pushSubtitle({
                      source: 'CCTV',
                      studentId: student.id,
                      seatLabel: student.seatLabel,
                      headline: `CCTV 특이행동 · ${student.seatLabel} (${student.name})`,
                      detail: `${student.behaviorLabel}`,
                      timestamp,
                      severity: student.rfDetected ? 'critical' : 'warning',
                    });
                  }
                }
              }
            } else {
              nextBehaviorActive = false;
              nextBehaviorTimer = 99;
            }
          } else if (
            nextBehaviorActive &&
            viewMode === 'cctv' &&
            student.room === 'our_room' &&
            !cctvDetected
          ) {
            // If user just switched to CCTV view while a student was mid-behavior
            const nowMs = Date.now();
            lastCctvSubtitleRef.current[student.id] = nowMs;
            cctvDetected = true;
            cctvLastInfo = {
              behaviorText: student.behaviorLabel ?? '이상 행동 포착',
              timestamp,
            };
            const newlySuspected = !suspectedCheating && student.rfDetected;
            suspectedCheating = student.rfDetected;
            pushSubtitle({
              source: newlySuspected ? 'COMBINED' : 'CCTV',
              studentId: student.id,
              seatLabel: student.seatLabel,
              headline: newlySuspected
                ? `부정행위 의심 · ${student.seatLabel} (${student.name})`
                : `CCTV 특이행동 · ${student.seatLabel} (${student.name})`,
              detail: newlySuspected
                ? `CCTV 특이행동(${student.behaviorLabel})과 전파 감지 기록이 동시 확인되었습니다.`
                : `${student.behaviorLabel}`,
              timestamp,
              severity: newlySuspected ? 'critical' : 'warning',
            });
          }

          return {
            ...student,
            rfEmittingNow: nextRfEmitting,
            rfTimer: nextRfTimer,
            behaviorActiveNow: nextBehaviorActive,
            behaviorTimer: nextBehaviorTimer,
            cctvDetected,
            cctvLastInfo,
            suspectedCheating,
          };
        });

        const { updatedStudents } = runRfScan(
          steppedStudents,
          nextElapsed,
          viewMode,
          proctorPosture,
          proctorPos,
          headOffsetDeg,
          patrolHeadingDeg
        );

        return {
          ...prev,
          elapsedSeconds: nextElapsed,
          students: updatedStudents,
        };
      });
    }, tickMs);

    return () => window.clearInterval(interval);
  }, [
    isPaused,
    simSpeed,
    viewMode,
    proctorPosture,
    proctorPos,
    headOffsetDeg,
    patrolHeadingDeg,
    runRfScan,
    pushSubtitle,
  ]);

  const handleExpelStudent = (studentId: string) => {
    const target = session.students.find((s) => s.id === studentId);
    if (!target) return;
    const timestamp = formatClock(session.elapsedSeconds);

    setSession((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === studentId
          ? {
              ...s,
              status: 'expelled',
              rfEmittingNow: false,
              behaviorActiveNow: false,
            }
          : s
      ),
    }));

    const isActualCheater = target.scenario === 'cheater';
    pushSubtitle({
      source: 'ACTION',
      studentId: target.id,
      seatLabel: target.seatLabel,
      headline: `즉시 퇴실 조치 · ${target.seatLabel} (${target.name})`,
      detail: isActualCheater
        ? `적발 성공 — ${target.deviceType} (${target.rfBand}) 회수 완료.`
        : target.deviceType
        ? `오인 퇴실 — 확인 결과 ${target.deviceType}로 부정행위 기기가 아니었습니다.`
        : '오인 퇴실 — 소지한 부정 전자기기가 없었습니다.',
      timestamp,
      severity: isActualCheater ? 'info' : 'warning',
    });
  };

  const handleHoldStudent = (studentId: string) => {
    const target = session.students.find((s) => s.id === studentId);
    if (!target) return;
    const timestamp = formatClock(session.elapsedSeconds);

    setSession((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === studentId ? { ...s, status: 'held' } : s
      ),
    }));

    pushSubtitle({
      source: 'ACTION',
      studentId: target.id,
      seatLabel: target.seatLabel,
      headline: `보류 지정 · ${target.seatLabel} (${target.name})`,
      detail: '추후 검사 대상에 등록되었습니다. 순찰 접근 또는 CCTV로 재확인하세요.',
      timestamp,
      severity: 'info',
    });
  };

  const handleClearStudent = (studentId: string) => {
    const target = session.students.find((s) => s.id === studentId);
    if (!target) return;
    const timestamp = formatClock(session.elapsedSeconds);

    setSession((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === studentId ? { ...s, status: 'cleared' } : s
      ),
    }));

    pushSubtitle({
      source: 'ACTION',
      studentId: target.id,
      seatLabel: target.seatLabel,
      headline: `정상 판정 · ${target.seatLabel} (${target.name})`,
      detail: '보류가 해제되고 정상 응시자로 처리되었습니다.',
      timestamp,
      severity: 'info',
    });
  };

  const handleStartNextExam = () => {
    const nextPeriod = session.periodNumber + 1;
    setSession(generateExamSession(nextPeriod));
    setSelectedStudentId(null);
    setSubtitleLog([]);
    setActiveSubtitle(null);
    setProctorPosture('fixed');
    setViewMode('proctor');
    setHeadOffsetDeg(0);
    setAutoSweep(false);
    setProctorPos({ x: PROCTOR_DESK.x, y: PROCTOR_DESK.y });
    setWalkTarget(null);
    lastRfSubtitleRef.current = {};
    lastCctvSubtitleRef.current = {};
    setShowResultModal(false);
    setIsPaused(false);
  };

  const handleWalkNearStudent = (student: Student) => {
    const targetY = Math.max(OUR_ROOM.yMin + 28, student.y - 44);
    setViewMode('proctor');
    setProctorPosture('patrol');
    setWalkTarget({ x: student.x, y: targetY });
  };

  const handleOpenLaterInspection = (studentId?: string) => {
    setLaterInspectionTargetId(studentId ?? null);
    setShowResultModal(false);
    setLaterInspectionOpen(true);
  };

  const handlePerformHoldRfCheck = (studentId: string) => {
    setSession((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === studentId ? { ...s, holdRfChecked: true } : s
      ),
    }));
  };

  const handlePerformHoldPhysicalCheck = (studentId: string) => {
    setSession((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === studentId ? { ...s, holdPhysicalChecked: true } : s
      ),
    }));
  };

  const ourStudents = session.students.filter((s) => s.room === 'our_room');
  const activeCount = ourStudents.filter(
    (s) => s.status === 'active' || s.status === 'held'
  ).length;
  const heldCount = ourStudents.filter((s) => s.status === 'held').length;
  const selectedStudent =
    ourStudents.find((s) => s.id === selectedStudentId) ?? null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 3-Zone Top Navigation Bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-[1440px] mx-auto px-6 py-3.5 flex items-center justify-between gap-8">
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            시험장 전자기기 감지 시뮬레이터
          </span>

          <div className="hidden md:flex items-center gap-2.5 text-xs text-slate-600 whitespace-nowrap shrink-0 font-mono tabular-nums">
            <span className="font-sans font-medium text-slate-800">
              제1시험실 · {session.periodNumber}교시 {session.subjectName}
            </span>
            <span aria-hidden="true">·</span>
            <span>응시 인원 {activeCount}/20명</span>
            <span aria-hidden="true">·</span>
            <span>보류 {heldCount}명</span>
          </div>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setShowResultModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              다음 시험
              <SkipForward className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-5 space-y-4">
        {/* Workspace Control Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-3">
            {/* Primary Viewpoint Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('proctor')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  viewMode === 'proctor'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Radio className="h-3.5 w-3.5" />
                감독관 시점
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cctv')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  viewMode === 'cctv'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="h-3.5 w-3.5" />
                CCTV 시점
              </button>
            </div>

            {/* Proctor Sub-mode Switcher */}
            {viewMode === 'proctor' && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setProctorPosture('fixed');
                    setWalkTarget(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    proctorPosture === 'fixed'
                      ? 'bg-white text-sky-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Scan className="h-3.5 w-3.5" />
                  교탁 고정 (55°)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProctorPosture('patrol');
                    setAutoSweep(false);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    proctorPosture === 'patrol'
                      ? 'bg-white text-sky-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Footprints className="h-3.5 w-3.5" />
                  순찰 이동 (반경 2m)
                </button>
              </div>
            )}

            {/* Fixed Head Angle Controls */}
            {viewMode === 'proctor' && proctorPosture === 'fixed' && (
              <div className="flex items-center gap-2 pl-1">
                <button
                  type="button"
                  onClick={() => {
                    setAutoSweep(false);
                    setHeadOffsetDeg((prev) => Math.min(68, prev + 15));
                  }}
                  title="고개 좌측 회전"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  좌측
                </button>

                <div className="flex items-center gap-2">
                  <label htmlFor="head-angle-slider" className="sr-only">
                    시야 각도 조절
                  </label>
                  <input
                    id="head-angle-slider"
                    type="range"
                    min={-68}
                    max={68}
                    value={-headOffsetDeg}
                    onChange={(e) => {
                      setAutoSweep(false);
                      setHeadOffsetDeg(-Number(e.target.value));
                    }}
                    className="w-28 accent-sky-600 cursor-pointer"
                  />
                  <span className="text-xs font-mono tabular-nums text-slate-600 w-11 text-right">
                    {-Math.round(headOffsetDeg) > 0
                      ? `+${-Math.round(headOffsetDeg)}`
                      : -Math.round(headOffsetDeg)}
                    °
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAutoSweep(false);
                    setHeadOffsetDeg((prev) => Math.max(-68, prev - 15));
                  }}
                  title="고개 우측 회전"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
                >
                  우측
                  <RotateCw className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setAutoSweep((prev) => !prev)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    autoSweep
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {autoSweep ? '자동 살피기 켜짐' : '자동 살피기'}
                </button>
              </div>
            )}

            {/* Patrol Return Control */}
            {viewMode === 'proctor' && proctorPosture === 'patrol' && (
              <button
                type="button"
                onClick={() => {
                  setWalkTarget({ x: PROCTOR_DESK.x, y: PROCTOR_DESK.y + 36 });
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
              >
                교탁 앞으로 이동
              </button>
            )}
          </div>

          {/* Playback & Later Inspection Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenLaterInspection()}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                heldCount > 0
                  ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              추후 검사 ({heldCount})
            </button>
            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
            >
              {isPaused ? (
                <>
                  <Play className="h-3.5 w-3.5" />
                  재개
                </>
              ) : (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  일시정지
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSimSpeed((s) => (s === 1 ? 2 : 1))}
              className={`px-2.5 py-1.5 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap ${
                simSpeed === 2
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {simSpeed}× 속도
            </button>
          </div>
        </div>

        {/* Two-Zone Simulation Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-8">
            <ClassroomStage
              viewMode={viewMode}
              proctorPosture={proctorPosture}
              proctorPos={proctorPos}
              headOffsetDeg={headOffsetDeg}
              patrolHeadingDeg={patrolHeadingDeg}
              students={session.students}
              selectedStudentId={selectedStudentId}
              activeSubtitle={activeSubtitle}
              elapsedSeconds={session.elapsedSeconds}
              periodNumber={session.periodNumber}
              subjectName={session.subjectName}
              onSelectStudent={(id) => setSelectedStudentId(id)}
              onChangeHeadOffset={(deg) => {
                setAutoSweep(false);
                setHeadOffsetDeg(deg);
              }}
              onMoveProctorTo={(x, y) => setWalkTarget({ x, y })}
            />
          </div>

          <div className="lg:col-span-4">
            <InspectionPanel
              students={session.students}
              selectedStudent={selectedStudent}
              subtitleLog={subtitleLog}
              proctorPosture={proctorPosture}
              onSelectStudent={(id) => setSelectedStudentId(id)}
              onExpelStudent={handleExpelStudent}
              onHoldStudent={handleHoldStudent}
              onClearStudent={handleClearStudent}
              onWalkNearStudent={handleWalkNearStudent}
              onOpenLaterInspection={handleOpenLaterInspection}
            />
          </div>
        </div>
      </main>

      {laterInspectionOpen && (
        <LaterInspectionModal
          students={session.students}
          initialStudentId={laterInspectionTargetId}
          onClose={() => setLaterInspectionOpen(false)}
          onPerformHoldRfCheck={handlePerformHoldRfCheck}
          onPerformHoldPhysicalCheck={handlePerformHoldPhysicalCheck}
          onExpelStudent={handleExpelStudent}
          onClearStudent={handleClearStudent}
        />
      )}

      {showResultModal && (
        <ExamResultModal
          session={session}
          onClose={() => setShowResultModal(false)}
          onStartNextExam={handleStartNextExam}
          onOpenLaterInspection={() => handleOpenLaterInspection()}
        />
      )}
    </div>
  );
}
