# Product Requirements Document: Exam Electronic Device Detection Simulator

## 1. Product Scope

### 1.1 Overview
The **Exam Electronic Device Detection Simulator** (`시험장 전자기기 감지 시뮬레이터`) is an interactive web-based proctoring simulation built for monitoring exam rooms and identifying unauthorized electronic devices. The user assumes the role of an exam proctor overseeing **Room 1 (`제1시험실`)** while an adjacent room (**Room 2 / `제2시험실`**) operates independently under another proctor.

### 1.2 Objectives & Boundaries
- **Multi-Perspective Verification**: Combine active radio-frequency (RF) scanning from the proctor's perspective with visual posture/behavior monitoring from an overhead CCTV feed.
- **Classroom-Scoped Isolation**: Restrict RF detection strictly to Room 1 (`OUR_ROOM`), ensuring signals originating from Room 2 (`ADJACENT_ROOM`) do not trigger false alerts.
- **Evidence-Based Decision Making**: Support both immediate expulsion for clear violations and a **Hold (`보류`)** workflow with a dedicated **Later Inspection (`추후 정밀 검사`)** console to minimize false expulsions.
- **Multi-Session Replayability**: Allow proctors to review round accuracy and advance across sequential exam periods (`1교시` → `2교시` → ...) with freshly generated student cohorts and cheating scenarios.

---

## 2. Core Features & Detection Logic

### 2.1 Viewpoints & Modes

| Viewpoint | Sub-Mode | Spatial Mechanism | Scope & Limits |
| :--- | :--- | :--- | :--- |
| **Proctor View (`감독관 시점`)** | **Fixed Desk (`교탁 고정`)** | Projects a **55° field-of-view (FOV)** cone from the front desk (`PROCTOR_DESK`). Head orientation rotates from `-68°` to `+68°` via pointer drag/click, angle slider, left/right rotation buttons, `A`/`D` or `←`/`→` keys, or `Auto Sweep`. | Ray-wall intersection (`computeClippedFovPolygon`) clips the 55° cone against `OUR_ROOM` interior boundaries so it never crosses into `ADJACENT_ROOM`. |
| **Proctor View (`감독관 시점`)** | **Patrol Walk (`순찰 이동`)** | Proctor navigates freely inside `OUR_ROOM` via floor clicks, `WASD`/Arrow keys, or one-click proximity navigation. Projects an omnidirectional **2.0m radius (`144px` at `72px/m`)** detection zone. | Euclidean distance check (`isPointInPatrolRadius`) detects all active RF emitters within `2.0m` inside `OUR_ROOM` only. |
| **CCTV View (`CCTV 시점`)** | **Overhead Wide-Angle (`CAM-01`)** | Switches the spatial stage to a dark overhead camera view monitoring all 20 seats in `OUR_ROOM` (excluding RF waves and `ADJACENT_ROOM`). | Highlights active suspicious physical behaviors with a tracking reticle when `behaviorActiveNow` triggers. |

### 2.2 Detection & Subtitle Engine
- **RF Detection Subtitles (`전파 자막`)**: When an emitting student inside `OUR_ROOM` falls inside the active 55° cone or 2.0m patrol circle, `describeDetectionDirection` calculates relative direction (left/center/right, front/rear), angle in degrees, distance in meters, seat region, and frequency band (`2.4GHz BLE`, `5.8GHz RF`, `LTE / 5G Sub-6`, etc.), posting a live subtitle at the bottom of the stage and in `자막 기록`.
- **CCTV Behavior Subtitles (`CCTV 자막`)**: When a student exhibits unusual physical behavior while CCTV View is active, a live subtitle reports the seat label, student name, and observed behavior.
- **Simultaneous Cheating Suspicion (`부정행위 의심`)**: When a student records **both** an RF detection (`rfDetected === true`) and a CCTV behavioral anomaly (`cctvDetected === true`), the student is automatically flagged as `suspectedCheating = true` with a critical-severity subtitle and inspection alert.

