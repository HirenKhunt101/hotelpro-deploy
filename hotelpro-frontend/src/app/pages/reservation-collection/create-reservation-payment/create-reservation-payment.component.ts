import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CrudService } from '../../../core/services/crud.service';
import { APIConstant } from '../../../core/constants/APIConstant';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-create-reservation-payment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-reservation-payment.component.html',
  styleUrl: './create-reservation-payment.component.css',
})
export class CreateReservationPaymentComponent implements OnInit {
  paymentEntries: any[] = [];
  paymentForm!: FormGroup;
  groupDetails: any;
  reservationsArray: any;
  propertyUnitId: string | null = '';
  currentBalance: number = 0;
  isWalkin: boolean = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private alertService: AlertService,
    private authService: AuthService,
    private crudService: CrudService
  ) {}

  ngOnInit(): void {
    this.propertyUnitId = this.authService.getUserInfo()?.user?.propertyUnitId;
    this.isWalkin = this.router.url == '/reservation-payment' ? false : true;

    // this.propertyUnitId = this.route.snapshot.paramMap.get('propertyUnitId');
    this.paymentForm = this.fb.group({
      paymentType: ['cash'],
      amount: [10, [Validators.min(1), Validators.required]],
      deposit: [false, Validators.required],
      remark: [''],
    });
    const session_reservationsArray =
      sessionStorage.getItem('reservationsArray');
    const session_groupDetails = sessionStorage.getItem('groupDetails');
    if (session_reservationsArray && session_groupDetails) {
      this.reservationsArray = JSON.parse(session_reservationsArray);
      this.groupDetails = JSON.parse(session_groupDetails);

      this.groupDetails.totalTax =
        this.groupDetails.totalCost - this.groupDetails.totalPrice;
      this.groupDetails.totalBalance = -this.groupDetails.totalCost;
      this.groupDetails.totalPayment = 0;
      this.groupDetails.totalDeposit = 0;
      this.paymentForm.controls.amount.patchValue(this.groupDetails.totalCost);
      this.currentBalance = this.groupDetails.totalCost;
    }
  }
  onAddPayment() {
    if (this.paymentForm.valid) {
      this.paymentEntries.push(this.paymentForm.value);
      if (!this.paymentForm.get('deposit')?.value) {
        this.currentBalance -= this.paymentForm.get('amount')?.value;
      }
      this.paymentForm.patchValue({
        paymentType: 'cash',
        amount: this.currentBalance,
        deposit: false,
        remark: '',
      }); // Optionally reset the form after adding payment
    }
  }

  onPayment() {
    const sendObj = {
      propertyUnitId: this.propertyUnitId,
      reservationsArray: this.reservationsArray,
      groupDetails: this.groupDetails,
      paymentEntries: this.paymentEntries,
      isWalkin: this.isWalkin,
    };
    this.crudService
      .post(APIConstant.CREATE_RESERVATION, sendObj)
      .then((response) => {
        console.log(response);
        this.alertService.successAlert('Reservation created successfully');
        this.router.navigate(['/guest-folio/' + response?.data?._id]);
      })
      .catch((error) => {
        this.alertService.errorAlert(
          error?.error?.message || 'An error occurred while processing payment'
        );
        console.error(error);
      });
  }
  trackByFn(index: number, item: any): any {
    return index;
  }
  removePaymnetObj(index: number) {
    if (!this.paymentEntries[index].deposit) {
      this.currentBalance += this.paymentEntries[index].amount;
      this.paymentForm.patchValue({
        paymentType: 'cash',
        amount: this.currentBalance,
        deposit: false,
        remark: '',
      });
    }
    this.paymentEntries.splice(index, 1);
  }
}
