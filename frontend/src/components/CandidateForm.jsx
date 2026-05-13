import { useState, useRef } from "react";
import { uploadToIPFS } from "../utils/ipfs";

export default function CandidateForm({ addCandidate, votingState }) {
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(""); // "uploading" | "submitting" | ""
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef(null);

  const isSetup = votingState === 0;
  const busy = status !== "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) { setError("후보자 이름을 입력해 주세요."); return; }
    if (!file) { setError("사진 파일을 선택해 주세요."); return; }

    try {
      setStatus("uploading");
      const cid = await uploadToIPFS(file);

      setStatus("submitting");
      const result = await addCandidate(name.trim(), cid);

      if (result.success) {
        setSuccess(`"${name.trim()}" 후보자가 등록되었습니다.`);
        setName("");
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err.message || "처리 중 오류가 발생했습니다.");
    } finally {
      setStatus("");
    }
  };

  const buttonLabel = () => {
    if (status === "uploading") return "IPFS 업로드 중...";
    if (status === "submitting") return "트랜잭션 전송 중...";
    return "후보자 등록";
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!isSetup || busy}
          placeholder="후보자 이름 입력"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">사진</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0] ?? null)}
          disabled={!isSetup || busy}
          className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        disabled={!isSetup || busy}
        className="py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors flex items-center justify-center gap-2"
      >
        {busy && (
          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {buttonLabel()}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
    </form>
  );
}
