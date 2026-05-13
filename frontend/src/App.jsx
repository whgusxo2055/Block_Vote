import { useState, useCallback } from "react";
import { useWallet } from "./hooks/useWallet";
import { useVoting } from "./hooks/useVoting";
import Header from "./components/Header";
import CandidateCard from "./components/CandidateCard";
import VoteButton from "./components/VoteButton";
import AdminPanel from "./components/AdminPanel";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const ETHERSCAN_BASE = "https://sepolia.etherscan.io";

export default function App() {
  const { account, isOwner, isConnected, chainOk, connect, switchToSepolia } =
    useWallet();
  const { candidates, votingState, hasVoted, totalVotes, loading, castVote, voting, addCandidate, startVoting, endVoting } =
    useVoting(account);

  const [toast, setToast] = useState(null);

  const handleVoteResult = useCallback((result) => {
    const message = result.success ? "투표가 완료되었습니다!" : result.message;
    const type = result.success ? "success" : "error";
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        votingState={votingState}
        chainOk={chainOk}
        account={account}
        isConnected={isConnected}
        isOwner={isOwner}
        connect={connect}
      />

      {toast && <Toast message={toast.message} type={toast.type} />}

      {isConnected && !chainOk ? (
        <NetworkErrorScreen switchToSepolia={switchToSepolia} />
      ) : loading ? (
        <main className="flex justify-center items-center min-h-[60vh]">
          <p className="text-gray-400">불러오는 중...</p>
        </main>
      ) : (
        <>
          <main className="container mx-auto px-4 py-8 max-w-4xl">
            <VotingContent
              votingState={votingState}
              candidates={candidates}
              totalVotes={totalVotes}
              hasVoted={hasVoted}
              isConnected={isConnected}
              castVote={castVote}
              voting={voting}
              onVoteResult={handleVoteResult}
            />
          </main>
          {isOwner && (
            <AdminPanel
              candidates={candidates}
              votingState={votingState}
              addCandidate={addCandidate}
              startVoting={startVoting}
              endVoting={endVoting}
            />
          )}
        </>
      )}
    </div>
  );
}

function VotingContent({ votingState, candidates, totalVotes, hasVoted, isConnected, castVote, voting, onVoteResult }) {
  if (votingState === null) {
    return (
      <div className="text-center py-24 text-gray-400">
        컨트랙트에 연결할 수 없습니다. 네트워크를 확인해 주세요.
      </div>
    );
  }

  if (votingState === 0) {
    if (candidates.length === 0) {
      return (
        <div className="text-center py-24">
          <p className="text-2xl font-semibold text-gray-700">투표가 아직 시작되지 않았습니다.</p>
          <p className="text-gray-400 mt-2">관리자 패널에서 후보자를 등록해 주세요.</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">등록된 후보자</h2>
          <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">투표 준비 중</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {candidates.map((c) => (
            <CandidateCard key={c.id} candidate={c} totalVotes={0} isWinner={false} action={null} />
          ))}
        </div>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="text-center py-24 text-gray-400">
        등록된 후보자가 없습니다.
      </div>
    );
  }

  if (votingState === 2) {
    const sorted = [...candidates].sort((a, b) => b.voteCount - a.voteCount);
    let rank = 0;
    let prevCount = -1;
    const ranked = sorted.map((c) => {
      if (c.voteCount !== prevCount) { rank += 1; prevCount = c.voteCount; }
      return { ...c, rank };
    });
    const topCount = sorted[0]?.voteCount ?? 0;
    const isWinner = (c) => totalVotes > 0 && c.voteCount === topCount;

    return (
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800">최종 투표 결과</h2>
          <p className="text-sm text-gray-400 mt-1">총 {totalVotes}표</p>
        </div>
        <div className="flex flex-col gap-3">
          {ranked.map((c) => {
            const pct = totalVotes > 0 ? Math.round((c.voteCount / totalVotes) * 100) : 0;
            const winner = isWinner(c);
            return (
              <div
                key={c.id}
                className={`flex items-center gap-4 p-4 rounded-xl border ${winner ? "border-yellow-400 bg-yellow-50" : "border-gray-200 bg-white"}`}
              >
                <span className={`text-lg font-bold w-8 text-center flex-shrink-0 ${c.rank === 1 ? "text-yellow-500" : c.rank === 2 ? "text-gray-400" : c.rank === 3 ? "text-orange-400" : "text-gray-300"}`}>
                  {c.rank === 1 ? "🥇" : c.rank === 2 ? "🥈" : c.rank === 3 ? "🥉" : `${c.rank}위`}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{c.name}</span>
                    {winner && (
                      <span className="text-xs font-bold bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">당선</span>
                    )}
                  </div>
                  <div className="mt-1.5 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${winner ? "bg-yellow-400" : "bg-blue-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{c.voteCount}표 ({pct}%)</p>
                </div>
              </div>
            );
          })}
        </div>
        {CONTRACT_ADDRESS && (
          <div className="text-center">
            <a
              href={`${ETHERSCAN_BASE}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline"
            >
              Etherscan에서 컨트랙트 확인 →
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">투표 현황</h2>
        <span className="text-sm text-gray-400">총 {totalVotes}표</span>
      </div>
      {isConnected && hasVoted && (
        <div className="text-center text-sm text-blue-600 bg-blue-50 rounded-lg py-2">
          이미 투표하셨습니다.
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {candidates.map((c) => (
          <CandidateCard
            key={c.id}
            candidate={c}
            totalVotes={totalVotes}
            isWinner={false}
            action={
              <VoteButton
                candidateId={c.id}
                candidateName={c.name}
                isConnected={isConnected}
                hasVoted={hasVoted}
                voting={voting}
                castVote={castVote}
                onResult={onVoteResult}
              />
            }
          />
        ))}
      </div>
    </div>
  );
}

function Toast({ message, type }) {
  const colors =
    type === "success"
      ? "bg-green-600 text-white"
      : "bg-red-600 text-white";
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${colors}`}>
      {message}
    </div>
  );
}

function NetworkErrorScreen({ switchToSepolia }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-4 text-center">
      <p className="text-5xl">⚠️</p>
      <h2 className="text-2xl font-bold text-gray-800">
        잘못된 네트워크에 연결되어 있습니다.
      </h2>
      <p className="text-gray-500">
        필요 네트워크: Sepolia Testnet (Chain ID: 11155111)
      </p>
      <button
        onClick={switchToSepolia}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        Sepolia로 전환하기
      </button>
    </div>
  );
}
