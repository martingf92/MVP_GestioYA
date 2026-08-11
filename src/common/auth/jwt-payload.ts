export interface JwtPayload {
  sub: string;
  empresaId: string;
  roles: string[];
}

export interface RequestUser {
  userId: string;
  empresaId: string;
  roles: string[];
}
