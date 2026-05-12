const STATE_LABELS = { 0: "준비 중", 1: "진행 중", 2: "종료" };
const STATE_COLORS = {
  0: "bg-gray-100 text-gray-600",
  1: "bg-green-100 text-green-700",
  2: "bg-blue-100 text-blue-700",
};

export default function Header({
  votingState,
  chainOk,
  account,
  isConnected,
  isOwner,
  connect,
}) {
  const truncate = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const stateNum = votingState !== undefined ? Number(votingState) : null;

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b shadow-sm">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">BlockVote</h1>
        {isOwner && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
            관리자 모드
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`text-xs px-3 py-1 rounded-full font-medium ${
            chainOk
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-600"
          }`}
        >
          {chainOk ? "Sepolia" : "잘못된 네트워크"}
        </span>

        {stateNum !== null && (
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium ${
              STATE_COLORS[stateNum] ?? "bg-gray-100 text-gray-600"
            }`}
          >
            {STATE_LABELS[stateNum] ?? "—"}
          </span>
        )}

        <button
          onClick={connect}
          className="text-sm px-4 py-1.5 rounded-lg border border-gray-300 font-medium hover:bg-gray-50 transition-colors"
        >
          {isConnected && account ? truncate(account) : "지갑 연결"}
        </button>
      </div>
    </header>
  );
}
