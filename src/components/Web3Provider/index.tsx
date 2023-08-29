import { enableMasca, isError } from '@blockchain-lab-um/masca-connector'
import { CustomUserProperties, InterfaceEventName, WalletConnectionResult } from '@uniswap/analytics-events'
import { useWeb3React, Web3ReactHooks, Web3ReactProvider } from '@web3-react/core'
import { Connector } from '@web3-react/types'
import { sendAnalyticsEvent, user } from 'analytics'
import { connections, getConnection } from 'connection'
import { isSupportedChain } from 'constants/chains'
import { RPC_PROVIDERS } from 'constants/providers'
import { TraceJsonRpcVariant, useTraceJsonRpcFlag } from 'featureFlags/flags/traceJsonRpc'
import useEagerlyConnect from 'hooks/useEagerlyConnect'
import usePrevious from 'hooks/usePrevious'
import { ReactNode, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useMascaStore } from 'state/masca/mascaStore'
import { useConnectedWallets } from 'state/wallets/hooks'
import { getCurrentPageFromLocation } from 'utils/urlRoutes'
import { getWalletMeta } from 'utils/walletMeta'

export default function Web3Provider({ children }: { children: ReactNode }) {
  useEagerlyConnect()
  const connectors = connections.map<[Connector, Web3ReactHooks]>(({ hooks, connector }) => [connector, hooks])

  return (
    <Web3ReactProvider connectors={connectors}>
      <Updater />
      {children}
    </Web3ReactProvider>
  )
}

/** A component to run hooks under the Web3ReactProvider context. */
function Updater() {
  const { account, chainId, connector, provider } = useWeb3React()
  const { pathname } = useLocation()
  const { mascaApi, setMascaApi, setEnabled } = useMascaStore((state) => ({
    mascaApi: state.mascaApi,
    setMascaApi: state.changeMascaApi,
    setEnabled: state.changeIsEnabled,
  }))
  const currentPage = getCurrentPageFromLocation(pathname)

  // Trace RPC calls (for debugging).
  const networkProvider = isSupportedChain(chainId) ? RPC_PROVIDERS[chainId] : undefined
  const shouldTrace = useTraceJsonRpcFlag() === TraceJsonRpcVariant.Enabled
  useEffect(() => {
    if (shouldTrace) {
      provider?.on('debug', trace)
      if (provider !== networkProvider) {
        networkProvider?.on('debug', trace)
      }
    }
    return () => {
      provider?.off('debug', trace)
      networkProvider?.off('debug', trace)
    }
  }, [networkProvider, provider, shouldTrace])

  useEffect(() => {
    const initMasca = async () => {
      if (!account) return
      if (mascaApi) {
        await mascaApi?.setCurrentAccount({ account: (account as string).toLowerCase() })
        setMascaApi(mascaApi)
        setEnabled(true)
        return
      }
      const mascaResult = await enableMasca((account as string).toLowerCase(), {
        snapId: 'npm:@blockchain-lab-um/masca',
        version: '1.0.0-beta.2',
        supportedMethods: ['did:polygonid'],
      })
      if (isError(mascaResult)) {
        throw new Error(mascaResult.error)
      }
      const newMascaApi = mascaResult.data.getMascaApi()
      await newMascaApi?.setCurrentAccount({ account: account as string })
      setMascaApi(newMascaApi)
      setEnabled(true)
    }
    initMasca()
  }, [account, mascaApi, setEnabled, setMascaApi])

  // Send analytics events when the active account changes.
  const previousAccount = usePrevious(account)
  const [connectedWallets, addConnectedWallet] = useConnectedWallets()
  useEffect(() => {
    if (account && account !== previousAccount) {
      const walletType = getConnection(connector).getName()
      const peerWalletAgent = provider ? getWalletMeta(provider)?.agent : undefined
      const isReconnect = connectedWallets.some(
        (wallet) => wallet.account === account && wallet.walletType === walletType
      )

      // User properties *must* be set before sending corresponding event properties,
      // so that the event contains the correct and up-to-date user properties.
      user.set(CustomUserProperties.WALLET_ADDRESS, account)
      user.set(CustomUserProperties.WALLET_TYPE, walletType)
      user.set(CustomUserProperties.PEER_WALLET_AGENT, peerWalletAgent ?? '')
      if (chainId) {
        user.postInsert(CustomUserProperties.ALL_WALLET_CHAIN_IDS, chainId)
      }
      user.postInsert(CustomUserProperties.ALL_WALLET_ADDRESSES_CONNECTED, account)

      sendAnalyticsEvent(InterfaceEventName.WALLET_CONNECT_TXN_COMPLETED, {
        result: WalletConnectionResult.SUCCEEDED,
        wallet_address: account,
        wallet_type: walletType,
        is_reconnect: isReconnect,
        peer_wallet_agent: peerWalletAgent,
        page: currentPage,
      })

      addConnectedWallet({ account, walletType })
    }
  }, [account, addConnectedWallet, currentPage, chainId, connectedWallets, connector, previousAccount, provider])

  return null
}

function trace(event: any) {
  if (!event?.request) return
  const { method, id, params } = event.request
  console.groupCollapsed(method, id)
  console.debug(params)
  console.groupEnd()
}
