# TONE — Playlist Mood Diary

## 1. 핵심 콘셉트
“오늘을 들은 음악으로 기억하기.”

TONE은 음악 스트리밍 서비스 자체를 대체하지 않고, 사용자가 하루에 들은 음악과 감정을 연결해 저장하는 개인 무드 다이어리입니다.

핵심 흐름:
1. 오늘의 곡 또는 플레이리스트를 선택
2. 현재 감정 선택
3. 짧은 기록 작성
4. Diary에서 과거 기록 회고
5. Playlists/Insights에서 감정 패턴 확인

## 2. MVP 화면
- Today: 오늘 기록 CTA, 최근 기억, 이번 달 무드, 최근 기록
- Diary: 날짜순 기록, 감정 필터, 검색, 수정/삭제
- Playlists: 같은 플레이리스트에 연결된 기록 묶기
- Insights: 기록 수, 무드 빈도, 자주 등장한 플레이리스트/아티스트
- New Memory Modal: 날짜/무드/제목/메모/곡/아티스트/플레이리스트 입력

## 3. 현재 프로토타입에서 실제 동작하는 기능
- 기록 생성/수정/삭제
- 무드 필터
- 전체 검색
- 플레이리스트 자동 그룹화
- 간단한 통계
- localStorage 자동 저장
- JSON 내보내기
- 모바일 반응형 레이아웃

## 4. 추천 무드 체계
감정을 너무 세분화하면 기록 피로가 생기므로 5개만 사용:
- Calm / 차분함
- Bright / 가벼움
- Low / 가라앉음
- Restless / 뒤숭숭함
- Deep / 몰입

## 5. 실제 서비스로 확장할 때
### 계정/백엔드
- Supabase 권장
- Auth: Google/Apple 로그인
- DB:
  users
  diary_entries
  tracks
  playlists
  playlist_entries
  mood_tags

### Spotify 연동
Spotify Web API로:
- 현재 재생 곡 가져오기
- 최근 재생 곡 20~50개 후보 제공
- 내 플레이리스트 목록 불러오기
- 곡 선택 시 title/artist/album image 자동 입력

주의:
- Spotify 로그인이 없어도 수동 기록 가능해야 함.
- TONE 내부에서 음원을 직접 재생하는 기능은 MVP에서 제외.

## 6. 데이터 구조 예시
diary_entry:
{
  id,
  user_id,
  date,
  mood,
  title,
  note,
  track_id,
  song_title,
  artist,
  playlist_name,
  created_at
}

## 7. UX 원칙
- “일기 쓰기”보다 “노래에 메모 붙이기”처럼 가볍게
- 최소 입력 시간 30초 이내
- 감정 분석을 의료/심리 진단처럼 표현하지 않기
- 통계는 판단이 아니라 회고 보조 도구로만 사용
- 앨범 커버가 없어도 UI가 무너지지 않도록 디자인

## 8. 2차 기능
- 월간 Mood Recap
- 특정 곡을 들었던 날만 모아보기
- 같은 곡인데 서로 다른 무드였던 기록 비교
- “1년 전 오늘 들었던 곡”
- 사진 1장 첨부
- 위치 대신 사용자가 직접 장소명 선택 입력
- 공개 링크로 한 개 기록만 공유
- PDF/이미지 월간 리포트
- 데이터 가져오기(JSON)

## 9. 추천 개발 순서
1주차: 현재 HTML 프로토타입으로 UI/UX 확정
2주차: React/Next.js 전환, Supabase Auth/DB
3주차: Spotify OAuth + 최근 재생/플레이리스트 연동
4주차: Insights/월간 recap, 모바일 최적화
5주차: 배포(Vercel), 개인정보처리/에러처리/QA

## 10. 실행 방법
index.html을 브라우저에서 열면 바로 실행됩니다.
별도의 서버나 설치가 필요 없습니다.
