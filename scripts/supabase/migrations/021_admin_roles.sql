-- ==========================================
-- 021_admin_roles.sql: Admin Roles & Security Setup
-- ==========================================

-- Helper function to check if a user is an Admin/Super Admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE public.user_roles.user_id = $1
    AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if a user is a Staff member (Moderator or Admin)
CREATE OR REPLACE FUNCTION public.is_staff(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE public.user_roles.user_id = $1
    AND role IN ('MODERATOR', 'ADMIN', 'SUPER_ADMIN')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security (RLS) policies for user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Everyone can read their own role
CREATE POLICY "Users can read their own role" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

-- Only SUPER_ADMIN can update roles
CREATE POLICY "Super Admins can update roles" 
ON public.user_roles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN'
  )
);
