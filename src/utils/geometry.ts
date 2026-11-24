export const STAGE_WIDTH = 960;
export const STAGE_HEIGHT = 600;
export const PIXELS_PER_METER = 72;

export const OUR_ROOM = {
  xMin: 44,
  xMax: 652,
  yMin: 44,
  yMax: 556,
};

export const ADJACENT_ROOM = {
  xMin: 676,
  xMax: 916,
  yMin: 44,
  yMax: 556,
};

export const PROCTOR_DESK = {
  x: 348,
  y: 96,
};

export const FIXED_FOV_DEG = 55;
export const PATROL_RADIUS_METERS = 2.0;
export const PATROL_RADIUS_PX = PATROL_RADIUS_METERS * PIXELS_PER_METER;

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function normalizeAngleDiff(a: number, b: number): number {
  let diff = ((a - b + 180) % 360 + 360) % 360 - 180;
  return diff;
}

export function isInsideOurRoom(x: number, y: number): boolean {
  return (
    x >= OUR_ROOM.xMin &&
    x <= OUR_ROOM.xMax &&
    y >= OUR_ROOM.yMin &&
    y <= OUR_ROOM.yMax
  );
}

/**
 * Ray-wall intersection against OUR_ROOM interior bounds so the 55° FOV cone
 * strictly terminates at our classroom walls and never bleeds into the adjacent room.
 */
export function computeClippedFovPolygon(
  originX: number,
  originY: number,
  centerAngleScreenDeg: number,
  fovDeg: number = FIXED_FOV_DEG
): string {
  const halfFov = fovDeg / 2;
  const steps = 44;
  const points: Array<[number, number]> = [[originX, originY]];

  for (let i = 0; i <= steps; i++) {
    const angleDeg = centerAngleScreenDeg - halfFov + (fovDeg * i) / steps;
    const rad = degToRad(angleDeg);
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);

    let minT = Infinity;

    if (dx > 1e-6) {
      minT = Math.min(minT, (OUR_ROOM.xMax - originX) / dx);
    } else if (dx < -1e-6) {
      minT = Math.min(minT, (OUR_ROOM.xMin - originX) / dx);
    }

    if (dy > 1e-6) {
      minT = Math.min(minT, (OUR_ROOM.yMax - originY) / dy);
    } else if (dy < -1e-6) {
      minT = Math.min(minT, (OUR_ROOM.yMin - originY) / dy);
    }

    if (!Number.isFinite(minT) || minT < 0) {
      minT = 0;
    }

    points.push([originX + dx * minT, originY + dy * minT]);
  }

  return points.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
}

export function isPointInFixedFov(
  originX: number,
  originY: number,
  centerAngleScreenDeg: number,
  targetX: number,
  targetY: number,
  fovDeg: number = FIXED_FOV_DEG
): boolean {
  if (!isInsideOurRoom(targetX, targetY)) return false;
  const angleToTarget = radToDeg(Math.atan2(targetY - originY, targetX - originX));
  const diff = Math.abs(normalizeAngleDiff(angleToTarget, centerAngleScreenDeg));
  return diff <= fovDeg / 2;
}

export function getDistanceMeters(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.hypot(x2 - x1, y2 - y1) / PIXELS_PER_METER;
}

export function isPointInPatrolRadius(
  proctorX: number,
  proctorY: number,
  targetX: number,
  targetY: number
): boolean {
  if (!isInsideOurRoom(targetX, targetY)) return false;
  return getDistanceMeters(proctorX, proctorY, targetX, targetY) <= PATROL_RADIUS_METERS;
}

export function describeDetectionDirection(
  proctorX: number,
  proctorY: number,
  proctorHeadingDeg: number,
  targetX: number,
  targetY: number,
  seatLabel: string,
  col: number,
  row: number,
  mode: 'fixed' | 'patrol'
): {
  directionText: string;
  locationText: string;
  distanceMeters: number;
  angleDeg: number;
} {
  const distanceMeters = getDistanceMeters(proctorX, proctorY, targetX, targetY);
  const angleToTarget = radToDeg(Math.atan2(targetY - proctorY, targetX - proctorX));
  const relativeAngle = normalizeAngleDiff(angleToTarget, proctorHeadingDeg);
  const roundedAngle = Math.round(relativeAngle);

  let zoneSide = '중앙';
  if (col <= 2) zoneSide = '교실 좌측';
  else if (col >= 4) zoneSide = '교실 우측';

  let zoneDepth = '중단';
  if (row === 1) zoneDepth = '앞줄';
  else if (row === 4) zoneDepth = '뒷줄';

  let relDir = '정면';
  if (mode === 'fixed') {
    if (angleToTarget > 105) relDir = '교실 좌측 방향';
    else if (angleToTarget < 75) relDir = '교실 우측 방향';
    else relDir = '교탁 정면 방향';
  } else {
    const absRel = Math.abs(relativeAngle);
    if (absRel <= 25) relDir = '진행 정면';
    else if (absRel >= 155) relDir = '후방';
    else if (relativeAngle > 0) {
      relDir = absRel < 100 ? '우측 전방' : '우측 후방';
    } else {
      relDir = absRel < 100 ? '좌측 전방' : '좌측 후방';
    }
  }

  return {
    directionText: `${relDir} (${roundedAngle >= 0 ? `+${roundedAngle}` : roundedAngle}° · ${distanceMeters.toFixed(1)}m)`,
    locationText: `${zoneSide} ${zoneDepth} ${seatLabel} 부근`,
    distanceMeters,
    angleDeg: roundedAngle,
  };
}

export function formatClock(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
