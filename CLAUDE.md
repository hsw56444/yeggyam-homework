# 예그얌 숙제관리 — 프로젝트 컨텍스트

새로 들어온 Claude 세션이 이 문서를 읽고 작업을 이어갈 수 있도록 정리한 컨텍스트.

## 프로젝트 목적
- 학원에서 학생들의 숙제 진행 상황을 입력·관리
- 학부모에게 이미지 파일로 공유 (이미지 출력 기능은 미구현 — 다음 작업)
- 사용자: 교사 1명 (관리자), 학생/학부모는 보지 않음 (URL 비공개)
- **개발자(hsw5644)가 다른 사람에게 만들어 주는 도구**, 본인이 쓰는 게 아님

## 기술 스택
- **React + Vite + Tailwind CSS** (출석앱 `attendance-app`과 동일 스택)
- **Firebase Firestore** — 프로젝트 `yeggyam-attendance` **공유**, 컬렉션 prefix `hw_*` 로 격리
- `react-router-dom` — 라우팅 + `?view=mobile|pc` URL 파라미터
- `html2canvas` (설치만 됨, 미사용 — 이미지 출력 단계에서 사용 예정)

## 핵심 결정 사항 (이미 합의됨)

| 항목 | 결정 |
|---|---|
| Firebase 프로젝트 | 출석앱과 공유 (`yeggyam-attendance`), 컬렉션 prefix `hw_*` 로 격리 |
| 인증 | 없음 — URL 비공개 전제로 `allow read, write: if true` |
| 디자인 | 모바일 우선 (Galaxy S26 412dp 기준), Tailwind 반응형 |
| 뷰 모드 | `?view=mobile` `?view=pc` URL 강제 + 헤더 토글 버튼 (📱 💻 Auto) |
| 학부모 공유 | 이미지 다운로드 (PNG, html2canvas 예정) |
| 시간표 정책 | 학생은 반 시간표를 그대로 따름 (학생 개별 시간표 없음) |
| 월 자동 복사 | 한 달 → 다음 달 시간표·교재 자동 복사 (이전 단계에서 만들었다가 모달 통합 시 제거됨) |

## 데이터 모델 (Firestore)

```
yeggyam-attendance (Firebase 프로젝트, 출석앱과 공유)
├── (출석앱 컬렉션들 — 건드리지 않음)
└── hw_*                                 ← 이 앱의 데이터
    ├── hw_classes/{classId}              { name, schedule: [요일0~6], createdAt }
    ├── hw_students/{studentId}           { name, classId, createdAt }
    └── hw_homework/{YYYY-MM}/items/{studentId}_{YYYY-MM-DD}
        {
          studentId, date,
          classMaterial:    { name, memo, status },  // 수업교재
          homeworkMaterial: { name, memo, status },  // 숙제교재
          updatedAt
        }
```

- 결정적 doc ID (`${studentId}_${date}`) — 같은 (학생·날짜) 는 1개 doc, `setDoc(merge:true)` 로 upsert
- `status`: `'done' | 'partial' | 'none' | null` — 끝남 / 진행중 / 안 함 / 미입력
- 수업교재·숙제교재는 각각 독립적인 상태 가짐 (사용자 요구)
- 레거시 `items[]` 배열 데이터(초기 단계 데이터)는 `normalizeDoc` 으로 읽기 시 변환

## 라우트 (3개)

| URL | 페이지 | 설명 |
|---|---|---|
| `/` | `CalendarPage` | 달력 + 숙제 등록·수정·상태 입력 (핵심) |
| `/students` | `StudentsPage` | 학생 이름 + 반 등록·관리 (반별 그룹화, 가나다 정렬) |
| `/classes` | `ClassesPage` | 반 이름 + 요일 시간표 등록·관리 |

(예전엔 `/homework`, `/textbooks` 도 있었으나, 사용자 요구로 달력에 통합·삭제됨)

## 달력 페이지 동작

