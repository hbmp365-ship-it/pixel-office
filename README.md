# 픽셀 오피스 (Pixel Office)

여러 명이 동시에 접속해서 아바타로 돌아다니고 채팅하는 픽셀아트 가상 오피스.
게더타운과 같은 형태를 Cloudflare Workers + Durable Objects 위에 직접 구현했습니다.

<!-- 부서: 재무부 · 인사부 · 디자인팀 · 고객지원부 · 법무부 · 경영지원부 · 마케팅부 · 영업부 -->

## 기능

- **실시간 멀티플레이** — 내 아바타가 움직이면 다른 사람 화면에서도 즉시 움직입니다.
- **채팅** — 아바타 위 말풍선 + 사이드바 대화 로그. 최근 50개는 서버에 남아서 나중에 들어온 사람도 읽을 수 있습니다.
- **부서 자동 인식** — 어느 방에 서 있는지에 따라 상단 표시와 접속자 목록이 부서별로 묶입니다.
- **8개 부서 맵** — 코드로 그린 타일맵이라 외부 이미지 에셋이 없습니다. 지도를 바꾸려면 `src/game/map.ts`만 고치면 됩니다.
- **모바일 지원** — 터치 기기에서는 화면 좌측 하단에 조이스틱이 나옵니다.
- **자동 재연결** — 네트워크가 끊기면 지수 백오프로 다시 붙고, 서 있던 자리 그대로 복귀합니다.

조작: 방향키 또는 `WASD`로 이동, `Enter`로 채팅창 포커스, `Esc`로 채팅창 빠져나오기.

## 구조

```
index.html
src/
  App.tsx            화면 조립 + 소켓/게임 연결
  game/
    constants.ts     타일 크기, 이동 속도, 아바타 팔레트
    map.ts           층 배치도(방·벽·문·가구·충돌 격자)
    tiles.ts         바닥/벽/가구 픽셀 드로잉
    sprites.ts       아바타, 이름표, 말풍선 드로잉
    engine.ts        카메라, 충돌 처리, 게임 루프
  net/client.ts      WebSocket 클라이언트 (재연결 + 하트비트)
  ui/                로그인, 채팅, 접속자 목록, 터치패드
shared/protocol.ts   클라이언트/서버가 공유하는 메시지 타입
worker/
  index.ts           라우팅: /ws → Durable Object, 나머지는 정적 파일
  OfficeRoom.ts      방 하나 = Durable Object 하나 (접속자 상태 + 채팅)
```

맵 전체는 한 번만 오프스크린 캔버스에 그려두고 매 프레임 통째로 복사하므로,
프레임마다 그리는 것은 아바타뿐입니다.

## 개발

```bash
npm install
npm run dev          # Vite(1004) + wrangler dev(8787) 동시 실행
```

브라우저에서 http://localhost:1004 을 엽니다. (포트는 `vite.config.ts`에 1004로 고정되어 있습니다) WebSocket은 Vite가 8787로 프록시합니다.
여러 명 접속을 확인하려면 탭을 두 개 열거나 다른 기기에서 접속하면 됩니다.

빌드 결과 그대로 확인하려면:

```bash
npm run preview      # 빌드 후 wrangler dev 로 8787에서 서빙
```

## 배포 (Cloudflare)

Cloudflare 계정이 있어야 합니다. Durable Objects는 SQLite 백엔드를 쓰므로 무료 플랜에서도 동작합니다.

```bash
npx wrangler login
npm run deploy
```

`https://pixel-office.<계정명>.workers.dev` 주소가 나오고, 그 URL을 팀원에게 공유하면 됩니다.
워커 이름을 바꾸려면 `wrangler.jsonc`의 `name`을 수정하세요.

## 설계 메모

- **방 = Durable Object 하나.** `/ws?room=xxx` 로 층을 나눌 수 있습니다(기본값 `main`).
- **WebSocket Hibernation API**를 씁니다. 아무도 안 움직이면 객체가 잠들어 과금되지 않고,
  플레이어 상태는 각 소켓의 attachment에 저장돼 깨어날 때 복원됩니다.
- **이동은 클라이언트 권한**입니다. 서버는 좌표 범위와 문자열 길이만 검증하고 중계합니다.
  사내용이라 이 정도면 충분하고, 외부 공개용이라면 서버에서 충돌 검사를 하도록 바꿔야 합니다.
- 채팅은 소켓당 400ms 쿨다운, 이름 12자·메시지 200자 제한, 한 방 최대 60명입니다.
  값은 `shared/protocol.ts` 상단에 모여 있습니다.

## 다음에 붙일 만한 것

- 근접 음성/화상 (WebRTC 또는 LiveKit·Agora 같은 SDK)
- 로그인 연동 (Cloudflare Access 등)으로 사내 인원만 입장
- 화이트보드, 문서 링크 등 방 안의 상호작용 오브젝트
