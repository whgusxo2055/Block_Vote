const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting — Phase 1: 환경 구성 + 컨트랙트 골격", function () {
  let voting;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const VotingFactory = await ethers.getContractFactory("Voting");
    voting = await VotingFactory.deploy();
  });

  it("배포자 주소가 owner와 일치해야 한다", async function () {
    expect(await voting.owner()).to.equal(owner.address);
  });

  it("초기 votingState가 SETUP(0)이어야 한다", async function () {
    expect(await voting.votingState()).to.equal(0);
  });

  it("초기 candidates 배열이 비어있어야 한다 (index 0 접근 시 revert)", async function () {
    // public Candidate[] 배열은 인덱스로만 접근 가능 (getCandidates는 Phase 3 구현)
    // 빈 배열이면 index 0 접근이 revert되어야 함
    await expect(voting.candidates(0)).to.be.reverted;
  });
});
