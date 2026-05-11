# BlockVote — 이더리움 기반 투표 시스템
## PRD · SRS · 구현계획서 · 화면 설계서

> **수업 실습용 프로젝트** | Ethereum Sepolia Testnet | 예상 참여자 10명 미만

---

## 1. PRD — 제품 요구사항 정의서

### 1.1 제품 개요

| 항목 | 내용 |
|------|------|
| 제품명 | BlockVote |
| 네트워크 | Ethereum Sepolia Testnet |
| 접근 방식 | 웹 브라우저 (Chrome + MetaMask 익스텐션) |
| 주요 사용자 | 관리자(Owner), 유권자(일반 사용자) |

### 1.2 사용자 역할

| 역할 | 정의 | 권한 |
|------|------|------|
| Owner (관리자) | 스마트 컨트랙트 배포 지갑 주소 | 후보자 등록, 투표 시작, 투표 종료 |
| Voter (유권자) | MetaMask 연결된 임의 지갑 주소 | 투표 진행 중 1회 투표, 현황 조회 |
| Guest (비연결) | MetaMask 미연결 상태 | 투표 현황 조회만 가능 |

### 1.3 핵심 기능 목록

| 기능 | 설명 | 우선순위 |
|------|------|---------|
| 후보자 등록 | 이름 + IPFS 사진 CID 등록 (Owner 전용) | P0 |
| 투표 시작 | 후보자 ≥2명 조건 충족 시 Owner가 수동 시작 | P0 |
| 투표 종료 | Owner가 수동으로 투표 종료 | P0 |
| 투표 실행 | MetaMask 서명으로 1인 1투표 | P0 |
| 중복 투표 차단 | 동일 지갑 재투표 시 컨트랙트 레벨에서 revert | P0 |
| 득표 현황 자동 갱신 | 투표 진행 중 후보자별 득표수 주기적 갱신 표시 (15초 폴링) | P0 |
| 최종 결과 확인 | 투표 종료 후 전체 득표수 및 당선자 표시 | P0 |
| MetaMask 연동 | 지갑 연결 / 네트워크 확인 (Sepolia) | P0 |
| IPFS 사진 업로드 | 관리자 화면에서 사진 파일 → IPFS 업로드 | P1 |

### 1.4 프로젝트 성격

> **수업 실습용 프로젝트**입니다. 전체 예상 투표 참여자는 **10명 미만**이며, 고가용성·부하 분산·확장성은 고려하지 않습니다. 학습 목적에 맞춰 코드 단순성과 기능 명확성을 우선합니다.

### 1.5 비기능 요건

| 항목 | 요건 |
|------|------|
| 블록체인 | Ethereum Sepolia (Chain ID: 11155111) |
| 브라우저 | Chrome (MetaMask 익스텐션 필수) |
| 동시 사용자 | 10명 미만 (수업 실습 규모) |
| 투명성 | 모든 투표 트랜잭션은 온체인에서 검증 가능 |
| 보안 | 스마트 컨트랙트 레벨에서 중복 투표·권한 위반 차단 |
| 가용성 | Sepolia RPC 의존 (Infura / Alchemy 등), 고가용성 불필요 |
| 확장성 | 단일 투표 세션만 지원, 다중 투표 동시 운영 불필요 |
| Sepolia 수명 | 2026년 9월 이후까지 지원 확정 — 실습 기간 내 사용 문제 없음 |
| 가스비 준비 | 투표 참여자 전원이 Sepolia ETH 보유 필요 (Google Cloud Web3 Faucet 등에서 무료 수령) |

---

## 2. SRS — 소프트웨어 요구사항 명세서

### 2.1 스마트 컨트랙트 요구사항

#### 2.1.1 데이터 구조

```solidity
// SPDX-License-Identifier: MIT
// pragma solidity ^0.8.20;

struct Candidate {
    uint256 id;         // 0-indexed (candidates 배열 인덱스와 동일)
    string  name;
    string  photoCID;   // Pinata IPFS CID (예: "QmXxx...abc")
    uint256 voteCount;
}

enum VotingState { SETUP, ACTIVE, ENDED }

// 스토리지 변수
address public owner;                      // public → contract.owner() 자동 getter
Candidate[] public candidates;             // 동적 배열 — mapping 불가, 배열만 전체 반환 가능
VotingState public votingState;            // public → contract.votingState() 자동 getter
mapping(address => bool) public hasVoted;  // public → contract.hasVoted(address) 자동 getter
```

`owner`, `votingState`, `hasVoted`를 `public`으로 선언하면 Solidity가 자동 getter를 생성합니다. 프론트에서 별도 함수 없이 `contract.owner()`, `contract.votingState()`, `contract.hasVoted(address)` 를 직접 호출할 수 있습니다.

#### 2.1.2 함수 명세 (Solidity 타입 포함)

| 함수 시그니처 | 접근 제어 | 실행 조건 | 동작 |
|------|----------|----------|------|
| `addCandidate(string memory name, string memory photoCID)` | onlyOwner | votingState == SETUP | Candidate 구조체 생성, candidates.push() |
| `startVoting()` | onlyOwner | votingState == SETUP && candidates.length >= 2 | votingState → ACTIVE |
| `endVoting()` | onlyOwner | votingState == ACTIVE | votingState → ENDED |
| `vote(uint256 candidateId)` | 누구나 | votingState == ACTIVE && !hasVoted[msg.sender] && candidateId < candidates.length | candidates[candidateId].voteCount++, hasVoted[msg.sender] = true |
| `getCandidates() returns (Candidate[] memory)` | 누구나 | — | candidates 배열 전체 반환 (Solidity 0.8+ 기본 ABI encoder로 struct 배열 반환 가능) |
| `getTotalVotes() returns (uint256)` | 누구나 | — | candidates 배열 순회 후 voteCount 합산 반환 |

#### 2.1.3 이벤트 명세

| 이벤트 | 파라미터 | 발생 시점 |
|--------|---------|---------|
| `CandidateAdded` | id, name, photoCID | 후보자 등록 시 |
| `VotingStarted` | timestamp | 투표 시작 시 |
| `VotingEnded` | timestamp | 투표 종료 시 |
| `Voted` | voter(address), candidateId | 투표 성공 시 |

#### 2.1.4 예외·revert 조건

