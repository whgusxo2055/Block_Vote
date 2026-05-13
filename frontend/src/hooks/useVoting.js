import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import votingABI from "../abi/Voting.json";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const POLL_INTERVAL = 15000;

function mapAdminError(e) {
  const msg = (e?.reason ?? e?.message ?? "").toLowerCase();
  if (msg.includes("only owner")) return "관리자 권한이 필요합니다.";
  if (msg.includes("need at least 2")) return "후보자가 2명 이상 필요합니다.";
  if (msg.includes("voting not")) return "현재 상태에서는 실행할 수 없습니다.";
  if (e?.code === "ACTION_REJECTED" || msg.includes("user rejected"))
    return "사용자가 트랜잭션을 취소했습니다.";
  return "트랜잭션 처리 중 오류가 발생했습니다.";
}

function mapVoteError(e) {
  const msg = (e?.reason ?? e?.message ?? "").toLowerCase();
  if (msg.includes("already voted")) return "이미 투표하셨습니다.";
  if (msg.includes("voting not active")) return "투표가 종료되었습니다.";
  if (msg.includes("invalid candidate")) return "잘못된 후보자입니다.";
  if (e?.code === "ACTION_REJECTED" || msg.includes("user rejected"))
    return "사용자가 트랜잭션을 취소했습니다.";
  return "트랜잭션 처리 중 오류가 발생했습니다.";
}

export function useVoting(account) {
  const [candidates, setCandidates] = useState([]);
  const [votingState, setVotingState] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

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

  const castVote = useCallback(async (candidateId) => {
    if (!window.ethereum || !CONTRACT_ADDRESS) return { success: false, message: "지갑이 연결되지 않았습니다." };
    setVoting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, votingABI, signer);
      const tx = await contract.vote(candidateId);
      await tx.wait();
      await refresh();
      return { success: true };
    } catch (e) {
      return { success: false, message: mapVoteError(e) };
    } finally {
      setVoting(false);
    }
  }, [refresh]);

  const sendAdminTx = useCallback(async (method, ...args) => {
    if (!window.ethereum || !CONTRACT_ADDRESS) return { success: false, message: "지갑이 연결되지 않았습니다." };
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, votingABI, signer);
      const tx = await contract[method](...args);
      await tx.wait();
      await refresh();
      return { success: true };
    } catch (e) {
      return { success: false, message: mapAdminError(e) };
    }
  }, [refresh]);

  const addCandidate = useCallback((name, cid) => sendAdminTx("addCandidate", name, cid), [sendAdminTx]);
  const startVoting = useCallback(() => sendAdminTx("startVoting"), [sendAdminTx]);
  const endVoting = useCallback(() => sendAdminTx("endVoting"), [sendAdminTx]);

  return { candidates, votingState, hasVoted, totalVotes, loading, refresh, castVote, voting, addCandidate, startVoting, endVoting };
}
