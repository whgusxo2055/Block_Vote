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

describe("Voting — Phase 2: 후보자 등록 + 투표 시작/종료", function () {
  let voting;
  let owner;
  let voter1;
  let voter2;

  beforeEach(async function () {
    [owner, voter1, voter2] = await ethers.getSigners();
    const VotingFactory = await ethers.getContractFactory("Voting");
    voting = await VotingFactory.deploy();
  });

  // ── addCandidate ──────────────────────────────────────────
  describe("addCandidate", function () {
    it("Owner가 후보자를 등록하면 candidates 배열에 추가된다", async function () {
      await voting.addCandidate("홍길동", "QmAbc123");
      const c = await voting.candidates(0);
      expect(c.id).to.equal(0);
      expect(c.name).to.equal("홍길동");
      expect(c.photoCID).to.equal("QmAbc123");
      expect(c.voteCount).to.equal(0);
    });

    it("addCandidate 성공 시 CandidateAdded 이벤트가 emit된다", async function () {
      await expect(voting.addCandidate("홍길동", "QmAbc123"))
        .to.emit(voting, "CandidateAdded")
        .withArgs(0, "홍길동", "QmAbc123");
    });

    it("id는 push 전 배열 길이(0-indexed)로 자동 부여된다", async function () {
      await voting.addCandidate("후보A", "QmA");
      await voting.addCandidate("후보B", "QmB");
      const c0 = await voting.candidates(0);
      const c1 = await voting.candidates(1);
      expect(c0.id).to.equal(0);
      expect(c1.id).to.equal(1);
    });

    it("비-Owner가 addCandidate 호출 시 revert된다", async function () {
      await expect(
        voting.connect(voter1).addCandidate("홍길동", "QmAbc123")
      ).to.be.revertedWith("Only owner");
    });

    it("ACTIVE 상태에서 addCandidate 호출 시 revert된다", async function () {
      await voting.addCandidate("후보A", "QmA");
      await voting.addCandidate("후보B", "QmB");
      await voting.startVoting();
      await expect(
        voting.addCandidate("후보C", "QmC")
      ).to.be.revertedWith("Voting already started");
    });
  });

  // ── startVoting ───────────────────────────────────────────
  describe("startVoting", function () {
    it("후보자 1명일 때 startVoting 호출 시 revert된다", async function () {
      await voting.addCandidate("후보A", "QmA");
      await expect(voting.startVoting()).to.be.revertedWith(
        "Need at least 2 candidates"
      );
    });

    it("후보자 2명 등록 후 startVoting 호출 시 ACTIVE 상태로 전환된다", async function () {
      await voting.addCandidate("후보A", "QmA");
      await voting.addCandidate("후보B", "QmB");
      await voting.startVoting();
      expect(await voting.votingState()).to.equal(1); // ACTIVE = 1
    });

    it("startVoting 성공 시 VotingStarted 이벤트가 emit된다", async function () {
      await voting.addCandidate("후보A", "QmA");
      await voting.addCandidate("후보B", "QmB");
      await expect(voting.startVoting()).to.emit(voting, "VotingStarted");
    });

    it("비-Owner가 startVoting 호출 시 revert된다", async function () {
      await voting.addCandidate("후보A", "QmA");
      await voting.addCandidate("후보B", "QmB");
      await expect(
        voting.connect(voter1).startVoting()
      ).to.be.revertedWith("Only owner");
    });
  });

  // ── endVoting ─────────────────────────────────────────────
  describe("endVoting", function () {
    it("SETUP 상태에서 endVoting 호출 시 revert된다", async function () {
      await expect(voting.endVoting()).to.be.revertedWith("Voting not active");
    });

    it("ACTIVE 상태에서 endVoting 호출 시 ENDED 상태로 전환된다", async function () {
      await voting.addCandidate("후보A", "QmA");
      await voting.addCandidate("후보B", "QmB");
      await voting.startVoting();
      await voting.endVoting();
      expect(await voting.votingState()).to.equal(2); // ENDED = 2
    });

    it("endVoting 성공 시 VotingEnded 이벤트가 emit된다", async function () {
      await voting.addCandidate("후보A", "QmA");
      await voting.addCandidate("후보B", "QmB");
      await voting.startVoting();
      await expect(voting.endVoting()).to.emit(voting, "VotingEnded");
    });

    it("비-Owner가 endVoting 호출 시 revert된다", async function () {
      await voting.addCandidate("후보A", "QmA");
      await voting.addCandidate("후보B", "QmB");
      await voting.startVoting();
      await expect(
        voting.connect(voter1).endVoting()
      ).to.be.revertedWith("Only owner");
    });
  });

  // ── 사이드 이펙트 ──────────────────────────────────────────
  describe("사이드 이펙트", function () {
    it("addCandidate 연속 호출 시 candidates index가 순차 증가한다", async function () {
      await voting.addCandidate("A", "QmA");
      await voting.addCandidate("B", "QmB");
      await voting.addCandidate("C", "QmC");
      const c2 = await voting.candidates(2);
      expect(c2.name).to.equal("C");
      expect(c2.id).to.equal(2);
    });

    it("startVoting 후 addCandidate 호출 시 revert된다", async function () {
      await voting.addCandidate("A", "QmA");
      await voting.addCandidate("B", "QmB");
      await voting.startVoting();
      await expect(voting.addCandidate("C", "QmC")).to.be.revertedWith(
        "Voting already started"
      );
    });
  });
});

