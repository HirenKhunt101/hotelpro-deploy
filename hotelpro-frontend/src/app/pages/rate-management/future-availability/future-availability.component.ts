import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { APIConstant } from '../../../core/constants/APIConstant';
import { AlertService } from '../../../core/services/alert.service';
import { CrudService } from '../../../core/services/crud.service';
import { AuthService } from '../../../core/services/auth.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-future-availability',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    DatePipe,
  ],
  templateUrl: './future-availability.component.html',
  styleUrl: './future-availability.component.css',
})
export class FutureAvailabilityComponent implements OnInit {
  userInfo: any;
  availabilityData: any;
  Week = 2;
  Date: any;
  Max: any;

  constructor(
    private authService: AuthService,
    private router: Router,
    private crudService: CrudService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.userInfo = this.authService.getUserInfo()?.user;
    console.log(this.userInfo);

    this.Date = new DatePipe('en-US').transform(new Date(), 'yyyy-MM-dd');
    this.Max = new DatePipe('en-US').transform(new Date(), 'yyyy-MM-dd');

    this.fetchData();
  }

  fetchData() {
    if (this.Week < 2) this.Week = 2;
    if (this.Week > 52) this.Week = 52;
    let startDate = new Date(this.Date.replace(/-/g, '/'));
    let endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + this.Week * 7);

    const payloadStartDate = startDate.toLocaleDateString('en-CA'); // "yyyy-mm-dd"
    const payloadEndDate = endDate.toLocaleDateString('en-CA');

    this.crudService
      .post(APIConstant.READ_FUTURE_AVAILABILITY, {
        propertyUnitId: this.userInfo.propertyUnitId,
        startDate: payloadStartDate,
        endDate: payloadEndDate,
      })
      .then((response: any) => {
        this.availabilityData = response.data;
        console.log(this.availabilityData);
      })
      .catch((error) => {
        this.alertService.errorAlert(error?.error?.message || error.message);
      });
  }

  add() {
    this.Week += 1;
  }

  sub() {
    if (this.Week > 2) {
      this.Week -= 1;
    }
  }
}
