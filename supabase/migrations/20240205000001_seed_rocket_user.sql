-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert user into auth.users if not exists
DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'rocket@hhtools.com') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      'rocket@hhtools.com',
      crypt('rocket_password_9898', gen_salt('bf')),
      now(),
      NULL,
      NULL,
      '{"provider":"email","providers":["email"]}',
      '{"name":"Rocket"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    -- Insert into public.users (sync)
    INSERT INTO public.users (
      id,
      email,
      name,
      password_hash, -- We can store a dummy or the same hash here if needed, but auth is handled by Supabase
      role
    ) VALUES (
      new_user_id,
      'rocket@hhtools.com',
      'Rocket',
      'managed_by_supabase_auth',
      'admin' -- Rocket seems to be the main user/admin
    );
  END IF;
END $$;
