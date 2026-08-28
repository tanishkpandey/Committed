-- ==============================================================================
-- HabitKit Complete Supabase PostgreSQL Schema
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Enable UUID Extension (standard in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#10B981',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default categories if empty
INSERT INTO categories (name, color) VALUES
    ('General', '#6B7280'),
    ('Fitness', '#10B981'),
    ('Mindfulness', '#8B5CF6'),
    ('Health', '#06B6D4'),
    ('Learning', '#F59E0B'),
    ('Productivity', '#EC4899')
ON CONFLICT (name) DO NOTHING;

-- 3. Habits Table
CREATE TABLE IF NOT EXISTS habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 4. Habit Logs Table
CREATE TABLE IF NOT EXISTS habit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
    completed_date DATE NOT NULL,
    count INTEGER DEFAULT 1,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(habit_id, completed_date)
);

-- 5. XP Transactions Ledger
CREATE TABLE IF NOT EXISTS xp_transactions (
    id TEXT PRIMARY KEY,
    user_id UUID,
    amount INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
    reference_id TEXT,
    event_date DATE NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Achievements Record
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    achievement_key TEXT NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_key)
);

-- 7. User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    theme TEXT DEFAULT 'dark',
    sound_enabled BOOLEAN DEFAULT TRUE,
    confetti_enabled BOOLEAN DEFAULT TRUE,
    default_grid_days INTEGER DEFAULT 60,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(completed_date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit ON habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_habits_category ON habits(category);
CREATE INDEX IF NOT EXISTS idx_xp_tx_date ON xp_transactions(event_date);
