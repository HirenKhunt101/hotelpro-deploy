import { Component, OnInit, TemplateRef } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormArray,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { APIConstant } from '../../../core/constants/APIConstant';
import { AlertService } from '../../../core/services/alert.service';
import { CrudService } from '../../../core/services/crud.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { GeneralModalService } from '../../../core/services/general-modal.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { PropertySidebarComponent } from '../property-sidebar/property-sidebar.component';

@Component({
  selector: 'app-rateplan',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    PropertySidebarComponent,
  ],
  templateUrl: './rateplan.component.html',
  styleUrl: './rateplan.component.css',
})
export class RateplanComponent implements OnInit {
  ratePlanForm!: FormGroup;
  propertyUnitId: string | null = '';

  cancellationPolicyList: any[] = [];
  noshowPolicyList: any[] = [];
  ratePlanId: string | null = 'Add';
  constructor(
    private crudService: CrudService,
    private fb: FormBuilder,
    private alertService: AlertService,
    private activeRoute: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
    private generalModal: GeneralModalService,
    private modalService: NgbModal
  ) {}

  //   read roomtype
  // read,create,update rateplan
  // read,update,create cancel &  no show

  ngOnInit() {
    this.propertyUnitId = this.authService.getUserInfo()?.user?.propertyUnitId;
    this.ratePlanId = this.activeRoute.snapshot.paramMap.get('ratePlanId');
    const pId = this.activeRoute.snapshot.paramMap.get('propertyUnitId');
    if (pId) this.propertyUnitId = pId;

    this.ratePlanForm = this.fb.group({
      _id: [''],
      ratePlanName: ['', Validators.required],
      ratePlanShortName: ['', Validators.required],
      ratePlanDescription: [''],
      isBaseRate: [false],
      active: [true],
      cancellationPolicyId: ['', Validators.required],
      noShowPolicyId: ['', Validators.required],
      propertyUnitId: [''],
      isRefundable: [false],
      roomTypeRates: this.fb.array([]),
    });

    if (this.ratePlanId == 'Add') {
      this.readRoomTypes();
    } else {
      this.readRate();
    }

    this.readAllCancelationPolicies();
    this.readAllNoShowPolicies();
  }
  readRoomTypes() {
    this.crudService
      .post(APIConstant.READ_ROOMTYPES + this.propertyUnitId)
      .then((response: any) => {
        console.log(response);
        for (let r of response.data) {
          this.addRoomType(r);
        }
        console.log(this.ratePlanForm.value);
        this.alertService.successAlert(response.message);
      })
      .catch((error: any) => {
        console.log(error);
        this.alertService.errorAlert(error.message);
      });
  }

  createRoomTypeRate(r?: any): FormGroup {
    return this.fb.group({
      roomTypeName: [r?.roomTypeName || '', [Validators.required]],
      roomTypeId: [r?.roomTypeId || ''],
      baseRate: [
        r?.baseRate || 0,
        [Validators.required, Validators.pattern('[0-9]+(.[0-9]{1,2})?%?')],
      ],
      adultRate: [
        r?.adultRate || 0,
        [Validators.required, Validators.pattern('[0-9]+(.[0-9]{1,2})?%?')],
      ],
      childRate: [
        r?.childRate || 0,
        [Validators.required, Validators.pattern('[0-9]+(.[0-9]{1,2})?%?')],
      ],
    });
  }

  addRoomType(roomType?: any): void {
    this.roomTypeRates.push(this.createRoomTypeRate(roomType));
  }

  get roomTypeRates(): FormArray {
    return this.ratePlanForm.get('roomTypeRates') as FormArray;
  }

  onSubmit() {
    console.log(this.ratePlanForm.value);

    const callApiUrl = this.ratePlanForm.get('_id')?.value
      ? APIConstant.UPDATE_RATEPLAN
      : APIConstant.CREATE_RATEPLAN;
    this.generalModal
      .openModal('Are you sure want to submit this details?', '')
      .then((result) => {
        if (result) {
          // User confirmed
          let obj = this.ratePlanForm.value;
          obj.propertyUnitId = this.propertyUnitId;
          this.crudService
            .post(callApiUrl, obj)
            .then((response: any) => {
              console.log(response);
              this.alertService.successAlert(response.message);
            })
            .catch((error: any) => {
              console.log(error);
              this.alertService.errorAlert(error.message);
            });
        } else {
          // User cancelled
          console.log('no');
        }
      });
  }

  readRate() {
    let obj = {};
    if (this.router.url.includes('/baserate-setup')) {
      obj = {
        isBaseRate: true,
        propertyUnitId: this.propertyUnitId,
      };
    } else if (this.ratePlanId) {
      obj = {
        ratePlanId: this.ratePlanId,
        propertyUnitId: this.propertyUnitId,
      };
    } else {
      this.alertService.errorAlert('No Rate Plan Found !');
      window.history.back();
    }
    this.crudService
      .post(APIConstant.READ_RATEPLAN, obj)
      .then((response: any) => {
        console.log(response);
        this.ratePlanForm.patchValue(response.data);
        for (let r of response.data.rateRoomTypes) {
          this.addRoomType(r);
        }
      })
      .catch((error: any) => {
        console.log(error);
        this.alertService.errorAlert(error?.error?.message);
      });
  }
  readAllNoShowPolicies() {
    this.crudService
      .post(APIConstant.GET_ALL_NOSHOW_POLICIES + this.propertyUnitId)
      .then((response: any) => {
        console.log(response);
        this.noshowPolicyList = response.data;
      })
      .catch((error: any) => {
        console.log(error);
        this.alertService.errorAlert(error.message);
      });
  }
  readAllCancelationPolicies() {
    this.crudService
      .post(APIConstant.GET_ALL_CANCELLATION_POLICIES + this.propertyUnitId)
      .then((response: any) => {
        console.log(response);
        this.cancellationPolicyList = response.data;
      })
      .catch((error: any) => {
        console.log(error);
        this.alertService.errorAlert(error.message);
      });
  }

  next() {
    this.router.navigate(['/tax-setup', this.propertyUnitId]);
  }

  navigateToRoomSetup() {
    this.router.navigate(['/rooms-review/' + this.propertyUnitId]);
  }
}
