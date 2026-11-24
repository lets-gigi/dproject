import { ExamSession, Student, StudentScenarioType } from '../types/simulation';

const SUBJECTS = [
  '국어 영역',
  '수학 영역',
  '영어 영역',
  '한국사 · 탐구',
  '제2외국어',
];

const KOREAN_NAMES = [
  '김서연', '이준호', '박민준', '최지우', '정현우',
  '강예은', '조도윤', '윤하은', '장시우', '임수빈',
  '한태양', '오지민', '서유진', '신동현', '권나연',
  '황민서', '안재현', '송채원', '전우성', '홍서현',
  '백승민', '유다인', '남기훈', '문소율', '양준혁',
  '구하린',
];

const CHEATER_PROFILES = [
  {
    deviceType: '초소형 무선 이어폰',
    rfBand: '2.4GHz BLE',
    behaviorLabel: '머리카락 아래 귀 쪽 반복 손 접촉 및 고개 기울임',
  },
  {
    deviceType: '통신형 스마트워치',
    rfBand: '2.4GHz Wi-Fi/BLE',
    behaviorLabel: '왼손 소매 걷어 손목 화면 반복 응시',
  },
  {
    deviceType: '은닉 스마트폰',
    rfBand: 'LTE / 5G Sub-6',
    behaviorLabel: '책상 아래 시선 고정 및 두 손 은닉 조작',
  },
  {
    deviceType: '초소형 무선 송수신기',
    rfBand: '5.8GHz RF',
    behaviorLabel: '필통 내부 지속적 손 조작 및 주변 곁눈질',
  },
];

const INNOCENT_RF_PROFILES = [
  {
    deviceType: '인가된 의료용 보청기',
    rfBand: '2.4GHz BLE (저전력)',
  },
  {
    deviceType: '전원 미차단 가방 내 기기 (수거함 외)',
    rfBand: '2.4GHz 대기 신호',
  },
];

const INNOCENT_BEHAVIORS = [
  '떨어진 지우개를 찾기 위해 책상 아래 순간 응시',
  '긴장으로 인한 손목 꺾기 및 목 스트레칭 동작',
  '창가 및 복도 방향 찰나의 시선 분산',
];

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generateExamSession(periodNumber: number): ExamSession {
  const subjectName = SUBJECTS[(periodNumber - 1) % SUBJECTS.length];
  const shuffledNames = shuffleArray(KOREAN_NAMES);

  // 20 seats in OUR_ROOM (5 cols x 4 rows)
  const ourIndices = shuffleArray(Array.from({ length: 20 }, (_, i) => i));
  const cheaterCount = periodNumber === 1 ? 3 : 2 + (periodNumber % 2);
  const rfInnocentCount = 1;
  const behaviorInnocentCount = 2;

  const scenarioMap = new Map<number, StudentScenarioType>();
  let cursor = 0;
  for (let i = 0; i < cheaterCount; i++) {
    scenarioMap.set(ourIndices[cursor++], 'cheater');
  }
  for (let i = 0; i < rfInnocentCount; i++) {
    scenarioMap.set(ourIndices[cursor++], 'rf_innocent');
  }
  for (let i = 0; i < behaviorInnocentCount; i++) {
    scenarioMap.set(ourIndices[cursor++], 'behavior_innocent');
  }

  const students: Student[] = [];

  // Seat grid inside OUR_ROOM (x: 44..652, y: 44..556)
  // 5 columns centered around x = 116, 232, 348, 464, 580
  // 4 rows centered around y = 196, 294, 392, 490
  const startX = 116;
  const colStep = 116;
  const startY = 198;
  const rowStep = 96;

  let cheaterProfileIdx = 0;
  let rfInnocentIdx = 0;
  let behaviorInnocentIdx = 0;

  for (let row = 1; row <= 4; row++) {
    for (let col = 1; col <= 5; col++) {
      const idx = (row - 1) * 5 + (col - 1);
      const scenario = scenarioMap.get(idx) ?? 'normal';

      let deviceType: string | null = null;
      let rfBand: string | null = null;
      let behaviorLabel: string | null = null;

      if (scenario === 'cheater') {
        const profile = CHEATER_PROFILES[cheaterProfileIdx % CHEATER_PROFILES.length];
        cheaterProfileIdx++;
        deviceType = profile.deviceType;
        rfBand = profile.rfBand;
        behaviorLabel = profile.behaviorLabel;
      } else if (scenario === 'rf_innocent') {
        const profile = INNOCENT_RF_PROFILES[rfInnocentIdx % INNOCENT_RF_PROFILES.length];
        rfInnocentIdx++;
        deviceType = profile.deviceType;
        rfBand = profile.rfBand;
      } else if (scenario === 'behavior_innocent') {
        behaviorLabel = INNOCENT_BEHAVIORS[behaviorInnocentIdx % INNOCENT_BEHAVIORS.length];
        behaviorInnocentIdx++;
      }

      students.push({
        id: `p${periodNumber}-our-${col}-${row}`,
        seatLabel: `${col}열 ${row}번`,
        col,
        row,
        room: 'our_room',
        name: shuffledNames[idx],
        x: startX + (col - 1) * colStep,
        y: startY + (row - 1) * rowStep,
        scenario,
        deviceType,
        rfBand,
        behaviorLabel,
        rfEmittingNow: scenario === 'cheater' || scenario === 'rf_innocent',
        behaviorActiveNow: false,
        rfTimer: Math.floor(Math.random() * 3) + 1,
        behaviorTimer: Math.floor(Math.random() * 4) + 2,
        status: 'active',
        rfDetected: false,
        rfLastInfo: null,
        cctvDetected: false,
        cctvLastInfo: null,
        suspectedCheating: false,
      });
    }
  }

  // Adjacent classroom (제2시험실) students to visually demonstrate classroom-scoped boundary filtering
  const adjCols = [744, 848];
  const adjRows = [210, 330, 450];
  let adjNameIdx = 20;
  for (let r = 0; r < adjRows.length; r++) {
    for (let c = 0; c < adjCols.length; c++) {
      const hasRfInAdjacent = (r === 0 && c === 0) || (r === 2 && c === 0);
      students.push({
        id: `p${periodNumber}-adj-${c + 1}-${r + 1}`,
        seatLabel: `제2실 ${c + 1}열 ${r + 1}번`,
        col: c + 1,
        row: r + 1,
        room: 'adjacent_room',
        name: shuffledNames[adjNameIdx++ % shuffledNames.length],
        x: adjCols[c],
        y: adjRows[r],
        scenario: hasRfInAdjacent ? 'cheater' : 'normal',
        deviceType: hasRfInAdjacent ? '인접 교실 전자기기 (타 감독관 담당)' : null,
        rfBand: hasRfInAdjacent ? '2.4GHz RF' : null,
        behaviorLabel: null,
        rfEmittingNow: hasRfInAdjacent,
        behaviorActiveNow: false,
        rfTimer: 2,
        behaviorTimer: 99,
        status: 'active',
        rfDetected: false,
        rfLastInfo: null,
        cctvDetected: false,
        cctvLastInfo: null,
        suspectedCheating: false,
      });
    }
  }

  return {
    periodNumber,
    subjectName,
    elapsedSeconds: 0,
    students,
  };
}
