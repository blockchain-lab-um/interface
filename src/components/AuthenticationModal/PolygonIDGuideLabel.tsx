import { ReactNode } from 'react'
import { Text } from 'rebass'
import styled from 'styled-components'

const Label = styled.div<{ color: string; backgroundColor?: string }>`
  padding: 16px 16px;
  font-size: 12px;
  border-radius: 8px;
  color: ${({ color }) => color};
  display: inline-flex;
  align-items: center;
  text-align: center;
`

const Title = styled(Text)`
  margin-right: 5px;
  font-weight: 700;
  font-size: 14px;
`

type PolygonIDGuideLabelProps = {
  children: ReactNode
}
export default function PolygonIDGuideLabel({ children }: PolygonIDGuideLabelProps) {
  return (
    <Label color="black">
      <Title marginRight="5px" fontWeight={545}>
        {children}
      </Title>
    </Label>
  )
}
