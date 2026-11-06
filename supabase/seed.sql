-- Seed Default Categories for Existing User
-- Replace 'YOUR_USER_ID' with your user uuid from auth.users if running manually
DO $$
DECLARE
    uid uuid;
BEGIN
    SELECT id INTO uid FROM auth.users ORDER BY created_at ASC LIMIT 1;
    IF uid IS NOT NULL THEN
        INSERT INTO public.categories (user_id, name, slug, color) VALUES
            (uid, 'Visual Metaphors', 'visual-metaphors', '#ec4899'),
            (uid, 'Maps & Geography', 'maps-geography', '#3b82f6'),
            (uid, 'Typography', 'typography', '#eab308'),
            (uid, 'Motion Graphics', 'motion-graphics', '#8b5cf6'),
            (uid, 'Data Visualization', 'data-visualization', '#10b981'),
            (uid, 'Cinematic Composition', 'cinematic-composition', '#f97316'),
            (uid, 'Transitions', 'transitions', '#06b6d4'),
            (uid, 'Sound Design', 'sound-design', '#14b8a6'),
            (uid, 'Documentary Editing', 'documentary-editing', '#6366f1'),
            (uid, 'Product Advertising', 'product-advertising', '#f43f5e'),
            (uid, 'UI & Interface', 'ui-interface', '#a855f7'),
            (uid, 'Color Grading', 'color-grading', '#f59e0b'),
            (uid, 'Camera Movement', 'camera-movement', '#84cc16'),
            (uid, 'Editing Techniques', 'editing-techniques', '#0ea5e9'),
            (uid, 'Historical Visuals', 'historical-visuals', '#78716c')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
