export class User {
  avatar: any;
  email: string;
  isEmailVerified?: boolean;
  loginType?: string;
  role: 'ADMIN' | 'USER';
  createdAt?: Date;
  updatedAt?: Date;
  username?: string;
  __v?: number;
  _id?: string;

  constructor() {
    this.email = '';
    this.role = 'USER';
    this.username = '';
  }
}
export class Money {}
