-- ==============================================================================
-- Committed Complete Supabase PostgreSQL Schema & RLS Setup
-- Multi-user architecture with Row-Level Security (RLS) and Supabase Auth
-- ==============================================================================

-- 1. Enable UUID Extension (standard in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Categories Table (scoped to user)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#10B981',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- 3. Habits Table (scoped to user)
CREATE TABLE IF NOT EXISTS habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'General',
    color TEXT DEFAULT '#10B981',
    icon TEXT DEFAULT 'zap',
    frequency_days INTEGER DEFAULT 7,
    grid_days INTEGER DEFAULT 60,
    tile_shape TEXT DEFAULT 'tile-rounded',
    is_archived BOOLEAN DEFAULT FALSE,
    order_index BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Habit Logs Table (scoped to user)
CREATE TABLE IF NOT EXISTS habit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
    completed_date DATE NOT NULL,
    count INTEGER DEFAULT 1,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(habit_id, completed_date)
);

-- 5. XP Transactions Ledger (scoped to user)
CREATE TABLE IF NOT EXISTS xp_transactions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
    reference_id TEXT,
    event_date DATE NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Achievements Record (scoped to user)
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_key TEXT NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_key)
);

-- 7. User Settings Table (scoped to user)
CREATE TABLE IF NOT EXISTS user_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'dark',
    sound_enabled BOOLEAN DEFAULT TRUE,
    confetti_enabled BOOLEAN DEFAULT TRUE,
    default_grid_days INTEGER DEFAULT 60,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_id ON habit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_tx_user_id ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(completed_date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit ON habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_habits_category ON habits(category);
CREATE INDEX IF NOT EXISTS idx_xp_tx_date ON xp_transactions(event_date);

-- 9. Row-Level Security (RLS) Configuration
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies (scoped strictly to auth.uid())
-- Categories
CREATE POLICY "Users can select own categories" ON categories FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own categories" ON categories FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own categories" ON categories FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own categories" ON categories FOR DELETE USING (user_id = auth.uid());

-- Habits
CREATE POLICY "Users can select own habits" ON habits FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own habits" ON habits FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own habits" ON habits FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own habits" ON habits FOR DELETE USING (user_id = auth.uid());

-- Habit Logs
CREATE POLICY "Users can select own habit_logs" ON habit_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own habit_logs" ON habit_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own habit_logs" ON habit_logs FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own habit_logs" ON habit_logs FOR DELETE USING (user_id = auth.uid());

-- XP Transactions
CREATE POLICY "Users can select own xp_transactions" ON xp_transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own xp_transactions" ON xp_transactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own xp_transactions" ON xp_transactions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own xp_transactions" ON xp_transactions FOR DELETE USING (user_id = auth.uid());

-- Achievements
CREATE POLICY "Users can select own achievements" ON achievements FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own achievements" ON achievements FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own achievements" ON achievements FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own achievements" ON achievements FOR DELETE USING (user_id = auth.uid());

-- User Settings
CREATE POLICY "Users can select own user_settings" ON user_settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own user_settings" ON user_settings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own user_settings" ON user_settings FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own user_settings" ON user_settings FOR DELETE USING (user_id = auth.uid());
