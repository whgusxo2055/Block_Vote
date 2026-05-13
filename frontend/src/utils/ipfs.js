const JWT = import.meta.env.VITE_PINATA_JWT;

export async function uploadToIPFS(file) {
  if (!JWT || JWT.includes("placeholder") || JWT.includes("your_pinata")) {
    throw new Error("VITE_PINATA_JWT가 설정되지 않았습니다. frontend/.env를 확인해 주세요.");
  }

  const form = new FormData();
  form.append("file", file, file.name);
  form.append("name", file.name);

  const res = await fetch("https://uploads.pinata.cloud/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${JWT}` },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`IPFS 업로드 실패 (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const cid = json?.data?.cid;
  if (!cid) throw new Error("서버에서 CID를 반환하지 않았습니다.");
  return cid;
}
