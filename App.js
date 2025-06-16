import 'react-native-get-random-values'
import React, { useEffect, useState, useRef } from 'react'
import { Buffer } from 'buffer/'
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
  V2CredentialProtocol,
  JsonLdCredentialFormatService,
  DidCommMimeType,
  ProofsModule,
  V2ProofProtocol,
  AutoAcceptProof,
  DidsModule,
  W3cCredentialsModule,
  KeyDidRegistrar,
  KeyDidResolver,
  CredentialStateChangedEvent,
  CredentialEventTypes, CredentialState
} from '@credo-ts/core'

import { AskarModule } from '@credo-ts/askar'
import {
  AnonCredsModule,
  AnonCredsCredentialFormatService,
  AnonCredsProofFormatService,
  LegacyIndyProofFormatService,
  LegacyIndyCredentialFormatService,
  V1CredentialProtocol,
} from '@credo-ts/anoncreds'
import { IndyVdrAnonCredsRegistry,IndyVdrIndyDidRegistrar,IndyVdrIndyDidResolver  } from '@credo-ts/indy-vdr'
import { agentDependencies } from '@credo-ts/react-native'
import '@hyperledger/aries-askar-react-native'
import 'react-native-get-random-values'
import 'react-native-quick-crypto';

// 지갑 정보
const walletId = 'test-wallet-id-1'
const walletKey = 'testkey00000000000000000000000000'
//======================================================================[    NEW.1   ]======================================================================================
// API 기본 URL (실제 서버 주소로 변경 필요)
const API_BASE_URL = 'http://192.168.0.82:8080'
// 병원 연결 요청
const HOSPITAL_INFO = {
  passId: 104,
  hospitalId: 1
}
// Polling 간격
const HOSPITAL_POLL_INTERVAL = 2000 // 1분
//======================================================================[    NEW.1  ]======================================================================================
export default function App() {
  const isDarkMode = useColorScheme() === 'dark'
  const backgroundStyle = {
    backgroundColor: isDarkMode ? '#181818' : '#f3f3f3',
  }

  //======================================================================[    NEW.2: Agent Config  ]======================================================================================
  // ---- 상태 변수들 ----
  const [agent, setAgent] = useState(null)
  const [peerDid, setPeerDid] = useState(null)
  const [connStatus, setConnStatus] = useState('')
  const [vcContent, setVcContent] = useState(null)
  const [isPollingActive, setIsPollingActive] = useState(false)
  const [mediatorConnected, setMediatorConnected] = useState(false)
  const [hospitalConnected, setHospitalConnected] = useState(false)

  // Polling 타이머 관리를 위한 ref
  const hospitalPollTimer = useRef(null)

  // ---- API 요청 함수들 ----
  const getMediatorInvitation = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/polls/mediator-invitation`)
      return response.data.data
    } catch (error) {
      console.error('❌ Mediator 초대 정보 요청 실패:', error)
      throw error
    }
  }

  const getHospitalInvitation = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/polls/hospital-invitation`, {
        passId: HOSPITAL_INFO.passId,
        hospitalId: HOSPITAL_INFO.hospitalId
      })
      return response.data.data
    } catch (error) {
      console.error('❌ Hospital 초대 정보 요청 실패:', error)
      throw error
    }
  }

  // ---- Agent 초기화 함수 ----
  const initializeAgent = async (mediatorUrl = null) => {
    try {
      setConnStatus('🔄 Agent 초기화 중...')

      const legacyIndyCredentialFormat = new LegacyIndyCredentialFormatService()
      const legacyIndyProofFormat = new LegacyIndyProofFormatService()

      let mediatorInvitationUrl = mediatorUrl
      if (!mediatorInvitationUrl) {
        try {
          const mediatorInfo = await getMediatorInvitation()
          mediatorInvitationUrl = mediatorInfo.invitationUrl
          console.log('✅ API에서 Mediator 초대 URL 획득:', mediatorInvitationUrl)
        } catch (error) {
          console.warn('⚠️ API에서 Mediator 정보 획득 실패, 기본값 사용')
          // 기본 mediator URL 사용: 기본적으로 테스트 할 때 하나 받아서 녛어두면 좋을 듯
          mediatorInvitationUrl = 'ws://10.221.84.216:8000?oob=eyJAdHlwZSI6ICJodHRwczovL2RpZGNvbW0ub3JnL291dC1vZi1iYW5kLzEuMS9pbnZpdGF0aW9uIiwgIkBpZCI6ICJhYWNhODc0Yi0zNzVmLTQ1YzAtYTUyMC0yNmM0MWUyOGU2NTIiLCAibGFiZWwiOiAibWVkaWF0b3ItYWNhcHkiLCAiaGFuZHNoYWtlX3Byb3RvY29scyI6IFsiaHR0cHM6Ly9kaWRjb21tLm9yZy9kaWRleGNoYW5nZS8xLjAiXSwgImFjY2VwdCI6IFsiZGlkY29tbS9haXAyO2Vudj1yZmMxOSJdLCAic2VydmljZXMiOiBbImRpZDpwZWVyOjIuVno2TWtzY0s3MUhkeWpUV2c4ajJGWTIzS0E3UVVIU3RXdld6QmdFbUU3WENXUmtYZy5FejZMU25qWUNIenVSWTNLR2ZOSFJTNEdVVnE1TUJHUzRHdEE3WDFnTmNzVFMySGJlLlNleUpwWkNJNklpTmthV1JqYjIxdExUQWlMQ0owSWpvaVpHbGtMV052YlcxMWJtbGpZWFJwYjI0aUxDSndjbWx2Y21sMGVTSTZNQ3dpY21WamFYQnBaVzUwUzJWNWN5STZXeUlqYTJWNUxURWlYU3dpY2lJNlcxMHNJbk1pT2lKM2N6b3ZMekV3TGpJeU1TNDROQzR5TVRZNk9EQXdNQ0o5Il19'
        }
      }

      const _agent = new Agent({
        config: {
          label: 'KeyWeCredo',
          walletConfig: { id: walletId, key: walletKey },
          autoUpdateStorageOnStartup: true,
          didCommMimeType: DidCommMimeType.V1,
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
            registrars: [new IndyVdrIndyDidRegistrar(), new KeyDidRegistrar()],
            resolvers: [new IndyVdrIndyDidResolver(), new KeyDidResolver()],
          }),
          credentials: new CredentialsModule({
            autoAcceptCredentials: AutoAcceptCredential.Always,
            credentialProtocols: [
              new V1CredentialProtocol({
                indyCredentialFormat: legacyIndyCredentialFormat
              }),
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
          w3cVc: new W3cCredentialsModule(),
          mediationRecipient: new MediationRecipientModule({
            mediatorInvitationUrl: mediatorInvitationUrl,
          }),
          messagePickup: new MessagePickupModule({
            mediatorPickupStrategy: MediatorPickupStrategy.Implicit,
          }),
        },
      })

      _agent.registerOutboundTransport(new HttpOutboundTransport())
      _agent.registerOutboundTransport(new WsOutboundTransport())

      // 이벤트 리스너 등록
      _agent.events.on(
          CredentialEventTypes.CredentialStateChanged,
          async ({ payload }: CredentialStateChangedEvent) => {
            console.log('CREDENTIAL CHANGED EVENT: ', payload)
            const { credentialRecord } = payload
            switch (credentialRecord.state) {
              case CredentialState.OfferReceived:
                // await _agent.credentials.acceptOffer({
                //   credentialRecordId: credentialRecord.id,
                //   credentialFormats: {
                //     jsonld: undefined
                //   }
                // })
                break
              case CredentialState.Done:
                console.log(`Credential for credential id ${credentialRecord.id} is accepted`)
                // VC 수신 완료 시 자동으로 목록 업데이트
                await getVC()
                break
              default:
                break
            }
          }
      )

      _agent.events.on(AgentEventTypes.AgentMessageReceived, (event) => {
        console.log('📨 Mediator로부터 원시 메시지 수신:', JSON.stringify(event.payload, null, 2))
      })

      _agent.events.on(AgentEventTypes.AgentMessageProcessed, ({ payload }) => {
        console.log('🔓 복호화된 메시지:', payload.message)
      })

      await _agent.initialize()

      console.log('✅ Agent 초기화 성공')
      setAgent(_agent)
      setMediatorConnected(true)
      setConnStatus('✅ Agent 초기화 완료 - Mediator 연결됨')

      //Agent 초기화 완료 후 Hospital polling 시작
      startHospitalPolling(_agent)

      return _agent
    } catch (err) {
      console.error('Agent 초기화 실패:', err)
      setConnStatus(`Agent 초기화 실패: ${err.message || String(err)}`)
      setMediatorConnected(false)

      // Mediator 연결 실패 시 재시도 로직
      setTimeout(() => {
        console.log('Mediator 연결 재시도')
        initializeAgent()
      }, 5000) //5초 후 재시도

      throw err
    }
  }
  //======================================================================[    NEW.2: Agent Config  ]======================================================================================
//======================================================================[    NEW.3: polling method   ]======================================================================================
  // ---- Hospital Polling 시작 함수 ----
  const startHospitalPolling = (_agent) => {
    if (hospitalPollTimer.current) {
      clearInterval(hospitalPollTimer.current)
    }

    setIsPollingActive(true)
    setConnStatus('🔄 Hospital 초대 정보 polling 시작...')

    // 즉시 한 번 실행
    pollHospitalInvitation(_agent)

    // 1분마다 반복 실행
    hospitalPollTimer.current = setInterval(() => {
      pollHospitalInvitation(_agent)
    }, HOSPITAL_POLL_INTERVAL)
  }

  // ---- Hospital Polling 중지 함수 ----
  const stopHospitalPolling = () => {
    if (hospitalPollTimer.current) {
      clearInterval(hospitalPollTimer.current)
      hospitalPollTimer.current = null
    }
    setIsPollingActive(false)
    setConnStatus('⏹️ Hospital polling 중지됨')
  }
  // ---- Hospital 초대 정보 polling 함수 ----
  const pollHospitalInvitation = async (_agent) => {
    if (!_agent || hospitalConnected) {
      return // 이미 연결된 경우 polling 중지
    }

    try {
      console.log('🔍 Hospital 초대 정보 요청 중...')
      const hospitalInfo = await getHospitalInvitation()

      if (hospitalInfo && hospitalInfo.invitationUrl) {
        console.log('✅ Hospital 초대 URL 수신:', hospitalInfo.invitationUrl)
        await connectToHospital(_agent, hospitalInfo.invitationUrl)
      } else {
        console.log('⏳ Hospital 초대 정보 없음, 계속 대기 중...')
        setConnStatus('⏳ Hospital 초대 대기 중... (1분마다 확인)')
      }
    } catch (error) {
      console.error('❌ Hospital 초대 정보 polling 실패:', error)
      setConnStatus('❌ Hospital 초대 정보 요청 실패, 계속 재시도 중...')
    }
  }

  // ---- Hospital 연결 함수 ----
  const connectToHospital = async (_agent, invitationUrl) => {
    try {
      setConnStatus('🏥 Hospital 연결 중...')

      const result = await _agent.dids.create({
        method: 'peer',
        options: {
          numAlgo: PeerDidNumAlgo.InceptionKeyWithoutDoc,
        },
      })

      await _agent.oob.receiveInvitationFromUrl(invitationUrl, {
        ourDid: result.didState.did,
        autoAcceptConnection: true,
        autoAcceptInvitation: true,
      })

      console.log('✅ Hospital 연결 성공')
      setHospitalConnected(true)
      setConnStatus('✅ Hospital 연결 완료')
      // Hospital 연결 성공 시 polling 중지
      stopHospitalPolling()
    } catch (error) {
      console.error('❌ Hospital 연결 실패:', error)
      setConnStatus(`❌ Hospital 연결 실패: ${error.message || String(error)}`)
    }
  }

  // ---- 컴포넌트 마운트 시 Agent 초기화 ----
  useEffect(() => {
    initializeAgent().catch(console.error)

    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (hospitalPollTimer.current) {
        clearInterval(hospitalPollTimer.current)
      }
    }
  }, [])


  //======================================================================[    NEW.3: polling method    ]======================================================================================
  // ---- 수동 Hospital 연결 함수 (기존 버튼용) ----
  const connectHospital = async () => {
    if (!agent) {
      setConnStatus('⚠️ Agent 준비 중...')
      return
    }

    try {
      const hospitalInfo = await getHospitalInvitation()
      if (hospitalInfo && hospitalInfo.invitationUrl) {
        await connectToHospital(agent, hospitalInfo.invitationUrl)
      } else {
        setConnStatus(' Hospital 초대 정보를 가져올 수 없습니다')
      }
    } catch (error) {
      console.error('Hospital 연결 실패:', error)
      setConnStatus(`Hospital 연결 실패: ${error.message || String(error)}`)
    }
  }

  // ---- 받은 VC 목록 조회 함수 ----
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
      setConnStatus(`❌ VC 조회 실패: ${error.message || String(error)}`)
    }
  }

  const startPolling = async () => {
    try {
      setConnStatus('⚙️ Message Pickup (Polling) 시작…')

      const defaultMediator = await agent.mediationRecipient.findDefaultMediator()
      if (!defaultMediator) {
        console.warn('⚠️ Default Mediator 없음, 메시지 픽업을 시작할 수 없습니다.')
      } else {
        agent.mediationRecipient
            .initiateMessagePickup(defaultMediator, MediatorPickupStrategy.Implicit)
            .then(() => {
              console.log('✅ PickUp Polling이 시작되었습니다.')
            })
            .catch((e) => {
              console.warn('📡 PickUp Polling 오류:', e.message || e)
            })
      }
    } catch(error) {
      console.error('❌ Message Pickup 시작 실패:', error)
    }
  }

  const stopPolling = async () => {
    try {
      setConnStatus('⚙️ Message Pickup (Polling) 정지')
      const defaultMediator = await agent.mediationRecipient.findDefaultMediator()
      if (!defaultMediator) {
        console.warn('⚠️ Default Mediator 없음, 메시지 픽업을 중지 할 수 없습니다.')
      } else {
        await agent.mediationRecipient.stopMessagePickup(defaultMediator)
        console.log('✅ PickUp Polling을 정지합니다.')
      }
    } catch(error) {
      console.error('❌ Message Pickup 정지 실패:', error)
    }
  }

  // ---- 지갑 삭제 함수 ----
  const deleteWallet = async () => {
    if (!agent) {
      setConnStatus('⚠️ Agent 준비 중...')
      return
    }
    try {

//======================================================================[    NEW.4: 지갑 삭제 시 polling 중지    ]======================================================================================
      // Polling 중지
      stopHospitalPolling()
//======================================================================[    NEW.4: 지갑 삭제 시 polling 중지    ]======================================================================================
      await agent.wallet.delete()
      console.log('✅ 지갑이 성공적으로 삭제되었습니다.')
      setConnStatus('✅ 지갑 삭제 완료')
      setVcContent(null)
      setPeerDid(null)
      setAgent(null)
      setMediatorConnected(false)
      setHospitalConnected(false)
    } catch (error) {
      console.error('❌ 지갑 삭제 실패:', error)
      setConnStatus(`❌ 지갑 삭제 실패: ${error.message || String(error)}`)
    }
  }
