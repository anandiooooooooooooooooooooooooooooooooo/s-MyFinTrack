-- Trigger function to seed default categories when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default expense categories
  INSERT INTO public.categories (name, type, icon, color, user_id) VALUES
    ('Food & Dining', 'expense', '🍔', '#ef4444', NEW.id),
    ('Transportation', 'expense', '🚗', '#f97316', NEW.id),
    ('Shopping', 'expense', '🛍️', '#eab308', NEW.id),
    ('Bills & Utilities', 'expense', '💡', '#22c55e', NEW.id),
    ('Entertainment', 'expense', '🎬', '#06b6d4', NEW.id),
    ('Healthcare', 'expense', '💊', '#3b82f6', NEW.id),
    ('Education', 'expense', '📚', '#8b5cf6', NEW.id),
    ('Other', 'expense', '📦', '#6b7280', NEW.id);

  -- Insert default income categories
  INSERT INTO public.categories (name, type, icon, color, user_id) VALUES
    ('Salary', 'income', '💰', '#10b981', NEW.id),
    ('Freelance', 'income', '💻', '#14b8a6', NEW.id),
    ('Investment', 'income', '📈', '#6366f1', NEW.id),
    ('Other Income', 'income', '💵', '#84cc16', NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
-- This fires after a new user is inserted into Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created_categories ON auth.users;
CREATE TRIGGER on_auth_user_created_categories
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_categories();
