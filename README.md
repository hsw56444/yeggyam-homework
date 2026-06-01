# 예그얌 숙제관리

학생별 숙제 현황을 입력하고, 학부모에게 이미지로 공유하는 웹앱.

## 스택
- React + Vite + Tailwind CSS
- Firebase Firestore (프로젝트 `yeggyam-attendance` 공유, 컬렉션 `hw_*` 격리)
- html2canvas (이미지 출력)
- React Router (URL 라우팅 + ?view=mobile|pc)

## 개발

```bash
npm install
npm run dev      # 로컬 개발 서버 (http://localhost:5173)
npm run build    # 프로덕션 빌드 → dist/
```

## 뷰 모드
- 기본: 화면 크기에 따라 자동 (반응형)
- `?view=mobile` — PC에서도 모바일 폭(412px)으로 고정 (Galaxy S26 기준)
- `?view=pc` — 모바일에서도 PC 폭으로
- 헤더의 📱 / 💻 / Auto 버튼으로도 토글 가능

## 데이터 모델 (Firestore)

```
hw_classes/{classId}            { name, schedule: [요일배열] }
hw_students/{studentId}          { name, classId, createdAt }
hw_textbooks/{textbookId}        { name, scope: 'common'|'personal', ownerId? }
hw_homework/{YYYY-MM}/items/{id} { studentId, date, items: [{textbook, detail, status}] }
```

## 배포 (Cloudflare Pages)

1. GitHub 레포 `yeggyam-homework`에 push
2. Cloudflare Pages에서 레포 연결
3. Build command: `npm run build`
4. Build output: `dist`
5. SPA 라우팅: `public/_redirects` 가 자동 처리

## Firestore 보안 규칙

`firestore.rules.snippet.txt` 참고 — Firebase Console에 직접 추가 (출석앱 규칙 보존).
