-- Create the storage bucket for brand assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand_assets', 'brand_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS for the brand_assets bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'brand_assets' );

CREATE POLICY "Authenticated users can upload assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'brand_assets' );

CREATE POLICY "Users can update their own assets"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'brand_assets' AND auth.uid() = owner );

CREATE POLICY "Users can delete their own assets"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'brand_assets' AND auth.uid() = owner );
