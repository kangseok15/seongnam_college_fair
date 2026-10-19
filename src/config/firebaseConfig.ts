/**
 * Firebase 설정
 *
 * 값은 코드에 직접 넣지 않고 환경변수(VITE_FIREBASE_*)에서 읽어옵니다.
 *  - 로컬 개발: 프로젝트 루트의 `.env.local` 파일
 *  - GitHub Pages 배포: 저장소 Settings → Secrets and variables → Actions 에 등록
 * 자세한 방법은 README.md 를 참고하세요.
 */
const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
  /** Firestore 데이터베이스 ID. 비워 두면 기본 데이터베이스 '(default)' 사용 */
  firestoreDatabaseId: env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)',
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error(
    '[설정 오류] Firebase 환경변수가 비어 있습니다. .env.local 또는 GitHub Actions Secrets 에 VITE_FIREBASE_* 값을 설정하세요.'
  );
}
