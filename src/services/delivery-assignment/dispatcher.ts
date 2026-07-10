import type { DeliveryAssignmentStrategy } from './types'
import { BackgroundJobStrategy } from './strategies/background-job'
import { ASSIGNMENT_STRATEGY } from '@/constants/env'
// We can import others like WebSocketPushStrategy if needed in the future

export function getAssignmentStrategy(): DeliveryAssignmentStrategy {
  const strategyName = ASSIGNMENT_STRATEGY
  
  switch (strategyName) {
    case 'background_job':
    default:
      return new BackgroundJobStrategy()
  }
}
