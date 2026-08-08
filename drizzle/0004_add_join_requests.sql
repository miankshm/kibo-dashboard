CREATE TABLE IF NOT EXISTS join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending',
  requested_at timestamp DEFAULT now(),
  approved_at timestamp,
  approved_by_admin_id uuid REFERENCES admins(id),
  invite_token text,
  invite_sent_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

ALTER TABLE admins ADD COLUMN IF NOT EXISTS receive_update_emails boolean DEFAULT true;
