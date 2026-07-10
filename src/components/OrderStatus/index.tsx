import type { Order } from '@/payload-types'
import { cn } from '@/utilities/cn'

type StatusOptions = NonNullable<Order['status']>

type Props = {
  status: StatusOptions
  className?: string
}

export const OrderStatus: React.FC<Props> = ({ status, className }) => {
  return (
    <div
      className={cn(
        'text-xs tracking-widest font-mono uppercase py-0 px-2 rounded w-fit',
        className,
        {
          'bg-primary/10': status === 'preparing' || status === 'order_received',
          'bg-success': status === 'delivered' || status === 'cod_payment_received',
        },
      )}
    >
      {status}
    </div>
  )
}
