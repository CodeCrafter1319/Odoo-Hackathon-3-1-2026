import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Role } from '../core/user.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http:HttpClient) { }

  getRoles():Observable<Role[]>{
    return this.http.get<Role[]>(`${this.API_URL}/roles`);
  }
  getRolesByType(role:string):Observable<Role[]>{
    return this.http.get<Role[]>(`${this.API_URL}/roles?role=${role}`);
  }
}
