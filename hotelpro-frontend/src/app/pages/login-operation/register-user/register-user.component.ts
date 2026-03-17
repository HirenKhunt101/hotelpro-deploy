import { Component } from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  FormControlOptions,
} from '@angular/forms';
import { CrudService } from '../../../core/services/crud.service';
import { APIConstant } from '../../../core/constants/APIConstant';
import { CommonModule } from '@angular/common';
import { AlertService } from '../../../core/services/alert.service';
import { Router, RouterModule } from '@angular/router';
import { CustomValidators } from '../../../core/shared/validators/custom-validators';

@Component({
  selector: 'app-register-user',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './register-user.component.html',
  styleUrls: ['./register-user.component.css'],
})
export class RegisterUserComponent {
  userForm = this.formBuilder.group(
    {
      primaryPropertyName: [
        '',
        [
          Validators.required,
          CustomValidators.noLeadingSpace,
          Validators.minLength(3),
        ],
      ],
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
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      address: this.formBuilder.group({
        addressLine1: [''],
        city: ['', [Validators.required, CustomValidators.noLeadingSpace]],
        state: [
          '',
          [
            Validators.required,
            Validators.pattern(/^[A-Za-z\s]+$/),
            CustomValidators.noLeadingSpace,
          ],
        ],
        zipCode: ['', [Validators.required, CustomValidators.zipCodeValidator]],
      }),
      password: ['', [Validators.required, CustomValidators.passwordValidator]],
      confirmpassword: ['', Validators.required],
    },
    { validator: this.passwordMatchValidator } as FormControlOptions
  );

  constructor(
    private formBuilder: FormBuilder,
    private crudService: CrudService,
    private alertService: AlertService,
    private router: Router
  ) {}

  onSubmit() {
    if (this.userForm.valid) {
      const obj = this.userForm.value;
      this.crudService
        .post(APIConstant.CREATE_PROPERTY, obj)
        .then((response: any) => {
          this.alertService.successAlert(response.message);
          this.router.navigate(['/login']);
        })
        .catch((error) => {
          this.alertService.errorAlert(error?.error?.message || error.message);
        });
    } else {
      this.alertService.errorAlert(
        'Please fill all required fields correctly.'
      );
    }
  }

  passwordMatchValidator(form: AbstractControl): ValidationErrors | null {
    return form.get('password')?.value === form.get('confirmpassword')?.value
      ? null
      : { mismatch: true };
  }
}
