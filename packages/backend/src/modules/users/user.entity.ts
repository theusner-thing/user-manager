import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type Role = 'admin' | 'user';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'email', unique: true })
  email!: string;

  @Column({name: 'is_password_temporary', default: true})
  isPasswordTemporary!: boolean;

  @Column({name: 'firstname'})
  firstName!: string;

  @Column({name: 'lastname'})
  lastName!: string;

  @Column()
  password!: string;

  @Column({ default: 'user' })
  role!: Role;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
