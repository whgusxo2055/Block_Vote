const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("배포 계정:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("계정 잔액:", ethers.formatEther(balance), "ETH");

  const VotingFactory = await ethers.getContractFactory("Voting");
  console.log("Voting 컨트랙트 배포 중...");

  const voting = await VotingFactory.deploy();
  await voting.waitForDeployment();

  const contractAddress = await voting.getAddress();
  console.log("✅ Voting 컨트랙트 배포 완료:", contractAddress);

  // ABI를 frontend/src/abi/Voting.json으로 자동 복사
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/Voting.sol/Voting.json"
  );
  const abiDestDir = path.join(__dirname, "../frontend/src/abi");
  const abiDestPath = path.join(abiDestDir, "Voting.json");

  if (fs.existsSync(artifactPath)) {
    fs.mkdirSync(abiDestDir, { recursive: true });
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    fs.writeFileSync(abiDestPath, JSON.stringify(artifact.abi, null, 2));
    console.log("✅ ABI 복사 완료:", abiDestPath);
  } else {
    console.warn("⚠️  artifacts 없음 — npx hardhat compile 먼저 실행하세요.");
  }

  console.log("\n📋 다음 단계:");
  console.log("   frontend/.env 에 추가:");
  console.log(`   VITE_CONTRACT_ADDRESS=${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