describe("Voting — Phase 3: 투표 실행 + 읽기 함수", function () {
  let voting;
  let owner;
  let voter1;
  let voter2;
  let voter3;

  beforeEach(async function () {
    [owner, voter1, voter2, voter3] = await ethers.getSigners();
    const VotingFactory = await ethers.getContractFactory("Voting");
    voting = await VotingFactory.deploy();
    // 공통 셋업: 후보자 2명 등록
    await voting.addCandidate("후보A", "QmA");
    await voting.addCandidate("후보B", "QmB");
  });

  // ── vote ─────────────────────────────────────────────────
  describe("vote", function () {
    it("SETUP 상태에서 vote 호출 시 revert된다", async function () {
      await expect(
        voting.connect(voter1).vote(0)
      ).to.be.revertedWith("Voting not active");
    });

    it("유효하지 않은 candidateId로 vote 호출 시 revert된다", async function () {
      await voting.startVoting();
      await expect(
        voting.connect(voter1).vote(99)
      ).to.be.revertedWith("Invalid candidate");
    });

    it("동일 지갑이 2회 vote 호출 시 revert된다", async function () {
      await voting.startVoting();
      await voting.connect(voter1).vote(0);
      await expect(
        voting.connect(voter1).vote(0)
      ).to.be.revertedWith("Already voted");
    });

    it("정상 투표 후 voteCount가 1 증가한다", async function () {
      await voting.startVoting();
      await voting.connect(voter1).vote(0);
      const c = await voting.candidates(0);
      expect(c.voteCount).to.equal(1);
    });

    it("정상 투표 후 hasVoted[voter]가 true가 된다", async function () {
      await voting.startVoting();
      await voting.connect(voter1).vote(0);
      expect(await voting.hasVoted(voter1.address)).to.equal(true);
    });

    it("정상 투표 시 Voted 이벤트가 emit된다", async function () {
      await voting.startVoting();
      await expect(voting.connect(voter1).vote(0))
        .to.emit(voting, "Voted")
        .withArgs(voter1.address, 0);
    });

    it("ENDED 상태에서 vote 호출 시 revert된다", async function () {
      await voting.startVoting();
      await voting.endVoting();
      await expect(
        voting.connect(voter1).vote(0)
      ).to.be.revertedWith("Voting not active");
    });
  });

  // ── getCandidates ─────────────────────────────────────────
  describe("getCandidates", function () {
    it("후보자 2명 등록 후 배열 길이 2를 반환한다", async function () {
      const list = await voting.getCandidates();
      expect(list.length).to.equal(2);
    });

    it("반환된 후보자 데이터가 등록 내용과 일치한다", async function () {
      const list = await voting.getCandidates();
      expect(list[0].name).to.equal("후보A");
      expect(list[0].photoCID).to.equal("QmA");
      expect(list[1].name).to.equal("후보B");
    });

    it("getCandidates는 상태를 변경하지 않는다 (view 함수)", async function () {
      await voting.getCandidates();
      expect(await voting.votingState()).to.equal(0); // 여전히 SETUP
    });
  });

  // ── getTotalVotes ─────────────────────────────────────────
  describe("getTotalVotes", function () {
    it("투표 전 getTotalVotes는 0을 반환한다", async function () {
      expect(await voting.getTotalVotes()).to.equal(0);
    });

    it("3표 투표 후 getTotalVotes는 3을 반환한다", async function () {
      await voting.startVoting();
      await voting.connect(voter1).vote(0);
      await voting.connect(voter2).vote(1);
      await voting.connect(voter3).vote(0);
      expect(await voting.getTotalVotes()).to.equal(3);
    });
  });

  // ── 사이드 이펙트 ──────────────────────────────────────────
  describe("사이드 이펙트", function () {
    it("endVoting 후 vote 호출 시 Voting not active revert된다", async function () {
      await voting.startVoting();
      await voting.endVoting();
      await expect(
        voting.connect(voter1).vote(0)
      ).to.be.revertedWith("Voting not active");
    });

    it("여러 투표자가 각각 1표씩 투표하면 voteCount가 정확히 집계된다", async function () {
      await voting.startVoting();
      await voting.connect(voter1).vote(0);
      await voting.connect(voter2).vote(0);
      await voting.connect(voter3).vote(1);
      const list = await voting.getCandidates();
      expect(list[0].voteCount).to.equal(2);
      expect(list[1].voteCount).to.equal(1);
    });
  });
});
