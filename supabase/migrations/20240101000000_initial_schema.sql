-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- THREADS TABLE
-- ============================================
CREATE TABLE public.threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Chat',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_threads_user_id ON public.threads(user_id);
CREATE INDEX idx_threads_updated_at ON public.threads(updated_at DESC);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL DEFAULT '',
    tool_calls JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- ============================================
-- SKILLS TABLE
-- ============================================
CREATE TABLE public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    description VARCHAR(1024) NOT NULL CHECK (char_length(description) >= 20),
    instructions TEXT NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT true,
    license VARCHAR(64),
    compatibility VARCHAR(64),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT skills_name_format CHECK (
        name ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'
        AND char_length(name) <= 64
    )
);

CREATE UNIQUE INDEX idx_skills_user_name ON public.skills(
    COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID), name
);

-- ============================================
-- SKILL FILES TABLE
-- ============================================
CREATE TABLE public.skill_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_skill_files_skill_id ON public.skill_files(skill_id);

-- ============================================
-- CODE EXECUTIONS TABLE
-- ============================================
CREATE TABLE public.code_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    stdout TEXT,
    stderr TEXT,
    exit_code INTEGER,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_code_executions_thread_id ON public.code_executions(thread_id);

-- ============================================
-- SANDBOX FILES TABLE
-- ============================================
CREATE TABLE public.sandbox_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES public.code_executions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sandbox_files_execution_id ON public.sandbox_files(execution_id);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_threads_updated_at
    BEFORE UPDATE ON public.threads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_skills_updated_at
    BEFORE UPDATE ON public.skills
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Threads RLS
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own threads" ON public.threads
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own threads" ON public.threads
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own threads" ON public.threads
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own threads" ON public.threads
    FOR DELETE USING (auth.uid() = user_id);

-- Messages RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own messages" ON public.messages
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own messages" ON public.messages
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON public.messages
    FOR DELETE USING (auth.uid() = user_id);

-- Skills RLS (users can see own + global skills where user_id IS NULL)
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own and global skills" ON public.skills
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can create own skills" ON public.skills
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own skills" ON public.skills
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own skills" ON public.skills
    FOR DELETE USING (auth.uid() = user_id);

-- Skill Files RLS
ALTER TABLE public.skill_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own skill files" ON public.skill_files
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own skill files" ON public.skill_files
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own skill files" ON public.skill_files
    FOR DELETE USING (auth.uid() = user_id);

-- Code Executions RLS
ALTER TABLE public.code_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own executions" ON public.code_executions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own executions" ON public.code_executions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own executions" ON public.code_executions
    FOR UPDATE USING (auth.uid() = user_id);

-- Sandbox Files RLS
ALTER TABLE public.sandbox_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sandbox files" ON public.sandbox_files
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sandbox files" ON public.sandbox_files
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('skill-files', 'skill-files', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('sandbox-outputs', 'sandbox-outputs', false);

-- Storage RLS policies
CREATE POLICY "Users can upload to own skill files path"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'skill-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own skill files"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'skill-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own skill files"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'skill-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload to own sandbox path"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'sandbox-outputs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own sandbox files"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'sandbox-outputs' AND (storage.foldername(name))[1] = auth.uid()::text);
