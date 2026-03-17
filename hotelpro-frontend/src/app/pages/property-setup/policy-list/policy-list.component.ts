import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { CrudService } from '../../../core/services/crud.service';
import { GeneralModalService } from '../../../core/services/general-modal.service';
import { APIConstant } from '../../../core/constants/APIConstant';
import { PropertySidebarComponent } from '../property-sidebar/property-sidebar.component';

@Component({
  selector: 'app-policy-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    PropertySidebarComponent,
  ],
  templateUrl: './policy-list.component.html',
  styleUrl: './policy-list.component.css',
})
export class PolicyListComponent implements OnInit {
  propertyUnitId: string | null = '';

  cancelPolicyListForm!: FormGroup;
  noshowPolicyListForm!: FormGroup;

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

  ngOnInit(): void {
    const pId = this.activeRoute.snapshot.paramMap.get('propertyUnitId');
    if (pId) this.propertyUnitId = pId;

    this.initForms();
    this.readAllCancelationPolicies();
    this.readAllNoShowPolicies();
  }
  initForms() {
    this.cancelPolicyListForm = this.fb.group({
      cancelPolicies: this.fb.array([]),
    });
    this.noshowPolicyListForm = this.fb.group({
      noshowPolicies: this.fb.array([]),
    });
  }
  get noshowPolicies(): FormArray {
    return this.noshowPolicyListForm.get('noshowPolicies') as FormArray;
  }
  readAllNoShowPolicies() {
    this.crudService
      .post(APIConstant.GET_ALL_NOSHOW_POLICIES + this.propertyUnitId)
      .then((response: any) => {
        console.log(response);
        response.data.forEach((policy: any) => this.addNoShowPolicy(policy));
      })
      .catch((error: any) => {
        console.log(error);
        this.alertService.errorAlert(error.message);
      });
  }

  createNoShowPolicy(data?: any): FormGroup {
    const noShowForm = this.fb.group({
      _id: [data?._id || ''],
      noShowPolicyName: [data?.noShowPolicyName || '', Validators.required],
      chargeType: [data?.chargeType || 'percentage', Validators.required],
      chargeValue: [data?.chargeValue || 10, Validators.required],
      propertyUnitId: [
        data?.propertyUnitId || this.propertyUnitId,
        Validators.required,
      ],
      policyDescription: [data?.policyDescription || ''],
    });
    if (data?._id) noShowForm.disable();

    return noShowForm;
  }

  addNoShowPolicy(data?: any) {
    this.noshowPolicies.push(this.createNoShowPolicy(data));
  }

  addUpdateNoShowPolicy(index: number) {
    const policy = this.noshowPolicies.at(index);
    const obj = policy.value;

    const callApiUrl = obj._id
      ? APIConstant.UPDATE_NOSHOW_POLICY + obj._id
      : APIConstant.CREATE_NOSHOW_POLICY;

    this.crudService
      .post(callApiUrl, obj)
      .then((response: any) => {
        console.log(response);
        policy.patchValue(response.data);
        policy.disable();
      })
      .catch((error: any) => {
        console.log(error);
        this.alertService.errorAlert(error.message);
      });
  }
  deleteNoShowPolicy(index: number) {
    const obj = this.noshowPolicies.at(index).value;
    if (!obj._id) {
      this.noshowPolicies.removeAt(index);
      return;
    }
    this.crudService
      .post(APIConstant.DELETE_NOSHOW_POLICY + obj._id, obj)
      .then((response: any) => {
        console.log(response);
        this.noshowPolicies.removeAt(index);
      })
      .catch((error: any) => {
        console.log(error);
        this.alertService.errorAlert(error.message);
      });
  }

  get cancelPolicies(): FormArray {
    return this.cancelPolicyListForm.get('cancelPolicies') as FormArray;
  }
  createCancelPolicy(data?: any): FormGroup {
    const cancelForm = this.fb.group({
      _id: [data?._id || ''],
      cancelPolicyName: [data?.cancelPolicyName || '', Validators.required],
      windowRange: [data?.windowRange || '24h', Validators.required],
      windowType: [data?.windowType || 'percentage', Validators.required],
      insideWindowCharge: [data?.insideWindowCharge || 10, Validators.required],
      outsideWindowCharge: [
        data?.outsideWindowCharge || 10,
        Validators.required,
      ],
      propertyUnitId: [
        data?.propertyUnitId || this.propertyUnitId,
        Validators.required,
      ],
      policyDescription: [data?.policyDescription || ''],
    });
    if (data?._id) cancelForm.disable();

    return cancelForm;
  }

  addCancelPolicy(data?: any) {
    this.cancelPolicies.push(this.createCancelPolicy(data));
  }

  readAllCancelationPolicies() {
    this.crudService
      .post(APIConstant.GET_ALL_CANCELLATION_POLICIES + this.propertyUnitId)
      .then((response: any) => {
        console.log(response);

        response.data.forEach((policy: any) => this.addCancelPolicy(policy));
      })
      .catch((error: any) => {
        console.log(error);
        this.alertService.errorAlert(error.message);
      });
  }

  addUpdateCancellationPolicy(index: number) {
    let policy = this.cancelPolicies.at(index);
    let obj = this.cancelPolicies.at(index).value;

    const callApiUrl = obj._id
      ? APIConstant.UPDATE_CANCELLATION_POLICY + obj._id
      : APIConstant.CREATE_CANCELLATION_POLICY;
    this.crudService
      .post(callApiUrl, obj)
      .then((response: any) => {
        console.log(response);
        policy.patchValue(response.data);
        policy.disable();
      })
      .catch((error: any) => {
        console.log(error);
        this.alertService.errorAlert(error.message);
      });
  }
  deleteCancellationPolicy(index: number) {
    let obj = this.cancelPolicies.at(index).value;
    if (!obj._id) {
      this.cancelPolicies.removeAt(index);
      return;
    }
    this.crudService
      .post(APIConstant.DELETE_CANCELLATION_POLICY + obj._id, obj)
      .then((response: any) => {
        console.log(response);
        this.cancelPolicies.removeAt(index);
      })
      .catch((error: any) => {
        console.log(error);
        this.alertService.errorAlert(error.message);
      });
  }
}
