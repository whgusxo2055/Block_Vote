// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Voting {
    struct Candidate {
        uint256 id;
        string name;
        string photoCID;
        uint256 voteCount;
    }

    enum VotingState { SETUP, ACTIVE, ENDED }

    address public owner;
    Candidate[] public candidates;
    VotingState public votingState;
    mapping(address => bool) public hasVoted;

    event CandidateAdded(uint256 indexed id, string name, string photoCID);
    event VotingStarted(uint256 timestamp);
    event VotingEnded(uint256 timestamp);
    event Voted(address indexed voter, uint256 candidateId);

    constructor() {
        owner = msg.sender;
        votingState = VotingState.SETUP;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    function addCandidate(string memory name, string memory photoCID) external onlyOwner {
        require(votingState == VotingState.SETUP, "Voting already started");
        uint256 id = candidates.length;
        candidates.push(Candidate({id: id, name: name, photoCID: photoCID, voteCount: 0}));
        emit CandidateAdded(id, name, photoCID);
    }

    function startVoting() external onlyOwner {
        require(votingState == VotingState.SETUP, "Voting already started");
        require(candidates.length >= 2, "Need at least 2 candidates");
        votingState = VotingState.ACTIVE;
        emit VotingStarted(block.timestamp);
    }

    function endVoting() external onlyOwner {
        require(votingState == VotingState.ACTIVE, "Voting not active");
        votingState = VotingState.ENDED;
        emit VotingEnded(block.timestamp);
    }
}
