export enum Role {
  CITIZEN = 'CITIZEN',
  OFFICER = 'OFFICER',
  DEPARTMENT_HEAD = 'DEPARTMENT_HEAD',
  COMMISSIONER = 'COMMISSIONER',
  ADMIN = 'ADMIN',
}

export const PERMISSION_MATRIX: Record<string, Role[]> = {
  'GET /auth/me': [Role.CITIZEN, Role.OFFICER, Role.DEPARTMENT_HEAD, Role.COMMISSIONER, Role.ADMIN],
  'POST /complaints': [Role.CITIZEN],
  'POST /complaints/image': [Role.CITIZEN],
  'POST /complaints/audio': [Role.CITIZEN],
  'POST /complaints/voice': [Role.CITIZEN],
  'POST /complaints/video': [Role.CITIZEN],
  'GET /complaints/mine': [Role.CITIZEN],
  'POST /complaints/:id/appeal': [Role.CITIZEN],
  'POST /complaints/:id/feedback': [Role.CITIZEN],

  'PATCH /complaints/:id/status': [Role.OFFICER],
  'GET /dashboard/officer': [Role.OFFICER],

  'PATCH /complaints/:id/assign': [Role.DEPARTMENT_HEAD, Role.ADMIN],
  'GET /dashboard/department': [Role.DEPARTMENT_HEAD, Role.COMMISSIONER, Role.ADMIN],
  
  'GET /dashboard/executive': [Role.COMMISSIONER, Role.ADMIN],
  'GET /analytics/by-category': [Role.DEPARTMENT_HEAD, Role.COMMISSIONER, Role.ADMIN],
  'GET /analytics/by-ward': [Role.DEPARTMENT_HEAD, Role.COMMISSIONER, Role.ADMIN],
  'GET /analytics/department-performance': [Role.DEPARTMENT_HEAD, Role.COMMISSIONER, Role.ADMIN],
  'GET /analytics/satisfaction': [Role.DEPARTMENT_HEAD, Role.COMMISSIONER, Role.ADMIN],

  'GET /dashboard/admin': [Role.ADMIN],
  'GET /admin/users': [Role.ADMIN],
  'GET /admin/review-queue': [Role.ADMIN],
  'PATCH /admin/sla-rules/:category': [Role.ADMIN],
  'PATCH /appeals/:id/resolve': [Role.ADMIN],

  'GET /gis/complaints': [Role.CITIZEN, Role.OFFICER, Role.DEPARTMENT_HEAD, Role.COMMISSIONER, Role.ADMIN],
  'GET /gis/wards': [Role.CITIZEN, Role.OFFICER, Role.DEPARTMENT_HEAD, Role.COMMISSIONER, Role.ADMIN],
  'GET /gis/heatmap': [Role.CITIZEN, Role.OFFICER, Role.DEPARTMENT_HEAD, Role.COMMISSIONER, Role.ADMIN],
  'GET /complaints/:id': [Role.CITIZEN, Role.OFFICER, Role.DEPARTMENT_HEAD, Role.COMMISSIONER, Role.ADMIN],
};
