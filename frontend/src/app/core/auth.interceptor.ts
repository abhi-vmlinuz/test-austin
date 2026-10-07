import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const t = localStorage.getItem('c2e_token');
  if (t && req.url.startsWith('http')) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${t}` } });
  }
  return next(req);
};
