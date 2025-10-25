import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { SharedService } from "../shared/shared.service";
import Papa from "papaparse";

export interface PaginationResult<T> {
  items: T[];
  total: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    private sharedService: SharedService,
  ) {}

  async findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  async deleteById(id: string) {
    // remove the user by id
    const res = await this.repo.delete(id);
    // TypeORM DeleteResult has affected property in some drivers; normalize response
    if (res && (res as any).affected !== undefined) {
      return { deleted: (res as any).affected > 0 };
    }
    // fallback
    return { deleted: true };
  }

  async findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  async search(page = 1, limit = 10, q?: string, order?: string): Promise<PaginationResult<User>> {
    const qb = this.repo.createQueryBuilder('u');
    if (q) {
      // search by email, firstname or lastname (case-insensitive)
      qb.where('u.email ILIKE :q OR u.firstname ILIKE :q OR u.lastname ILIKE :q', { q: `%${q}%` });
    }
    // handle optional order param in the form 'field:ASC' or 'field:DESC'
    // whitelist allowed fields to avoid SQL injection
    const fieldMap: Record<string, string> = {
      firstName: 'u.firstname',
      lastName: 'u.lastname',
      email: 'u.email',
      role: 'u.role',
      createdAt: 'u.created_at',
    };

    if (order) {
      const [fieldRaw, dirRaw] = order.split(':');
      const field = fieldMap[fieldRaw] || null;
      const dir = dirRaw && dirRaw.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      if (field) {
        qb.orderBy(field, dir as 'ASC' | 'DESC');
      } else {
        // fallback to email if unknown field
        qb.orderBy('u.email', 'ASC');
      }
    } else {
      // keep a stable ordering - email is fine by default
      qb.orderBy('u.email', 'ASC');
    }
    qb.skip((page - 1) * limit).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async update(id: string, patch: Partial<User>) {
    // if email is being changed, ensure it's not already taken by another user
    if (patch.email) {
      const existing = await this.findByEmail(patch.email);
      if (existing && existing.id !== id) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // If a password is provided, hash it before storing. If an empty string is provided
    // treat it as "no change" and do not overwrite the existing password.
    if ((patch as any).password !== undefined) {
      const p = (patch as any).password;
      if (typeof p === 'string' && p.length > 0) {
        // createPasswordHash returns salt:hash
        (patch as any).password = this.sharedService.createPasswordHash(p);
        (patch as any).isPasswordTemporary = false;
      } else {
        // remove password so we don't overwrite with empty value
        delete (patch as any).password;
      }
    }

    await this.repo.update(id, patch as any);
    return this.findById(id);
  }

  async create(user: Partial<User>) {
    // prevent creating a user with an email that already exists
    if (user.email) {
      const exists = await this.findByEmail(user.email);
      if (exists) {
        throw new ConflictException('User with this email already exists');
      }
    }
    // If no password is provided, create a temporary one
    if (!user.password) {
      const {hash, password} = this.sharedService.createTemporaryPassword();
      user.password = hash;
      user.isPasswordTemporary = true;
      // TODO implement sending email to user so that he can change the password during login
    } else {
      // Create password hash
      user.password = this.sharedService.createPasswordHash(user.password);
      user.isPasswordTemporary = false;
    }
    if (!user.role) {
      user.role = 'user';
    }
    const e = this.repo.create(user as any);
    return this.repo.save(e);
  }

  /**
   * Import users from a CSV file. CSV must contain a header row. Supported headers:
   * firstName, lastName, email
   * Note: role and password columns are ignored when importing.
   * If an email already exists the existing user will be updated (first/last name).
   * Returns a summary of imported rows and any row-level errors.
   */
  async import(file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.buffer) {
      throw new BadRequestException('Uploaded file must be provided in request body (buffer)');
    }

    const content = file.buffer.toString('utf8');
    // parse CSV using PapaParse to handle quoted fields and headers
    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });

  const rows: any[] = parsed.data || [];
  const results: { created: number; updated: number; errors: any[] } = { created: 0, updated: 0, errors: [] };

    // include any parse-level errors
    if (parsed.errors && parsed.errors.length) {
      parsed.errors.forEach((pe: any) => {
        results.errors.push({ line: pe.row ? pe.row + 1 : null, error: pe.message });
      });
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      const obj: any = {};

      // helper to get a column value case-insensitively
      const get = (name: string) => {
        const key = Object.keys(row).find(k => k && k.toLowerCase() === name.toLowerCase());
        return key ? (row as any)[key] : undefined;
      };

      obj.firstName = get('firstName') || get('firstname') || '';
      obj.lastName = get('lastName') || get('lastname') || '';
      obj.email = (get('email') || '').trim();
      // ignore role and password from CSV per requirements

      try {
        if (!obj.email) throw new Error('Missing email');

        const existing = await this.findByEmail(obj.email);
        if (existing) {
          // update existing user: only update allowed fields (firstName, lastName)
          await this.update(existing.id, { firstName: obj.firstName, lastName: obj.lastName });
          results.updated += 1;
        } else {
          // create new user; do not pass role/password from CSV (they are ignored)
          await this.create({ email: obj.email, firstName: obj.firstName, lastName: obj.lastName });
          results.created += 1;
        }
      } catch (e: any) {
        results.errors.push({ line: i + 2, error: e?.message || String(e), email: obj.email });
      }
    }

    return results;
  }

  /**
   * Bulk delete users by id. Expects an array of ids.
   * Returns the number of deleted rows.
   */
  async bulkDelete(ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('No ids provided for deletion');
    }

    // Use query builder to delete by ids and get affected count
    const qb = this.repo.createQueryBuilder().delete().whereInIds(ids);
    const res = await qb.execute();
    const affected = (res as any).affected ?? 0;
    return { deleted: affected };
  }
}