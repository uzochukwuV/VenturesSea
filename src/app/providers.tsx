'use client';

import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, polygon, arbitrum, optimism, base } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';

const mezoTestnet = {
  id: 31611,
  name: 'Mezo Testnet',
  nativeCurrency: { decimals: 18, name: 'Bitcoin', symbol: 'BTC' },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.mezo.io'] },
  },
  blockExplorers: {
    default: { name: 'Mezo Explorer', url: 'https://testnet.explorer.mezo.org' },
  },
  testnet: true,
} as const;

const wagmiConfig = createConfig({
  chains: [mezoTestnet, mainnet, polygon, arbitrum, optimism, base],
  transports: {
    [mezoTestnet.id]: http(),
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

const customTheme = darkTheme({
  accentColor: '#ff3e00',
  accentColorForeground: 'white',
  borderRadius: 'large',
  fontStack: 'system',
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={customTheme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
