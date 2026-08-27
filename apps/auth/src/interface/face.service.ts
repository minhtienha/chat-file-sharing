import { RegisterAuthDto, User } from '@sharing/models';
import { Observable } from 'rxjs';

export interface UsersService {
  CreateUser(data: RegisterAuthDto): Observable<User>;
}
