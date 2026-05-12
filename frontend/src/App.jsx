import { useState, useCallback } from "react";
import { useWallet } from "./hooks/useWallet";
import { useVoting } from "./hooks/useVoting";
import Header from "./components/Header";
import CandidateCard from "./components/CandidateCard";
import VoteButton from "./components/VoteButton";

export default function App() {
  const { account, isOwner, isConnected, chainOk, connect, switchToSepolia } =
    useWallet();
  const { candidates, votingState, hasVoted, totalVotes, loading, castVote, voting } =
    useVoting(account);

  const [toast, setToast] = useState(null);

  const handleVoteResult = useCallback((result) => {
    const message = result.success ? "투표가 완료되었습니다!" : result.message;
    const type = result.success ? "success" : "error";
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const maxVotes =
    candidates.length > 0 ? Math.max(...candidates.map((c) => c.voteCount)) : 0;

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
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <VotingContent
            votingState={votingState}
            candidates={candidates}
            totalVotes={totalVotes}
            maxVotes={maxVotes}
            hasVoted={hasVoted}
            isConnected={isConnected}
            castVote={castVote}
            voting={voting}
            onVoteResult={handleVoteResult}
          />
        </main>
      )}
    </div>
  );
}

function VotingContent({ votingState, candidates, totalVotes, maxVotes, hasVoted, isConnected, castVote, voting, onVoteResult }) {
  if (votingState === null) {
    return (
      <div className="text-center py-24 text-gray-400">
        컨트랙트에 연결할 수 없습니다. 네트워크를 확인해 주세요.
      </div>
    );
  }

  if (votingState === 0) {
    return (
      <div className="text-center py-24">
        <p className="text-2xl font-semibold text-gray-700">투표가 아직 시작되지 않았습니다.</p>
        <p className="text-gray-400 mt-2">관리자가 투표를 시작하면 여기에 후보자 목록이 표시됩니다.</p>
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

  return (
    <div className="flex flex-col gap-6">
      {votingState === 1 && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">투표 현황</h2>
          <span className="text-sm text-gray-400">총 {totalVotes}표</span>
        </div>
      )}
      {votingState === 2 && (
        <div className="text-center mb-2">
          <h2 className="text-xl font-bold text-gray-800">최종 투표 결과</h2>
          <p className="text-sm text-gray-400 mt-1">총 {totalVotes}표</p>
        </div>
      )}
      {isConnected && votingState === 1 && hasVoted && (
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
            isWinner={votingState === 2 && totalVotes > 0 && c.voteCount === maxVotes}
            action={
              votingState === 1 ? (
                <VoteButton
                  candidateId={c.id}
                  candidateName={c.name}
                  isConnected={isConnected}
                  hasVoted={hasVoted}
                  voting={voting}
                  castVote={castVote}
                  onResult={onVoteResult}
                />
              ) : null
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
