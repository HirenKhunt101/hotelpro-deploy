import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';

@Injectable({
  providedIn: 'root',
})
export class ReservationSharedService {
  private formData = new BehaviorSubject<any>(null);
  currentFormData = this.formData.asObservable();

  setFormData(data: any) {
    this.formData.next(data);
  }

  clearFormData() {
    this.formData.next(null);
  }
}
