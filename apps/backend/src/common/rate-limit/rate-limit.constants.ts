export const AUTH_RATE_LIMIT_STORE = Symbol('AUTH_RATE_LIMIT_STORE');

export const AUTH_RATE_LIMIT_POLICY = Symbol('AUTH_RATE_LIMIT_POLICY');

export const UPLOAD_RATE_LIMIT_POLICY = Symbol('UPLOAD_RATE_LIMIT_POLICY');

export const THROTTLE_POLICY = Symbol('THROTTLE_POLICY');

export const SKIP_THROTTLE = Symbol('SKIP_THROTTLE');

export type AuthRateLimitPolicyName =
  | 'register'
  | 'login'
  | 'forgotPassword'
  | 'resetPassword'
  | 'changePassword'
  | 'refresh'
  | 'logout';

export type UploadRateLimitPolicyName =
  'uploadAvatar' | 'uploadPresignedUrl' | 'uploadBatchPresignedUrl' | 'uploadConfirm';

export type ThrottlePolicyName =
  | 'questionsSearch'
  | 'questionsMutate'
  | 'questionGroupsMutate'
  | 'adminUsers'
  | 'catalogRead'
  | 'profileManage'
  | 'mediaManage'
  | UploadRateLimitPolicyName;
