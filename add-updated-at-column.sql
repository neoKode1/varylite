-- Add updated_at column to image_uploads table
-- This fixes the schema mismatch where code expects updated_at but column doesn't exist

-- Add the updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image_uploads' 
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.image_uploads 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Create function to update updated_at timestamp
        CREATE OR REPLACE FUNCTION update_image_uploads_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        -- Create trigger for automatic timestamp updates
        DROP TRIGGER IF EXISTS update_image_uploads_updated_at ON public.image_uploads;
        CREATE TRIGGER update_image_uploads_updated_at 
          BEFORE UPDATE ON public.image_uploads 
          FOR EACH ROW EXECUTE FUNCTION update_image_uploads_updated_at();
          
        RAISE NOTICE 'Added updated_at column and trigger to image_uploads table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in image_uploads table';
    END IF;
END $$;

-- Update existing records to have updated_at set to created_at
UPDATE public.image_uploads 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Add comment to column
COMMENT ON COLUMN public.image_uploads.updated_at IS 'Timestamp when the record was last updated';
