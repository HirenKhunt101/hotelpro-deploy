import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DataTableComponent } from '../../core/reused/data-table/data-table.component';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, DataTableComponent, RouterModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent implements OnInit {
  loginInForm = new FormGroup({
    email: new FormControl<string>('khunt1@gmail.com', [Validators.required]),
    password: new FormControl<string>('hiii', [Validators.required]),
  });
  sendTableData = [
    {
      name: 'john',
      Date: '22/03/1999',
      car: 'buggati',
    },
    {
      name: 'Kin',
      Date: '20/03/1919',
      car: 'bmw',
    },
    {
      name: 'Ranny',
      Date: '11/03/1999',
      car: 'german',
    },
  ];
  headerTableData: any[] = [];
  showActionBtn: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  async logIn() {
    if (this.loginInForm.valid) {
      try {
        await this.authService.login(this.loginInForm.value);
        console.log('Login successful');
      } catch (error) {
        console.error('Login failed', error);
      }
    }
  }

  ngOnInit(): void {
    const dkey = Object.keys(this.sendTableData[0]);
    for (const name of dkey) {
      this.headerTableData.push({ header: name });
    }
  }

  getDeleteItem(item: any) {
    console.log(item);
  }
  getEditItem(item: any) {
    console.log(item);
  }

  AddDataRecord() {
    this.sendTableData = [
      ...this.sendTableData,
      { car: 'Swift', name: 'Doe', Date: '22/12/1999' },
    ]; // Spread operator to create a new array reference
  }
  showAction() {
    this.showActionBtn = !this.showActionBtn;
  }
}
