import { Component, OnInit } from '@angular/core';
import {
  FormGroup,
  FormArray,
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AlertService } from '../../../core/services/alert.service';
import { CrudService } from '../../../core/services/crud.service';
import { APIConstant } from '../../../core/constants/APIConstant';
import { CommonModule } from '@angular/common';
import { CustomValidators } from '../../../core/shared/validators/custom-validators';
import { AuthService } from '../../../core/services/auth.service';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';

@Component({
  selector: 'app-manage-user',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgMultiSelectDropDownModule,
  ],
  templateUrl: './manage-user.component.html',
  styleUrl: './manage-user.component.css',
})
export class ManageUserComponent implements OnInit {
  propertyUnitId: string | null = '';
  userForm!: FormGroup;
  userData: any[] = [];
  selectedUserIndex = 0;
  createUserForm!: FormGroup;
  clientInfo: any;
  selectedItems = [];
  dropdownSettings = {};
  constructor(
    private crudService: CrudService,
    private fb: FormBuilder,
    private alertService: AlertService,
    private activeRoute: ActivatedRoute,
    private router: Router,
    private modalService: NgbModal,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.propertyUnitId =
      this.activeRoute.snapshot.paramMap.get('propertyUnitId');
    this.clientInfo = this.authService.getUserInfo()?.user;
    this.initForms();
    this.fetchData();
  }

  private initForms(): void {
    this.userForm = this.fb.group({
      firstName: [
        '',
        [
          Validators.required,
          CustomValidators.noLeadingSpace,
          Validators.minLength(2),
        ],
      ],
      lastName: [
        '',
        [
          Validators.required,
          CustomValidators.noLeadingSpace,
          Validators.minLength(2),
        ],
      ],
      phone: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      active: [true, [Validators.required]],
      userType: ['frontdesk', [Validators.required]],
      propertyUnits: [],
    });

    this.createUserForm = this.fb.group({
      propertyUnitId: [this.propertyUnitId],
      firstName: [
        '',
        [Validators.required, Validators.pattern("^[a-zA-Z.'\\s]*$")],
      ],
      lastName: [
        '',
        [Validators.required, Validators.pattern("^[a-zA-Z.'\\s]*$")],
      ],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      userType: ['frontdesk', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(4)]],
      propertyUnits: [],
    });
  }

  fetchData() {
    this.crudService
      .post(APIConstant.READ_USER_BY_PROPERTY_UNIT, {
        propertyUnitId: this.propertyUnitId,
      })
      .then((response) => {
        this.userData = response.data.users;
        if (this.userData?.length > 0) {
          this.selectUser(this.userData[0], 0);
        }
      })
      .catch((error) => {
        this.alertService.errorAlert(
          error?.error?.message || 'An error occurred while fetching users'
        );
        console.error(error);
      });
  }

  selectUser(user: any, index: number): void {
    this.selectedUserIndex = index; // Track the selected row index
    let propertyUnits = [];
    if (user.userType == 'manager' && user?.accessPropertyUnitIds) {
      propertyUnits = this.clientInfo.propertyUnits.filter((p: any) => {
        return user.accessPropertyUnitIds.includes(p._id);
      });
    }
    this.userForm.patchValue({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email,
      active: user.isLoginable,
      userType: user.userType,
      propertyUnits: propertyUnits,
    });
  }

  updateUser(): void {
    if (this.userForm.valid) {
      const updatedUser = {
        ...this.userForm.value,
        userId: this.userData[this.selectedUserIndex]._id,
      };
      this.crudService
        .post(APIConstant.UPDATE_USER, updatedUser)
        .then(() => {
          this.alertService.successAlert('User updated successfully');
          this.ngOnInit();
        })
        .catch((error) => {
          this.alertService.errorAlert(
            error?.error?.message || 'An error occurred while updating the user'
          );
          console.error(error);
        });
    }
  }

  addUser(): void {
    if (this.createUserForm.valid) {
      const addUser = {
        ...this.createUserForm.value,
      };
      this.crudService
        .post(APIConstant.CREATE_USER, addUser)
        .then(() => {
          this.alertService.successAlert('User created successfully');
          this.ngOnInit();
        })
        .catch((error) => {
          this.alertService.errorAlert(
            error?.error?.message || 'An error occurred while create the user'
          );
        })
        .finally(() => {
          this.modalService.dismissAll();
        });
    }
  }

  openModalAddUser(content: any) {
    this.modalService.open(content, { centered: true });
  }
}
