import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import votingABI from "../abi/Voting.json";

const SEPOLIA_CHAIN_ID = "0xaa36a7";
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

export function useWallet() {
  const [account, setAccount] = useState(null);
  const [chainOk, setChainOk] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const isConnected = Boolean(account);

  const checkOwner = useCallback(async (addr) => {
    if (!addr || !CONTRACT_ADDRESS) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, votingABI, provider);
      const owner = await contract.owner();
      setIsOwner(owner.toLowerCase() === addr.toLowerCase());
    } catch {
      setIsOwner(false);
    }
  }, []);

  const checkChain = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      setChainOk(chainId === SEPOLIA_CHAIN_ID);
    } catch {
      setChainOk(false);
    }
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;

    checkChain();
    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          checkOwner(accounts[0]);
        }
      });

    const onAccountsChanged = (accounts) => {
      const addr = accounts[0] ?? null;
      setAccount(addr);
      if (addr) checkOwner(addr);
      else setIsOwner(false);
    };

    const onChainChanged = () => checkChain();

    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", onAccountsChanged);
      window.ethereum.removeListener("chainChanged", onChainChanged);
    };
  }, [checkChain, checkOwner]);

  const switchToSepolia = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (e) {
      if (e.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: SEPOLIA_CHAIN_ID,
              chainName: "Sepolia Testnet",
              rpcUrls: ["https://rpc.sepolia.org"],
              nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
      }
    }
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert(
        "MetaMask가 설치되지 않았습니다. Chrome에서 MetaMask 익스텐션을 설치해 주세요."
      );
      return;
    }
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const addr = accounts[0];
      setAccount(addr);
      checkOwner(addr);
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      if (chainId !== SEPOLIA_CHAIN_ID) await switchToSepolia();
    } catch (e) {
      console.error("지갑 연결 실패:", e);
    }
  }, [checkOwner, switchToSepolia]);

  return { account, isOwner, isConnected, chainOk, connect, switchToSepolia };
}
