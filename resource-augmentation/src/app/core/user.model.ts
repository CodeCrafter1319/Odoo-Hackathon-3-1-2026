export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  roleName: string;
  isEmailVerified: boolean;
  isActive: boolean;
  profile: UserProfile;
}

export interface UserProfile {
  phone?: string;
  dateOfBirth?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  linkedInProfile?: string;
  gitHubProfile?: string;
  portfolioWebsite?: string;
}

export interface Company {
  id: number;
  name: string;
  type: CompanyType;
}

export enum Role {
  ADMIN = 'ADMIN',
  COMPANY = 'COMPANY',
  RESOURCE = 'RESOURCE',
  MANAGER = 'MANAGER',
}

export enum CompanyType {
  ADMIN_COMPANY = 'ADMIN_COMPANY',
  CLIENT_COMPANY = 'CLIENT_COMPANY',
  RESOURCE_PROVIDER = 'RESOURCE_PROVIDER',
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  managerId?: number;
}

export interface EmailVerificationResponse {
  success: boolean;
  message: string;
  data: {
    userId: number;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    nextStep: string;
  };
}

export interface SetPasswordRequest {
  userId: number;
  password: string;
}

export interface PersonalDetailsRequest {
  phone?: string;
  dateOfBirth?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  linkedInProfile?: string;
  gitHubProfile?: string;
  portfolioWebsite?: string;
}

export interface EducationRequest {
  Id?: number;
  degree: string;
  fieldOfStudy: string;
  institution: string;
  startDate: string | null;
  endDate?: string | null;
  grade?: string;
  description?: string;
}

export interface EmploymentRequest {
  Id?: number;
  jobTitle: string;
  companyName: string;
  location?: string;
  startDate: string;
  endDate?: string | null;
  description?: string;
  skills?: string[];
  isCurrentJob?: boolean;
}

export interface ProfileStatusResponse {
  success: boolean;
  data: {
    userId: number;
    isEmailVerified: boolean;
    hasPassword: boolean;
    profileCompletion: {
      personalDetails: boolean;
      education: boolean;
      employment: boolean;
    };
    nextStep: string;
  };
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface PersonalDetailsResponse {
  success: boolean;
  message: string;
  data: PersonalDetailsRequest | null;
}

export interface EducationDetailsResponse {
  success: boolean;
  message: string;
  data: EducationRequest | null;
}

export interface EmploymentDetailsResponse {
  success: boolean;
  message: string;
  data: EmploymentRequest | null;
}

export interface UserProfileComplete extends UserProfile {
  id?: number;
  userId?: number;
  createdAt?: string;
  avatarUrl?: string;
  topSkill?: string;
  education?: Array<{
    degree?: string;
    institution?: string;
    startYear?: number;
    endYear?: number;
  }>;
  updatedAt?: string | Date;
}

export interface EducationInfo extends EducationRequest {
  id?: number;
  userId?: number;
  createdAt?: string;
}

export interface EmploymentInfo extends EmploymentRequest {
  id?: number;
  userId?: number;
  createdAt?: string;
}
