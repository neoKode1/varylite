-- Comprehensive Model Check: Compare Application Models vs Database Models
-- Run this in Supabase SQL Editor

-- 1. Check what models exist in the model_costs table
SELECT 
    'DATABASE_MODELS' as source,
    model_name,
    cost_per_generation,
    category,
    display_name,
    is_active,
    created_at
FROM public.model_costs 
ORDER BY model_name;

-- 2. Check for specific models that are used in the application
-- Image Models
SELECT 
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'nano-banana') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as nano_banana_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'runway-t2i') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as runway_t2i_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'seedream-4-edit') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as seedream_4_edit_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'bytedance-seedream-4') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as bytedance_seedream_4_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'gemini-25-flash-image-edit') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as gemini_25_flash_image_edit_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'luma-photon-reframe') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as luma_photon_reframe_status;

-- Video Models
SELECT 
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'runway-video') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as runway_video_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'veo3-fast') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as veo3_fast_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'minimax-2.0') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as minimax_2_0_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'minimax-video') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as minimax_video_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'kling-2.1-master') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as kling_2_1_master_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'seedance-pro') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as seedance_pro_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'decart-lucy-14b') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as decart_lucy_14b_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'minimax-video-01') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as minimax_video_01_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'stable-video-diffusion-i2v') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as stable_video_diffusion_i2v_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'modelscope-i2v') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as modelscope_i2v_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'text2video-zero-i2v') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as text2video_zero_i2v_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'wan-v2-2-a14b-i2v-lora') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as wan_v2_2_a14b_i2v_lora_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'cogvideo-i2v') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as cogvideo_i2v_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'zeroscope-t2v') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as zeroscope_t2v_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'minimax-i2v-director') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as minimax_i2v_director_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'hailuo-02-pro') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as hailuo_02_pro_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'kling-video-pro') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as kling_video_pro_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'seedream-3') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as seedream_3_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'seedance-1-pro') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as seedance_1_pro_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.model_costs WHERE model_name = 'kling-ai-avatar') 
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as kling_ai_avatar_status;

-- 3. Summary: Count of missing models
WITH app_models AS (
    SELECT unnest(ARRAY[
        'nano-banana', 'runway-t2i', 'seedream-4-edit', 'bytedance-seedream-4', 
        'gemini-25-flash-image-edit', 'luma-photon-reframe', 'runway-video', 
        'veo3-fast', 'minimax-2.0', 'minimax-video', 'kling-2.1-master', 
        'seedance-pro', 'decart-lucy-14b', 'minimax-video-01', 
        'stable-video-diffusion-i2v', 'modelscope-i2v', 'text2video-zero-i2v', 
        'wan-v2-2-a14b-i2v-lora', 'cogvideo-i2v', 'zeroscope-t2v', 
        'minimax-i2v-director', 'hailuo-02-pro', 'kling-video-pro', 
        'seedream-3', 'seedance-1-pro', 'kling-ai-avatar'
    ]) as model_name
),
db_models AS (
    SELECT model_name FROM public.model_costs WHERE is_active = true
)
SELECT 
    'SUMMARY' as report_type,
    COUNT(*) as total_app_models,
    (SELECT COUNT(*) FROM db_models) as total_db_models,
    COUNT(*) - (SELECT COUNT(*) FROM app_models am WHERE EXISTS(SELECT 1 FROM db_models dm WHERE dm.model_name = am.model_name)) as missing_models
FROM app_models;

-- 4. List all missing models
WITH app_models AS (
    SELECT unnest(ARRAY[
        'nano-banana', 'runway-t2i', 'seedream-4-edit', 'bytedance-seedream-4', 
        'gemini-25-flash-image-edit', 'luma-photon-reframe', 'runway-video', 
        'veo3-fast', 'minimax-2.0', 'minimax-video', 'kling-2.1-master', 
        'seedance-pro', 'decart-lucy-14b', 'minimax-video-01', 
        'stable-video-diffusion-i2v', 'modelscope-i2v', 'text2video-zero-i2v', 
        'wan-v2-2-a14b-i2v-lora', 'cogvideo-i2v', 'zeroscope-t2v', 
        'minimax-i2v-director', 'hailuo-02-pro', 'kling-video-pro', 
        'seedream-3', 'seedance-1-pro', 'kling-ai-avatar'
    ]) as model_name
),
db_models AS (
    SELECT model_name FROM public.model_costs WHERE is_active = true
)
SELECT 
    'MISSING_MODELS' as status,
    am.model_name,
    'NOT_FOUND_IN_DATABASE' as reason
FROM app_models am
WHERE NOT EXISTS(SELECT 1 FROM db_models dm WHERE dm.model_name = am.model_name)
ORDER BY am.model_name;
