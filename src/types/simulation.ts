export type ViewMode = 'proctor' | 'cctv';

export type ProctorPosture = 'fixed' | 'patrol';

export type StudentStatus = 'active' | 'held' | 'expelled' | 'cleared';

export type StudentScenarioType =
  | 'cheater'
  | 'rf_innocent'
  | 'behavior_innocent'
  | 'normal';

export type RoomId = 'our_room' | 'adjacent_room';

export interface RfDetectionInfo {
  directionText: string;
  locationText: string;
  distanceMeters: number;
  angleDeg: number;
  band: string;
  timestamp: string;
}

export interface CctvDetectionInfo {
  behaviorText: string;
  timestamp: string;
}

export interface Student {
  id: string;
  seatLabel: string;
  col: number;
  row: number;
  room: RoomId;
  name: string;
  x: number;
  y: number;
  scenario: StudentScenarioType;
  deviceType: string | null;
  rfBand: string | null;
  behaviorLabel: string | null;
  rfEmittingNow: boolean;
  behaviorActiveNow: boolean;
  rfTimer: number;
  behaviorTimer: number;
  status: StudentStatus;
  rfDetected: boolean;
  rfLastInfo: RfDetectionInfo | null;
  cctvDetected: boolean;
  cctvLastInfo: CctvDetectionInfo | null;
  suspectedCheating: boolean;
  holdRfChecked?: boolean;
  holdPhysicalChecked?: boolean;
}

export interface SubtitleEvent {
  id: string;
  source: 'RF' | 'CCTV' | 'COMBINED' | 'ACTION';
  studentId?: string;
  seatLabel?: string;
  headline: string;
  detail: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface ExamSession {
  periodNumber: number;
  subjectName: string;
  elapsedSeconds: number;
  students: Student[];
}