### 2.3 Student Scenarios (Ground Truth)
Each exam period populates 20 seats (`5 cols × 4 rows`) in `OUR_ROOM` and 6 reference seats in `ADJACENT_ROOM`:
- **`cheater`**: Carries an unauthorized device (`초소형 무선 이어폰`, `통신형 스마트워치`, `은닉 스마트폰`, `초소형 무선 송수신기`) emitting RF pulses and intermittently triggers suspicious CCTV behaviors.
- **`rf_innocent`**: Carries a benign RF source (`인가된 의료용 보청기`, `전원 미차단 가방 내 기기`) with normal exam posture (no CCTV anomalies).
- **`behavior_innocent`**: Exhibits nervous fidgeting on CCTV (dropping an eraser, stretching) with zero RF emissions.
- **`normal`**: Emits neither RF signals nor suspicious CCTV behaviors.
- **`adjacent_room`**: Includes RF-emitting students in `제2시험실` to visually demonstrate that cross-room signals are excluded by the classroom boundary filter.

---

## 3. User Flows

### 3.1 Primary Proctoring Loop
1. **Monitor from Front Desk**: Start in `감독관 시점` (`교탁 고정 55°`). Turn the proctor's head to scan rows and observe RF direction/location subtitles.
2. **Patrol & Cross-Check**: Switch to `순찰 이동 (반경 2m)` to approach suspected seats or switch to `CCTV 시점` to verify whether RF-emitting seats also exhibit suspicious behavior.
3. **Select & Inspect Student**: Click any seat on the floorplan/CCTV feed or click `학생 확인` on a subtitle to load the student's RF and CCTV evidence matrix in `InspectionPanel`.
4. **Execute Decision**:
   - **Immediate Expulsion (`즉시 퇴실`)**: Immediately removes the student and logs whether an unauthorized device was actually recovered (True Positive vs. False Expulsion).
   - **Hold for Later Inspection (`보류 (추후 검사)`)**: Places uncertain cases into the hold queue for dedicated post-hold verification.

### 3.2 Dedicated Post-Hold Later Inspection Flow (`LaterInspectionModal`)
1. Open **추후 정밀 검사** via the toolbar (`추후 검사 (N)`), the `보류 명단` tab, a held student's detail panel, or the end-of-period summary prompt.
2. Select a held student from the queue and run two verification steps:
   - **0.5m Close-Range RF Scan (`휴대용 스캐너 초근접 전파 검사`)**: Distinguishes unauthorized active transmissions from benign low-power medical/bag signals or complete absence of RF.
   - **Physical & Belongings Inspection (`소지품 · 착용물 대면 물리 검사`)**: Confirms physical possession of hidden devices vs. authorized medical devices or innocent behavior.
3. Render final verdict: **`최종 퇴실 조치`** (Expel) or **`정상 판정 (보류 해제)`** (Clear).

### 3.3 Exam Progression Flow (`ExamResultModal`)
1. Click **`다음 시험`** in the top bar to view the current period summary (`실제 부정행위자`, `적발 퇴실 성공`, `미적발 인원`, `오인 퇴실`, plus any remaining held students).
2. Either return to inspect remaining held students or click **`다음 시험 시작`** to generate the next exam period (`2교시 수학 영역`, `3교시 영어 영역`, etc.) with randomized seating and scenarios.

---

## 4. Technical Stack Specifications

| Layer | Specification |
| :--- | :--- |
| **Architecture** | Zero-framework, zero-build single-file application (`index.html`) with inline `<style>` and classic `<script>` |
| **External Libraries** | Google Fonts CDN only (`Plus Jakarta Sans`, `Noto Sans KR`, `JetBrains Mono`) with system font fallback |
| **Local Execution** | Runs directly when double-clicked in any modern browser (`file://` protocol safe, no ES module or server dependency) |
| **Spatial & Simulation Engine** | Custom SVG coordinate stage (`960×600`, `72px = 1.0m`), ray-wall intersection FOV polygon clipping, Euclidean 2.0m proximity detection, dual-speed (`1×`/`2×`) tick loop |
| **Deployment Target** | Direct GitHub upload and zero-build static Vercel deployment via `vercel.json` (`cleanUrls: true`) |
