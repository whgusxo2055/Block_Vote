#!/usr/bin/env zsh
# BlockVote 전체 재배포 스크립트
# 실행: ./scripts/redeploy.sh
# 동작: 컨트랙트 배포 → .env 자동 업데이트 → 프론트엔드 빌드 → Cloudflare Pages 배포

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$ROOT/frontend"

echo "=========================================="
echo "  BlockVote 재배포 시작"
echo "=========================================="

# 1. 스마트 컨트랙트 배포 (ABI 복사 + .env 업데이트 자동)
echo "\n[1/3] 스마트 컨트랙트 Sepolia 배포 중..."
cd "$ROOT"
npx hardhat run scripts/deploy.js --network sepolia

# 2. 프론트엔드 빌드
echo "\n[2/3] 프론트엔드 빌드 중..."
cd "$FRONTEND"
npm run build

# 3. Cloudflare Pages 배포
echo "\n[3/3] Cloudflare Pages 배포 중..."
wrangler pages deploy dist --project-name blockvote --commit-dirty=true

echo "\n=========================================="
echo "  ✅ 재배포 완료"
echo "  🌐 https://blockvote-e4g.pages.dev"
echo "=========================================="
