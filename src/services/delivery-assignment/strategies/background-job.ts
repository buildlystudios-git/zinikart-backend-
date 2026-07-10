import type { Payload } from 'payload'
import type { DeliveryAssignmentStrategy } from '../types'

export class BackgroundJobStrategy implements DeliveryAssignmentStrategy {
  name = 'background_job'

  async assign(orderId: string | number, payload: Payload): Promise<void> {
    try {
      await payload.jobs.queue({
        task: 'assignDeliveryPartner',
        input: { orderId: String(orderId) },
      })
    } catch (err) {
      payload.logger.error(`BackgroundJobStrategy: Failed to queue assignDeliveryPartner for order ${orderId}: ${err}`)
    }
  }

  async handleResponse(orderId: string | number, partnerId: string | number, accepted: boolean, payload: Payload): Promise<void> {
    // Strategy-specific response logic
    // (e.g. canceling timeout jobs can be done here if needed)
  }
}
