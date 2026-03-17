import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CrudService } from '../../services/crud.service';
import { APIConstant } from '../../constants/APIConstant';
import { environment } from '../../../../environments/environment.development';
import { Router, RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { PaymentSharedService } from '../../services/payment-shared.service';
import { AlertService } from '../../services/alert.service';
import { NgZone } from '@angular/core';

interface PaymentData {
  paymentOrderId: string;
  payment: any;
  userId: string;
  propertyUnitId: string;
  groupId: string;
}

@Component({
  selector: 'app-razorpay-flow',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './razorpay-flow.component.html',
  styleUrls: ['./razorpay-flow.component.css'],
})
export class RazorpayFlowComponent implements OnInit {
  paymentOrderId: string | null = '';
  razorPayKey: string = environment.RAZOR_KEY_ID;
  paymentData: PaymentData = {} as PaymentData;

  constructor(
    private crudService: CrudService,
    private router: Router,
    private paymentSharedService: PaymentSharedService,
    private alertService: AlertService,
    @Inject(PLATFORM_ID) private platformId: object,
    private _ngZone: NgZone
  ) {}

  async ngOnInit() {
    await this.loadRazorpayScript();
    this.paymentSharedService.paymentData$.subscribe((data) => {
      if (data) {
        this.paymentData = data;

        this.payWithRazorpay();
      }
    });
    console.log(this.paymentData);
  }
  isEmpty(obj: any) {
    return Object.keys(obj).length === 0;
  }
  loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (
        document.querySelector(
          `script[src="https://checkout.razorpay.com/v1/checkout.js"]`
        )
      ) {
        resolve(); // Script already loaded
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(); // Script loaded successfully
      script.onerror = () => {
        alert('Could not load payment processing. Please try again later.');
        reject(new Error('Razorpay script failed to load.'));
      };
      document.body.appendChild(script);
    });
  }

  payWithRazorpay() {
    if (!this.paymentData || !this.paymentData.paymentOrderId) {
      console.error('Payment data is incomplete.');
      return;
    }

    const options: any = {
      key: this.razorPayKey,
      amount: this.paymentData.payment.amount * 100,
      currency: 'INR',
      name: 'Fun World',
      description: '',
      image:
        'https://i.pinimg.com/originals/51/f6/fb/51f6fb256629fc755b8870c801092942.png',
      order_id: this.paymentData.paymentOrderId,
      theme: {
        color: '#ddcbff',
      },
      handler: (response: any) => this.handlePaymentSuccess(response),
      modal: {
        escape: false,
      },
      notes: {},
      config: {
        display: {
          hide: [
            { method: 'paylater' },
            { method: 'netbanking' },
            { method: 'wallet' },
          ],
        },
      },
    };
    options.modal.ondismiss = () => {
      console.log('Transaction has been cancelled.');
      this._ngZone.run(() => {
        this.alertService.errorAlert('Transaction has been cancelled.');
        this.router.navigateByUrl(`guest-folio/${this.paymentData.groupId}`);
      });
    };
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  }

  handlePaymentSuccess(response: any) {
    const obj = {
      ...this.paymentData,
      razorpay_signature: response.razorpay_signature,
      original_order_id: this.paymentData.paymentOrderId,
      razorpay_payment_id: response.razorpay_payment_id,
    };

    this.crudService
      .post(APIConstant.POST_RESERVATION_PAYMENT, obj)
      .then((response: any) => {
        this.alertService.successAlert(response.message);
        this._ngZone.run(() =>
          this.router.navigateByUrl(`guest-folio/${this.paymentData.groupId}`)
        );
      })
      .catch((error: any) => {
        console.error('There was an error!', error);
        this.alertService.errorAlert(
          error?.error?.message || 'An error occurred while doing Payment'
        );
        this._ngZone.run(() =>
          this.router.navigateByUrl(`guest-folio/${this.paymentData.groupId}`)
        );
      });
  }
}
