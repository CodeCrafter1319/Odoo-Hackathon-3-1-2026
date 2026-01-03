export interface Project {
  Id: number;
  ProjectName: string;
  ProjectCode: string;
  Description?: string;
  ClientName?: string;
  ProjectType: 'INTERNAL' | 'CLIENT' | 'RND';
  Status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

  StartDate: string;
  EndDate?: string;
  EstimatedEndDate?: string;
  ActualEndDate?: string;

  Technologies?: string[];
  ProjectStack?: string;
  Domain?: string;

  ManagerId?: number;
  ManagerName?: string;
  ManagerEmail?: string;
  TotalResources: number;

  EstimatedBudget?: number;
  ActualCost?: number;
  Currency?: string;

  Priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ProjectLocation?: string;
  DocumentationUrl?: string;
  RepositoryUrl?: string;

  CreatedBy: number;
  CreatedByName?: string;
  CreatedAt: string;
  UpdatedAt: string;
  IsActive: boolean;

  // Additional fields when fetching details
  resources?: ProjectResource[];
  AssignedResourcesCount?: number;

  MyRole?: string;
  AllocationPercentage?: number;
  AssignedDate?: string;
  MyStartDate?: string;
  MyEndDate?: string;
}

export interface ProjectResource {
  Id: number;
  ProjectId: number;
  UserId: number;
  ResourceName: string;
  ResourceEmail: string;
  ResourceRole: string;
  ResourcePhone?: string;

  Role?: string; // Project role like "Frontend Developer"
  AllocationPercentage: number;
  AssignedDate: string;
  StartDate?: string;
  EndDate?: string;
  IsActive: boolean;

  AssignedBy: number;
  AssignedByName?: string;
  Notes?: string;
}

export interface CreateProjectDto {
  projectName: string;
  projectCode: string;
  description?: string;
  clientName?: string;
  projectType?: string;
  status?: string;
  startDate: string;
  endDate?: string;
  estimatedEndDate?: string;
  technologies?: string[];
  projectStack?: string;
  domain?: string;
  managerId?: number;
  priority?: string;
  projectLocation?: string;
  documentationUrl?: string;
  repositoryUrl?: string;
  estimatedBudget?: number;
  currency?: string;
}

export interface AssignResourceDto {
  userId: number;
  role?: string;
  allocationPercentage?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface ProjectStatistics {
  TotalProjects: number;
  ActiveProjects: number;
  PlanningProjects?: number;
  CompletedProjects?: number;
  TotalResourcesAssigned?: number;
}

export interface ProjectActivity {
  Id: number;
  ProjectId: number;
  UserId: number;
  UserName: string;
  UserRole: string;
  ActivityType: string;
  Description: string;
  OldValue?: string;
  NewValue?: string;
  CreatedAt: string;
}
export interface AvailableResource {
  Id: number;
  Name: string;
  Email: string;
  Role: string;
  Phone?: string;
  CurrentProjectsCount: number;
}
