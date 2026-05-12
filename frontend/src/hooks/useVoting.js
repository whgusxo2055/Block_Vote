import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import votingABI from "../abi/Voting.json";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const POLL_INTERVAL = 15000;

export function useVoting(account) {
  const [candidates, setCandidates] = useState([]);
  const [votingState, setVotingState] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!CONTRACT_ADDRESS || !window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, votingABI, provider);
      const [rawCandidates, rawState] = await Promise.all([
        contract.getCandidates(),
        contract.votingState(),
      ]);
      const stateNum = Number(rawState);
      const parsed = rawCandidates.map((c) => ({
        id: Number(c.id),
        name: c.name,
        photoCID: c.photoCID,
        voteCount: Number(c.voteCount),
      }));
      const total = parsed.reduce((sum, c) => sum + c.voteCount, 0);
      setCandidates(parsed);
      setVotingState(stateNum);
      setTotalVotes(total);
      if (account) {
        const voted = await contract.hasVoted(account);
        setHasVoted(voted);
      } else {
        setHasVoted(false);
      }
    } catch (e) {
      console.error("컨트랙트 데이터 로드 실패:", e);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [refresh]);

  return { candidates, votingState, hasVoted, totalVotes, loading, refresh };
}