| 상황 | revert 메시지 |
|------|-------------|
| Owner 아닌 계정이 관리 함수 호출 | "Only owner" |
| 후보자 1명 이하로 startVoting 호출 | "Need at least 2 candidates" |
| 투표 ACTIVE 아닌데 vote 호출 | "Voting not active" |
| 이미 투표한 주소가 vote 호출 | "Already voted" |
| 존재하지 않는 candidateId로 vote 호출 | "Invalid candidate" |

### 2.2 프론트엔드 요구사항

#### 2.2.1 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | React (Vite) |
| Web3 라이브러리 | ethers.js v6 |
| IPFS 업로드 | Pinata API V3 (JWT 인증) |
| 스타일링 | Tailwind CSS |
| 컨트랙트 인터페이스 | ABI JSON + ethers.Contract |

#### 2.2.2 MetaMask 연동 흐름

```
1. 사용자가 '지갑 연결' 버튼 클릭
2. window.ethereum.request({ method: 'eth_requestAccounts' })
3. chainId 확인 → '0xaa36a7'(Sepolia) 아닌 경우:
     wallet_switchEthereumChain({ chainId: '0xaa36a7' }) 요청
     → MetaMask에 Sepolia 미등록 시: wallet_addEthereumChain으로 추가
4. 연결된 주소와 contract.owner() 비교 → 관리자 UI 여부 결정
5. ethers.BrowserProvider(window.ethereum) + .getSigner() → Signer 획득
6. new ethers.Contract(address, abi, signer) → 쓰기 가능 컨트랙트 인스턴스
   new ethers.Contract(address, abi, provider) → 읽기 전용 인스턴스 (별도)
```

**득표수 갱신 전략 (폴링 방식)**:
```
// BrowserProvider는 WebSocket이 아닌 polling 방식
// contract.on('Voted', ...) 대신 주기적 재조회가 더 안정적

// 권장: 투표 성공 직후 즉시 + 15초 주기 폴링
const refresh = async () => {
  const data = await contract.getCandidates();
  setCandidates(data);
};
// 투표 트랜잭션 confirm 후 refresh() 즉시 호출
// useEffect에서 setInterval(refresh, 15000) 추가
```

#### 2.2.3 Pinata IPFS 업로드 흐름

```
관리자가 사진 파일 선택
       │
       ▼
FormData 생성 (파일 첨부)
       │
       ▼
POST https://uploads.pinata.cloud/v3/files
  Headers: Authorization: Bearer {VITE_PINATA_JWT}
  Body: FormData
       │
       ▼
응답: { data: { cid: "QmXxx...abc" } }
       │
       ▼
addCandidate(name, cid) 트랜잭션 전송
```

#### 2.2.4 화면별 기능 요구사항

**[공통]**
- 상단 헤더: MetaMask 연결 버튼 / 연결된 지갑 주소 축약 표시 / Sepolia 네트워크 배지
- 현재 투표 상태(준비 중 / 진행 중 / 종료) 배지 상시 표시

**[메인 화면 — 투표 현황]**
- 후보자 카드 목록: 사진, 이름, 득표수, 득표율 프로그레스바
- ACTIVE: 득표수 자동 갱신(15초 주기) + '투표하기' 버튼 활성화
- ENDED: 최종 득표수 + 최다 득표자 강조 표시
- SETUP: "투표가 아직 시작되지 않았습니다" 안내
- 이미 투표한 지갑: 버튼 비활성화 + "이미 투표하셨습니다" 표시

**[투표 실행]**
- 후보자 선택 → 확인 모달 → MetaMask 트랜잭션 서명
- 전송 중 로딩 스피너
- 성공: 토스트 알림 + getCandidates() 즉시 재호출로 득표수 갱신
- 실패(revert): 한국어 에러 메시지 표시

**[관리자 화면 — Owner 지갑 연결 시에만 노출]**
- 후보자 등록 폼: 이름 입력 + 사진 파일 업로드 (IPFS → CID 자동 처리)
- 등록된 후보자 목록 (삭제 불가 — 등록 후 불변)
- '투표 시작' 버튼: 후보자 ≥2명 조건 충족 시 활성화
- '투표 종료' 버튼: ACTIVE 상태일 때만 활성화
- 각 버튼 → MetaMask 트랜잭션 서명 요청

---

## 3. 구현 계획서

### 3.1 시스템 아키텍처

```
[브라우저]
  └── React 앱
        ├── ethers.js ──→ [MetaMask] ──→ [Sepolia RPC (Infura/Alchemy)]
        │                                          │
        │                                  [Voting.sol Contract]
        │
        └── Pinata API ──→ [IPFS 네트워크]
                                  │
                            후보자 사진(CID만 온체인 저장)
```

### 3.2 디렉토리 구조

```
VotingSystem/
├── contracts/
│   └── Voting.sol                   # 스마트 컨트랙트
├── scripts/
│   └── deploy.js                    # Hardhat 배포 스크립트
├── test/
│   └── Voting.test.js               # 컨트랙트 단위 테스트
├── frontend/
│   ├── src/
│   │   ├── abi/
│   │   │   └── Voting.json          # 컨트랙트 ABI
│   │   ├── components/
│   │   │   ├── Header.jsx           # 지갑 연결, 네트워크 배지
│   │   │   ├── CandidateCard.jsx    # 후보자 카드 (사진, 이름, 득표수)
│   │   │   ├── VoteButton.jsx       # 투표 버튼 + 상태 처리
│   │   │   ├── AdminPanel.jsx       # 관리자 전용 패널
│   │   │   └── CandidateForm.jsx    # 후보자 등록 폼
│   │   ├── hooks/
│   │   │   ├── useWallet.js         # MetaMask 연결 상태 관리
│   │   │   └── useVoting.js         # 컨트랙트 상태, 후보자 목록, 투표 함수
│   │   ├── utils/
│   │   │   └── ipfs.js              # Pinata 업로드 유틸리티
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env                         # VITE_CONTRACT_ADDRESS, VITE_PINATA_*
│   └── package.json
├── hardhat.config.js
├── .env                             # PRIVATE_KEY, SEPOLIA_RPC_URL
└── package.json
```

### 3.3 의존성 패키지

#### 컨트랙트 (루트)
```bash
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv
npx hardhat init   # "Create a JavaScript project" 선택
```

