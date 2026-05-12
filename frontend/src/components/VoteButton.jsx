import { useState, useEffect } from "react";

function ConfirmModal({ candidateName, onCancel, onConfirm }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-4">
        <h3 className="text-lg font-bold text-gray-900 text-center">투표 확인</h3>
        <p className="text-gray-600 text-center text-sm leading-relaxed">
          <span className="font-semibold text-gray-900">{candidateName}</span>에게
          투표하시겠습니까?
          <br />
          이 작업은 블록체인에 기록되며 취소할 수 없습니다.
        </p>
        <div className="flex gap-3 mt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            MetaMask로 서명하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VoteButton({ candidateId, candidateName, isConnected, hasVoted, voting, castVote, onResult }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isThisVoting, setIsThisVoting] = useState(false);

  const handleConfirm = async () => {
    setModalOpen(false);
    setIsThisVoting(true);
    const result = await castVote(candidateId);
    setIsThisVoting(false);
    onResult(result);
  };

  if (!isConnected) {
    return (
      <button
        disabled
        className="w-full py-2 rounded-lg bg-gray-100 text-gray-400 text-sm font-medium cursor-not-allowed"
      >
        지갑을 연결해 주세요
      </button>
    );
  }

  if (hasVoted) {
    return (
      <button
        disabled
        className="w-full py-2 rounded-lg bg-gray-100 text-gray-400 text-sm font-medium cursor-not-allowed"
      >
        이미 투표하셨습니다
      </button>
    );
  }

  if (isThisVoting) {
    return (
      <button
        disabled
        className="w-full py-2 rounded-lg bg-blue-400 text-white text-sm font-medium flex items-center justify-center gap-2 cursor-not-allowed"
      >
        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        처리 중...
      </button>
    );
  }

  if (voting) {
    return (
      <button
        disabled
        className="w-full py-2 rounded-lg bg-gray-100 text-gray-400 text-sm font-medium cursor-not-allowed"
      >
        대기 중...
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        투표하기
      </button>
      {modalOpen && (
        <ConfirmModal
          candidateName={candidateName}
          onCancel={() => setModalOpen(false)}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}
