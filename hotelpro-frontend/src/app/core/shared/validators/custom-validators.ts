import { AbstractControl, ValidationErrors } from '@angular/forms';

export class CustomValidators {
  static noLeadingSpace(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string;
    if (value && value.startsWith(' ')) {
      return { noLeadingSpace: true };
    }
    return null;
  }

  static passwordValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
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

  static zipCodeValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string;
    const zipCodePattern = /^\d{6,8}$/;
    return zipCodePattern.test(value) ? null : { zipCode: true };
  }
}
