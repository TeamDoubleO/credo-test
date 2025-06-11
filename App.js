import 'react-native-get-random-values'
import React, { useEffect, useState } from 'react'
import { Buffer } from 'buffer'
import base64url from 'base64url'
import bs58 from 'bs58'
import axios from 'axios'
import RNFS from 'react-native-fs'
import 'react-native-get-random-values'; 

global.Buffer = Buffer

import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Button,
} from 'react-native'

import {
  Agent,
  OutOfBandModule,
  ConnectionsModule,
  CredentialsModule,
  HttpOutboundTransport,
  WsOutboundTransport,
  AutoAcceptCredential,
  MediationRecipientModule,
  AgentEventTypes,
  MessagePickupModule,
  MediatorPickupStrategy,
  PeerDidNumAlgo,
  V2CredentialProtocol,                // 병원이 Issue-Credential v2 사용 시
  JsonLdCredentialFormatService,       // 병원이 JSON-LD VC를 보내는 경우   // ← 여기서 AnonCreds 포맷 서비스 임포트
  DidCommMimeType,
  ProofsModule,
  V2ProofProtocol,
  AutoAcceptProof,
  DidsModule
} from '@credo-ts/core'

import { AskarModule } from '@credo-ts/askar'
import { 
  AnonCredsModule,
  AnonCredsCredentialFormatService,
  AnonCredsProofFormatService,
  LegacyIndyProofFormatService,
  LegacyIndyCredentialFormatService,
} from '@credo-ts/anoncreds'
import { IndyVdrAnonCredsRegistry,IndyVdrIndyDidRegistrar,IndyVdrIndyDidResolver  } from '@credo-ts/indy-vdr'
import { agentDependencies } from '@credo-ts/react-native'
import '@hyperledger/aries-askar-react-native'
import 'react-native-get-random-values'
import 'react-native-quick-crypto';      // crypto 폴리필
// 지갑 정보
const walletId = 'test-wallet-id-1'
const walletKey = 'testkey00000000000000000000000000'

// 병원 ACAPY OOB 초대 URL 예시
const HOSPITAL_INVITATION_URL =
  'http://192.168.0.68:8020?oob=eyJAdHlwZSI6ICJodHRwczovL2RpZGNvbW0ub3JnL291dC1vZi1iYW5kLzEuMS9pbnZpdGF0aW9uIiwgIkBpZCI6ICJkMzE4Y2MzNi02Y2JhLTQ1MmItYjc1My01NTMwYTZiYTJkM2YiLCAibGFiZWwiOiAiXHVhYzE1XHViZDgxXHVjMGJjXHVjMTMxXHViY2QxXHVjNmQwIiwgImhhbmRzaGFrZV9wcm90b2NvbHMiOiBbImh0dHBzOi8vZGlkY29tbS5vcmcvZGlkZXhjaGFuZ2UvMS4wIl0sICJhY2NlcHQiOiBbImRpZGNvbW0vYWlwMjtlbnY9cmZjMTkiXSwgInNlcnZpY2VzIjogWyJkaWQ6cGVlcjoyLlZ6Nk1rbk1rWGlycG0xRWVRa01wNXFSM2p3OTR1blE0bVZOOHRNNzdyb2ZzZ0ZOSjMuRXo2TFNraFhlM28xdzVFRzhzcnpwRTlMZnJudkpDOTdNYTR4bmh5V3VZZkJXeUdLbS5TZXlKcFpDSTZJaU5rYVdSamIyMXRMVEFpTENKMElqb2laR2xrTFdOdmJXMTFibWxqWVhScGIyNGlMQ0p3Y21sdmNtbDBlU0k2TUN3aWNtVmphWEJwWlc1MFMyVjVjeUk2V3lJamEyVjVMVEVpWFN3aWNpSTZXMTBzSW5NaU9pSm9kSFJ3T2k4dk1Ua3lMakUyT0M0d0xqWTRPamd3TWpBaWZRIl19'

// Mediator ACAPY OOB 초대 URL 예시
const MEDIATOR_INVITATION_URL =
  'ws://192.168.0.68:8000?oob=eyJAdHlwZSI6ICJodHRwczovL2RpZGNvbW0ub3JnL291dC1vZi1iYW5kLzEuMS9pbnZpdGF0aW9uIiwgIkBpZCI6ICIxNDZmYTM5Zi02ODhhLTQ4NDUtYWNlYS1jNzRhZDU5YTJmMjQiLCAibGFiZWwiOiAibWVkaWF0b3ItYWNhcHkiLCAiaGFuZHNoYWtlX3Byb3RvY29scyI6IFsiaHR0cHM6Ly9kaWRjb21tLm9yZy9kaWRleGNoYW5nZS8xLjAiXSwgImFjY2VwdCI6IFsiZGlkY29tbS9haXAyO2Vudj1yZmMxOSJdLCAic2VydmljZXMiOiBbImRpZDpwZWVyOjIuVno2TWt0cDVKZXZlZjczaVYxUmZGbWJRR2tUak50b0tnUVlWUjhNbVdLaDc5REFUdy5FejZMU2pGaWtzUHdwV0FDOHNoQ2V4QVczNU5zY3dZaXZkNkV3eWZ2dWlKeG1WcnZaLlNleUpwWkNJNklpTmthV1JqYjIxdExUQWlMQ0owSWpvaVpHbGtMV052YlcxMWJtbGpZWFJwYjI0aUxDSndjbWx2Y21sMGVTSTZNQ3dpY21WamFYQnBaVzUwUzJWNWN5STZXeUlqYTJWNUxURWlYU3dpY2lJNlcxMHNJbk1pT2lKM2N6b3ZMekU1TWk0eE5qZ3VNQzQyT0RvNE1EQXdJbjAiXX0'

