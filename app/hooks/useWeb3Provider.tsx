import { BrowserProvider, ethers, JsonRpcSigner } from 'ethers';
import { useCallback, useEffect, useState } from 'react';

export interface IWeb3State {
  address: string | null;
  currentChain: number | null;
  signer: JsonRpcSigner | null;
  provider: BrowserProvider | null;
  isAuthenticated: boolean;
}

const useWeb3Provider = () => {
  const initialWeb3State = {
    address: null,
    currentChain: null,
    signer: null,
    provider: null,
    isAuthenticated: false,
  };

  const [state, setState] = useState<IWeb3State>(initialWeb3State);

  const connectWallet = useCallback(async () => {
    if (state.isAuthenticated) return;

    try {
      const { ethereum } = window;

      const provider = new ethers.BrowserProvider(ethereum);

      const accounts: string[] = await provider.send('eth_requestAccounts', []);

      if (accounts.length > 0) {
        const signer = await provider.getSigner();
        const chain = Number(await (await provider.getNetwork()).chainId);

        setState({
          ...state,
          address: accounts[0],
          signer,
          currentChain: chain,
          provider,
          isAuthenticated: true,
        });

        localStorage.setItem('isAuthenticated', 'true');
      }
    } catch {}
  }, [state]);

  const disconnect = () => {
    setState(initialWeb3State);
    localStorage.removeItem('isAuthenticated');
  };

  const getPublicKey = useCallback(async () => {
    const { provider } = state;
    if (provider == null) return;
    const accounts: string[] = await provider.send('eth_requestAccounts', []);
    return await provider.send('eth_getEncryptionPublicKey', [accounts[0]]);
  }, [state]);

  const decryptMessage = useCallback(
    async (encryptedMessage: string) => {
      const { provider } = state;
      if (provider == null) return;
      const accounts: string[] = await provider.send('eth_requestAccounts', []);
      return await provider.send('eth_decrypt', [
        encryptedMessage,
        accounts[0],
      ]);
    },
    [state]
  );

  useEffect(() => {
    if (window == null) return;

    if (localStorage.hasOwnProperty('isAuthenticated')) {
      connectWallet();
    }
  }, [connectWallet, state.isAuthenticated]);

  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return;

    window.ethereum.on('accountsChanged', (accounts: string[]) => {
      setState({ ...state, address: accounts[0] });
    });

    window.ethereum.on('networkChanged', (network: string) => {
      setState({ ...state, currentChain: Number(network) });
    });

    return () => {
      window.ethereum.removeAllListeners();
    };
  }, [state]);

  return {
    connectWallet,
    disconnect,
    getPublicKey,
    decryptMessage,
    state,
  };
};

export default useWeb3Provider;
