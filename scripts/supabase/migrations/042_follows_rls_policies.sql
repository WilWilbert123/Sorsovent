-- Migration 042: Add RLS policies for public.follows table

-- Enable RLS (idempotent)
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- 1. Allow everyone (public/authenticated) to read follow relationships
DROP POLICY IF EXISTS "Public follows are viewable by everyone." ON public.follows;
CREATE POLICY "Public follows are viewable by everyone." ON public.follows
  FOR SELECT
  USING (true);

-- 2. Allow authenticated users to follow others (must be their own follower_id and cannot follow oneself)
DROP POLICY IF EXISTS "Users can follow other users." ON public.follows;
CREATE POLICY "Users can follow other users." ON public.follows
  FOR INSERT
  WITH CHECK (
    auth.uid() = follower_id
    AND auth.uid() != following_id
  );

-- 3. Allow authenticated users to unfollow (must be their own follow record)
DROP POLICY IF EXISTS "Users can unfollow." ON public.follows;
CREATE POLICY "Users can unfollow." ON public.follows
  FOR DELETE
  USING (auth.uid() = follower_id);
