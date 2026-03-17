// src/payments/payments.module.ts
import { Module }              from '@nestjs/common'
import { PaymentsController }  from './payments.controller'
import { PaymentsService }     from './payments.service'
import { NotificationsModule } from '../notifications/notifications.module'
import { EnrollmentsModule }   from '../enrollments/enrollments.module'

@Module({
  imports:     [NotificationsModule, EnrollmentsModule],
  controllers: [PaymentsController],
  providers:   [PaymentsService],
  exports:     [PaymentsService],
})
export class PaymentsModule {}
