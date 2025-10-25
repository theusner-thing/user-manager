import { DataSourceOptions } from 'typeorm';
import { User } from './modules/users/user.entity';

const isSqlite = process.env.DB_TYPE === 'sqlite' || !process.env.DB_HOST;

const dbConfig: DataSourceOptions = isSqlite
  ? {
      type: 'sqlite',
      database: process.env.DB_NAME || 'dev.sqlite',
      synchronize: true,
      logging: false,
      entities: [User],
    }
  : {
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      synchronize: true,
      logging: false,
      entities: [User],
    };
  
const config = {
  ...dbConfig,
  synchronize: false,
};
export default config;
