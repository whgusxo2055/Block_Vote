import { useWallet } from "./hooks/useWallet";
import Header from "./components/Header";

export default function App() {
  const { account, isOwner, isConnected, chainOk, connect, switchToSepolia } =
    useWallet();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        votingState={undefined}
        chainOk={chainOk}
        account={account}
        isConnected={isConnected}
        isOwner={isOwner}
        connect={connect}
      />
      {isConnected && !chainOk ? (
        <NetworkErrorScreen switchToSepolia={switchToSepolia} />
      ) : (
        <main className="container mx-auto px-4 py-12 text-center text-gray-400">
          Phase 5에서 투표 현황이 표시됩니다.
        </main>
      )}
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
