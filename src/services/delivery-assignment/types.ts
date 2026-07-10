import type { Payload } from 'payload'

export interface DeliveryAssignmentStrategy {
  name: string;
  assign(orderId: string | number, payload: Payload): Promise<void>;
  handleResponse(orderId: string | number, partnerId: string | number, accepted: boolean, payload: Payload): Promise<void>;
}
