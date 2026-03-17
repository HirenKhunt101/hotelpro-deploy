import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CrudService } from '../../../core/services/crud.service';
import { APIConstant } from '../../../core/constants/APIConstant';
import { AlertService } from '../../../core/services/alert.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
})
export class ForgotPasswordComponent {
  forgotPasswordForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private crudService: CrudService,
    private alertService: AlertService,
    private router: Router
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  onSubmit() {
    if (this.forgotPasswordForm.valid) {
      // Handle password reset logic here (e.g., send reset email)
      this.crudService
        .post(APIConstant.FORGOT_PASSWORD, this.forgotPasswordForm.value)
        .then((response: any) => {
          console.log(response);
          this.alertService.successAlert(response.message);
          this.router.navigate(['/login']);
        })
        .catch((error) => {
          console.error('There was an error!', error);
          this.alertService.errorAlert(error?.error?.message);
        });
      // Redirect to a confirmation page or display a success message
    } else {
      // Mark all fields as touched to display validation errors
      this.forgotPasswordForm.markAllAsTouched();
    }
  }
}
