# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**BlockVote** — Ethereum Sepolia Testnet 기반 탈중앙화 투표 시스템 (수업 실습용, 10명 미만).
전체 기획/설계 문서: `BlockVote_Document.md`

## Architecture

```
[Browser]
  └── React + Vite (./frontend)
        ├── ethers.js v6 → MetaMask → Sepolia RPC (Alchemy/Infura)
        │                                   └── Voting.sol Contract
        └── Pinata API V3 → IPFS (후보자 사진, CID만 온체인 저장)
```

- **백엔드 서버 없음** — 블록체인 + IPFS만 사용
- **MetaMask 필수** — Chrome 익스텐션, Sepolia (Chain ID: `0xaa36a7` = 11155111)
- **컨트랙트 배포자 지갑 = Owner** — 관리자 UI는 지갑 주소 비교로 조건부 렌더링

## Directory Structure

```
VotingSystem/
├── contracts/Voting.sol        # 스마트 컨트랙트 (Solidity 0.8.20)
├── scripts/deploy.js           # Hardhat 배포 스크립트
├── test/Voting.test.js         # 컨트랙트 단위 테스트
├── hardhat.config.js
├── .env                        # PRIVATE_KEY, SEPOLIA_RPC_URL, ETHERSCAN_API_KEY
└── frontend/
    ├── src/
    │   ├── abi/Voting.json     # 배포 후 artifacts에서 복사한 ABI
    │   ├── components/         # Header, CandidateCard, VoteButton, AdminPanel, CandidateForm
    │   ├── hooks/
    │   │   ├── useWallet.js    # MetaMask 연결, Sepolia 체크
    │   │   └── useVoting.js    # 컨트랙트 읽기/쓰기, 15초 폴링
    │   └── utils/ipfs.js       # Pinata V3 업로드
    └── .env                    # VITE_CONTRACT_ADDRESS, VITE_PINATA_JWT, VITE_IPFS_GATEWAY
```

## Commands

### Smart Contract (루트)
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv
npx hardhat test                          # 컨트랙트 단위 테스트
npx hardhat test --grep "vote"           # 특정 테스트만 실행
npx hardhat run scripts/deploy.js --network sepolia   # Sepolia 배포
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>  # Etherscan 검증
```

### Frontend (./frontend)
```bash
npm create vite@latest . -- --template react
npm install ethers
npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init -p
npm run dev     # Vite 개발 서버 (port 5173)
npm run build   # 프로덕션 빌드
```

### ABI 동기화 (컨트랙트 재배포 시)
```bash
cp artifacts/contracts/Voting.sol/Voting.json frontend/src/abi/Voting.json
```

## Key Technical Decisions

**폴링 방식 (이벤트 X)**: `BrowserProvider`는 HTTP polling 기반이라 `contract.on('Voted', ...)` 이벤트 리스너가 불안정하다. 투표 confirm 후 `getCandidates()` 즉시 재호출 + `setInterval(refresh, 15000)` 폴링을 사용한다.

**Pinata V3 JWT**: IPFS 업로드 시 레거시 API Key+Secret 방식이 아닌 JWT 단일 토큰 사용. 엔드포인트: `POST https://uploads.pinata.cloud/v3/files`, 응답에서 `data.cid` 추출.

**`Candidate[]` 배열**: `getCandidates()`가 전체 후보자를 반환해야 하므로 `mapping` 대신 dynamic array 사용. `candidateId`는 배열 인덱스와 동일 (0-indexed).

**IPFS 이미지 URL**: `${VITE_IPFS_GATEWAY}/ipfs/${photoCID}` (예: `https://gateway.pinata.cloud/ipfs/QmXxx`)

## Smart Contract State Machine

```
VotingState: SETUP → ACTIVE → ENDED
- SETUP: 후보자 등록 가능 (Owner only), addCandidate()
- ACTIVE: 투표 가능 (모든 지갑, 1회), vote()
- ENDED: 조회만 가능, getCandidates()
```

Revert 메시지: `"Only owner"` / `"Need at least 2 candidates"` / `"Voting not active"` / `"Already voted"` / `"Invalid candidate"`

## Environment Variables

| 파일 | 변수 | 설명 |
|------|------|------|
| `.env` (루트) | `PRIVATE_KEY` | 배포 지갑 개인키 |
| `.env` (루트) | `SEPOLIA_RPC_URL` | Alchemy/Infura Sepolia 엔드포인트 |
| `.env` (루트) | `ETHERSCAN_API_KEY` | hardhat verify용 |
| `frontend/.env` | `VITE_CONTRACT_ADDRESS` | 배포된 컨트랙트 주소 |
| `frontend/.env` | `VITE_PINATA_JWT` | Pinata Files:Write 스코프 JWT |
| `frontend/.env` | `VITE_IPFS_GATEWAY` | IPFS 게이트웨이 URL |

## PM2 Services

| Port | Name | Type |
|------|------|------|
| 5173 | blockvote-5173 | Vite (React) |

**Terminal Commands:**
```bash
pm2 start ecosystem.config.cjs   # 최초 실행 (config 파일 사용)
pm2 start all                    # 이후 실행
pm2 stop all / pm2 restart all
pm2 start blockvote-5173 / pm2 stop blockvote-5173
pm2 logs / pm2 status / pm2 monit
pm2 save                         # 프로세스 목록 저장
pm2 resurrect                    # 저장된 목록 복원
```
