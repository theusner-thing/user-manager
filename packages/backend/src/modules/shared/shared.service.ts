import { Injectable } from "@nestjs/common";
import { createHash } from "crypto";

@Injectable()
export class SharedService {

  private randomPassword(length = 12): string {
    const char =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_-+=";
    let password = "";
    for (let i = 0; i < length; i++) {
      const ind = Math.floor(Math.random() * char.length);
      password += char[ind];
    }
    return password;
  }

  generateSalt(): string {
    return Date.now().toString();
  }

  createTemporaryPassword() {
    const password = this.randomPassword();
    return {
      password,
      hash:this.createPasswordHash(password),
    }
  }

  createPasswordHash(password: string): string {
    const salt = this.generateSalt();
    const hash = this.hashPassword(password, salt);
    // store as salt:hash so we can verify and recover the salt later
    return `${salt}:${hash}`;
  }

  hashPassword(password: string, salt: string): string {
    return createHash('sha256').update(password + salt).digest('hex');
  }

}