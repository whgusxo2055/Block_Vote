import { useState } from "react";
import CandidateForm from "./CandidateForm";

const GATEWAY = import.meta.env.VITE_IPFS_GATEWAY || "https://ipfs.io";
const FALLBACK = "https://placehold.co/40x40/e2e8f0/94a3b8?text=?";

function ipfsUrl(cid) {
  if (!cid || !cid.startsWith("Qm")) return FALLBACK;
  return `${GATEWAY}/ipfs/${cid}`;
}

export default function AdminPanel({ candidates, votingState, addCandidate, startVoting, endVoting }) {
  const [ctrlLoading, setCtrlLoading] = useState(null); // "start" | "end" | null
  const [ctrlError, setCtrlError] = useState("");

  const canStart = votingState === 0 && candidates.length >= 2;
  const canEnd = votingState === 1;

  const handleControl = async (action) => {
    setCtrlError("");
    setCtrlLoading(action);
    const fn = action === "start" ? startVoting : endVoting;
    const result = await fn();
    setCtrlLoading(null);
    if (!result.success) setCtrlError(result.message);
  };

  return (
    <div className="bg-amber-50 border-t border-amber-200">
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-5">
        <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide">관리자 패널</h2>

        {/* 후보자 등록 폼 */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">후보자 등록</h3>
          {votingState === 0 ? (
            <CandidateForm addCandidate={addCandidate} votingState={votingState} />
          ) : (
            <p className="text-sm text-gray-400">투표가 시작된 후에는 후보자를 등록할 수 없습니다.</p>
          )}
        </section>

        {/* 등록된 후보자 목록 */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            등록된 후보자 ({candidates.length}명)
          </h3>
          {candidates.length === 0 ? (
            <p className="text-sm text-gray-400">아직 등록된 후보자가 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {candidates.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <img
                    src={ipfsUrl(c.photoCID)}
                    alt={c.name}
                    onError={(e) => { e.currentTarget.src = FALLBACK; }}
                    className="w-10 h-10 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400 truncate">CID: {c.photoCID || "없음"}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {votingState === 0 && candidates.length === 1 && (
            <p className="mt-3 text-xs text-amber-600">후보자 1명을 더 등록하면 투표를 시작할 수 있습니다.</p>
          )}
          {votingState === 0 && candidates.length >= 2 && (
            <p className="mt-3 text-xs text-green-600">투표를 시작할 준비가 완료되었습니다.</p>
          )}
        </section>

        {/* 투표 제어 버튼 */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">투표 제어</h3>
          <div className="flex gap-3">
            <button
              onClick={() => handleControl("start")}
              disabled={!canStart || ctrlLoading !== null}
              className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors flex items-center justify-center gap-2"
            >
              {ctrlLoading === "start" && (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              투표 시작
            </button>
            <button
              onClick={() => handleControl("end")}
              disabled={!canEnd || ctrlLoading !== null}
              className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 transition-colors flex items-center justify-center gap-2"
            >
              {ctrlLoading === "end" && (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              투표 종료
            </button>
          </div>
          {ctrlError && <p className="mt-2 text-sm text-red-600">{ctrlError}</p>}
        </section>
      </div>
    </div>
  );
}
