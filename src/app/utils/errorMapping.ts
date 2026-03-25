export const mapAuthErrorToKey = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/invalid-email':
    case 'auth/invalid-login-credentials':
      return 'error.invalidEmail';
    case 'auth/user-not-found':
      return 'error.userNotFound';
    case 'auth/wrong-password':
      return 'error.wrongPassword';
    case 'auth/email-already-in-use':
      return 'error.emailInUse';
    case 'auth/weak-password':
      return 'error.weakPassword';
    case 'auth/network-request-failed':
      return 'error.network';
    default:
      return 'error.generic';
  }
};
