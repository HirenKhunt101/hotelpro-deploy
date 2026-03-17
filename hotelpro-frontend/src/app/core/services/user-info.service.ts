import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import { environment } from '../../../environments/environment.development';
import { BehaviorSubject } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class UserInfoService {
  private readonly storageKey = environment.storageKey;
  private readonly encryptionKey = environment.crypto_encryption_Key; // Use a secure key management approach

  private navBarUpdate = new BehaviorSubject<any>(null);
  navBarUpdate$ = this.navBarUpdate.asObservable();

  sendNavUpdate(data: any) {
    this.navBarUpdate.next(data);
  }

  setUserInfo(data: any, isUpdate?: boolean): void {
    try {
      const encryptedData = CryptoJS.AES.encrypt(
        JSON.stringify(data),
        this.encryptionKey
      ).toString();
      localStorage.setItem(this.storageKey, encryptedData);
      if (isUpdate) this.sendNavUpdate(true);
    } catch (e) {
      console.error('Error encrypting user info:', e);
    }
  }

  getUserInfo(): any {
    const encryptedData = localStorage.getItem(this.storageKey);
    if (!encryptedData) {
      return null;
    }

    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedData);
    } catch (e) {
      console.error('Error decrypting user info:', e);
      return null;
    }
  }

  clearUserInfo(): void {
    localStorage.removeItem(this.storageKey);
  }

  updateUserInfo(updates: Partial<any>): void {
    const currentInfo = this.getUserInfo();
    if (currentInfo) {
      const updatedInfo = { ...currentInfo, ...updates };
      this.setUserInfo(updatedInfo, true);
    }
  }
}