//======================================================================[    NEW.5: Agent 재초기화  ]======================================================================================
  // ---- Agent 재초기화 함수 ----
  const reinitializeAgent = async () => {
    try {
      if (agent) {
        await agent.shutdown()
        setAgent(null)
      }
      stopHospitalPolling()
      setMediatorConnected(false)
      setHospitalConnected(false)

      await initializeAgent()
    } catch (error) {
      console.error('Agent 재초기화 실패:', error)
      setConnStatus(`Agent 재초기화 실패: ${error.message || String(error)}`)
    }
  }
//======================================================================[    NEW.5: Agent 재초기화    ]======================================================================================
  return (
      <SafeAreaView style={[styles.container, backgroundStyle]}>
        <StatusBar
            barStyle={isDarkMode ? 'light-content' : 'dark-content'}
            backgroundColor={backgroundStyle.backgroundColor}
        />
        <ScrollView style={backgroundStyle}>
          <View style={styles.content}>
            <Text style={styles.title}>Credo - DID VC 발급 테스트 (Auto Polling)</Text>

            {/* 연결 상태 표시 */}
            <View style={styles.statusContainer}>
              <Text style={[styles.statusIndicator, { color: mediatorConnected ? '#0a0' : '#f00' }]}>
                Mediator: {mediatorConnected ? '✅ 연결됨' : '❌ 연결 안됨'}
              </Text>
              <Text style={[styles.statusIndicator, { color: hospitalConnected ? '#0a0' : '#f00' }]}>
                Hospital: {hospitalConnected ? '✅ 연결됨' : '❌ 연결 안됨'}
              </Text>
              <Text style={[styles.statusIndicator, { color: isPollingActive ? '#0a0' : '#999' }]}>
                Polling: {isPollingActive ? '🔄 활성' : '⏹️ 비활성'}
              </Text>
            </View>
          </View>

          {/* DID 정보 영역 */}
          <Text selectable style={styles.didText}>
            {peerDid || '* DID 정보는 아직 없음 *'}
          </Text>

          {/* 상태 메시지 영역 */}
          <Text style={styles.statusText}>{connStatus}</Text>

          {/* 버튼들 */}
          <View style={styles.buttonContainer}>
            <Button title="Agent 재초기화" onPress={reinitializeAgent} />
          </View>
          <View style={styles.buttonContainer}>
            <Button
                title="Hospital 수동 연결"
                onPress={connectHospital}
                disabled={hospitalConnected}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button title="전체 VC 목록 조회" onPress={getVC} />
          </View>
          <View style={styles.buttonContainer}>
            <Button title="▶Message Pickup 시작" onPress={startPolling} />
          </View>
          <View style={styles.buttonContainer}>
            <Button title="⏹Message Pickup 중지" onPress={stopPolling} />
          </View>
          <View style={styles.buttonContainer}>
            <Button
                title="Hospital Polling 시작/중지"
                onPress={isPollingActive ? stopHospitalPolling : () => startHospitalPolling(agent)}
                disabled={!agent}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button title="지갑 삭제" onPress={deleteWallet} />
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
  statusContainer: {
    width: '100%',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusIndicator: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  didText: {
    width: '100%',
    fontSize: 13,
    color: '#222',
    backgroundColor: '#eee',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginHorizontal: 24,
  },
  vcText: {
    width: '100%',
    fontSize: 12,
    backgroundColor: '#f2f2f2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginHorizontal: 24,
    color: '#000',
  },
  statusText: {
    width: '100%',
    fontSize: 14,
    color: '#0a0',
    marginTop: 12,
    marginBottom: 12,
    marginHorizontal: 24,
  },
  buttonContainer: {
    marginTop: 8,
    width: '100%',
    paddingHorizontal: 24,
  },
})