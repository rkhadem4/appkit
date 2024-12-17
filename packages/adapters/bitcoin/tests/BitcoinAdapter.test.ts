import { beforeEach, describe, it, vi, type Mock, expect } from 'vitest'
import { BitcoinAdapter } from '../src'
import type { BitcoinApi } from '../src/utils/BitcoinApi'
import { bitcoin, mainnet } from '@reown/appkit/networks'
import { mockUTXO } from './mocks/mockUTXO'
import { SatsConnectConnector } from '../src/connectors/SatsConnectConnector'
import { mockSatsConnectProvider } from './mocks/mockSatsConnect'

function mockBitcoinApi(): { [K in keyof BitcoinApi.Interface]: Mock<BitcoinApi.Interface[K]> } {
  return {
    getUTXOs: vi.fn(async () => [])
  }
}

describe('BitcoinAdapter', () => {
  let adapter: BitcoinAdapter
  let api: ReturnType<typeof mockBitcoinApi>

  beforeEach(() => {
    api = mockBitcoinApi()
    adapter = new BitcoinAdapter({ api })
  })

  describe('connect', () => {
    it('should return the chainId of the available chain from connector', async () => {
      const connector = new SatsConnectConnector({
        provider: mockSatsConnectProvider().provider,
        requestedChains: [bitcoin],
        getActiveNetwork: () => bitcoin
      })
      vi.spyOn(connector, 'connect').mockResolvedValueOnce('mock_address')

      adapter.connectors.push(connector)

      const result = await adapter.connect({
        id: connector.id,
        chainId: 'bitcoin:any_chain_id',
        provider: connector.provider,
        type: 'mock_type'
      })

      expect(result).toEqual({
        id: connector.id,
        type: connector.type,
        address: 'mock_address',
        chainId: bitcoin.id,
        provider: connector.provider
      })
    })
  })

  describe('getBalance', () => {
    it('should return the balance', async () => {
      api.getUTXOs.mockResolvedValueOnce([
        mockUTXO({ value: 10000 }),
        mockUTXO({ value: 20000 }),
        mockUTXO({ value: 30000 }),
        mockUTXO({ value: 10000000000 })
      ])

      const balance = await adapter.getBalance({
        address: 'mock_address',
        chainId: bitcoin.id,
        caipNetwork: bitcoin
      })

      expect(balance).toEqual({
        balance: '100.0006',
        symbol: 'BTC'
      })
    })

    it('should return empty balance if no UTXOs', async () => {
      api.getUTXOs.mockResolvedValueOnce([])

      const balance = await adapter.getBalance({
        address: 'mock_address',
        chainId: bitcoin.id,
        caipNetwork: bitcoin
      })

      expect(balance).toEqual({
        balance: '0',
        symbol: 'BTC'
      })
    })

    it('should return empty balance if chain is not bip122', async () => {
      const balance = await adapter.getBalance({
        address: 'mock_address',
        chainId: mainnet.id,
        caipNetwork: mainnet as any
      })

      expect(balance).toEqual({
        balance: '0',
        symbol: bitcoin.nativeCurrency.symbol
      })
    })

    it('should return empty balance if chain is not provided', async () => {
      const balance = await adapter.getBalance({
        address: 'mock_address',
        chainId: 'mock_chain_id'
      })

      expect(balance).toEqual({
        balance: '0',
        symbol: bitcoin.nativeCurrency.symbol
      })
    })
  })
})