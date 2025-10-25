-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    firstname VARCHAR(255) NOT NULL,
    lastname VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_password_temporary BOOLEAN DEFAULT TRUE,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert admin user (password is 'password' hashed with SHA256)
-- Salt: timestamp in milliseconds, Password: password
INSERT INTO public.users (email, firstname, lastname, password, is_password_temporary, role)
VALUES ('admin@silenceapi.com', 'Admin', 'User', '1761403350701:64a978a7ea6f01984a00ade38c5c73e4bc3cc43e8595a46c015cb108d0dd6b33', false, 'admin')
ON CONFLICT (email) DO NOTHING;

