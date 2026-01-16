-- Fix board_posts foreign key constraint
-- This allows users to be deleted without deleting their posts
-- Posts will show created_by as NULL (can display as "Deleted User")

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find the constraint name
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'board_posts'::regclass
  AND contype = 'f'
  AND confrelid = 'users'::regclass;

  -- Drop the old constraint if exists
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE board_posts DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped constraint: %', constraint_name;
  END IF;

  -- Add new constraint with ON DELETE SET NULL
  ALTER TABLE board_posts
  ADD CONSTRAINT board_posts_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

  RAISE NOTICE 'Added new constraint with ON DELETE SET NULL';
END $$;
