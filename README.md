# Mood Diary - GitHub Pages + Supabase

정적 화면은 GitHub Pages에 두고, 로그인/프로필/다이어리/친구 메시지는 Supabase에 저장합니다.

## 1. Supabase 프로젝트 만들기
1. https://supabase.com 에서 새 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase.sql` 전체를 실행합니다.
3. Authentication > Providers > Email에서 **Confirm email을 OFF** 합니다.
   - 이 프로젝트는 화면상 이메일을 받지 않고 `아이디@mooddiary.app` 형식의 내부 로그인 주소를 사용합니다.
   - 수업/소규모 친구용 데모에 맞춘 방식입니다.

## 2. config.js 설정
Supabase Project Settings > API에서 다음 값을 복사합니다.
- Project URL
- anon / publishable key

`config.js`에 붙여 넣습니다.

```js
window.MOOD_CONFIG = {
  SUPABASE_URL: "https://xxxxx.supabase.co",
  SUPABASE_ANON_KEY: "..."
};
```

**service_role / secret key는 절대 웹 파일에 넣지 마세요.**

## 3. GitHub Pages 배포
`index.html`, `style.css`, `script.js`, `config.js`를 저장소 루트에 올린 뒤 Pages를 배포합니다.

## 기능
- 프로필 목록
- 프로필 생성 (아이디 + 비밀번호)
- 프로필 선택 후 비밀번호 로그인
- 사용자별 비공개 다이어리
- 사용자별 캘린더
- YouTube 링크 / LP 턴테이블
- 친구 아이디로 친구 추가
- 친구끼리 짧은 메시지 교환
- 로그아웃

## 보안 구조
- 비밀번호는 직접 DB에 저장하지 않고 Supabase Auth가 관리합니다.
- 다이어리는 RLS 정책으로 본인 데이터만 조회/수정할 수 있습니다.
- 메시지는 송신자/수신자만 읽을 수 있습니다.
- 프로필 이름과 아이디는 로그인한 사용자에게 공개됩니다.
