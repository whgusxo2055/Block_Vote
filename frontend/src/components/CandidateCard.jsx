const GATEWAY = import.meta.env.VITE_IPFS_GATEWAY || "https://gateway.pinata.cloud";
const FALLBACK = "https://placehold.co/200x200/e2e8f0/94a3b8?text=No+Image";

export default function CandidateCard({ candidate, totalVotes, isWinner, action }) {
  const { name, photoCID, voteCount } = candidate;
  const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
  const imageUrl = photoCID ? `${GATEWAY}/ipfs/${photoCID}` : FALLBACK;

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border p-5 flex flex-col gap-3 transition-all ${
        isWinner ? "border-yellow-400 ring-2 ring-yellow-300" : "border-gray-100"
      }`}
    >
      {isWinner && (
        <div className="text-xs font-semibold text-yellow-600 bg-yellow-50 rounded-full px-3 py-1 self-start">
          최다 득표
        </div>
      )}

      <img
        src={imageUrl}
        alt={name}
        onError={(e) => {
          e.currentTarget.src = FALLBACK;
        }}
        className="w-full h-44 object-cover rounded-xl bg-gray-100"
      />

      <div>
        <p className="text-base font-semibold text-gray-900">{name}</p>
        <p className="text-sm text-gray-500 mt-0.5">
          {voteCount}표 ({pct}%)
        </p>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
