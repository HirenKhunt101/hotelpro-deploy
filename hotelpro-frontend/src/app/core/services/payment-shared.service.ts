import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface PaymentData {
  paymentOrderId: string;
  payment: any; // Replace `any` with a specific type if possible
  userId: string;
  propertyUnitId: string;
  groupId: string;
}

@Injectable({
  providedIn: 'root',
})
export class PaymentSharedService {
  private paymentDataSubject = new BehaviorSubject<PaymentData | null>(null);

  // Expose as observable for components to subscribe to
  paymentData$ = this.paymentDataSubject.asObservable();

  // Method to update the payment data
  updatePaymentData(data: any) {
    this.paymentDataSubject.next(data);
  }

  // Method to get the latest payment data
  getPaymentData() {
    return this.paymentDataSubject.getValue();
  }
  clearPaymentData() {
    this.paymentDataSubject.next(null);
  }
}
