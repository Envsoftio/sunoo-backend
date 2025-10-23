import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../entities/payment.entity';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>
  ) {}

  async createPayment(paymentData: {
    payment_id: string;
    status: string;
    amount?: string;
    currency?: string;
    invoice_id?: string;
    plan_id?: string;
    user_id?: string;
    subscription_id?: string;
    metadata?: any;
  }) {
    // Use a transaction to prevent race conditions
    return await this.paymentRepository.manager.transaction(
      async transactionalEntityManager => {
        try {
          // Check if payment already exists within the transaction
          const existingPayment = await transactionalEntityManager.findOne(
            Payment,
            {
              where: { payment_id: paymentData.payment_id },
            }
          );

          if (existingPayment) {
            return {
              success: false,
              message: 'Payment already exists',
              data: existingPayment,
            };
          }

          const payment = transactionalEntityManager.create(
            Payment,
            paymentData
          );
          const savedPayment = await transactionalEntityManager.save(
            Payment,
            payment
          );
          return { success: true, data: savedPayment };
        } catch (error) {
          return { success: false, message: error.message };
        }
      }
    );
  }

  async getPaymentsByUserId(userId: string) {
    try {
      const payments = await this.paymentRepository.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
      });
      return { success: true, data: payments };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getPaymentsBySubscriptionId(subscriptionId: string) {
    try {
      const payments = await this.paymentRepository.find({
        where: { subscription_id: subscriptionId },
        order: { created_at: 'DESC' },
      });
      return { success: true, data: payments };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async updatePaymentStatus(paymentId: string, status: string, metadata?: any) {
    try {
      await this.paymentRepository.update(
        { payment_id: paymentId },
        { status, metadata }
      );
      return { success: true, message: 'Payment status updated' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
