import Modal from 'components/Modal'
import { useState } from 'react'
import styled from 'styled-components'

import PolygonIDGuideLabel from './PolygonIDGuideLabel'

const Container = styled.div`
  width: 100%;
  padding: 32px 40px;
  display: flex;
  flex-flow: column;
  align-items: center;
`

interface AuthenticationModalProps {
  onCancel: () => void
}

export default function AuthenticationModal({ onCancel }: AuthenticationModalProps) {
  const [loadingLabel, setLoadingLabel] = useState('Waiting for confirmed identity verification ')
  // timeout to add a dot to a loading label, one dot each second and when it reaches 3 dots, it resets to 0
  setTimeout(() => {
    if (loadingLabel === 'Waiting for confirmed identity verification ') {
      setLoadingLabel('Waiting for confirmed identity verification .')
    } else if (loadingLabel === 'Waiting for confirmed identity verification .') {
      setLoadingLabel('Waiting for confirmed identity verification ..')
    } else if (loadingLabel === 'Waiting for confirmed identity verification ..') {
      setLoadingLabel('Waiting for confirmed identity verification ...')
    } else {
      setLoadingLabel('Waiting for confirmed identity verification ')
    }
  }, 700)

  return (
    <Modal isOpen onDismiss={onCancel}>
      <Container>
        <PolygonIDGuideLabel>{loadingLabel}</PolygonIDGuideLabel>
      </Container>
    </Modal>
  )
}
