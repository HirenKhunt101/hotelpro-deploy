import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
// import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NotificationSharedService {
  private notifications = new BehaviorSubject<any[]>([]);
  currentNotifications$ = this.notifications.asObservable();

  // private socket: Socket;

  constructor() {
    // this.socket = io('http://localhost:3001');
    // // Add error handling for socket
    // this.socket.on('connect_error', (err) => {
    //   console.error('Socket connection error:', err);
    // });
    // this.socket.on('disconnect', (reason) => {
    //   console.warn('Socket disconnected:', reason);
    // });
  }

  // joinToRoom(userId: any) {
  //   if (userId) {
  //     this.socket.emit('joinUserRoom', userId);
  //   }
  // }

  sendNewNotifications(data: any) {
    this.notifications.next(data);
  }

  clearAllNotifications() {
    this.notifications.next([]);
  }

  // emit(event: string, data: any) {
  //   this.socket.emit(event, data);
  // }

  // on(event: string): Observable<any> {
  //   return new Observable((observer) => {
  //     this.socket.on(event, (data) => {
  //       observer.next(data);
  //     });

  //     // Handle cleanup
  //     return () => {
  //       this.socket.off(event);
  //     };
  //   });
  // }
}
