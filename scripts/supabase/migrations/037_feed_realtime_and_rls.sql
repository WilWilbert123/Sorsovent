-- Migration 037: Realtime publication and RLS policies for posts, likes, comments, and post_media

-- Add posts, likes, comments, post_media to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'post_media'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.post_media;
  END IF;
END $$;

-- Enable RLS and Policies for post deletion
CREATE POLICY "Users can delete own posts." ON public.posts 
FOR DELETE USING (
  auth.uid() = author_id 
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
  )
);

-- Policies for likes
CREATE POLICY "Likes are viewable by everyone." ON public.likes 
FOR SELECT USING (true);

CREATE POLICY "Users can insert their own likes." ON public.likes 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes." ON public.likes 
FOR DELETE USING (auth.uid() = user_id);

-- Policies for comments
CREATE POLICY "Comments are viewable by everyone." ON public.comments 
FOR SELECT USING (true);

CREATE POLICY "Users can insert comments." ON public.comments 
FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own comments." ON public.comments 
FOR DELETE USING (
  auth.uid() = author_id 
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
  )
);

-- Policies for post_media
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post media is viewable by everyone." ON public.post_media 
FOR SELECT USING (true);

CREATE POLICY "Users can insert post media for own posts." ON public.post_media 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE id = post_id AND author_id = auth.uid()
  )
);
