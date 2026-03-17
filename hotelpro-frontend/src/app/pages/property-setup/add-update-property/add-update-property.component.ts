import { Component, OnInit, ViewChild } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { APIConstant } from '../../../core/constants/APIConstant';
import { AuthService } from '../../../core/services/auth.service';
import { CrudService } from '../../../core/services/crud.service';
import { CustomValidators } from '../../../core/shared/validators/custom-validators';
import {
  NgxFileDropEntry,
  FileSystemFileEntry,
  FileSystemDirectoryEntry,
  NgxFileDropModule,
} from 'ngx-file-drop';
import { AlertService } from '../../../core/services/alert.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FileUploadComponent } from '../../../core/reused/file-upload/file-upload.component';
import { CommonModule } from '@angular/common';
import { PropertySidebarComponent } from '../property-sidebar/property-sidebar.component';

@Component({
  selector: 'app-add-update-property',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    NgxFileDropModule,
    FileUploadComponent,
    PropertySidebarComponent,
  ],
  templateUrl: './add-update-property.component.html',
  styleUrls: ['./add-update-property.component.css'],
})
export class AddUpdatePropertyComponent implements OnInit {
  userInfo: any;
  propertyUnitForm!: FormGroup;
  PropertyTypes: any[] = ['Villa', 'Hotel', 'Resort'];
  propertyUnitId: string | null = 'ADD';

  @ViewChild(FileUploadComponent) fileUploadComponent!: FileUploadComponent;

  constructor(
    private authService: AuthService,
    private crudService: CrudService,
    private fb: FormBuilder,
    private alertService: AlertService,
    private router: Router,
    private activeRoute: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.userInfo = this.authService.getUserInfo()?.user;
    this.propertyUnitId =
      this.activeRoute.snapshot.paramMap.get('propertyUnitId');

    this.propertyUnitForm = this.fb.group({
      propertyUnitName: [
        '',
        [Validators.required, CustomValidators.noLeadingSpace],
      ],
      propertyUnitLegalName: ['', [Validators.required]],
      propertyUnitType: ['Hotel', [Validators.required]],
      description: [''],
      website: [''],
      propertyAddress: this.fb.group({
        addressLine1: ['', [Validators.required]],
        addressLine2: [''],
        city: ['', [Validators.required, CustomValidators.noLeadingSpace]],
        state: [
          '',
          [
            Validators.required,
            Validators.pattern(/^[A-Za-z\s]+$/),
            CustomValidators.noLeadingSpace,
          ],
        ],
        country: ['', [Validators.required]],
        zipCode: ['', [Validators.required, CustomValidators.zipCodeValidator]],
      }),
      managerDetails: this.fb.group({
        firstName: ['', [Validators.required, CustomValidators.noLeadingSpace]],
        lastName: ['', [Validators.required, CustomValidators.noLeadingSpace]],
        phone: ['', [Validators.required, Validators.minLength(10)]],
        email: ['', [Validators.required, Validators.email]],
      }),
    });
    if (this.propertyUnitId != 'ADD') {
      this.crudService
        .post(APIConstant.READ_PROPERTY_UNIT + this.propertyUnitId, {})
        .then((response: any) => {
          console.log(response);
          this.propertyUnitForm.reset(response.data);
        })
        .catch((error) => {
          this.alertService.errorAlert(error.message);
        });
    }
  }

  onSubmit(): void {
    if (this.propertyUnitForm.valid) {
      console.log(this.propertyUnitForm.value);
      const obj = this.propertyUnitForm.value;
      obj.propertyId = this.userInfo.propertyId;
      if (this.propertyUnitId == 'ADD') {
        this.crudService
          .post(APIConstant.CREATE_PROPERTY_UNIT, obj)
          .then((response: any) => {
            console.log(response);
            this.alertService.successAlert(response.message);
            this.propertyUnitId = response?.data?._id;
            this.router.navigate(['/property-setup', this.propertyUnitId]);
          })
          .catch((error) => {
            this.alertService.errorAlert(error?.error?.message);
          });
      } else {
        this.crudService
          .post(APIConstant.UPDATE_PROPERTY_UNIT + this.propertyUnitId, obj)
          .then((response: any) => {
            console.log(response);
            this.alertService.successAlert(response.message);
          })
          .catch((error) => {
            this.alertService.errorAlert(error.message);
          });
      }
    } else {
      this.propertyUnitForm.markAllAsTouched(); // Mark all controls as touched to display validation errors
    }
  }

  navigateToRoomSetup() {
    this.router.navigate(['/rooms-review/' + this.propertyUnitId]);
  }

  getfile(files: File[]) {
    if (files.length > 0) {
      const formData = new FormData();
      files.forEach((file) => formData.append('file', file, file.name));
      this.crudService
        .post(APIConstant.UPLOAD_ROOMS_PHOTOS, formData, {
          skipLoader: true,
        })
        .then((response: any) => {
          this.fileUploadComponent.clearFiles();
          this.alertService.successAlert(response.message);
        })
        .catch((error) => {
          this.alertService.errorAlert(error.message);
        });
    }
  }
}
