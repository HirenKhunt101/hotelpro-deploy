import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { MasterService } from './master.service';

@Injectable({
  providedIn: 'root',
})
export class CrudService {
  constructor(private masterService: MasterService) {}

  async get(endpoint: string, params?: any): Promise<any> {
    return lastValueFrom(
      this.masterService.Get(`${environment.apiUrl}` + endpoint, params)
    );
  }

  async post(endpoint: string, body?: any, params?: any): Promise<any> {
    return lastValueFrom(
      this.masterService.Post(`${environment.apiUrl}` + endpoint, body, params)
    );
  }

  async put(endpoint: string, body: any): Promise<any> {
    return lastValueFrom(
      this.masterService.Put(`${environment.apiUrl}` + endpoint, body)
    );
  }

  async delete(endpoint: string, body?: any, params?: any): Promise<any> {
    return lastValueFrom(
      this.masterService.Delete(
        `${environment.apiUrl}` + endpoint,
        body,
        params
      )
    );
  }
}
