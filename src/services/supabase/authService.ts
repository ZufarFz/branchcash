import { authLoginService } from './authLoginService';
import { authUserAdminService } from './authUserAdminService';

export const authService = {
  // Login & Session
  signInWithPassword: authLoginService.signInWithPassword.bind(authLoginService),
  signOut: authLoginService.signOut.bind(authLoginService),
  getCurrentAuthUser: authLoginService.getCurrentAuthUser.bind(authLoginService),

  // Registration & User Administration
  signUpWithProfile: authUserAdminService.signUpWithProfile.bind(authUserAdminService),
  fetchUsersList: authUserAdminService.fetchUsersList.bind(authUserAdminService),
  fetchUsers: authUserAdminService.fetchUsers.bind(authUserAdminService),
  updateUserStatus: authUserAdminService.updateUserStatus.bind(authUserAdminService),
};

export { authLoginService, authUserAdminService };
