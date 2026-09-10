/*
# Homepage Layout Switcher

Adds a `layout_style` column to `theme_settings` so the admin can switch
between different visual arrangements of the homepage's Services and
Materials Shop sections without needing a developer - e.g. a classic
tile grid vs. a horizontal-scroll "showcase" style. Purely additive,
defaults every existing theme row to the current ('classic') layout so
nothing changes visually until an admin picks something else.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'theme_settings' AND column_name = 'layout_style'
  ) THEN
    ALTER TABLE theme_settings ADD COLUMN layout_style text NOT NULL DEFAULT 'classic';
  END IF;
END $$;

ALTER TABLE theme_settings DROP CONSTRAINT IF EXISTS theme_settings_layout_style_check;
ALTER TABLE theme_settings ADD CONSTRAINT theme_settings_layout_style_check
  CHECK (layout_style IN ('classic', 'showcase'));
