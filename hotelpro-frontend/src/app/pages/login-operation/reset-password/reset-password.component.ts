import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CrudService } from '../../../core/services/crud.service';
import { APIConstant } from '../../../core/constants/APIConstant';
import { FormsModule } from '@angular/forms';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css',
})
export class ResetPasswordComponent implements OnInit {
  token: string = '';
  newPassword: string = '';
  constructor(
    private activeRoute: ActivatedRoute,
    private router: Router,
    private crudService: CrudService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    const resettoken = this.activeRoute.snapshot.paramMap.get('resettoken');
    console.log(resettoken);
    if (resettoken) {
      this.token = resettoken;
    } else {
      console.log('error');
    }
  }

  passwordValidator() {
    const value = this.newPassword;
    if (!value) {
      return null;
    }
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecialCharacter = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    const passwordValid =
      hasUpperCase && hasLowerCase && hasNumeric && hasSpecialCharacter;

    return !passwordValid ? { passwordStrength: true } : null;
  }
  resetPasswordClick() {
    this.crudService
      .post(APIConstant.RESET_PASSWORD + this.token, {
        newPassword: this.newPassword,
      })
      .then((response: any) => {
        console.log(response);
        this.alertService.successAlert(response.message);
        this.router.navigate(['/login']);
      })
      .catch((error) => {
        console.error('There was an error!', error);
        this.alertService.errorAlert(error.message);
      });
  }
}
