import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { timingSafeEqual } from 'crypto';
import { UsersService } from '../users/users.service';
import { SharedService } from "../shared/shared.service";

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService, private sharedService: SharedService, private jwtService: JwtService) {}

  private verifyPassword(password: string, hash: string, salt: string): boolean {
    try {
      const passwordHash = this.sharedService.hashPassword(password, salt || '');
      const a = Buffer.from(passwordHash, 'hex');
      const b = Buffer.from(hash || '', 'hex');
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch (e) {
      // any parsing/encoding error -> treat as verification failure
      return false;
    }
  }

  async validateUser(email: string, pass: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;

    // Extract salt from stored hash (expected format: salt:hash)
    const raw = String(user.password || '');
    const parts = raw.split(':');
    let salt = '';
    let hash = '';
    if (parts.length === 2) {
      salt = parts[0];
      hash = parts[1];
    } else if (parts.length === 1) {
      // legacy or unexpected format: treat the whole value as hash
      salt = '';
      hash = parts[0];
    } else if (parts.length > 2) {
      // join any trailing parts into the hash portion
      salt = parts[0];
      hash = parts.slice(1).join(':');
    }

    const ok = this.verifyPassword(String(pass || ''), hash, salt);

    if (ok) {
      // omit password
      const { password, ...rest } = user;
      return rest;
    }
    return null;
  }

  async login(user: any) {
    const accessTokenTtl = process.env.ACCESS_TOKEN_TTL || '15m';
    const refreshTokenTtl = process.env.REFRESH_TOKEN_TTL || '7d';

    const nowMs = Date.now();

    // We need the actual signed tokens, so sign once properly
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, type: 'access' },
      { expiresIn: accessTokenTtl }
    );
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: refreshTokenTtl }
    );

    // Compute access token expiration timestamp (ms) from current time + parsed ttl when possible
    // Prefer decoding exp from the token for accuracy
    const decodedAccess: any = this.jwtService.decode(accessToken);
    const decodedRefresh: any = this.jwtService.decode(refreshToken);
    const accessExpiresAt = decodedAccess && decodedAccess.exp ? decodedAccess.exp * 1000 : nowMs;
    const refreshExpiresAt = decodedRefresh && decodedRefresh.exp ? decodedRefresh.exp * 1000 : nowMs;

    return {
      access_token: accessToken,
      expiresAt: accessExpiresAt,
      refresh_token: refreshToken,
      refreshExpiresAt,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload: any = this.jwtService.verify(refreshToken);
      if (payload.type !== 'refresh') {
        return null;
      }
      const user = await this.usersService.findById(payload.sub);
      if (!user) return null;
      return this.login(user);
    } catch (e) {
      return null;
    }
  }
}
