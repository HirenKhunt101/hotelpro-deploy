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
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-future-rates',
  standalone: true,
  imports: [
    FormsModule,
    NgMultiSelectDropDownModule,
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './future-rates.component.html',
  styleUrl: './future-rates.component.css',
})
export class FutureRatesComponent {
  changeRateForm!: FormGroup;
  propertyUnitId: string | null = '';
  startDate!: any;
  endDate!: any;
  Date: any;
  Week = 2;
  RoomData: any;
  DateArr: any;
  dropdownSettings!: {
    singleSelection: boolean;
    idField: string;
    textField: string;
    unSelectAllText: string;
    enableCheckAll: boolean;
    itemsShowLimit: number;
    allowSearchFilter: boolean;
  };
  dropdownList: any = [];
  selectedItems: any = [];
  Max!: any;
  Today!: any;
  ratePlanList: any[] = [];
  RoomTypes: any[] = [];
  RatePlanId = '';

  constructor(
    private crudService: CrudService,
    private fb: FormBuilder,
    private alertService: AlertService,
    private router: Router,
    private activeRoute: ActivatedRoute,
    private modalService: NgbModal,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.propertyUnitId = this.authService.getUserInfo()?.user?.propertyUnitId;

    this.Max = new DatePipe('en-US').transform(new Date(), 'yyyy-MM-dd');
    this.Date = new DatePipe('en-US').transform(new Date(), 'yyyy-MM-dd');
    this.Today = new DatePipe('en-US').transform(new Date(), 'yyyy-MM-dd');

    this.dropdownSettings = {
      singleSelection: false,
      idField: 'item_id',
      textField: 'item_text',
      unSelectAllText: 'UnSelect All',
      enableCheckAll: false,
      itemsShowLimit: 2,
      allowSearchFilter: true,
    };

    this.changeRateForm = this.fb.group({
      startDate: [this.Date, Validators.required],
      endDate: [this.Date, Validators.required],
      roomType: ['', Validators.required],
      newRate: [0, Validators.required],
    });
    this.readRatePlans();
  }

  readRatePlans() {
    this.crudService
      .post(APIConstant.READ_RATEPLAN, {
        propertyUnitId: this.propertyUnitId,
        fromList: true,
      })
      .then((response: any) => {
        console.log(response);
        this.ratePlanList = response.data.ratePlanList;

        for (let rp of this.ratePlanList) {
          if (rp.isBaseRate) {
            this.RatePlanId = rp._id;
            break;
          }
        }
        this.fetchdata();
      })
      .catch((error: any) => {
        console.log(error);
        this.alertService.errorAlert(error?.error?.message);
      });
  }

  fetchdata() {
    if (this.Week < 2) this.Week = 2;
    if (this.Week > 52) this.Week = 52;
    if (
      new Date(this.Date).toISOString() < new Date(this.Today).toISOString()
    ) {
      this.Date = this.Today; // if user enters past date using input
      this.alertService.errorAlert('You cannot visit past data');
      return;
    }

    this.startDate = new Date(this.Date.replace(/-/g, '/'));
    this.startDate.setHours(0, 0, 0, 0);
    this.endDate = new Date(this.startDate);
    this.endDate.setDate(this.endDate.getDate() + this.Week * 7);
    this.DateArr = [];
    for (
      let d = new Date(this.startDate);
      d < this.endDate;
      d.setDate(d.getDate() + 1)
    ) {
      this.DateArr.push(new Date(d));
    }

    const payloadStartDate = this.startDate.toLocaleDateString('en-CA'); // "yyyy-mm-dd"
    const payloadEndDate = this.endDate.toLocaleDateString('en-CA');

    this.crudService
      .post(APIConstant.READ_FUTURE_RATES, {
        startDate: payloadStartDate,
        endDate: payloadEndDate,
        ratePlanId: this.RatePlanId,
        propertyUnitId: this.propertyUnitId,
      })
      .then((response: any) => {
        this.dropdownList = [];
        this.RoomData = response.data;

        this.changeRateForm.patchValue({
          roomType: this.RoomData?.[0].roomTypeName,
        });
        for (let r of this.RoomData) {
          if (!this.dropdownList.includes(r.roomTypeName)) {
            this.dropdownList.push(r.roomTypeName);
          }
          r.Show = true;
        }
        this.dropdownList = this.dropdownList.map((e: any) => {
          return { item_id: e, item_text: e };
        });
      })
      .catch((error) => {
        this.alertService.errorAlert(error.statusMessage);
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

  changeRate() {
    if (
      this.changeRateForm.controls.startDate.value?.toString() < this.Date ||
      this.changeRateForm.controls.endDate.value?.toString() < this.Date
    ) {
      this.alertService.errorAlert('You can not change rates of past date');
      this.modalService.dismissAll();
    }
    console.log(this.changeRateForm.value);
    let ratePlanRoomRateId = '';
    for (let rd of this.RoomData) {
      if (rd.roomTypeName == this.changeRateForm.controls.roomType.value) {
        ratePlanRoomRateId = rd.ratePlanRoomRateId;
        break;
      }
    }
    this.crudService
      .post(APIConstant.UPDATE_FUTURE_RATES, {
        changeRates: this.changeRateForm.value,
        ratePlanRoomRateId,
      })
      .then((response: any) => {
        this.alertService.successAlert('Rate updated successfully');
      })
      .catch((error) => {
        this.alertService.errorAlert(error.statusMessage);
      })
      .finally(() => {
        this.ngOnInit();
        this.modalService.dismissAll();
      });
  }

  checkDates() {
    if (
      this.changeRateForm.controls.startDate.value?.toString() >=
      this.changeRateForm.controls.endDate.value?.toString()
    ) {
      this.changeRateForm.patchValue({
        endDate: this.changeRateForm.controls.startDate.value,
      });
    }
  }

  openRangeUpdateModal(content: any) {
    this.changeRateForm.patchValue({
      startDate: this.Date,
      endDate: this.Date,
      roomType: this.RoomData?.[0].roomTypeName,
      newRate: 0,
    });

    this.modalService.open(content).result.then((result) => {
      if (result) {
      }
    });
  }

  filterRoom() {
    let r = this.selectedItems.map((e: any) => e.item_id);
    if (r.length > 0) {
      for (let t of this.RoomData) {
        if (r.includes(t.roomTypeName)) {
          t.Show = true;
        } else {
          t.Show = false;
        }
      }
    } else {
      for (let t of this.RoomData) {
        t.Show = true;
      }
    }
  }
}
