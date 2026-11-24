import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
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
  ViewMode,
} from '../types/simulation';
import {
  ADJACENT_ROOM,
  FIXED_FOV_DEG,
  OUR_ROOM,
  PATROL_RADIUS_PX,
  PIXELS_PER_METER,
  PROCTOR_DESK,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  computeClippedFovPolygon,
  formatClock,
  isInsideOurRoom,
  isPointInFixedFov,
  isPointInPatrolRadius,
  radToDeg,
} from '../utils/geometry';

interface ClassroomStageProps {
  viewMode: ViewMode;
  proctorPosture: ProctorPosture;
  proctorPos: { x: number; y: number };
  headOffsetDeg: number; // -65 to +65 relative to straight down (90 deg)
  patrolHeadingDeg: number;
  students: Student[];
  selectedStudentId: string | null;
  activeSubtitle: SubtitleEvent | null;
  elapsedSeconds: number;
  periodNumber: number;
  subjectName: string;
  onSelectStudent: (studentId: string) => void;
  onChangeHeadOffset: (offsetDeg: number) => void;
  onMoveProctorTo: (x: number, y: number) => void;
}

export const ClassroomStage: React.FC<ClassroomStageProps> = ({
  viewMode,
  proctorPosture,
  proctorPos,
  headOffsetDeg,
  patrolHeadingDeg,
  students,
  selectedStudentId,
  activeSubtitle,
  elapsedSeconds,
  periodNumber,
  subjectName,
  onSelectStudent,
  onChangeHeadOffset,
  onMoveProctorTo,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isDraggingAim, setIsDraggingAim] = useState(false);

  const isCctv = viewMode === 'cctv';
  const centerAngleScreenDeg = 90 + headOffsetDeg;

  const fovPolygonPoints =
    !isCctv && proctorPosture === 'fixed'
      ? computeClippedFovPolygon(
          PROCTOR_DESK.x,
          PROCTOR_DESK.y,
          centerAngleScreenDeg,
          FIXED_FOV_DEG
        )
      : '';

  const getSvgCoords = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * STAGE_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * STAGE_HEIGHT;
    return { x, y };
  };

  const aimHeadAt = (x: number, y: number) => {
    const rawAngle = radToDeg(Math.atan2(y - PROCTOR_DESK.y, x - PROCTOR_DESK.x));
    let offset = rawAngle - 90;
    if (offset > 180) offset -= 360;
    if (offset < -180) offset += 360;
    const clamped = Math.max(-68, Math.min(68, offset));
    onChangeHeadOffset(Math.round(clamped));
  };

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // Only act on background/floor clicks, student buttons call stopPropagation
    const coords = getSvgCoords(e);
    if (!coords) return;

    if (viewMode === 'proctor' && proctorPosture === 'fixed') {
      if (isInsideOurRoom(coords.x, coords.y)) {
        setIsDraggingAim(true);
        aimHeadAt(coords.x, coords.y);
      }
    } else if (viewMode === 'proctor' && proctorPosture === 'patrol') {
      if (isInsideOurRoom(coords.x, coords.y)) {
        const clampedX = Math.max(OUR_ROOM.xMin + 24, Math.min(OUR_ROOM.xMax - 24, coords.x));
        const clampedY = Math.max(OUR_ROOM.yMin + 24, Math.min(OUR_ROOM.yMax - 24, coords.y));
        onMoveProctorTo(clampedX, clampedY);
      }
    }
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingAim) return;
    if (viewMode !== 'proctor' || proctorPosture !== 'fixed') return;
    const coords = getSvgCoords(e);
    if (!coords) return;
    aimHeadAt(coords.x, coords.y);
  };

  const handleSvgPointerUp = () => {
    setIsDraggingAim(false);
  };

  // Grid lines every 1 meter (72px) inside OUR_ROOM
  const verticalGridLines: number[] = [];
  for (let gx = OUR_ROOM.xMin + PIXELS_PER_METER; gx < OUR_ROOM.xMax; gx += PIXELS_PER_METER) {
    verticalGridLines.push(gx);
  }
  const horizontalGridLines: number[] = [];
  for (let gy = OUR_ROOM.yMin + PIXELS_PER_METER; gy < OUR_ROOM.yMax; gy += PIXELS_PER_METER) {
    horizontalGridLines.push(gy);
  }

  return (
    <div
      className={`relative overflow-hidden rounded-xl border transition-colors duration-200 ${
        isCctv
          ? 'border-slate-800 bg-slate-950'
          : 'border-slate-200 bg-white'
      }`}
    >
      {/* Subtle Top Viewport Bar inside Stage */}
      <div
        className={`flex items-center justify-between px-4 py-2.5 border-b text-xs ${
          isCctv
            ? 'border-slate-800 bg-slate-900/90 text-slate-300'
            : 'border-slate-100 bg-slate-50/80 text-slate-600'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isCctv ? (
            <>
              <Camera className="h-3.5 w-3.5 text-sky-400" />
              <span className="font-semibold text-slate-100">
                CCTV 천장 광각 (CAM-01)
              </span>
              <span aria-hidden="true">·</span>
              <span>제1시험실 행동 이상 감지 활성</span>
            </>
          ) : (
            <>
              {proctorPosture === 'fixed' ? (
                <Radio className="h-3.5 w-3.5 text-sky-600" />
              ) : (
                <Footprints className="h-3.5 w-3.5 text-sky-600" />
              )}
              <span className="font-semibold text-slate-900">
                {proctorPosture === 'fixed'
                  ? '감독관 교탁 고정 감시 (시야각 55°)'
                  : '감독관 순찰 이동 감시 (반경 2.0m)'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {proctorPosture === 'fixed'
                  ? '화면 클릭/드래그로 고개 방향 조절 (우리 교실 한정)'
                  : '바닥 클릭 또는 WASD·방향키로 이동'}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 font-mono tabular-nums">
          <span>
            {periodNumber}교시 {subjectName}
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatClock(elapsedSeconds)}
          </span>
        </div>
      </div>

      {/* Main Interactive SVG Floorplan / CCTV Feed */}
      <div className="relative select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`}
          className={`w-full h-auto block ${
            viewMode === 'proctor' ? 'cursor-crosshair' : 'cursor-default'
          }`}
          onPointerDown={handleSvgPointerDown}
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
          onPointerLeave={handleSvgPointerUp}
        >
          <defs>
            <pattern
              id="adjacentHatch"
              width="12"
              height="12"
              patternTransform="rotate(45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="12"
                stroke={isCctv ? '#1e293b' : '#cbd5e1'}
                strokeWidth="1.5"
              />
            </pattern>
            <radialGradient id="fovGradient" cx="50%" cy="0%" r="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.28" />
              <stop offset="70%" stopColor="#0284c7" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.04" />
            </radialGradient>
            <radialGradient id="patrolGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.06" />
              <stop offset="75%" stopColor="#0284c7" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.26" />
            </radialGradient>
          </defs>

          {/* Outer Stage Background */}
          <rect
            x={0}
            y={0}
            width={STAGE_WIDTH}
            height={STAGE_HEIGHT}
            fill={isCctv ? '#020617' : '#f1f5f9'}
          />

          {/* OUR ROOM (제1시험실 - Active Inspection Area) */}
          <rect
            x={OUR_ROOM.xMin}
            y={OUR_ROOM.yMin}
            width={OUR_ROOM.xMax - OUR_ROOM.xMin}
            height={OUR_ROOM.yMax - OUR_ROOM.yMin}
            rx={4}
            fill={isCctv ? '#0b1120' : '#ffffff'}
            stroke={isCctv ? '#334155' : '#64748b'}
            strokeWidth={3}
          />

          {/* 1m Coordinate Grid inside OUR_ROOM */}
          {verticalGridLines.map((gx) => (
            <line
              key={`vg-${gx}`}
              x1={gx}
              y1={OUR_ROOM.yMin}
              x2={gx}
              y2={OUR_ROOM.yMax}
              stroke={isCctv ? '#1e293b' : '#f1f5f9'}
              strokeWidth={1}
              strokeDasharray={isCctv ? '4 4' : undefined}
            />
          ))}
          {horizontalGridLines.map((gy) => (
            <line
              key={`hg-${gy}`}
              x1={OUR_ROOM.xMin}
              y1={gy}
              x2={OUR_ROOM.xMax}
              y2={gy}
              stroke={isCctv ? '#1e293b' : '#f1f5f9'}
              strokeWidth={1}
              strokeDasharray={isCctv ? '4 4' : undefined}
            />
          ))}

          {/* Classroom Labels & Front Chalkboard */}
          <rect
            x={218}
            y={OUR_ROOM.yMin + 4}
            width={260}
            height={12}
            rx={2}
            fill={isCctv ? '#1e293b' : '#334155'}
          />
          <text
            x={348}
            y={OUR_ROOM.yMin + 30}
            textAnchor="middle"
            className="text-[11px] font-medium"
            fill={isCctv ? '#64748b' : '#64748b'}
          >
            제1시험실 (우리 교실 · 감시 구역)
          </text>

          {/* Scale Bar (1m indicator) */}
          <g transform={`translate(${OUR_ROOM.xMin + 14}, ${OUR_ROOM.yMax - 18})`}>
            <line
              x1={0}
              y1={0}
              x2={PIXELS_PER_METER}
              y2={0}
              stroke={isCctv ? '#475569' : '#94a3b8'}
              strokeWidth={1.5}
            />
            <line x1={0} y1={-4} x2={0} y2={4} stroke={isCctv ? '#475569' : '#94a3b8'} strokeWidth={1.5} />
            <line
              x1={PIXELS_PER_METER}
              y1={-4}
              x2={PIXELS_PER_METER}
              y2={4}
              stroke={isCctv ? '#475569' : '#94a3b8'}
              strokeWidth={1.5}
            />
            <text
              x={PIXELS_PER_METER + 6}
              y={4}
              className="text-[10px] font-mono"
              fill={isCctv ? '#64748b' : '#64748b'}
            >
              1.0m 축척
            </text>
          </g>

          {/* ADJACENT ROOM (제2시험실 - Excluded from our detection) */}
          <rect
            x={ADJACENT_ROOM.xMin}
            y={ADJACENT_ROOM.yMin}
            width={ADJACENT_ROOM.xMax - ADJACENT_ROOM.xMin}
            height={ADJACENT_ROOM.yMax - ADJACENT_ROOM.yMin}
            rx={4}
            fill={isCctv ? '#090d16' : '#f8fafc'}
            stroke={isCctv ? '#1e293b' : '#cbd5e1'}
            strokeWidth={2}
          />
          <rect
            x={ADJACENT_ROOM.xMin}
            y={ADJACENT_ROOM.yMin}
            width={ADJACENT_ROOM.xMax - ADJACENT_ROOM.xMin}
            height={ADJACENT_ROOM.yMax - ADJACENT_ROOM.yMin}
            rx={4}
            fill="url(#adjacentHatch)"
            opacity={0.45}
          />

          {/* Partition Wall Marker */}
          <rect
            x={OUR_ROOM.xMax}
            y={OUR_ROOM.yMin}
            width={ADJACENT_ROOM.xMin - OUR_ROOM.xMax}
            height={OUR_ROOM.yMax - OUR_ROOM.yMin}
            fill={isCctv ? '#1e293b' : '#cbd5e1'}
          />
          <text
            x={(OUR_ROOM.xMax + ADJACENT_ROOM.xMin) / 2}
            y={300}
            textAnchor="middle"
            transform={`rotate(-90 ${(OUR_ROOM.xMax + ADJACENT_ROOM.xMin) / 2} 300)`}
            className="text-[10px] font-medium tracking-wider"
            fill={isCctv ? '#94a3b8' : '#475569'}
          >
            교실 경계벽 (전파 차단 범위)
          </text>

          <text
            x={(ADJACENT_ROOM.xMin + ADJACENT_ROOM.xMax) / 2}
            y={OUR_ROOM.yMin + 30}
            textAnchor="middle"
            className="text-[11px] font-medium"
            fill={isCctv ? '#475569' : '#64748b'}
          >
            제2시험실 (타 감독관 구역)
          </text>
          <text
            x={(ADJACENT_ROOM.xMin + ADJACENT_ROOM.xMax) / 2}
            y={OUR_ROOM.yMin + 47}
            textAnchor="middle"
            className="text-[10px]"
            fill={isCctv ? '#475569' : '#94a3b8'}
          >
            {isCctv ? 'CAM-01 촬영 범위 외' : '검사 범위 제외 구역'}
          </text>

          {/* Another Proctor desk in Adjacent Room */}
          <g opacity={0.55}>
            <rect
              x={764}
              y={88}
              width={64}
              height={22}
              rx={3}
              fill={isCctv ? '#1e293b' : '#cbd5e1'}
            />
            <circle cx={796} cy={100} r={9} fill={isCctv ? '#334155' : '#94a3b8'} />
            <text
              x={796}
              y={128}
              textAnchor="middle"
              className="text-[10px]"
              fill={isCctv ? '#475569' : '#64748b'}
            >
              타 교실 감독관
            </text>
          </g>

          {/* Front Desk (교탁) in OUR_ROOM */}
          <rect
            x={PROCTOR_DESK.x - 48}
            y={PROCTOR_DESK.y - 14}
            width={96}
            height={28}
            rx={4}
            fill={isCctv ? '#1e293b' : '#e2e8f0'}
            stroke={isCctv ? '#475569' : '#94a3b8'}
            strokeWidth={1.5}
          />
          <text
            x={PROCTOR_DESK.x}
            y={PROCTOR_DESK.y + 4}
            textAnchor="middle"
            className="text-[10px] font-semibold"
            fill={isCctv ? '#94a3b8' : '#475569'}
          >
            교탁
          </text>

          {/* PROCTOR DETECTION FIELD (Only in Proctor View) */}
          {!isCctv && proctorPosture === 'fixed' && fovPolygonPoints && (
            <g className="pointer-events-none">
              <polygon
                points={fovPolygonPoints}
                fill="url(#fovGradient)"
                stroke="#0284c7"
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
              {/* Center Gaze Line */}
              <line
                x1={PROCTOR_DESK.x}
                y1={PROCTOR_DESK.y}
                x2={
                  PROCTOR_DESK.x +
                  Math.cos((centerAngleScreenDeg * Math.PI) / 180) * 160
                }
                y2={
                  PROCTOR_DESK.y +
                  Math.sin((centerAngleScreenDeg * Math.PI) / 180) * 160
                }
                stroke="#0284c7"
                strokeWidth={1.25}
                strokeDasharray="3 3"
                opacity={0.7}
              />
            </g>
          )}

          {!isCctv && proctorPosture === 'patrol' && (
            <g className="pointer-events-none">
              {/* Clip patrol circle cleanly to OUR_ROOM visually */}
              <clipPath id="ourRoomClip">
                <rect
                  x={OUR_ROOM.xMin}
                  y={OUR_ROOM.yMin}
                  width={OUR_ROOM.xMax - OUR_ROOM.xMin}
                  height={OUR_ROOM.yMax - OUR_ROOM.yMin}
                />
              </clipPath>
              <g clipPath="url(#ourRoomClip)">
                <circle
                  cx={proctorPos.x}
                  cy={proctorPos.y}
                  r={PATROL_RADIUS_PX}
                  fill="url(#patrolGradient)"
                  stroke="#0284c7"
                  strokeWidth={1.75}
                  strokeDasharray="6 4"
                />
                <text
                  x={proctorPos.x}
                  y={proctorPos.y - PATROL_RADIUS_PX + 16}
                  textAnchor="middle"
                  className="text-[10px] font-mono font-semibold"
                  fill="#0369a1"
                >
                  2.0m 전파 감지 반경
                </text>
              </g>
            </g>
          )}

          {/* STUDENTS (OUR_ROOM & ADJACENT_ROOM) */}
          {students.map((student) => {
            const isAdj = student.room === 'adjacent_room';
            const isSelected = student.id === selectedStudentId;
            const isExpelled = student.status === 'expelled';

            const inCurrentRfScan =
              !isCctv &&
              !isAdj &&
              !isExpelled &&
              (proctorPosture === 'fixed'
                ? isPointInFixedFov(
                    PROCTOR_DESK.x,
                    PROCTOR_DESK.y,
                    centerAngleScreenDeg,
                    student.x,
                    student.y
                  )
                : isPointInPatrolRadius(
                    proctorPos.x,
                    proctorPos.y,
                    student.x,
                    student.y
                  ));

            const showActiveRfPulse =
              !isCctv &&
              !isExpelled &&
              student.rfEmittingNow &&
              (inCurrentRfScan || isAdj);

            const showCctvAlert =
              isCctv && !isAdj && !isExpelled && student.behaviorActiveNow;

            // Colors
            let deskFill = isCctv ? '#111827' : '#ffffff';
            let deskStroke = isCctv ? '#334155' : '#cbd5e1';
            let avatarFill = isCctv ? '#334155' : '#e2e8f0';
            let statusBadgeText = '';
            let statusBadgeBg = '';

            if (isAdj) {
              deskFill = isCctv ? '#0f172a' : '#f1f5f9';
              deskStroke = isCctv ? '#1e293b' : '#cbd5e1';
              avatarFill = isCctv ? '#1e293b' : '#cbd5e1';
            } else if (isExpelled) {
              deskFill = isCctv ? '#090d16' : '#f8fafc';
              deskStroke = isCctv ? '#1e293b' : '#e2e8f0';
              avatarFill = 'transparent';
              statusBadgeText = '퇴실';
              statusBadgeBg = '#64748b';
            } else if (student.suspectedCheating) {
              deskStroke = '#dc2626';
              avatarFill = isCctv ? '#7f1d1d' : '#fee2e2';
              statusBadgeText = '의심';
              statusBadgeBg = '#dc2626';
            } else if (student.status === 'held') {
              deskStroke = '#d97706';
              avatarFill = isCctv ? '#78350f' : '#fef3c7';
              statusBadgeText = '보류';
              statusBadgeBg = '#d97706';
            } else if (student.status === 'cleared') {
              deskStroke = '#059669';
              avatarFill = isCctv ? '#064e3b' : '#d1fae5';
              statusBadgeText = '정상';
              statusBadgeBg = '#059669';
            } else if (student.rfDetected || student.cctvDetected) {
              deskStroke = '#0284c7';
              avatarFill = isCctv ? '#0c4a6e' : '#e0f2fe';
              statusBadgeText = student.rfDetected ? '전파' : '행동';
              statusBadgeBg = '#0284c7';
            }

            if (isAdj) {
              return (
                <g key={student.id} opacity={0.55}>
                  <rect
                    x={student.x - 24}
                    y={student.y - 16}
                    width={48}
                    height={32}
                    rx={4}
                    fill={deskFill}
                    stroke={deskStroke}
                    strokeWidth={1}
                  />
                  <circle cx={student.x} cy={student.y} r={9} fill={avatarFill} />
                  {/* Subtle visual note of adjacent RF signal being ignored */}
                  {!isCctv && student.rfEmittingNow && (
                    <g>
                      <circle
                        cx={student.x}
                        cy={student.y}
                        r={18}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                      />
                      <text
                        x={student.x}
                        y={student.y + 28}
                        textAnchor="middle"
                        className="text-[9px]"
                        fill="#94a3b8"
                      >
                        타 교실 신호(제외)
                      </text>
                    </g>
                  )}
                </g>
              );
            }

            return (
              <g
                key={student.id}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectStudent(student.id);
                }}
                className="cursor-pointer group"
              >
                {/* Selected Highlight Halo */}
                {isSelected && (
                  <rect
                    x={student.x - 36}
                    y={student.y - 28}
                    width={72}
                    height={56}
                    rx={8}
                    fill="none"
                    stroke={isCctv ? '#38bdf8' : '#0f172a'}
                    strokeWidth={2}
                  />
                )}

                {/* Active RF Wave Ripple when inside Proctor FOV/Radius */}
                {showActiveRfPulse && (
                  <g className="pointer-events-none">
                    <circle
                      cx={student.x}
                      cy={student.y}
                      r={24}
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth={2}
                      opacity={0.75}
                    />
                    <circle
                      cx={student.x}
                      cy={student.y}
                      r={34}
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth={1.25}
                      strokeDasharray="4 3"
                      opacity={0.55}
                    />
                  </g>
                )}

                {/* Active CCTV Tracking Reticle */}
                {showCctvAlert && (
                  <g className="pointer-events-none">
                    <rect
                      x={student.x - 34}
                      y={student.y - 26}
                      width={68}
                      height={52}
                      rx={4}
                      fill="rgba(245, 158, 11, 0.14)"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                    />
                    <text
                      x={student.x}
                      y={student.y - 31}
                      textAnchor="middle"
                      className="text-[10px] font-semibold"
                      fill="#fbbf24"
                    >
                      특이행동 포착
                    </text>
                  </g>
                )}

                {/* Desk */}
                <rect
                  x={student.x - 28}
                  y={student.y - 18}
                  width={56}
                  height={36}
                  rx={5}
                  fill={deskFill}
                  stroke={deskStroke}
                  strokeWidth={student.suspectedCheating || isSelected ? 2 : 1.5}
                />

                {/* Student Head / Seat Circle */}
                {!isExpelled ? (
                  <circle
                    cx={student.x}
                    cy={student.y - 2}
                    r={10}
                    fill={avatarFill}
                    stroke={deskStroke}
                    strokeWidth={1.2}
                  />
                ) : (
                  <line
                    x1={student.x - 7}
                    y1={student.y - 8}
                    x2={student.x + 7}
                    y2={student.y + 4}
                    stroke="#94a3b8"
                    strokeWidth={1.5}
                  />
                )}

                {/* Name & Seat Label */}
                <text
                  x={student.x}
                  y={student.y + 13}
                  textAnchor="middle"
                  className="text-[10px] font-medium"
                  fill={
                    isExpelled
                      ? '#94a3b8'
                      : isCctv
                      ? '#e2e8f0'
                      : '#1e293b'
                  }
                >
                  {student.name}
                </text>
                <text
                  x={student.x}
                  y={student.y + 30}
                  textAnchor="middle"
                  className="text-[9px] font-mono tabular-nums"
                  fill={isCctv ? '#64748b' : '#64748b'}
                >
                  {student.seatLabel}
                </text>

                {/* Compact Corner Status Tag */}
                {statusBadgeText && (
                  <g transform={`translate(${student.x + 12}, ${student.y - 23})`}>
                    <rect
                      x={0}
                      y={0}
                      width={26}
                      height={14}
                      rx={3}
                      fill={statusBadgeBg}
                    />
                    <text
                      x={13}
                      y={10}
                      textAnchor="middle"
                      className="text-[8.5px] font-semibold"
                      fill="#ffffff"
                    >
                      {statusBadgeText}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* PROCTOR CHARACTER MARKER (Visible in both views!) */}
          <g
            transform={`translate(${
              proctorPosture === 'fixed' ? PROCTOR_DESK.x : proctorPos.x
            }, ${
              proctorPosture === 'fixed' ? PROCTOR_DESK.y : proctorPos.y
            })`}
            className="pointer-events-none"
          >
            {/* Direction Pointer */}
            <g
              transform={`rotate(${
                proctorPosture === 'fixed'
                  ? centerAngleScreenDeg
                  : patrolHeadingDeg
              })`}
            >
              <polygon
                points="14,-5 24,0 14,5"
                fill={isCctv ? '#38bdf8' : '#0284c7'}
              />
            </g>
            <circle
              cx={0}
              cy={0}
              r={13}
              fill={isCctv ? '#0284c7' : '#0f172a'}
              stroke="#ffffff"
              strokeWidth={2}
            />
            <text
              x={0}
              y={3.5}
              textAnchor="middle"
              className="text-[9px] font-bold"
              fill="#ffffff"
            >
              감독
            </text>
          </g>

          {/* CCTV Viewfinder Corner Marks */}
          {isCctv && (
            <g className="pointer-events-none" stroke="#38bdf8" strokeWidth={2} opacity={0.5}>
              <polyline points="20,40 20,20 40,20" fill="none" />
              <polyline points={`${STAGE_WIDTH - 40},20 ${STAGE_WIDTH - 20},20 ${STAGE_WIDTH - 20},40`} fill="none" />
              <polyline points={`20,${STAGE_HEIGHT - 40} 20,${STAGE_HEIGHT - 20} 40,${STAGE_HEIGHT - 20}`} fill="none" />
              <polyline points={`${STAGE_WIDTH - 40},${STAGE_HEIGHT - 20} ${STAGE_WIDTH - 20},${STAGE_HEIGHT - 20} ${STAGE_WIDTH - 20},${STAGE_HEIGHT - 40}`} fill="none" />
            </g>
          )}
        </svg>

        {/* SUBTITLE BAR (자막 출력 영역) */}
        <div
          className={`border-t px-4 py-3 transition-colors ${
            isCctv
              ? 'border-slate-800 bg-slate-900 text-slate-100'
              : 'border-slate-200 bg-slate-900 text-white'
          }`}
          role="status"
          aria-live="polite"
        >
          {activeSubtitle ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`mt-0.5 inline-flex items-center gap-1.5 shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold ${
                    activeSubtitle.severity === 'critical'
                      ? 'bg-red-600 text-white'
                      : activeSubtitle.severity === 'warning'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-sky-600 text-white'
                  }`}
                >
                  {activeSubtitle.severity === 'critical' ? (
                    <ShieldAlert className="h-3.5 w-3.5" />
                  ) : activeSubtitle.source === 'CCTV' ? (
                    <Camera className="h-3.5 w-3.5" />
                  ) : activeSubtitle.source === 'ACTION' ? (
                    activeSubtitle.headline.includes('퇴실') ? (
                      <UserX className="h-3.5 w-3.5" />
                    ) : (
                      <UserCheck className="h-3.5 w-3.5" />
                    )
                  ) : (
                    <Radio className="h-3.5 w-3.5" />
                  )}
                  {activeSubtitle.source === 'RF'
                    ? '전파 자막'
                    : activeSubtitle.source === 'CCTV'
                    ? 'CCTV 자막'
                    : activeSubtitle.source === 'COMBINED'
                    ? '부정행위 의심'
                    : '조치 알림'}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug text-white">
                    {activeSubtitle.headline}
                  </p>
                  <p className="text-xs text-slate-300 mt-0.5 truncate">
                    {activeSubtitle.detail}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  {activeSubtitle.timestamp}
                </span>
                {activeSubtitle.studentId && (
                  <button
                    type="button"
                    onClick={() => onSelectStudent(activeSubtitle.studentId!)}
                    className="px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    학생 확인
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-slate-500" />
                <span>
                  자막 대기 중 · 감독관 시점에서 고개를 돌리거나 순찰 이동하고, CCTV 시점에서 특이 행동을 확인하세요.
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                정상 감시 중
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
