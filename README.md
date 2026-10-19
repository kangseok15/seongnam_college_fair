# 성남시 대입 진학 박람회 상담 운영 시스템 (ver 1.02)

성남시 수시·정시 대입 박람회의 **30개 상담 부스**를 현장에서 운영하기 위한 웹 프로그램입니다.
사전 신청자 관리, 키오스크 현장 접수·출석 체크, 노쇼 발생 시 대체 배정, 상담 티켓·부스 명패 인쇄,
상담 선생님별 일정 확인, 모바일 대기 현황 조회까지 한 화면에서 처리합니다.

- 화면: React 19 + Vite + Tailwind CSS 4
- 데이터 저장·실시간 동기화: Firebase (Firestore, Google 로그인)
- PC 간 직접 연결(관리자 PC ↔ 키오스크 PC): PeerJS
- 배포: GitHub Pages (GitHub Actions 자동 배포)

---

## 화면별 접속 주소

배포 주소 뒤에 아래 값을 붙이면 각 PC 용도에 맞는 화면이 바로 열립니다.

| 용도 | 주소 끝에 붙이는 값 | 설명 |
|---|---|---|
| 관리자 PC | `?pc=admin&room=2026` | 전체 배정·출결·노쇼 관리, 다른 PC들의 기준(호스트) |
| 출석 체크 키오스크 | `?pc=checkin&room=2026` | 사전 신청자 도착 확인 화면으로 고정 |
| 현장 접수 키오스크 | `?pc=onsite&room=2026` | 현장 신규 접수 화면으로 고정 |
| 상담 선생님 화면 | `?pc=teacher&booth=5` | 해당 부스(1~30) 상담 일정만 표시 |
| 학생 모바일 대기 현황 | `?view=waiting&id=…` | 티켓 QR로 접속, 내 순서 확인 |

`room` 값은 같은 행사장의 PC들을 묶는 방 번호입니다. 관리자 PC와 키오스크 PC가 같은 값을 써야 서로 연결됩니다.

---

## 1. 내 컴퓨터에서 실행하기

[Node.js](https://nodejs.org/) 20 이상이 필요합니다.

```bash
npm install
cp .env.example .env.local   # 그다음 .env.local 에 Firebase 값을 채웁니다
npm run dev                  # http://localhost:3000 에서 열림
```

## 2. GitHub Pages로 배포하기

### ① 저장소 만들기 & 올리기
GitHub에서 새 저장소를 만들고 이 폴더 전체를 올립니다. (`.env.local`과 `node_modules`는 자동으로 제외됩니다)

```bash
git init
git add .
git commit -m "첫 업로드"
git branch -M main
git remote add origin https://github.com/<아이디>/<저장소이름>.git
git push -u origin main
```

### ② Firebase 값을 Secrets에 등록
저장소 **Settings → Secrets and variables → Actions → New repository secret** 에서 아래 8개를 하나씩 등록합니다.
값은 `.env.local`에 적힌 것과 똑같이 넣으면 됩니다. (`VITE_FIREBASE_MEASUREMENT_ID`는 비어 있으면 생략 가능)

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
VITE_FIREBASE_FIRESTORE_DATABASE_ID
```

### ③ Pages 켜기
**Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 바꿉니다.
그다음 **Actions** 탭에서 `GitHub Pages 배포`를 실행(또는 `main`에 다시 push)하면
몇 분 뒤 `https://<아이디>.github.io/<저장소이름>/` 에서 열립니다.

### ④ Firebase에 깃허브 주소 허용 (중요)
이 단계를 빼먹으면 **관리자 Google 로그인이 실패**합니다.

[Firebase 콘솔](https://console.firebase.google.com/) → 해당 프로젝트 → **Authentication → 설정 → 승인된 도메인 → 도메인 추가** 에
`<아이디>.github.io` 를 추가합니다.

---

## 티켓 바로 인쇄

- 기본값: 4자리 번호로 출석 확인하거나 [티켓] 버튼을 누르면 **미리보기 창 없이 바로 인쇄**됩니다.
- 미리보기가 필요한 PC는 **설정 → 티켓 바로 인쇄** 스위치를 끄면 됩니다. (PC별로 저장)
- 브라우저의 인쇄 대화상자까지 없애려면 키오스크 PC의 Chrome을 `--kiosk-printing` 옵션으로 실행하세요.
  1. Chrome 창을 모두 닫습니다.
  2. 바탕화면 Chrome 바로가기 → 우클릭 → 속성 → **대상** 맨 끝에 한 칸 띄우고 `--kiosk-printing` 추가
  3. 그 바로가기로 Chrome을 열면 **기본 프린터**로 즉시 출력됩니다. (Windows 기본 프린터를 영수증 프린터로 지정)

## 관리자 권한

- 기본 관리자 계정: `sophia31511@gmail.com` (`src/utils/firebase.ts`의 `PRIMARY_ADMIN_EMAIL`)
- 관리자가 아닌 계정은 배정 현황 열람과 티켓·명패 인쇄만 가능하고, 배정·출석·노쇼·명단 수정은 막힙니다.
- 관리자를 바꾸려면 위 코드와 `firestore.rules`의 이메일을 **둘 다** 바꾼 뒤 보안 규칙을 다시 배포하세요.

## Firestore 보안 규칙 배포 (선택)

규칙을 고쳤을 때만 필요합니다. [Firebase CLI](https://firebase.google.com/docs/cli) 설치 후:

```bash
firebase login
firebase deploy --only firestore:rules
```

`firebase.json`, `.firebaserc`에 기존 AI Studio 프로젝트·데이터베이스 ID가 들어 있습니다.
새 Firebase 프로젝트로 옮기면 두 파일의 값도 바꿔 주세요.

---

## 폴더 구조

```
├─ .github/workflows/deploy.yml   GitHub Pages 자동 배포
├─ docs/firebase/                 보안 설계 문서, 데이터 구조, 개방형 규칙 초안
├─ src/
│  ├─ App.tsx                     메인 화면·URL별 모드 전환
│  ├─ components/                 관리자 대시보드, 키오스크, 티켓, 명패 등
│  ├─ config/firebaseConfig.ts    환경변수 → Firebase 설정
│  ├─ data/initialData.ts         초기 부스·시간대 데이터
│  ├─ types/                      데이터 타입 정의
│  └─ utils/                      자동 배정 엔진, CSV 읽기, 인쇄, PC 동기화, Firebase
├─ firestore.rules                Firestore 보안 규칙
├─ .env.example                   환경변수 양식
└─ index.html
```

## 저작권

ⓒ 숭신고등학교 진로전담교사 김강석 (cc by-nc) — 자세한 내용은 [LICENSE](LICENSE) 참고
