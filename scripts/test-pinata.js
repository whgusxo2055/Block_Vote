const fs = require("fs");
const path = require("path");

// frontend/.env에서 환경변수 로드
const envPath = path.join(__dirname, "../frontend/.env");
const envVars = {};
fs.readFileSync(envPath, "utf8")
  .split("\n")
  .forEach((line) => {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) envVars[key.trim()] = rest.join("=").trim();
  });

const JWT = envVars["VITE_PINATA_JWT"];
const GATEWAY = envVars["VITE_IPFS_GATEWAY"] || "https://gateway.pinata.cloud";

if (!JWT || JWT.includes("placeholder")) {
  console.error("❌ VITE_PINATA_JWT가 설정되지 않았습니다.");
  process.exit(1);
}

// 1×1 투명 PNG (최소 크기 테스트 파일)
const TEST_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

async function testPinata() {
  console.log("🔍 Pinata V3 API 검증 시작...\n");

  // Step 1: JWT 인증 확인
  console.log("1️⃣  JWT 인증 확인 중...");
  const authRes = await fetch("https://api.pinata.cloud/v3/files?pageLimit=1", {
    headers: { Authorization: `Bearer ${JWT}` },
  });

  if (!authRes.ok) {
    const err = await authRes.text();
    console.error(`❌ 인증 실패 (${authRes.status}):`, err);
    process.exit(1);
  }
  console.log("✅ JWT 인증 성공\n");

  // Step 2: 테스트 파일 업로드 (native FormData + Blob)
  console.log("2️⃣  테스트 이미지 업로드 중...");
  const form = new globalThis.FormData();
  const blob = new Blob([TEST_PNG], { type: "image/png" });
  form.append("file", blob, "blockvote-test.png");
  form.append("name", "blockvote-test");

  const uploadRes = await fetch("https://uploads.pinata.cloud/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${JWT}` },
    body: form,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    console.error(`❌ 업로드 실패 (${uploadRes.status}):`, err);
    process.exit(1);
  }

  const result = await uploadRes.json();
  const cid = result.data?.cid;

  if (!cid) {
    console.error("❌ CID를 받지 못했습니다:", JSON.stringify(result));
    process.exit(1);
  }
  console.log(`✅ 업로드 성공\n   CID: ${cid}\n`);

  // Step 3: IPFS 게이트웨이 접근 확인
  console.log("3️⃣  IPFS 게이트웨이 접근 확인 중...");
  const imageUrl = `${GATEWAY}/ipfs/${cid}`;
  const gatewayRes = await fetch(imageUrl, { method: "HEAD" });

  if (gatewayRes.ok) {
    console.log(`✅ 게이트웨이 접근 성공\n   URL: ${imageUrl}\n`);
  } else {
    console.warn(`⚠️  게이트웨이 응답: ${gatewayRes.status} (핀닝 전파 중일 수 있음)`);
    console.log(`   URL: ${imageUrl}\n`);
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 Pinata V3 검증 완료");
  console.log(`   CID    : ${cid}`);
  console.log(`   이미지  : ${imageUrl}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n💡 addCandidate 호출 예시:");
  console.log(`   contract.addCandidate("테스트후보", "${cid}")`);
}

testPinata().catch((e) => {
  console.error("❌ 예외 발생:", e.message);
  process.exit(1);
});