//=============================================================================================================================================================================
export default function App() {
  const isDarkMode = useColorScheme() === 'dark'
  const backgroundStyle = {
    backgroundColor: isDarkMode ? '#181818' : '#f3f3f3',
}

  // ---- 상태 변수들 ----
  const [agent, setAgent] = useState(null)
  const [peerDid, setPeerDid] = useState(null)  
  const [connStatus, setConnStatus] = useState('')        // 현재 진행 상태
  const [vcContent, setVcContent] = useState(null)        // 수신된 VC JSON

  // ---- Agent 한 번만 초기화해 둠 ----
  useEffect(() => {
    ;(async () => {
      try {
        const _agent = new Agent({
          config: {
            label: 'KeyWeCredo',
            walletConfig: { id: walletId, key: walletKey },
            autoUpdateStorageOnStartup: true,
            didCommMimeType: DidCommMimeType.V1,
            // mediatorPollingInterval: 5000,
          },
          dependencies: agentDependencies,
          modules: {
    
          askar: new AskarModule({}),
          connections: new ConnectionsModule({
            autoAcceptConnection: true,
          }),
          outOfBand: new OutOfBandModule(),
          anoncreds: new AnonCredsModule({
            registries: [new IndyVdrAnonCredsRegistry()],
            anoncreds: require('@hyperledger/anoncreds-react-native'),
          }),
          dids: new DidsModule({
            registrars: [new IndyVdrIndyDidRegistrar()],
            resolvers: [new IndyVdrIndyDidResolver()],
          }),
          credentials: new CredentialsModule({
            autoAcceptCredentials: AutoAcceptCredential.Always,
            credentialProtocols: [
              new V2CredentialProtocol({
                credentialFormats: [
                  new JsonLdCredentialFormatService(),
                  new AnonCredsCredentialFormatService(),
                  new LegacyIndyCredentialFormatService()
                ],
              }),
            ],
          }),
          proofs: new ProofsModule({
            autoAcceptProofs: AutoAcceptProof.ContentApproved,
            proofProtocols: [
              new V2ProofProtocol({
                proofFormats: [
                  new LegacyIndyProofFormatService(),
                  new AnonCredsProofFormatService()                        
                ],
              }),
            ],
          }),
          mediationRecipient: new MediationRecipientModule({
            mediatorInvitationUrl: MEDIATOR_INVITATION_URL, 
          }),
          messagePickup: new MessagePickupModule({
            mediatorPickupStrategy: MediatorPickupStrategy.Implicit,
          }),
        },
      })
      _agent.registerOutboundTransport(new HttpOutboundTransport())
      _agent.registerOutboundTransport(new WsOutboundTransport())



      _agent.events.on(AgentEventTypes.AgentMessageReceived, (event) => {
          console.log(
            '📨 Mediator로부터 원시 메시지 수신 (암호화된 상태):',
            JSON.stringify(event.payload, null, 2)

          );
        });
      _agent.events.on(AgentEventTypes.AgentMessageProcessed, ({ payload }) => {
        console.log('🔓 복호화된 메시지:', payload.message);
      });

        // HTTP/Ws transport 등록


        await _agent.initialize();

        console.log('Agent 초기화 성공')
        setAgent(_agent)
        setConnStatus('Agent 초기화 완료')
      } catch (err) {
        console.error('❌ Agent 초기화 실패:', err)
        setConnStatus(`Agent 초기화 실패: ${err.message || String(err)}`)
      }
    })()
  }, [])
//========================================================================================================================
  const connectHospital = async () => {
    if (!agent) {
      return
    }
    try {
      const result = await agent.dids.create({
        method: 'peer',
        options: {
          numAlgo: PeerDidNumAlgo.InceptionKeyWithoutDoc,
        },
      })
      setPeerDid(result)
      const record = await agent.oob.receiveInvitationFromUrl(HOSPITAL_INVITATION_URL,{
        ourDid: result.didState.did,
        autoAcceptConnection: true,
        autoAcceptInvitation: true,
      })

    } catch (error) {
      console.error('❌ Hospital 연결 또는 VC 요청 실패:', error)
      setConnStatus(`Hospital 연결/VC 요청 실패: ${error.message || String(error)}`)
    }

  }
//========================================================================================================================
  // ==== 받은 VC 목록 조회 함수 ====
  const getVC = async () => {
    if (!agent) {
      setConnStatus('⚠️ Agent 준비 중...')
      return
    }
    try { 
      setConnStatus('🔍 지갑에 저장된 VC 목록 조회 중...')

      const allCreds = await agent.credentials.getAll()

      console.log('▶ 현재 지갑에 저장된 VC:', allCreds)
      setVcContent(JSON.stringify(allCreds, null, 2))
      setConnStatus('✅ VC 목록 업데이트 완료')
    } catch (error) {
      console.error('❌ VC 목록 조회 실패:', error)
      setConnStatus(`VC 조회 실패: ${error.message || String(error)}`)
    }
  }

const startPolling = async () => {
    try {
      setConnStatus('⚙️ Message Pickup (Polling) 시작…');

      const defaultMediator = await agent.mediationRecipient.findDefaultMediator();
      if (!defaultMediator) {
        console.warn('⚠️ Default Mediator 없음, 메시지 픽업을 시작할 수 없습니다.');
      } else {
        agent.mediationRecipient
          .initiateMessagePickup(defaultMediator, MediatorPickupStrategy.Implicit)
          .then(() => {
            console.log('✅ PickUp Polling이 시작되었습니다.');
          })
          .catch((e) => {
            console.warn('📡 PickUp Polling 오류:', e.message || e);
          });
      }
    }catch(error){
      console.error('❌ VC 목록 조회 실패:', error)
    }
  }

   const stopPolling = async () => {
    try {
      setConnStatus('⚙️ Message Pickup (Polling) 정지');
      const defaultMediator = await agent.mediationRecipient.findDefaultMediator();
      if (!defaultMediator) {
        console.warn('⚠️ Default Mediator 없음, 메시지 픽업을 중지 할 수 없습니다.');
      } else {
        await agent.mediationRecipient.stopMessagePickup(defaultMediator)
        console.log('✅ PickUp Polling을 정지합니다.');
      }
    }catch(error){
      console.error('❌ VC 목록 조회 실패:', error)
    }
  }

  // ==== 지갑 삭제 함수 ====
  const deleteWallet = async () => {
    if (!agent) {
      setConnStatus('⚠️ Agent 준비 중...')
      return
    }
    try {
      await agent.wallet.delete()
      console.log('✅ 지갑이 성공적으로 삭제되었습니다.')
      setConnStatus('✅ 지갑 삭제 완료')
      setDid('')
      setVcContent(null)
      setPeerDid(null)
    } catch (error) {
      console.error('❌ 지갑 삭제 실패:', error)
      setConnStatus(`지갑 삭제 실패: ${error.message || String(error)}`)
    }
  }

  return (
    <SafeAreaView style={[styles.container, backgroundStyle]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView style={backgroundStyle}>
        <View style={styles.content}>
          <Text style={styles.title}>Credo - DID VC 발급 테스트</Text>
        </View>
          {/* DID(import) 정보 영역 */}
          <Text selectable style={styles.didText}>
            {peerDid || '* DID import & 정보는 아직 없음 *'}
          </Text>

          {/* 상태 메시지 영역 */}
          <Text style={styles.statusText}>{connStatus}</Text>

          {/* 버튼들: 단계별로 눌러서 실행 */}
          <View style={styles.buttonContainer}>
            <Button title="2) Connect Hospital " onPress={connectHospital} />
          </View>
          <View style={styles.buttonContainer}>
            <Button title="3) 전체 VC 목록 조회" onPress={getVC} />
          <View style={styles.buttonContainer}>
            <Button title="4-1) Polling Start" onPress={startPolling} />
          </View>
          <View style={styles.buttonContainer}>
            <Button title="4-2) Polling Stop" onPress={stopPolling} />
          </View>
          <View style={styles.buttonContainer}>
            <Button title="5) 지갑 삭제(Delete Wallet)" onPress={deleteWallet} />
          </View>

          {/* 수신된 VC가 있으면 화면에 출력 */}
          {vcContent && (
            <>
              <Text style={styles.subtitle}>📄 수신된 VC (JSON)</Text>
              <Text selectable style={styles.vcText}>
                {vcContent}
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    marginTop: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#345678',
  },
  subtitle: {
    marginTop: 24,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#444',
  },
  didText: {
    width: '100%',
    fontSize: 13,
    color: '#222',
    backgroundColor: '#eee',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  vcText: {
    width: '100%',
    fontSize: 12,
    backgroundColor: '#f2f2f2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    color: '#000',
  },
  statusText: {
    width: '100%',
    fontSize: 14,
    color: '#0a0',
    marginTop: 12,
    marginBottom: 12,
  },
  buttonContainer: {
    marginTop: 8,
    width: '100%',
  },
})