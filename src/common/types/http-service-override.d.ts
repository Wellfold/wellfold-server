import '@nestjs/axios';
import { Observable } from 'rxjs';

// eslint-disable-next-line
declare module '@nestjs/axios' {
  interface HttpService {
    get<T = any>(...args: any[]): Observable<T>;
    post<T = any>(...args: any[]): Observable<T>;
    put<T = any>(...args: any[]): Observable<T>;
    patch<T = any>(...args: any[]): Observable<T>;
    delete<T = any>(...args: any[]): Observable<T>;
  }
}
