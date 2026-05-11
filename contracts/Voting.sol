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

    constructor() {
        owner = msg.sender;
        votingState = VotingState.SETUP;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
}
