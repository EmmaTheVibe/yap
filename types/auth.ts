export type UserProfile = {
  id: string;
  username: string;
  display_name: string;
  public_key: string;
  wrapped_private_key: string;
  pbkdf2_salt: string;
  created_at: string;
};

export type UserPublicInfo = {
  id: string;
  username: string;
  display_name: string;
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
};

export type AuthRefreshResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type Session = {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
  privateKey: CryptoKey;
};
