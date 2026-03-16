// src/common/interceptors/transform.interceptor.ts
import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { map }        from 'rxjs/operators'

// Formato estándar de todas las respuestas exitosas
export interface ApiResponse<T> {
  success:   true
  data:      T
  timestamp: string
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>> {

  intercept(
    _ctx:  ExecutionContext,
    next:  CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map(data => ({
        success:   true,
        data,
        timestamp: new Date().toISOString(),
      })),
    )
  }
}