#### 프론트엔드
```bash
cd frontend
npm create vite@latest . -- --template react
npm install ethers
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 3.4 hardhat.config.js 최소 설정

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,   // hardhat verify 시 필요
  },
};
```

> Sepolia RPC URL은 [Alchemy](https://www.alchemy.com) 또는 [Infura](https://www.infura.io) 무료 계정에서 발급. Etherscan API Key는 [sepolia.etherscan.io](https://sepolia.etherscan.io) 계정에서 발급.

### 3.5 구현 단계

#### Phase 1 — 스마트 컨트랙트 (예상 1~2일)
1. 3.3의 컨트랙트 의존성 설치 및 Hardhat 초기화
2. `Voting.sol` 작성 (2.1절 명세 기준)
3. 단위 테스트 작성 및 통과 확인 (`test/Voting.test.js`)
4. Sepolia 배포 (`deploy.js`) → 컨트랙트 주소 확보
5. Etherscan 소스코드 검증 (`npx hardhat verify --network sepolia {주소}`)

#### Phase 2 — 프론트엔드 기반 (예상 1~2일)
1. 3.3의 프론트엔드 의존성 설치, Tailwind CSS 설정
2. `useWallet.js` 훅 구현 (MetaMask 연결, Sepolia 체크, 계정 변경 감지)
3. `useVoting.js` 훅 구현 (getCandidates, votingState, hasVoted 읽기 + 15초 폴링)
4. `Header.jsx` + `CandidateCard.jsx` UI 구현

#### Phase 3 — 투표 기능 연동 (예상 1일)
1. 투표 확인 모달 구현 (`VoteButton.jsx`)
2. `vote()` 트랜잭션 전송 + 로딩/에러 처리
3. 트랜잭션 confirm 후 `getCandidates()` 즉시 재호출 → 득표수 갱신 (폴링 방식)
4. 이미 투표한 주소 비활성화 처리 (`hasVoted` 조회)

#### Phase 4 — 관리자 기능 (예상 1~2일)
1. `ipfs.js` Pinata V3 업로드 유틸리티 구현 (2.2.3 흐름 기준)
2. `CandidateForm.jsx` 후보자 등록 폼 + `addCandidate()` 트랜잭션
3. `AdminPanel.jsx` 투표 시작/종료 버튼 구현
4. `contract.owner()` 비교로 `AdminPanel` 조건부 렌더링

#### Phase 5 — 마무리 (예상 0.5일)
1. ENDED 결과 화면: 당선자 강조 + 순위 표시
2. 오류 메시지 한국어 매핑 (revert reason → 사용자 메시지)
3. 반응형 레이아웃 점검

### 3.6 컨트랙트 배포 → 프론트엔드 연결 절차

```
1. 컨트랙트 컴파일
   npx hardhat compile
   → artifacts/contracts/Voting.sol/Voting.json 생성

2. Sepolia 배포
   npx hardhat run scripts/deploy.js --network sepolia
   → 터미널에 컨트랙트 주소 출력 (예: 0xAbCd...1234)

3. ABI 복사 (배포 후 반드시 실행)
   artifacts/contracts/Voting.sol/Voting.json 에서 "abi" 배열만
   → frontend/src/abi/Voting.json 에 복사

4. 환경 변수 설정
   frontend/.env 파일에 아래 추가:
   VITE_CONTRACT_ADDRESS=0xAbCd...1234               ← 2번에서 출력된 주소
   VITE_PINATA_JWT=eyJ...                            ← Pinata 대시보드에서 발급한 JWT
   VITE_IPFS_GATEWAY=https://gateway.pinata.cloud   ← 이미지 표시용 게이트웨이

5. 프론트엔드 실행
   cd frontend && npm run dev
```

> **자동화 팁**: `scripts/deploy.js`에서 배포 후 ABI를 `frontend/src/abi/Voting.json`에 자동 복사하는 코드를 추가하면 3번 수동 작업을 생략할 수 있습니다.

### 3.7 환경 변수 목록

| 파일 | 변수명 | 용도 |
|------|--------|------|
| `(루트)/.env` | `PRIVATE_KEY` | Hardhat 배포 지갑 비밀키 (0x 포함 64자리 hex) |
| `(루트)/.env` | `SEPOLIA_RPC_URL` | Sepolia RPC 엔드포인트 (Alchemy/Infura에서 발급) |
| `(루트)/.env` | `ETHERSCAN_API_KEY` | Etherscan 소스 검증용 (선택사항) |
| `frontend/.env` | `VITE_CONTRACT_ADDRESS` | 배포된 컨트랙트 주소 (0x...) |
| `frontend/.env` | `VITE_PINATA_JWT` | Pinata V3 JWT 토큰 (Files:Write 스코프만 허용) |
| `frontend/.env` | `VITE_IPFS_GATEWAY` | IPFS 이미지 게이트웨이 URL (아래 참고) |

**IPFS 이미지 표시 URL 패턴**:
```
// CID → 이미지 src 변환 공식
const imageUrl = `${import.meta.env.VITE_IPFS_GATEWAY}/ipfs/${photoCID}`;

// 권장 게이트웨이 (VITE_IPFS_GATEWAY에 설정)
https://gateway.pinata.cloud    ← Pinata 전용 게이트웨이 (가장 안정적)
https://ipfs.io                 ← 공개 게이트웨이 (느릴 수 있음)

// 예시: CID가 "QmXxx...abc"인 경우
// https://gateway.pinata.cloud/ipfs/QmXxx...abc
```

> **보안 주의**: `VITE_` 접두사 변수는 Vite 빌드 시 브라우저 번들에 포함되어 누구나 DevTools에서 확인할 수 있습니다. `VITE_PINATA_JWT`는 Pinata 대시보드에서 **"Files: Write" 스코프만 허용**한 전용 JWT로 발급하여 피해 범위를 최소화하고, 수업 종료 후 즉시 폐기하세요.

---

## 4. 화면 설계서

### 4.1 공통 컴포넌트 — 헤더

```
┌─────────────────────────────────────────────────────────────────────┐
│  BlockVote              [Sepolia] [진행 중]    [0x1a2b...3c4d ▼]   │
└─────────────────────────────────────────────────────────────────────┘
```

| UI 요소 | 설명 |
|---------|------|
| 로고/제품명 | 좌측 고정 |
| 네트워크 배지 | `[Sepolia]` 초록색 — 잘못된 네트워크 시 빨간색 경고로 전환 |
| 투표 상태 배지 | 준비 중(회색) / 진행 중(초록) / 종료(파란색) |
| 지갑 버튼 | 미연결: `[지갑 연결]` / 연결됨: 주소 앞뒤 축약 표시 |

---

### 4.2 메인 화면 — 투표 준비 중 (SETUP)

```
┌─────────────────────────────────────────────────────────────────────┐
│  BlockVote         [Sepolia] [● 준비 중]               [지갑 연결]  │
│─────────────────────────────────────────────────────────────────────│
│                                                                     │
│             투표가 곧 시작됩니다. 잠시만 기다려 주세요.                  │
│                                                                     │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │
│  │  [후보자 사진] │  │  [후보자 사진] │  │  [후보자 사진] │           │
│  │   후보자 A    │  │   후보자 B    │  │   후보자 C    │           │
│  └───────────────┘  └───────────────┘  └───────────────┘           │
│                                                                     │
│              * 후보자는 투표 시작 전에 확정됩니다.                      │
└─────────────────────────────────────────────────────────────────────┘
```

**표시 조건**: 후보자 카드는 등록된 후보자 목록을 표시하되, 득표수와 투표 버튼은 숨김.

---

### 4.3 메인 화면 — 투표 진행 중 (ACTIVE)

```
┌─────────────────────────────────────────────────────────────────────┐
│  BlockVote         [Sepolia] [● 진행 중]       [0x1a2b...3c4d ▼]   │
│─────────────────────────────────────────────────────────────────────│
│                    현재 투표 현황 (자동 갱신)                           │
│                    전체 투표 수: 7표                                  │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  [후보자 사진]    │  │  [후보자 사진]    │  │  [후보자 사진]    │  │
│  │   홍길동          │  │   김영희          │  │   이철수          │  │
│  │    4표 (57.1%)   │  │    2표 (28.6%)   │  │    1표 (14.3%)   │  │
│  │  ████████░░░░░░  │  │  ████░░░░░░░░░░  │  │  ██░░░░░░░░░░░░  │  │
│  │  [  투표하기  ]  │  │  [  투표하기  ]  │  │  [  투표하기  ]  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**'투표하기' 버튼 상태 변형:**

| 상태 | 버튼 표시 | 스타일 |
|------|---------|--------|
| MetaMask 미연결 | `지갑을 연결해 주세요` | 비활성, 클릭 시 연결 안내 |
| 연결됨 + 미투표 | `투표하기` | 활성 (파란색) |
| 연결됨 + 이미 투표 | `이미 투표하셨습니다` | 비활성 (회색) |
| 트랜잭션 전송 중 | `처리 중...` | 비활성 + 스피너 |

---

### 4.4 메인 화면 — 투표 종료 (ENDED)

```
┌─────────────────────────────────────────────────────────────────────┐
│  BlockVote         [Sepolia] [■ 종료]          [0x1a2b...3c4d ▼]   │
│─────────────────────────────────────────────────────────────────────│
│                      최종 투표 결과                                   │
│                    전체 투표 수: 9표                                  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  [당선]  홍길동  [사진]   5표 (55.6%)  ████████████████      │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  2위     김영희  [사진]   3표 (33.3%)  ██████████            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  3위     이철수  [사진]   1표 (11.1%)  ████                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│                [Etherscan에서 결과 확인 →]                            │
└─────────────────────────────────────────────────────────────────────┘
```

**표시 조건**: 당선자(최다 득표)는 강조 표시. 득표수 동률 시 복수 당선 표시.

---

### 4.5 관리자 화면 (Owner 지갑 연결 시에만 노출)

```
┌─────────────────────────────────────────────────────────────────────┐
│  BlockVote  [관리자 모드]  [Sepolia] [준비 중]     [0xOwner...▼]   │
│─────────────────────────────────────────────────────────────────────│
│  ┌──────── 후보자 등록 ──────────────────────────────────────────┐  │
│  │  이름  [__________________________]                           │  │
│  │  사진  [파일 선택] 또는 드래그 앤 드롭                           │  │
│  │        업로드 완료 시 CID 자동 처리                              │  │
│  │                                   [  후보자 등록  ]            │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────── 등록된 후보자 (2명) ──────────────────────────────────┐  │
│  │  #1  홍길동   [사진 썸네일]  CID: QmXxx...abc                  │  │
│  │  #2  김영희   [사진 썸네일]  CID: QmYyy...def                  │  │
│  │  ✅ 투표 시작 가능 (후보자 2명 이상 등록됨)                       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────── 투표 제어 ────────────────────────────────────────────┐  │
│  │  현재 상태: 준비 중                                              │  │
│  │  [     투표 시작     ]     [     투표 종료     ]               │  │
│  │  (후보자 ≥2명 시 활성)     (ACTIVE 상태일 때 활성)               │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**후보자 등록 제약**: 투표 시작(ACTIVE) 이후에는 후보자 등록 폼 비활성화.

---

### 4.6 투표 실행 — 확인 모달 및 트랜잭션 흐름

```
[후보자 카드의 '투표하기' 클릭]
         │
         ▼
┌──────────────────────────────────┐
│         투표 확인                 │
│                                  │
│  홍길동에게 투표하시겠습니까?        │
│  이 작업은 블록체인에 기록되며      │
│  취소할 수 없습니다.               │
│                                  │
│  [  취소  ]  [MetaMask로 서명하기] │
└──────────────────────────────────┘
         │
         ▼ (MetaMask 서명 팝업 → 사용자 서명)
         │
         ├── 성공 ──→ 토스트: "투표가 완료되었습니다!"
         │           getCandidates() 즉시 재호출 → 득표수 갱신
         │
         └── 실패 ──→ 한국어 에러 토스트
                      "이미 투표하셨습니다."
                      "투표가 종료되었습니다."
                      "잘못된 후보자입니다."
                      "사용자가 트랜잭션을 취소했습니다."
```

---

### 4.7 네트워크 오류 화면

```
┌─────────────────────────────────────────────────────────────────────┐
│  BlockVote                                           [지갑 연결됨]  │
│─────────────────────────────────────────────────────────────────────│
│                                                                     │
│     ⚠️  잘못된 네트워크에 연결되어 있습니다.                           │
│                                                                     │
│     현재 네트워크: Ethereum Mainnet                                   │
│     필요 네트워크: Sepolia Testnet (Chain ID: 11155111)               │
│                                                                     │
│                  [  Sepolia로 전환하기  ]                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**동작**: 버튼 클릭 시 `wallet_switchEthereumChain` 요청 → MetaMask 네트워크 전환 팝업.

---

## 5. 사전 준비 체크리스트

실습 전 모든 참여자가 완료해야 할 항목입니다.

| 항목 | 담당 | 확인 |
|------|------|------|
| Chrome에 MetaMask 익스텐션 설치 | 전원 | |
| MetaMask에서 지갑 생성 → 주소 공유 | 전원 | |
| Sepolia ETH 수령 (faucet) | 전원 | |
| Sepolia 네트워크 MetaMask 추가 | 전원 | |
| Alchemy/Infura 계정 및 Sepolia RPC URL 발급 | 관리자 | |
| Pinata 계정 및 JWT 발급 | 관리자 | |

**Sepolia ETH Faucet (가스비용 무료 수령처)**:
- Google Cloud Web3 Faucet: `https://cloud.google.com/application/web3/faucet/ethereum/sepolia`
- Alchemy Sepolia Faucet: `https://www.alchemy.com/faucets/ethereum-sepolia`
- 1회 투표 트랜잭션 가스: 약 50,000~100,000 gas (극소량 — Faucet 1회 수령으로 수십 번 투표 가능)

---

## 6. 검증 방법 (End-to-End)

| 단계 | 검증 항목 | 검증 방법 |
|------|---------|---------|
| 컨트랙트 | 배포 성공 | `npx hardhat run scripts/deploy.js --network sepolia` 실행 후 주소 출력 확인 |
| 컨트랙트 | Etherscan 등록 | https://sepolia.etherscan.io/address/{배포주소} 에서 트랜잭션 확인 |
| 컨트랙트 | addCandidate 권한 제한 | Owner 아닌 계정으로 호출 → "Only owner" revert 확인 |
| 컨트랙트 | 1인 1투표 | 동일 지갑으로 2회 vote 호출 → "Already voted" revert 확인 |
| 컨트랙트 | 후보자 최소 수 조건 | 1명만 등록 후 startVoting → "Need at least 2 candidates" revert 확인 |
| 프론트 | MetaMask 연결 | 지갑 연결 후 헤더에 주소 표시 확인 |
| 프론트 | Sepolia 체크 | Mainnet 연결 상태에서 앱 접속 → 오류 화면 및 전환 버튼 표시 확인 |
| 프론트 | 관리자 UI | Owner 지갑 연결 시에만 AdminPanel 렌더링 확인 / 다른 지갑 시 숨김 확인 |
| 프론트 | IPFS 업로드 | 사진 업로드 → Pinata 대시보드에서 CID 확인 → 이미지 정상 로딩 확인 |
| 프론트 | 득표수 갱신 | 투표 트랜잭션 confirm 후 15초 내 득표수 갱신 확인 |
| 통합 | 전체 시나리오 | 후보자 2명 등록 → 투표 시작 → 2개 이상 지갑으로 각 1표 투표 → 종료 → 결과 화면 확인 |

---

## 7. 상세 구현 계획 (1인 개발 기준, Phase당 약 1 man/day)

> 각 Phase는 **구현 → 코드 리뷰 → 검증 → 단위 테스트 → 사이드 이펙트 확인 → 누적 회귀 테스트** 순으로 완료한다.
> 다음 Phase는 현재 Phase의 회귀 테스트가 모두 통과된 후에만 시작한다.

---

### Phase 1 — 프로젝트 환경 구성 + 컨트랙트 골격

**구현 목표**: Hardhat 환경을 구성하고, 컨트랙트의 데이터 구조·상태변수·modifier를 정의한다.

#### 구현 항목
- `npm init`, Hardhat 설치 및 `npx hardhat init` (JavaScript 프로젝트)
- `contracts/Voting.sol` 생성: `Candidate` struct, `VotingState` enum, 4개 상태 변수 (`owner`, `candidates`, `votingState`, `hasVoted`) 선언
- `constructor()`: `owner = msg.sender`, `votingState = SETUP` 초기화
- `modifier onlyOwner()`: `require(msg.sender == owner, "Only owner")` 정의
- `hardhat.config.js` Sepolia 네트워크 설정 (3.4절 기준)
- `.env` 파일 생성 (PRIVATE_KEY, SEPOLIA_RPC_URL 값 입력)

#### 코드 리뷰 포인트
- `SPDX-License-Identifier: MIT` 및 `pragma solidity ^0.8.20;` 선언 여부
- `owner`가 `public`으로 선언되어 자동 getter가 생성되는지
- `candidates`, `votingState`, `hasVoted` 모두 `public`인지
- `.gitignore`에 `.env`가 포함되어 있는지

#### 검증
- `npx hardhat compile` → 오류 없이 빌드 성공
- `artifacts/` 디렉토리에 `Voting.json` 생성 확인

#### 단위 테스트 (`test/Voting.test.js`)
- 배포 후 `owner`가 배포자 주소와 일치하는지
- 초기 `votingState`가 `SETUP(0)`인지
- 초기 `candidates.length`가 0인지

#### 사이드 이펙트 확인
- 없음 (외부 연동 없는 초기 설정 단계)

#### 누적 회귀 테스트
- Phase 1 테스트 전체 통과 확인

---

### Phase 2 — 컨트랙트: 후보자 등록 + 투표 시작/종료

**구현 목표**: Owner만 실행할 수 있는 후보자 등록·투표 제어 함수와 이벤트를 구현한다.

#### 구현 항목
- `addCandidate(string memory name, string memory photoCID)`: `onlyOwner`, `votingState == SETUP` 조건, `candidates.push()`, `CandidateAdded` 이벤트 emit
- `startVoting()`: `onlyOwner`, `candidates.length >= 2` 조건, `votingState = ACTIVE`, `VotingStarted(block.timestamp)` emit
- `endVoting()`: `onlyOwner`, `votingState == ACTIVE` 조건, `votingState = ENDED`, `VotingEnded(block.timestamp)` emit
- 이벤트 4종 선언: `CandidateAdded`, `VotingStarted`, `VotingEnded`, `Voted`

#### 코드 리뷰 포인트
- revert 메시지가 2.1.4절 명세와 정확히 일치하는지
- `addCandidate`에서 `id`를 `candidates.length` (push 전)으로 설정하는지
- `startVoting`의 조건이 `SETUP` 상태 + 후보자 2명 이상 둘 다 체크하는지
- 이벤트에 `indexed` 파라미터 적용 여부 (`voter` 주소에 적용 권장)

#### 검증
- `npx hardhat compile` 재성공
- Hardhat console에서 함수 직접 호출하여 동작 확인

#### 단위 테스트
- `addCandidate`: Owner 호출 성공, 비-Owner 호출 → revert `"Only owner"`
- `addCandidate`: ACTIVE 상태에서 호출 → revert
- `startVoting`: 후보자 1명일 때 → revert `"Need at least 2 candidates"`
- `startVoting`: 후보자 2명 등록 후 → ACTIVE 전환 성공, `VotingStarted` 이벤트 emit 확인
- `endVoting`: SETUP 상태에서 → revert
- `endVoting`: ACTIVE 상태에서 → ENDED 전환 성공, `VotingEnded` 이벤트 emit 확인

#### 사이드 이펙트 확인
- `addCandidate` 성공 후 `candidates.length`가 1씩 증가하는지
- `startVoting` 후 `addCandidate` 호출 시 정상 revert되는지

#### 누적 회귀 테스트
- Phase 1 테스트 전체 재실행 → 통과 확인
- Phase 2 테스트 전체 통과 확인

---

### Phase 3 — 컨트랙트: 투표 실행 + Sepolia 배포

**구현 목표**: 핵심 투표 함수를 완성하고 Sepolia에 배포하여 컨트랙트 주소를 확보한다.

#### 구현 항목
- `vote(uint256 candidateId)`: `votingState == ACTIVE`, `!hasVoted[msg.sender]`, `candidateId < candidates.length` 조건, `candidates[candidateId].voteCount++`, `hasVoted[msg.sender] = true`, `Voted(msg.sender, candidateId)` emit
- `getCandidates() returns (Candidate[] memory)`: `candidates` 배열 전체 반환
- `getTotalVotes() returns (uint256)`: `candidates` 배열 순회하며 `voteCount` 합산
- `scripts/deploy.js`: 배포 후 컨트랙트 주소 콘솔 출력, ABI를 `frontend/src/abi/Voting.json`에 자동 복사
- Sepolia 배포 실행 (`npx hardhat run scripts/deploy.js --network sepolia`)

#### 코드 리뷰 포인트
- `vote`에서 3가지 조건이 모두 `require`로 검사되는지
- `getCandidates`가 `memory` 키워드를 사용하는지
- `deploy.js`에서 `fs.writeFileSync`로 ABI 자동 복사가 동작하는지
- 배포 지갑에 Sepolia ETH가 충분한지 (배포 가스 약 1~2M gas)

#### 검증
- Sepolia Etherscan에서 배포된 컨트랙트 주소 확인
- Etherscan "Read Contract"에서 `owner()`, `votingState()` 호출 성공
- `npx hardhat verify --network sepolia {주소}` → 소스 검증 완료

#### 단위 테스트
- `vote`: SETUP 상태에서 → revert `"Voting not active"`
- `vote`: 유효하지 않은 candidateId → revert `"Invalid candidate"`
- `vote`: 동일 지갑 2회 → revert `"Already voted"`
- `vote`: 정상 투표 후 `candidates[id].voteCount` 증가 확인, `Voted` 이벤트 emit 확인
- `getCandidates`: 후보자 2명 등록 후 배열 길이 2 반환 확인
- `getTotalVotes`: 3표 투표 후 반환값 3 확인

#### 사이드 이펙트 확인
- `endVoting` 후 `vote` 호출 → `"Voting not active"` revert 확인
- `getCandidates` 호출이 상태를 변경하지 않는지 (view 함수 특성 확인)

#### 누적 회귀 테스트
- Phase 1, 2, 3 테스트 전체 재실행 → 모두 통과 확인
- Sepolia 배포본에서 Etherscan Read Contract로 기본 함수 동작 확인

---

### Phase 4 — 프론트엔드 환경 + 지갑 연결

**구현 목표**: React 앱을 초기화하고, MetaMask 연결 및 Sepolia 체크 훅을 완성한다.

#### 구현 항목
- `npm create vite@latest frontend -- --template react`, ethers + Tailwind 설치
- `frontend/.env` 설정 (VITE_CONTRACT_ADDRESS, VITE_PINATA_JWT, VITE_IPFS_GATEWAY)
- `hooks/useWallet.js`:
  - `window.ethereum` 존재 여부 확인 (MetaMask 미설치 안내)
  - `eth_requestAccounts`로 계정 요청
  - `eth_chainId`로 체인 확인 → Sepolia(`0xaa36a7`) 아닌 경우 `wallet_switchEthereumChain` 요청
  - `accountsChanged`, `chainChanged` 이벤트 리스너 등록/해제
  - 반환값: `{ account, isOwner, isConnected, chainOk, connect }`
- `components/Header.jsx`: 네트워크 배지(색상 조건부), 투표 상태 배지, 지갑 연결 버튼
- `4.7 네트워크 오류 화면` 구현: `chainOk === false`일 때 전체 화면 표시

#### 코드 리뷰 포인트
- `useEffect` cleanup에서 이벤트 리스너가 제거되는지 (`return () => window.ethereum.removeListener(...)`)
- `isOwner` 판별 시 `account.toLowerCase() === owner.toLowerCase()` 비교 (대소문자 불일치 방지)
- `.env` 파일이 `.gitignore`에 등록되어 있는지

#### 검증
- `npm run dev` 실행 → 브라우저에서 앱 접속
- MetaMask 연결 버튼 클릭 → 주소 헤더 표시 확인
- Mainnet 연결 상태에서 → 오류 화면 표시 및 "Sepolia로 전환하기" 버튼 동작 확인
- Owner 지갑 연결 → `isOwner === true` 콘솔 확인

#### 단위 테스트 (브라우저 수동 확인)
- MetaMask 미설치 브라우저에서 연결 시도 → 안내 메시지 표시
- 잘못된 네트워크에서 앱 접속 → 오류 화면 표시
- Sepolia에서 지갑 연결 → 주소 정상 표시

#### 사이드 이펙트 확인
- MetaMask에서 계정 전환 시 `account` 상태 갱신 확인
- MetaMask에서 네트워크 전환 시 `chainOk` 상태 갱신 확인

#### 누적 회귀 테스트
- Phase 1~3 컨트랙트 테스트 전체 재실행 → 통과 확인
- Phase 4 브라우저 수동 확인 항목 전체 통과

---

### Phase 5 — 투표 현황 화면 (읽기 전용)

**구현 목표**: 컨트랙트에서 후보자 목록과 투표 상태를 읽어 화면에 표시한다.

#### 구현 항목
- `hooks/useVoting.js`:
  - `ethers.Contract(address, abi, provider)`로 읽기 전용 인스턴스 생성
  - `getCandidates()`, `votingState()`, `hasVoted(account)` 초기 로드
  - `setInterval(refresh, 15000)`으로 15초 폴링, `useEffect` cleanup에서 `clearInterval`
  - 반환값: `{ candidates, votingState, hasVoted, totalVotes, loading, refresh }`
- `components/CandidateCard.jsx`:
  - IPFS 사진: `${VITE_IPFS_GATEWAY}/ipfs/${photoCID}` URL로 `<img>` 렌더링
  - 이름, 득표수, 득표율 퍼센트 계산 (`voteCount / totalVotes * 100`)
  - 득표율 프로그레스바 (Tailwind `w-[{n}%]` 또는 인라인 스타일)
- `App.jsx` 메인 화면: `votingState`에 따라 SETUP / ACTIVE / ENDED 조건부 렌더링

#### 코드 리뷰 포인트
- `totalVotes === 0`일 때 득표율 계산에서 `NaN` 또는 `Infinity` 발생 방지 (0 나누기 방어)
- 폴링 `setInterval`이 컴포넌트 언마운트 시 정상 해제되는지
- IPFS 이미지 로딩 실패 시 fallback 이미지(`onError`) 처리 여부

#### 검증
- 후보자 2명 등록된 컨트랙트에서 카드 2개 정상 표시
- `votingState == SETUP` → "투표가 아직 시작되지 않았습니다" 안내 표시
- `votingState == ACTIVE` → 득표수·프로그레스바 표시
- `votingState == ENDED` → 최종 결과 레이아웃 표시
- 15초 후 자동으로 `getCandidates()` 재호출되는지 네트워크 탭에서 확인

#### 단위 테스트 (브라우저 수동 확인)
- 후보자 0명 상태 → 빈 목록 또는 안내 메시지 표시 (엣지 케이스)
- IPFS 이미지 URL이 실제 이미지를 정상 로드하는지

#### 사이드 이펙트 확인
- Phase 4 지갑 연결 기능이 Phase 5 추가 후에도 정상 동작하는지
- 폴링 중 지갑 연결 상태 변경이 화면 갱신에 간섭하지 않는지

#### 누적 회귀 테스트
- Phase 1~3 컨트랙트 테스트 재실행 → 통과
- Phase 4 브라우저 확인 항목 재확인 → 정상
- Phase 5 브라우저 확인 항목 전체 통과

---

### Phase 6 — 투표 실행 기능

**구현 목표**: 유권자가 후보자를 선택하고 MetaMask로 서명하여 온체인 투표를 실행한다.

#### 구현 항목
- `components/VoteButton.jsx`: 4가지 상태 렌더링 (미연결 / 미투표-활성 / 이미투표-비활성 / 전송중-스피너)
- 투표 확인 모달: 선택한 후보자 이름, "취소" / "MetaMask로 서명하기" 버튼
- `useVoting.js`에 `castVote(candidateId)` 함수 추가:
  - `ethers.Contract(address, abi, signer)`로 쓰기 인스턴스 생성
  - `contract.vote(candidateId)` 호출 → `tx.wait()` (confirm 대기)
  - confirm 후 `refresh()` 즉시 호출 → 득표수 갱신
- 에러 메시지 한국어 매핑 함수: revert reason 문자열 → 사용자 안내 메시지 변환
  - `"Already voted"` → `"이미 투표하셨습니다."`
  - `"Voting not active"` → `"투표가 종료되었습니다."`
  - `"Invalid candidate"` → `"잘못된 후보자입니다."`
  - 사용자 MetaMask 취소 (`ACTION_REJECTED`) → `"사용자가 트랜잭션을 취소했습니다."`
- 트랜잭션 전송 중 버튼 비활성화 + 스피너 표시

#### 코드 리뷰 포인트
- `tx.wait()` 완료 전에 `refresh()`를 호출하지 않는지 (confirm 이전 갱신 방지)
- 모달 열린 상태에서 페이지 스크롤 방지 처리 여부
- 에러 매핑에서 `error.reason`, `error.message` 모두 체크하는지 (ethers.js v6 에러 구조)
- 동시에 여러 후보자에 투표 클릭 방지 (전송 중 플래그)

#### 검증
- 미연결 상태에서 버튼 → "지갑을 연결해 주세요" 비활성 표시
- 연결 후 후보자 클릭 → 확인 모달 표시 → "취소" 클릭 → 모달 닫힘 확인
- "MetaMask로 서명하기" → MetaMask 팝업 → 서명 → 트랜잭션 전송 중 스피너 표시 → confirm 후 득표수 즉시 갱신
- 이미 투표한 지갑으로 재시도 → "이미 투표하셨습니다." 토스트 표시
- MetaMask에서 거절 → "사용자가 트랜잭션을 취소했습니다." 표시

#### 단위 테스트
- 동일 지갑으로 2회 투표 시도 → 두 번째 시도에서 에러 토스트 정상 표시
- `vote()` 성공 후 해당 후보자 `voteCount`가 UI에 즉시 반영되는지

#### 사이드 이펙트 확인
- Phase 5 폴링(15초)이 Phase 6 투표 실행 후에도 계속 동작하는지
- 투표 중 폴링이 트리거되어도 UI 충돌이 발생하지 않는지 (상태 병합 안전성)

#### 누적 회귀 테스트
- Phase 1~3 컨트랙트 테스트 재실행 → 통과
- Phase 4 지갑 연결 → 정상
- Phase 5 현황 화면 표시 → 정상
- Phase 6 투표 실행 전체 흐름 → 정상

---

### Phase 7 — 관리자 기능 + IPFS 사진 업로드

**구현 목표**: Owner 지갑에서만 접근 가능한 관리자 패널을 구현하고, 사진을 IPFS에 업로드하여 후보자를 등록한다.

#### 구현 항목
- `utils/ipfs.js`: Pinata V3 API 호출 함수
  - `uploadToIPFS(file)`: `FormData` 생성 → `POST https://uploads.pinata.cloud/v3/files` (Authorization 헤더에 JWT)
  - 응답에서 `data.cid` 추출 반환
- `components/CandidateForm.jsx`:
  - 이름 입력 필드
  - 사진 파일 선택 → 업로드 중 스피너 표시 → CID 획득
  - "후보자 등록" 버튼 → `addCandidate(name, cid)` 트랜잭션 전송
  - ACTIVE 상태이면 폼 전체 비활성화
- `components/AdminPanel.jsx`:
  - `isOwner === true`일 때만 렌더링
  - 등록된 후보자 목록 (이름, 사진 썸네일, CID)
  - 후보자 2명 이상 시 "투표 시작" 버튼 활성화 → `startVoting()` 트랜잭션
  - ACTIVE 상태 시 "투표 종료" 버튼 활성화 → `endVoting()` 트랜잭션
  - 각 버튼 클릭 후 `refresh()` 호출

#### 코드 리뷰 포인트
- `VITE_PINATA_JWT`가 없을 때 업로드 함수가 명확한 에러를 반환하는지
- 사진 업로드 완료 전에 `addCandidate` 트랜잭션이 실행되지 않는지 (비동기 순서)
- IPFS 업로드 실패 시 `addCandidate` 트랜잭션이 실행되지 않는지 (try-catch)
- `isOwner` 판별이 주소 소문자 비교로 안전하게 처리되는지

#### 검증
- Owner 지갑 연결 → AdminPanel 표시, 비-Owner 지갑 → 미표시
- 사진 파일 선택 → Pinata 대시보드에서 CID 업로드 확인 → 이미지 URL 로딩 확인
- 후보자 1명 등록 → "투표 시작" 버튼 비활성 / 2명 등록 → 활성
- "투표 시작" 클릭 → MetaMask 서명 → `votingState` ACTIVE 전환, 폼 비활성화 확인
- "투표 종료" 클릭 → ENDED 전환, AdminPanel의 두 버튼 모두 비활성화 확인

#### 단위 테스트
- 사진 없이 "후보자 등록" 클릭 → 유효성 검사 안내 표시
- ACTIVE 상태에서 `addCandidate` 폼 제출 시도 → 컨트랙트 revert 에러 토스트 표시

#### 사이드 이펙트 확인
- Phase 6 투표 실행 기능이 관리자 기능 추가 후에도 정상 동작하는지
- 관리자가 후보자 등록 후 일반 지갑에서 새 후보자가 카드에 표시되는지 (폴링 갱신)

#### 누적 회귀 테스트
- Phase 1~3 컨트랙트 테스트 재실행 → 통과
- Phase 4~6 브라우저 확인 항목 재확인 → 정상
- Phase 7 관리자 기능 전체 흐름 → 정상

---

### Phase 8 — 결과 화면 + 전체 통합 테스트

**구현 목표**: 투표 종료 후 최종 결과 화면을 완성하고, 전체 시나리오 E2E 테스트로 릴리즈 품질을 검증한다.

#### 구현 항목
- ENDED 상태 결과 화면 (`App.jsx` 또는 별도 `ResultView.jsx`):
  - 후보자 목록을 `voteCount` 기준 내림차순 정렬
  - 1위(최다 득표자)에 강조 스타일 적용 (동률 시 복수 당선 처리)
  - 각 후보자: 순위, 사진, 이름, 득표수, 득표율 프로그레스바
  - "Etherscan에서 결과 확인" 링크: `https://sepolia.etherscan.io/address/{CONTRACT_ADDRESS}`
- 반응형 레이아웃 전체 점검: 모바일(375px), 태블릿(768px), 데스크탑(1280px) 기준
- SETUP 화면에서 후보자 0명인 엣지 케이스 안내 문구 추가

#### 코드 리뷰 포인트
- 동률 처리: `voteCount` 최댓값과 같은 후보자가 복수일 때 모두 1위로 표시하는지
- Etherscan 링크가 환경 변수 `VITE_CONTRACT_ADDRESS`를 사용하는지 (하드코딩 금지)
- 정렬 시 `candidates` 원본 배열을 직접 변경하지 않는지 (`[...candidates].sort(...)`)

#### 검증
- 투표 종료 후 결과 화면 정상 렌더링 (순위 정렬 확인)
- 득표수 동률 후보자 복수 당선 표시 확인
- Etherscan 링크 클릭 → 컨트랙트 페이지로 이동 확인
- 모바일 화면(375px)에서 카드 레이아웃 깨짐 없는지 확인

#### 단위 테스트
- `candidates` 정렬 로직: `[{voteCount:3}, {voteCount:1}, {voteCount:3}]` → 1위 2명 처리 확인

#### 사이드 이펙트 확인
- 결과 화면 추가 후 SETUP / ACTIVE 화면이 이전과 동일하게 동작하는지
- 15초 폴링이 ENDED 상태에서도 불필요하게 계속 호출되지 않는지 (`votingState == ENDED`면 폴링 중단 권장)

#### 누적 회귀 테스트 (전체 E2E)

| 시나리오 | 확인 항목 |
|---------|---------|
| 관리자 지갑 연결 | AdminPanel 표시, 비-Owner 지갑에서 미표시 |
| 후보자 2명 사진 포함 등록 | IPFS 업로드 성공, 카드에 이미지 표시 |
| 투표 시작 | `votingState` → ACTIVE, 투표 버튼 활성화 |
| 지갑 A로 후보자 1에 투표 | 득표수 +1, 이미 투표 버튼 비활성화 |
| 지갑 A로 재투표 시도 | "이미 투표하셨습니다." 에러 표시 |
| 지갑 B로 후보자 2에 투표 | 득표수 분산 확인 |
| 투표 종료 | `votingState` → ENDED, 결과 화면 표시 |
| 결과 확인 | 득표 순위 정렬, 당선자 강조, Etherscan 링크 동작 |
| Sepolia Etherscan | 모든 트랜잭션(`Voted`, `VotingStarted`, `VotingEnded`) 조회 확인 |