1. 학생 선택 + 월 네비게이션 (◀ ▶ 오늘)
2. **빈 칸 클릭** → `HomeworkDayModal` (그 날짜 단발 등록·수정)
3. **숙제 있는 칸 클릭** → 같은 모달 (데이터 채워진 채로 수정·삭제)
4. **헤더 `+ 숙제등록`** → `HomeworkBulkModal` (학생 시간표 자동 매핑 → 그 달 일괄)
5. 모달 안에서 수업교재 / 숙제교재 각각 이름·메모·상태(끝남/진행중/안 함) 입력
6. Firestore `onSnapshot` 라이브 구독 → 다른 기기에서 바꿔도 즉시 반영

## 작업 규칙 (사용자 합의 사항)

- **자동 push**: 코드 수정 → `npm run build` 로 검증 → 커밋 → 즉시 `git push` (사용자가 매번 확인 안 함)
- **커밋 메시지**: 한국어, `feat:` `fix:` `refactor:` 접두어, 변경 요점 bullet
- **Co-Authored-By**: `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` 추가
- **VS Code IDE 환경에서 작업** — 파일 경로 마크다운 링크는 상대 경로
- Cloudflare Pages 자동 배포 (GitHub `hsw56444/yeggyam-homework` push 시 자동)

## 폴더 구조

```
src/
├── App.jsx                          ← 라우터 진입점
├── main.jsx
├── index.css                        ← Tailwind + force-mobile/force-pc 스타일
├── firebase.js                      ← Firestore 초기화 + COL 정적 ref
├── components/
│   ├── Layout.jsx                   ← 헤더(뷰 토글) + 네비
│   └── calendar/
│       ├── HomeworkDayModal.jsx     ← 단발 등록·수정 모달
│       └── HomeworkBulkModal.jsx    ← 일괄 등록 모달 (시간표 자동 매핑)
├── hooks/
│   └── useCollection.js             ← Firestore onSnapshot 라이브 구독 훅
├── lib/
│   └── homework.js                  ← saveDayHomework, bulkSaveDayHomework, normalizeDoc, classDatesInRange, monthRange
└── pages/
    ├── CalendarPage.jsx
    ├── StudentsPage.jsx
    └── ClassesPage.jsx

public/
└── _redirects                       ← Cloudflare SPA 라우팅 (* → index.html)

firestore.rules.snippet.txt          ← 보안 규칙 참고 (Firebase Console에 적용 완료)
```

## Firebase Console 정보

- 프로젝트: `yeggyam-attendance`
- 새 앱 등록명: `예그얌숙제` (appId: `1:135565622021:web:bddb19d9bfc7446c22d56c`)
- Firestore 규칙: `allow read, write: if true` 와일드카드 (URL 비공개 전제)

## 배포

- GitHub: `https://github.com/hsw56444/yeggyam-homework`
- Cloudflare Pages: 자동 배포 (main 브랜치 push 시)
- 빌드: `npm run build` → `dist/` 폴더 산출

## 현재 상태 / 다음 작업

### ✅ 완료
1. 셋업 (Vite, Tailwind, Firebase, 라우터, 뷰 모드)
2. 학생·반·시간표 CRUD
3. ~~교재 등록 페이지~~ (삭제됨 — 모달에서 자유 입력으로 변경)
4. ~~별도 숙제등록 페이지~~ (삭제됨 — 달력에 통합)
5. 달력 + 숙제 등록·수정·상태 입력 (단발 + 일괄)
6. 수업교재·숙제교재 각각 독립 상태 입력

### ⏭️ 다음 작업 (사용자가 진행하라고 하면)
- **6단계: 학부모 공유용 이미지 출력**
  - 달력을 PNG로 캡처해서 다운로드 (`html2canvas` 사용)
  - 학생 이름·월·전체 숙제 보이는 카드 레이아웃
  - 학부모가 보기 좋은 정리된 형태

## 작업 진행 방식

1. 사용자가 요구사항 말함
2. Claude가 구현 → `npm run build` 검증
3. 커밋 + 자동 `git push`
4. 사용자가 Cloudflare 배포 URL 또는 `npm run dev` 로 확인
5. 피드백 → 다음 수정

## 참고

- 출석앱 위치: `/Users/hsw5644/Desktop/vibecoding/attendance-app/` (같은 Firebase 프로젝트 공유)
- 학원관리앱 위치: `/Users/hsw5644/Desktop/vibecoding/학원관리앱/` (별도 Firebase 프로젝트 `mylearning-28fbc`, 본 앱과 무관)
