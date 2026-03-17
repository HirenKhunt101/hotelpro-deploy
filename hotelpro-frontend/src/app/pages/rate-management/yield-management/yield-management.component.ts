import { Component, OnInit } from '@angular/core';
import {
  FormGroup,
  FormArray,
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AlertService } from '../../../core/services/alert.service';
import { CrudService } from '../../../core/services/crud.service';
import { APIConstant } from '../../../core/constants/APIConstant';
import { CommonModule, DatePipe } from '@angular/common';
import { CustomValidators } from '../../../core/shared/validators/custom-validators';
import { AuthService } from '../../../core/services/auth.service';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';

@Component({
  selector: 'app-yield-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgMultiSelectDropDownModule,
  ],
  templateUrl: './yield-management.component.html',
  styleUrl: './yield-management.component.css',
})
export class YieldManagementComponent implements OnInit {
  propertyUnitId: string | null = '';
  Today!: any;
  Tomorrow!: any;
  yieldForm!: FormGroup;
  createYieldForm!: FormGroup;
  yieldData: any;

  selectedYieldIndex = 0;
  RoomTypes: any;
  RatePlanList: any;
  constructor(
    private crudService: CrudService,
    private fb: FormBuilder,
    private alertService: AlertService,
    private router: Router,
    private modalService: NgbModal,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.propertyUnitId = this.authService.getUserInfo()?.user?.propertyUnitId;
    this.Today = new DatePipe('en-US').transform(new Date(), 'yyyy-MM-dd');
    this.Tomorrow = new Date(this.Today);
    this.Tomorrow.setDate(this.Tomorrow.getDate() + 1);
    this.Tomorrow = new DatePipe('en-US').transform(
      this.Tomorrow,
      'yyyy-MM-dd'
    );
    this.initForms();
    this.fetchData();
  }

  private initForms(): void {
    const yieldFormControls = {
      yieldName: ['', [Validators.required]],
      yieldDescription: [''],
      ratePlanSetupId: ['', [Validators.required]],
      roomTypeIds: [[], [Validators.required]],
      startDate: [this.Today, [Validators.required]],
      endDate: [this.Tomorrow, [Validators.required]],
      occupancyRangeStart: [
        0,
        [Validators.required, Validators.pattern('[0-9]+(.[0-9]{1,2})?%?')],
      ],
      occupancyRangeEnd: [
        0,
        [Validators.required, Validators.pattern('[0-9]+(.[0-9]{1,2})?%?')],
      ],
      changeType: ['percentage'],
      changeValue: [
        0,
        [Validators.required, Validators.pattern('[0-9]+(.[0-9]{1,2})?%?')],
      ],
    };

    this.createYieldForm = this.fb.group({
      ...yieldFormControls,
    });

    this.yieldForm = this.fb.group({
      ...yieldFormControls,
      active: [true, [Validators.required]],
      yieldId: ['', [Validators.required]],
    });
  }

  fetchData() {
    this.crudService
      .post(APIConstant.READ_YIELD, {
        propertyUnitId: this.propertyUnitId,
      })
      .then((response) => {
        console.log(response.data);
        this.yieldData = response.data.yieldDetails;
        console.log(this.yieldData);

        this.RoomTypes = response.data.roomType;
        this.RatePlanList = response.data.ratePlan.map((rp: any) => {
          return { item_id: rp.ratePlanId, item_text: rp.ratePlanName };
        });

        this.createYieldForm.patchValue({
          ratePlanSetupId: this.RatePlanList[0].item_id,
        });

        if (this.yieldData && this.yieldData.length > 0) {
          this.selectYield(this.yieldData[0], 0);
        }
      })
      .catch((error) => {
        this.alertService.errorAlert(
          error?.error?.message || 'An error occurred while fetching yield'
        );
      });
  }

  createYield(): void {
    if (this.createYieldForm.valid) {
      const yieldBody = {
        ...this.createYieldForm.value,
        propertyUnitId: this.propertyUnitId,
      };
      console.log(yieldBody);

      this.crudService
        .post(APIConstant.CREATE_YIELD, yieldBody)
        .then(() => {
          this.alertService.successAlert('Yield created successfully');
        })
        .catch((error) => {
          this.alertService.errorAlert(
            error?.error?.message || 'An error occurred while create the yield'
          );
        })
        .finally(() => {
          this.fetchData();
          this.modalService.dismissAll();
        });
    }
  }

  selectYield(y: any, index: number): void {
    this.selectedYieldIndex = index; // Track the selected row index
    let roomTypes = y.roomTypes.map((rt: any) => ({
      roomTypeId: rt._id,
      roomTypeName: rt.roomTypeName,
    }));
    this.yieldForm.patchValue({
      yieldId: y._id,
      yieldName: y.yieldName,
      yieldDescription: y.yieldDescription,
      ratePlanSetupId: y.ratePlanDetail._id,
      roomTypeIds: roomTypes,
      startDate: new DatePipe('en-US').transform(y.startDate, 'yyyy-MM-dd'),
      endDate: new DatePipe('en-US').transform(y.endDate, 'yyyy-MM-dd'),
      occupancyRangeStart: y.occupancyRangeStart,
      occupancyRangeEnd: y.occupancyRangeEnd,
      changeType: y.changeType,
      changeValue: y.changeValue,
      active: y.active,
    });
  }

  updateYield(): void {
    if (this.yieldForm.valid) {
      if (
        this.yieldForm.controls.startDate.value?.toString() >=
        this.yieldForm.controls.endDate.value?.toString()
      ) {
        this.alertService.errorAlert('Please select valid dates');
        return;
      }

      const updatedYield = {
        ...this.yieldForm.value,
      };
      this.crudService
        .post(APIConstant.UPDATE_YIELD, updatedYield)
        .then(() => {
          this.alertService.successAlert('Yield updated successfully');
        })
        .catch((error) => {
          this.alertService.errorAlert(
            error?.error?.message ||
              'An error occurred while updating the yield'
          );
          console.error(error);
        })
        .finally(() => {
          this.fetchData();
        });
    }
  }

  getTomorrow() {
    this.Tomorrow = new Date(this.createYieldForm.controls.startDate.value);
    this.Tomorrow.setDate(this.Tomorrow.getDate() + 1);
    this.Tomorrow = new DatePipe('en-US').transform(
      this.Tomorrow,
      'yyyy-MM-dd'
    );
    if (
      this.createYieldForm.controls.startDate.value?.toString() >=
      this.createYieldForm.controls.endDate.value?.toString()
    ) {
      this.createYieldForm.patchValue({
        endDate: this.Tomorrow,
      });
    }
  }

  getRoomTypeNames(roomType: any) {
    return roomType
      .map((room: any) => room.roomTypeName)
      .sort()
      .join(' ');
  }

  openModalCreateYield(content: any) {
    this.createYieldForm.patchValue({
      yieldName: '',
      yieldDescription: '',
      ratePlanSetupId: '',
      roomTypeIds: [],
      startDate: this.Today,
      endDate: this.Tomorrow,
      occupancyRangeStart: 0,
      occupancyRangeEnd: 0,
      changeType: 'percentage',
      changeValue: 0,
    });
    this.modalService.open(content, { centered: true });
  }
}
